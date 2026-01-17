import os
from dotenv import load_dotenv
import requests
import time
import json
from script_gen import generate_script
import subprocess
from pathlib import Path

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

# Create video directory if it doesn't exist
if not os.path.exists("videos"):
    os.makedirs("videos")

def build_video_prompt_for_segment(segment: dict, segment_number: int) -> str:
    """Build a prompt for a single segment (max 15 seconds)"""
    duration = segment["end_sec"] - segment["start_sec"]
    
    lines = []
    lines.append(f"Create a polished, modern news briefing video segment #{segment_number}.")
    lines.append("Style: clean broadcast graphics, minimal, professional, neutral tone. No sensational imagery.")
    lines.append("Format: 16:9, smooth transitions, subtle motion graphics, readable lower-thirds.")
    lines.append("IMPORTANT: Do not invent any facts. Use ONLY the provided narration text.")
    lines.append(f"Duration: {duration} seconds.")
    lines.append("")
    
    overlay = segment.get("overlay_text")
    overlay_line = f'On-screen text overlay: "{overlay}".' if overlay else "On-screen text overlay: none."
    
    lines.append(f"Video content:")
    lines.append(f"Visuals: {segment['visuals']}")
    lines.append(overlay_line)
    lines.append(f"Narration (voiceover): {segment['narration']}")
    lines.append("")
    lines.append("Audio: include ONLY the narration as a voiceover (no music). If music must be used, keep it extremely subtle and non-distracting.")
    lines.append("Text: ensure all on-screen text is large and readable. Use short phrases only.")
    
    return "\n".join(lines)


def generate_single_video(segment: dict, segment_number: int, max_duration: int = 15):
    """Generate a single video for one segment"""
    try:
        duration = segment["end_sec"] - segment["start_sec"]
        
        # Cap at max_duration
        if duration > max_duration:
            print(f"⚠️  Segment {segment_number} is {duration}s (max is {max_duration}s), capping to {max_duration}s")
            duration = max_duration
        
        # Initial request to generate video
        url = "https://api.x.ai/v1/videos/generations"
        prompt = build_video_prompt_for_segment(segment, segment_number)
        
        payload = {
            "prompt": prompt,
            "model": "grok-imagine-video-a2",
            "duration": duration
        }

        headers = {
            "Authorization": f"Bearer {XAI_API_KEY}",
            "Content-Type": "application/json",
        }

        print(f"\n{'='*60}")
        print(f"🎬 Generating video for Segment {segment_number}")
        print(f"   Duration: {duration}s")
        print(f"   Narration: {segment['narration'][:60]}...")
        print(f"{'='*60}")

        response = requests.post(url, json=payload, headers=headers)
        request_id = response.json()["request_id"]
        
        print(f"✓ Request ID: {request_id}")

        # Poll for status
        status_url = f"https://api.x.ai/v1/videos/{request_id}"
        
        max_wait_time = 180  # 3 minutes
        start_time = time.time()

        while True:
            if time.time() - start_time > max_wait_time:
                print(f"❌ Timeout: Video generation took too long")
                return None
            
            response = requests.get(status_url, headers=headers)
            data = response.json()
            status = data.get("status")
            
            print(f"   Status: {status if status else 'completed'}")
            
            if status is None:  # Video is ready
                video_url = data.get("video", {}).get("url")
                print(f"\n✅ Video {segment_number} ready!")
                print(f"🔗 URL: {video_url}\n")
                return video_url
            elif status == "failed":
                error_msg = data.get("error", "Unknown error")
                print(f"❌ Video generation failed: {error_msg}")
                return None
            elif status == "pending":
                print("   Still processing... checking again in 2 seconds")
                time.sleep(2)
            else:
                print(f"⚠️  Unknown status: {status}")
                return None
                
    except Exception as e:
        print(f"❌ Error generating video {segment_number}: {e}")
        import traceback
        traceback.print_exc()
        return None


def generate_videos(script_segments):
    """Generate a video for each segment in the script"""
    video_urls = []
    
    print(f"\n🎥 Starting video generation for {len(script_segments)} segments")
    print(f"{'='*60}\n")
    
    for i, segment in enumerate(script_segments, start=1):
        video_url = generate_single_video(segment, i)
        
        if video_url:
            video_urls.append({
                "segment": i,
                "url": video_url,
                "start_sec": segment["start_sec"],
                "end_sec": segment["end_sec"],
                "narration": segment["narration"]
            })
        else:
            print(f"⚠️  Skipping segment {i} due to error\n")
            video_urls.append(None)
    
    print(f"\n{'='*60}")
    print(f"✅ Generation complete!")
    print(f"{'='*60}\n")
    
    # Print summary
    successful = [v for v in video_urls if v is not None]
    print(f"Successfully generated: {len(successful)}/{len(script_segments)} videos\n")
    
    for video in successful:
        print(f"Segment {video['segment']} ({video['start_sec']}-{video['end_sec']}s):")
        print(f"  URL: {video['url']}")
        print(f"  Text: {video['narration'][:80]}...")
        print()
    
    return video_urls

