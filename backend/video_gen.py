import os
from dotenv import load_dotenv
import requests
import time
import json
from script_gen import generate_script

load_dotenv()

XAI_API_KEY = os.getenv("XAI_API_KEY")

# REFER TO THESE DOCS THAT XAI TEAM SENT
# curl -X POST 'https://api.x.ai/v1/videos/generations' \
#     -H 'Content-Type: application/json' \
#     -H "Authorization: Bearer $XAI_API_KEY" \
#     --data '{
#     "prompt": "A cat playing with a ball of yarn",
#     "model": "grok-imagine-video-a2"
# }'

# curl -X GET https://api.x.ai/v1/videos/{request_id} \
#     -H "Authorization: Bearer $XAI_API_KEY"

def build_video_prompt(segments: list[dict]) -> str:
    total = segments[-1]["end_sec"] if segments else 60

    print(total)

    lines = []
    lines.append("Create a polished, modern news briefing video.")
    lines.append("Style: clean broadcast graphics, minimal, professional, neutral tone. No sensational imagery.")
    lines.append("Format: 16:9, smooth transitions, subtle motion graphics, readable lower-thirds.")
    lines.append("IMPORTANT: Do not invent any facts. Use ONLY the provided narration text. Do not add new claims, numbers, or named entities.")
    lines.append(f"Target length: {total} seconds.")
    lines.append("")
    lines.append("Video plan (time-coded shots):")

    for i, s in enumerate(segments, start=1):
        overlay = s.get("overlay_text")
        overlay_line = f'On-screen text overlay: "{overlay}".' if overlay else "On-screen text overlay: none."

        lines.append(
            f"{i}. {s['start_sec']}–{s['end_sec']}s: "
            f"Visuals: {s['visuals']} "
            f"{overlay_line} "
            f"Narration (voiceover): {s['narration']}"
        )

    lines.append("")
    lines.append("Audio: include ONLY the narration as a voiceover (no music). If music must be used, keep it extremely subtle and non-distracting.")
    lines.append("Text: ensure all on-screen text is large and readable. Use short phrases only.")
    lines.append("Transitions: quick crossfades or slide transitions between segments.")

    prompt = "\n".join(lines)

    return prompt


def generate_video(script_json):
    try:
        # Initial request to generate video
        url = "https://api.x.ai/v1/videos/generations"
        payload = {
            "prompt": build_video_prompt(script_json),
            "model": "grok-imagine-video-a2"
        }

        headers = {
            "Authorization": f"Bearer {XAI_API_KEY}",
            "Content-Type": "application/json",
        }

        response = requests.post(url, json=payload, headers=headers)
        request_id = response.json()["request_id"]
        
        print(f"Video generation started. Request ID: {request_id}")

        # Poll for status
        status_url = f"https://api.x.ai/v1/videos/{request_id}"
        headers = {
            "Authorization": f"Bearer {XAI_API_KEY}",
        }

        max_wait_time = 180  # 3 minutes
        start_time = time.time()

        while True:
            if time.time() - start_time > max_wait_time:
                print("Timeout: Video generation took too long")
                return None
            
            response = requests.get(status_url, headers=headers)
            data = response.json()
            status = data.get("status")
            
            print(f"Status: {status}")
            
            if status == None:
                video_url = data.get("video").get("url")
                print(f"Video ready! URL: {video_url}")
                return video_url
            elif status == "failed":
                print(f"Video generation failed: {data.get('error')}")
                return None
            elif status == "pending":
                print("Still processing... checking again in 2 seconds")
                time.sleep(2)
            else:
                print(f"Unknown status: {status}")
                return None
                
    except Exception as e:
        print(f"Error: {e}")
        return None

with open("test_json.json", "r") as f:
    data = json.load(f)
script = generate_script(data)
print(script)

generate_video(script)