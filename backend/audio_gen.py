import asyncio
import json
import os
import base64
import websockets
from script_gen import generate_script
from dotenv import load_dotenv

load_dotenv()

XAI_API_KEY = os.getenv("XAI_API_KEY")
base_url = "wss://api.x.ai/v1/realtime"

# Create audio directory if it doesn't exist
if not os.path.exists("audio"):
    os.makedirs("audio")

async def text_to_speech(text: str, voice: str = "Ara"):
    """Convert text to speech using Grok Voice API"""
    
    audio_chunks = []
    
    async with websockets.connect(
        uri=base_url,
        ssl=True,
        additional_headers={"Authorization": f"Bearer {XAI_API_KEY}"}
    ) as ws:
        
        # Configure session with desired voice
        session_config = {
            "type": "session.update",
            "session": {
                "voice": voice,  # Options: Ara, Rex, Sal, Eve, Leo
                "instructions": "You are a text-to-speech assistant. Read the text exactly as provided.",
                "turn_detection": {"type": "server_vad"},
                "audio": {
                    "input": {"format": {"type": "audio/pcm", "rate": 24000}},
                    "output": {"format": {"type": "audio/pcm", "rate": 24000}}
                }
            }
        }
        await ws.send(json.dumps(session_config))
        
        # Send the text to convert
        text_message = {
            "type": "conversation.item.create",
            "item": {
                "type": "message",
                "role": "user",
                "content": [{"type": "input_text", "text": text}]
            }
        }
        await ws.send(json.dumps(text_message))
        
        # Request response
        response_request = {
            "type": "response.create",
            "response": {
                "modalities": ["audio"]  # Only audio, no text needed
            }
        }
        await ws.send(json.dumps(response_request))
        
        # Collect audio chunks
        response_done = False
        while not response_done:
            message = await ws.recv()
            event = json.loads(message)
            
            if event["type"] == "response.output_audio.delta":
                # Collect base64 audio chunks
                audio_chunks.append(event["delta"])
                print(".", end="", flush=True)
            
            elif event["type"] == "response.output_audio.done":
                response_done = True
                print("\nAudio generation complete!")
            
            elif event["type"] == "error":
                print(f"Error: {event}")
                break
    
    # Combine all audio chunks
    full_audio_base64 = "".join(audio_chunks)
    audio_bytes = base64.b64decode(full_audio_base64)
    
    return audio_bytes

# Usage
async def generate_audio(script: list, output_filename: str = "output.wav") -> str:
    """
    Generates audio from the script and saves it to the specified filename in the audio/ directory.
    Returns the relative path to the audio file.
    """
    full_script = ""
    for item in script:
        full_script += item["narration"] + " "
        
    audio_data = await text_to_speech(full_script, voice="Ara")
    
    # Ensure audio directory exists
    if not os.path.exists("audio"):
        os.makedirs("audio")
        
    file_path = os.path.join("audio", output_filename)
    
    # Save to file
    import wave
    with wave.open(file_path, "wb") as wav:
        wav.setnchannels(1)  # Mono
        wav.setsampwidth(2)  # 16-bit
        wav.setframerate(24000)  # 24kHz
        wav.writeframes(audio_data)
    
    print(f"Audio saved to {file_path}")
    return f"/audio/{output_filename}"