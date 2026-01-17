import json
import os
from dotenv import load_dotenv
from xai_sdk import Client
from xai_sdk.chat import user, system

load_dotenv()

client = Client(
    api_key=os.getenv("XAI_API_KEY"),
    timeout=3600,
)

SYSTEM_PROMPT = """
You are a senior broadcast news producer and video director.

Your task is to convert structured news data into a timed production script
for a 60–90 second news briefing video.

Rules:
- Output MUST be valid JSON and nothing else.
- Total runtime must be between 60 and 90 seconds.
- Break the video into 5–8 chronological segments.
- Each segment must include:
  - start_sec (integer)
  - end_sec (integer)
  - narration (spoken voiceover text)
  - visuals (clear, concrete instructions for what appears on screen)
  - overlay_text (short on-screen text, optional)

Editorial rules:
- Neutral, professional, news-style tone.
- Clearly distinguish CONFIRMED facts from UNCONFIRMED or DEVELOPING claims.
- Do NOT invent facts beyond the provided data.
- Visual instructions should be feasible for AI image/video generation
  (maps, timelines, text cards, simple animations).
- Avoid vague visuals like “something dramatic”.
- Do not mention JSON, fields, or internal processing in narration.
"""


def build_user_prompt(info: dict) -> str:
    return f"""
You are given verified, structured information about current global events.

Use ONLY the information below.

HEADLINE:
{info["headline"]}

SUMMARY:
{info["summary"]}

CONFIRMED FACTS:
- """ + "\n- ".join(info["confirmed_facts"]) + """

UNCONFIRMED / DEVELOPING CLAIMS:
- """ + ("\n- ".join(info["unconfirmed_claims"]) if info["unconfirmed_claims"] else "None") + """

RECENT CHANGES:
- """ + ("\n- ".join(info["recent_changes"]) if info["recent_changes"] else "None") + """

WHAT TO WATCH NEXT:
- """ + ("\n- ".join(info["watch_next"]) if info["watch_next"] else "None") + """

TASK:
Create a timed production script for a 60–90 second news briefing video.

Requirements:
- Use 5–8 segments total.
- The first segment should be a headline / opening visual.
- Middle segments should cover confirmed facts, then unconfirmed claims (clearly labelled).
- Include at least one segment highlighting RECENT CHANGES.
- End with a “what to watch next” closing segment.
- Ensure timestamps are continuous and non-overlapping.
- Each segment should last 8–15 seconds.

Visual guidelines:
- Use maps for geography-related stories.
- Use timelines for evolving events.
- Use simple text cards for labels like “CONFIRMED” or “DEVELOPING”.
- Do not reference source URLs on screen.

Return ONLY valid JSON.
"""

def generate_script(info: dict) -> str:
    chat = client.chat.create(model="grok-4")
    chat.append(system(SYSTEM_PROMPT))
    chat.append(user(build_user_prompt(info)))
    response = chat.sample()
    result = json.loads(response.content)
    if type(result) == dict:
        if result.get("segments"):
            return result.get("segments")
        else:
            return ""
    else:
        return result