def download_video(url: str, output_path: str):
    """Download a video from URL to local file"""
    print(f"  Downloading: {output_path}")
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    with open(output_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    
    print(f"  ✓ Downloaded: {output_path}")


def combine_videos(video_urls: list, output_filename: str = "final_video.mp4"):
    """Download and combine multiple videos into one"""
    
    # Filter out None entries (failed generations)
    valid_videos = [v for v in video_urls if v is not None]
    
    if not valid_videos:
        print("❌ No valid videos to combine")
        return None
    
    print(f"\n{'='*60}")
    print(f"🎬 Combining {len(valid_videos)} videos")
    print(f"{'='*60}\n")
    
    # Create temp directory for downloads
    temp_dir = Path("temp_videos")
    temp_dir.mkdir(exist_ok=True)
    
    # Download all videos
    downloaded_files = []
    for i, video in enumerate(valid_videos, start=1):
        try:
            filename = f"segment_{i:02d}.mp4"
            filepath = temp_dir / filename
            download_video(video["url"], str(filepath))
            downloaded_files.append(str(filepath))
        except Exception as e:
            print(f"❌ Failed to download segment {i}: {e}")
            continue
    
    if not downloaded_files:
        print("❌ No videos were downloaded successfully")
        return None
    
    # Create concat file for ffmpeg
    concat_file = temp_dir / "concat_list.txt"
    with open(concat_file, 'w') as f:
        for filepath in downloaded_files:
            # Use just the filename since we're running ffmpeg from temp_dir
            f.write(f"file '{Path(filepath).name}'\n")
    
    print(f"\n🔗 Merging {len(downloaded_files)} videos...")
    
    # Combine videos using ffmpeg
    output_path = str(Path("videos") / output_filename)
    Path("videos").mkdir(exist_ok=True)
    
    # Get absolute path for output
    abs_output_path = str(Path(output_path).absolute())
    
    try:
        # Use ffmpeg concat demuxer (fastest, no re-encoding)
        subprocess.run([
            'ffmpeg',
            '-f', 'concat',
            '-safe', '0',
            '-i', 'concat_list.txt',  # ✅ Just filename, not full path
            '-c', 'copy',  # Copy without re-encoding (fast)
            '-y',  # Overwrite output file
            abs_output_path  # ✅ Use absolute path for output
        ], check=True, cwd=str(temp_dir), capture_output=True, text=True)
        
        print(f"\n✅ Video combined successfully!")
        print(f"📁 Output: {output_path}\n")
        
        # Clean up temp files
        print("🧹 Cleaning up temporary files...")
        for filepath in downloaded_files:
            os.remove(filepath)
        os.remove(concat_file)
        
        return output_path
        
    except subprocess.CalledProcessError as e:
        print(f"❌ FFmpeg error: {e.stderr}")
        
        # If copy fails, try with re-encoding
        print("\n⚠️  Copy failed, trying with re-encoding...")
        try:
            subprocess.run([
                'ffmpeg',
                '-f', 'concat',
                '-safe', '0',
                '-i', 'concat_list.txt',  # ✅ Just filename
                '-c:v', 'libx264',  # Re-encode video
                '-c:a', 'aac',      # Re-encode audio
                '-y',
                abs_output_path  # ✅ Use absolute path
            ], check=True, cwd=str(temp_dir), capture_output=True, text=True)
            
            print(f"\n✅ Video combined successfully (with re-encoding)!")
            print(f"📁 Output: {output_path}\n")
            
            # Clean up
            for filepath in downloaded_files:
                os.remove(filepath)
            os.remove(concat_file)
            
            return output_path
            
        except subprocess.CalledProcessError as e2:
            print(f"❌ Re-encoding also failed: {e2.stderr}")
            return None


# Main execution
# def generate_news_reporting_video(briefing_data):
    
#     print("Generating script from briefing...")
#     script = generate_script(briefing_data)
#     print(f"✓ Script generated with {len(script)} segments\n")

#     # Generate videos
#     video_urls = generate_videos(script)

#     # Combine all videos
#     final_video = combine_videos(video_urls, output_filename="news_briefing_final.mp4")

#     if final_video:
#         print(f"\n{'='*60}")
#         print(f"🎉 All done!")
#         print(f"{'='*60}")
#         print(f"Final video: {final_video}")
    
#     return final_video