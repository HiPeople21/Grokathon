import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from xai_sdk import Client
from xai_sdk.chat import user
from xai_sdk.tools import x_search

load_dotenv()

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
        chat.append(
            user("You are a news analyst. Return ONLY valid JSON with this structure: {\"headline\": \"engaging title\", \"summary\": \"2-3 sentence overview\", \"confirmed_facts\": [\"fact1\", \"fact2\", \"fact3\"], \"unconfirmed_claims\": [\"claim1\", \"claim2\"], \"recent_changes\": [\"update1\"], \"watch_next\": [\"related_topic1\", \"related_topic2\"], \"sources\": [{\"account_handle\": \"@username\", \"display_name\": \"Full Name\", \"post_url\": \"https://x.com/...\", \"label\": \"official|journalist|eyewitness|other\"}]}")
        )
        
        # User request
        chat.append(user(f"Generate a news briefing for: {request.topic}"))
        
        # Stream and collect response
        content = ""
        for response, chunk in chat.stream():
            if chunk.content:
                content += chunk.content

        print(content)
        
        return BriefingResponse(script=content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating briefing: {str(e)}")

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