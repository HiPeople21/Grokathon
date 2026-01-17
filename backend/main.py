import os
import json
import uuid
import asyncio
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from xai_sdk import Client
from xai_sdk.chat import user
from xai_sdk.tools import x_search

from script_gen import generate_script as create_script_from_briefing  # Rename to avoid conflict
from audio_gen import generate_audio
from video_gen import generate_videos, combine_videos

from concurrent.futures import ThreadPoolExecutor
import threading
import json
import sys

load_dotenv()

def filter_x_videos(content: str) -> str:
    """Remove X video URLs from the response JSON."""
    try:
        data = json.loads(content)
        if "media" in data and isinstance(data["media"], list):
            # Filter out videos from X domains
            filtered_media = []
            for item in data["media"]:
                if item.get("type") == "video":
                    url = item.get("url", "").lower()
                    source_url = item.get("sourceUrl", "").lower()
                    
                    # Skip X video URLs - check both url and sourceUrl
                    is_x_video = (
                        "video.twimg.com" in url or 
                        "x.com" in url or 
                        "twitter.com" in url or
                        "twimg.com/tweet" in url or
                        "pbs.twimg.com/amplify" in url or
                        "x.com" in source_url or
                        "twitter.com" in source_url
                    )
                    
                    if is_x_video:
                        continue
                
                filtered_media.append(item)
            data["media"] = filtered_media
        return json.dumps(data)
    except Exception as e:
        return content


app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve audio files
if not os.path.exists("audio"):
    os.makedirs("audio")
app.mount("/audio", StaticFiles(directory="audio"), name="audio")

# Serve video files
if not os.path.exists("videos"):
    os.makedirs("videos")
app.mount("/videos", StaticFiles(directory="videos"), name="videos")

client = Client(api_key=os.getenv("XAI_API_KEY"))
executor = ThreadPoolExecutor(max_workers=4)

class VideoScriptRequest(BaseModel):
    topic: str

class VideoScriptResponse(BaseModel):
    script: str

class BriefingRequest(BaseModel):
    topic: str

class BriefingResponse(BaseModel):
    script: str # This is the JSON string of the briefing
    audio_url: str

@app.post("/generate-briefing", response_model=BriefingResponse)
async def generate_briefing(request: BriefingRequest):
    """Generate a news briefing, script, and audio podcast."""
    if not os.getenv("XAI_API_KEY"):
        raise HTTPException(status_code=500, detail="XAI_API_KEY not configured")
    
    try:
        # 1. Generate Briefing Content (JSON text)
        # print(f"Step 1: Generating briefing for '{request.topic}'...")
        chat = client.chat.create(
            model="grok-4-1-fast",
            tools=[x_search(enable_image_understanding=True, enable_video_understanding=True)],
            include=["verbose_streaming"],
        )
        
        # System prompt for briefing
        prompt_text = """You are a news analyst. Search X for images about the topic. Return ONLY valid JSON with this structure:
{
  "headline": "engaging title",
  "summary": "2-3 sentence overview",
  "confirmed_facts": [{"text": "fact1", "sourceUrl": "https://x.com/user/status/id"}, {"text": "fact2", "sourceUrl": "https://x.com/user/status/id"}],
  "unconfirmed_claims": ["claim1", "claim2"],
  "recent_changes": ["update1"],
  "watch_next": ["related_topic1", "related_topic2"],
  "sources": [
    {
      "account_handle": "@username",
      "display_name": "Full Name",
      "excerpt": "quote or key statement",
      "time_ago": "2h ago",
      "post_url": "https://x.com/user/status/id",
      "profile_image_url": "https://pbs.twimg.com/profile_images/...",
      "label": "official|journalist|eyewitness|other"
    }
  ],
  "media": [
    {"url": "image URL from X post (pbs.twimg.com only)", "type": "image", "caption": "relevant caption", "sourceUrl": "https://x.com/user/status/id"}
  ]
}
CRITICAL: Include ONLY 2-3 images from X (pbs.twimg.com URLs). Do NOT include any videos in the response. Return images only."""
        chat.append(user(prompt_text))
        chat.append(user(f"Generate a news briefing for: {request.topic}"))
        
        # Stream and collect response
        content = ""
        for response, chunk in chat.stream():
            if chunk.content:
                content += chunk.content

        print(f"✓ Briefing generated: {len(content)} chars")

        # Filter out invalid media
        filtered_content = filter_x_videos(content)

        # 2. Parse the briefing JSON
        print("Step 2: Parsing briefing JSON...")
        briefing_json = json.loads(filtered_content)
        print("✓ Briefing JSON parsed successfully")
        
        # 3. Generate Script from Briefing
        print("Step 3: Generating podcast script from briefing...")
        script_segments = create_script_from_briefing(briefing_json)
        print(f"✓ Generated {len(script_segments) if script_segments else 0} script segments")
        
        # 4. Generate Audio from Script
        full_audio_url = ""
        if script_segments:
            print("Step 4: Generating audio from script...")
            filename = f"podcast_{uuid.uuid4().hex}.wav"
            audio_path = await generate_audio(script_segments, filename)
            full_audio_url = f"http://localhost:8000{audio_path}"
            print(f"✓ Audio generated: {full_audio_url}")
        else:
            print("⚠ No script segments - skipping audio generation")
        
        # 5. Return both briefing and audio
        print("Step 5: Returning briefing + audio URL")
        return BriefingResponse(script=filtered_content, audio_url=full_audio_url)
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing error: {e}")
        raise HTTPException(status_code=500, detail=f"Invalid JSON in briefing: {str(e)}")
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating briefing: {str(e)}")


