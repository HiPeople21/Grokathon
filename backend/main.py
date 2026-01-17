import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from xai_sdk import Client
from xai_sdk.chat import user
from xai_sdk.tools import x_search
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
                        print(f"DEBUG: Filtered X video: {url[:60]}...", file=sys.stderr, flush=True)
                        continue
                
                filtered_media.append(item)
            data["media"] = filtered_media
        return json.dumps(data)
    except Exception as e:
        print(f"DEBUG: Error filtering X videos: {e}", file=sys.stderr, flush=True)
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

client = Client(api_key=os.getenv("XAI_API_KEY"))
executor = ThreadPoolExecutor(max_workers=4)

class VideoScriptRequest(BaseModel):
    topic: str

class VideoScriptResponse(BaseModel):
    script: str

class BriefingRequest(BaseModel):
    topic: str

class BriefingResponse(BaseModel):
    script: str

@app.post("/generate-briefing", response_model=BriefingResponse)
async def generate_briefing(request: BriefingRequest):
    """Generate a news briefing using Grok API based on the given topic."""
    if not os.getenv("XAI_API_KEY"):
        raise HTTPException(status_code=500, detail="XAI_API_KEY not configured")
    
    try:
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
  "confirmed_facts": ["fact1", "fact2", "fact3"],
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
        
        # User request
        chat.append(user(f"Generate a news briefing for: {request.topic}"))
        
        # Stream and collect response
        content = ""
        for response, chunk in chat.stream():
            if chunk.content:
                content += chunk.content

        print(content)
        
        # Filter out X videos before returning
        content = filter_x_videos(content)
        
        return BriefingResponse(script=content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating briefing: {str(e)}")


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

        print(f"DEBUG: Starting briefing generation for '{topic}' in {location}", file=sys.stderr, flush=True)
        
        # Send status that we're starting generation
        await websocket.send_json({
            "type": "status",
            "content": f"Starting briefing generation for '{topic}' ({location})..."
        })

        # Run blocking chat.stream() in thread pool
        def run_briefing():
            print(f"DEBUG: In thread, creating chat", file=sys.stderr, flush=True)
            chat = client.chat.create(
                model="grok-4-1-fast",
                tools=[x_search(enable_image_understanding=True, enable_video_understanding=True)],
                include=["verbose_streaming"],
            )

            # System prompt for briefing
            prompt_text = f"""You are a news analyst covering news from {location}. Search X for images about {location}. Return ONLY valid JSON with this structure:
{{
  "headline": "engaging title",
  "summary": "2-3 sentence overview",
  "confirmed_facts": ["fact1", "fact2", "fact3"],
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

            # User request
            chat.append(user(f"Generate a news briefing for: {topic}"))

            # Stream and collect response
            content = ""
            thinking_emitted = False
            tool_searches = set()
            print(f"DEBUG: Starting stream", file=sys.stderr, flush=True)
            for response, chunk in chat.stream():
                has_reasoning = getattr(response, "usage", None) and getattr(response.usage, "reasoning_tokens", None)
                has_content = bool(chunk.content)
                reasoning_count = getattr(response.usage, "reasoning_tokens", 0) if has_reasoning else 0
                print(f"DEBUG: Got chunk, reasoning={reasoning_count}, content_len={len(chunk.content) if has_content else 0}", file=sys.stderr, flush=True)
                
                # Emit high-level thinking message only once
                if has_reasoning and not thinking_emitted:
                    print(f"DEBUG: Emitting thinking message", file=sys.stderr, flush=True)
                    thinking_emitted = True
                    yield {
                        "type": "thinking",
                        "content": f"🤔 Analyzing the topic and searching for current information...\n"
                    }

                # Surface server-side tool calls as they happen with friendly messages
                for tool_call in chunk.tool_calls:
                    tool_name = tool_call.function.name
                    if tool_name not in tool_searches:
                        tool_searches.add(tool_name)
                        print(f"DEBUG: Tool call: {tool_name}", file=sys.stderr, flush=True)
                        # Show tool details in human-readable format
                        try:
                            args = json.loads(tool_call.function.arguments) if isinstance(tool_call.function.arguments, str) else tool_call.function.arguments
                            if isinstance(args, dict):
                                query = args.get("query", args.get("q", ""))
                                if query:
                                    # Clean up query - show first 50 chars or full if shorter
                                    display_query = query[:60] + "..." if len(query) > 60 else query
                                    
                                    # Map tool names to friendly descriptions
                                    if "semantic" in tool_name:
                                        yield {
                                            "type": "tool",
                                            "content": f"📚 Finding related sources on: {display_query}\n"
                                        }
                                    elif "keyword" in tool_name:
                                        yield {
                                            "type": "tool",
                                            "content": f"🔎 Searching keywords: {display_query}\n"
                                        }
                                    else:
                                        yield {
                                            "type": "tool",
                                            "content": f"🔍 Searching for: {display_query}\n"
                                        }
                                else:
                                    yield {
                                        "type": "tool",
                                        "content": f"🔍 Gathering current information...\n"
                                    }
                            else:
                                yield {
                                    "type": "tool",
                                    "content": f"⚙️ Processing information...\n"
                                }
                        except Exception as e:
                            print(f"DEBUG: Could not parse tool args: {e}", file=sys.stderr, flush=True)
                            yield {
                                "type": "tool",
                                "content": f"⚙️ Processing information...\n"
                            }

                # Send generated content chunks
                if has_content:
                    content += chunk.content
                    print(f"DEBUG: Emitting content chunk, total={len(content)}", file=sys.stderr, flush=True)
                    yield {
                        "type": "chunk",
                        "content": chunk.content
                    }
            
            print(f"DEBUG: Stream complete, final content length={len(content)}", file=sys.stderr, flush=True)
            # Filter out X videos before sending result
            filtered_content = filter_x_videos(content)
            yield {
                "type": "result",
                "content": filtered_content
            }

        # Stream results back to client
        import asyncio
        loop = asyncio.get_event_loop()
        
        # Run the blocking generator in a thread pool
        def gen_wrapper():
            for message in run_briefing():
                yield message
        
        try:
            for message in gen_wrapper():
                if websocket.client_state.value == 1:  # CONNECTED
                    await websocket.send_json(message)
                    # Give the event loop a chance to process other tasks
                    await asyncio.sleep(0)
        except Exception as send_err:
            print(f"DEBUG: Error sending message: {send_err}", file=sys.stderr, flush=True)
        
        await websocket.close()

    except WebSocketDisconnect:
        print("DEBUG: WebSocket disconnected", file=sys.stderr, flush=True)
        return
    except Exception as e:
        print(f"DEBUG: Error in websocket: {str(e)}", file=sys.stderr, flush=True)
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