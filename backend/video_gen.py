import os
from dotenv import load_dotenv
import requests
import time

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


def generate_video():
    try:
        # Initial request to generate video
        url = "https://api.x.ai/v1/videos/generations"
        payload = {
            "prompt": "A cat playing with a ball of yarn",
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

        max_wait_time = 120  # 2 minutes
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

generate_video()