@app.post("/generate-script", response_model=VideoScriptResponse)
async def generate_script_endpoint(request: VideoScriptRequest):  # ✅ Renamed to avoid conflict
    """Generate a video script using Grok API based on the given topic."""
    if not os.getenv("XAI_API_KEY"):
        raise HTTPException(status_code=500, detail="XAI_API_KEY not configured")
    
    try:
        chat = client.chat.create(
            model="grok-4-1-fast",
            tools=[x_search(enable_image_understanding=True, enable_video_understanding=True)],
            include=["verbose_streaming"],
        )
        
        chat.append(
            user("You are an expert video scriptwriter and researcher. Return ONLY valid JSON with this structure: {\"headline\": \"title\", \"summary\": \"2-3 sentence overview\", \"confirmed_facts\": [\"fact1\", \"fact2\", \"fact3\"], \"unconfirmed_claims\": [\"claim1\"], \"recent_changes\": [\"change1\"], \"watch_next\": [\"topic1\"], \"script\": \"full 2-5 minute video script\"}")
        )
        
        chat.append(user(f"Generate content for topic: {request.topic}"))
        
        script_content = ""
        for response, chunk in chat.stream():
            if chunk.content:
                script_content += chunk.content
        
        return VideoScriptResponse(script=script_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating script: {str(e)}")


@app.websocket("/ws/briefing")
async def websocket_briefing(websocket: WebSocket):
    """Stream briefing generation chunks to the client in real time."""
    await websocket.accept()
    try:
        init_msg = await websocket.receive_json()
        topic = init_msg.get("topic") if isinstance(init_msg, dict) else None
        location = init_msg.get("location", "worldwide") if isinstance(init_msg, dict) else "worldwide"

        if not topic:
            await websocket.send_json({"type": "error", "message": "topic is required"})
            await websocket.close()
            return

        if not os.getenv("XAI_API_KEY"):
            await websocket.send_json({"type": "error", "message": "XAI_API_KEY not configured"})
            await websocket.close()
            return

        # Send status that we're starting generation
        # (moved inside generator to maintain proper queue ordering)

        def run_briefing():
            yield {"type": "status", "content": f"Starting briefing generation for '{topic}' ({location})...\n"}
            
            chat = client.chat.create(
                model="grok-4-1-fast",
                tools=[x_search(enable_image_understanding=True, enable_video_understanding=True)],
                include=["verbose_streaming"],
            )
            
            # Immediately send a status to confirm connection is working
            yield {"type": "status", "content": "Connected to Grok AI...\n"}

            prompt_text = f"""You are a news analyst covering news from {location}. Search X for images about {location}. Return ONLY valid JSON with this structure:
{{
  "headline": "engaging title",
  "summary": "2-3 sentence overview",
    "confirmed_facts": [{{"text": "fact1", "sourceUrl": "https://x.com/user/status/id"}}, {{"text": "fact2", "sourceUrl": "https://x.com/user/status/id"}}],
  "unconfirmed_claims": ["claim1", "claim2"],
  "recent_changes": ["update1"],
  "watch_next": ["related_topic1", "related_topic2"],
  "sources": [
    {{
      "account_handle": "@username",
      "display_name": "Full Name",
      "excerpt": "quote or key statement",
      "time_ago": "2h ago",
      "post_url": "https://x.com/user/status/id",
      "profile_image_url": "https://pbs.twimg.com/profile_images/...",
      "label": "official|journalist|eyewitness|other"
    }}
  ],
  "media": [
    {{\"url": "image URL from X post (pbs.twimg.com only)", "type": "image", "caption": "relevant caption", "sourceUrl": "https://x.com/user/status/id"}}
  ]
}}
CRITICAL: Include ONLY 2-3 images from X about {location} (pbs.twimg.com URLs). Do NOT include any videos in the response. Return images only."""
            chat.append(user(prompt_text))
            chat.append(user(f"Generate a news briefing for: {topic}"))

            # Stream briefing generation
            content = ""
            thinking_emitted = False
            tool_searches = set()
            
            for response, chunk in chat.stream():
                has_reasoning = getattr(response, "usage", None) and getattr(response.usage, "reasoning_tokens", None)
                has_content = bool(chunk.content)
                
                if has_reasoning and not thinking_emitted:
                    thinking_emitted = True
                    yield {
                        "type": "thinking",
                        "content": f"\n✨ Researching '{topic}' in {location}. Analyzing current events, finding relevant images, and compiling sources...\n"
                    }

                for tool_call in chunk.tool_calls:
                    tool_name = tool_call.function.name
                    if tool_name not in tool_searches:
                        tool_searches.add(tool_name)
                        # Show tool details in human-readable format
                        try:
                            args = json.loads(tool_call.function.arguments) if isinstance(tool_call.function.arguments, str) else tool_call.function.arguments
                            if isinstance(args, dict):
                                query = args.get("query", args.get("q", ""))
                                if query:
                                    display_query = query[:60] + "..." if len(query) > 60 else query
                                    
                                    if "semantic" in tool_name:
                                        yield {
                                            "type": "tool",
                                            "content": f"Finding sources discussing: {display_query}\n"
                                        }
                                    elif "keyword" in tool_name:
                                        yield {
                                            "type": "tool",
                                            "content": f"Searching for keywords: {display_query}\n"
                                        }
                                    else:
                                        yield {
                                            "type": "tool",
                                            "content": f"Searching X for images: {display_query}\n"
                                        }
                                else:
                                    yield {
                                        "type": "tool",
                                        "content": f"Gathering current information and visuals...\n"
                                    }
                            else:
                                yield {"type": "tool", "content": f"⚙️ Processing information...\n"}
                        except Exception as e:
                            yield {
                                "type": "tool",
                                "content": f"🔄 Processing information...\n"
                            }

                if has_content:
                    content += chunk.content
                    yield {
                        "type": "chunk",
                        "content": chunk.content
                    }
            
            # Filter out X videos before sending result
            filtered_content = filter_x_videos(content)
            
            # ✅ GENERATE SCRIPT AND AUDIO synchronously before sending result
            audio_url = ""
            try:
                yield {"type": "status", "content": "🎙️ Generating podcast script...\n"}
                
                briefing_json = json.loads(filtered_content)
                script_segments = create_script_from_briefing(briefing_json)
                
                if script_segments:
                    yield {"type": "status", "content": "🎵 Generating audio (this may take a minute)...\n"}
                    
                    filename = f"podcast_{uuid.uuid4().hex}.wav"
                    
                    # Run async generate_audio in sync context
                    import asyncio
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    audio_path = loop.run_until_complete(generate_audio(script_segments, filename))
                    loop.close()
                    
                    audio_url = f"http://localhost:8000{audio_path}"
                    
                    # Inject audio_url into the briefing JSON
                    briefing_json["audio_url"] = audio_url
                    
                    # ✅ GENERATE VIDEO (after audio)
                    print(f"DEBUG: Audio complete. Starting video generation...", file=sys.stderr, flush=True)
                    yield {"type": "status", "content": "🎬 Generating video segments (this will take a few minutes)...\n"}
                    
                    # Run synchronous video generation
                    # Ideally this should be async or threaded better, but sticking to simple sync integration for now
                    # We can yield intermediate status if we modify generate_videos, but for now just yield "working on it"
                    
                    try:
                        # 1. Generate individual clips
                        video_urls = generate_videos(script_segments)
                        
                        # 2. Combine them
                        yield {"type": "status", "content": "🎞️ Combining video segments...\n"}
                        final_video_filename = f"briefing_{uuid.uuid4().hex}.mp4"
                        final_video_path = combine_videos(video_urls, output_filename=final_video_filename)
                        
                        if final_video_path:
                            # Parse filename from path to construct URL
                            # combine_videos returns string path like "videos/briefing_xxx.mp4" (relative?) 
                            # or absolute? It returns `output_path` which is "videos/xxx.mp4"
                            
                            # Just use the filename we passed
                            video_url = f"http://localhost:8000/videos/{final_video_filename}"
                            briefing_json["video_url"] = video_url
                            print(f"DEBUG: Final video ready at: {video_url}", file=sys.stderr, flush=True)
                            
                            # Also emit a specific event for video ready if needed, 
                            # but sending it in the final result is the primary way
                            yield {"type": "video_ready", "url": video_url}
                        else:
                            print("DEBUG: Video combination failed or returned None", file=sys.stderr, flush=True)
                            
                    except Exception as vid_err:
                        print(f"DEBUG: Error in video generating: {vid_err}", file=sys.stderr, flush=True)
                        import traceback
                        traceback.print_exc()
                        yield {"type": "status", "content": "⚠️ Video generation failed, skipping.\n"}

                    # Update content with all URLs
                    filtered_content = json.dumps(briefing_json)
                    
            except Exception as e:
                # Don't fail the whole request, just log and continue without audio
                import traceback
                traceback.print_exc()

            # Send final briefing result (now potentially including audio_url)
            yield {"type": "result", "content": filtered_content}

        # Run in thread and stream to WebSocket
        from queue import Queue
        import queue
        import threading
        
        message_queue = Queue()
        
        def generator_thread():
            try:
                for message in run_briefing():
                    message_queue.put(("message", message))
            except Exception as e:
                message_queue.put(("error", str(e)))
            finally:
                message_queue.put(("done", None))
        
        thread = threading.Thread(target=generator_thread, daemon=True)
        thread.start()
        
        try:
            while True:
                try:
                    msg_type, data = message_queue.get(timeout=0.01)
                    
                    if msg_type == "message":
                        if websocket.client_state.value == 1:
                            await websocket.send_json(data)
                            # Force immediate send with small delay to prevent buffering
                            import asyncio
                            await asyncio.sleep(0.001)
                    elif msg_type == "error":
                        await websocket.send_json({"type": "error", "message": data})
                        break
                    elif msg_type == "done":
                        break
                        
                except queue.Empty:
                    if websocket.client_state.value != 1:
                        break
                    # Small sleep to yield to event loop
                    import asyncio
                    try:
                        await asyncio.sleep(0.001)
                    except:
                        pass
                    continue
                    
        except Exception as send_err:
            pass
        
        await websocket.close()

    except WebSocketDisconnect:
        return
    except Exception as e:
        import traceback
        traceback.print_exc()
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        finally:
            await websocket.close()

@app.post("/generate-script", response_model=VideoScriptResponse)
async def generate_script(request: VideoScriptRequest):
    """Generate a video script using Grok API based on the given topic."""
    if not os.getenv("XAI_API_KEY"):
        raise HTTPException(status_code=500, detail="XAI_API_KEY not configured")
    
    try:
        chat = client.chat.create(
            model="grok-4-1-fast",
            tools=[x_search(enable_image_understanding=True, enable_video_understanding=True)],
            include=["verbose_streaming"],
        )
        
        # System prompt
        chat.append(
            user("You are an expert video scriptwriter and researcher. Return ONLY valid JSON with this structure: {\"headline\": \"title\", \"summary\": \"2-3 sentence overview\", \"confirmed_facts\": [\"fact1\", \"fact2\", \"fact3\"], \"unconfirmed_claims\": [\"claim1\"], \"recent_changes\": [\"change1\"], \"watch_next\": [\"topic1\"], \"script\": \"full 2-5 minute video script\"}")
        )
        
        # User request
        chat.append(user(f"Generate content for topic: {request.topic}"))
        
        # Stream and collect response
        script_content = ""
        for response, chunk in chat.stream():
            if chunk.content:
                script_content += chunk.content
        
        return VideoScriptResponse(script=script_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating script: {str(e)}")

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)