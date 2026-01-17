import { BriefingData, BriefingTopic, BriefingLocation } from '../types';

const parseBriefing = (topic: BriefingTopic, content: string): BriefingData => {
    try {
        const parsed = JSON.parse(content);

        return {
            id: `briefing_${Date.now()}`,
            topic,
            generated_at: new Date().toISOString(),
            headline: parsed.headline || "Briefing Generated",
            summary: parsed.summary || "",
            status: "confirmed",
            video_url: "",
            script: {
                headline: parsed.headline || topic,
                confirmed_facts: parsed.confirmed_facts || [],
                unconfirmed_claims: parsed.unconfirmed_claims || [],
                recent_changes: parsed.recent_changes || [],
                watch_next: parsed.watch_next || []
            },
            sources: (parsed.sources || []).map((source: any, idx: number) => ({
                account_handle: source.account_handle || `@user_${Math.random().toString(36).substr(2, 9)}`,
                display_name: source.display_name || "Briefing Source",
                excerpt: source.excerpt || parsed.confirmed_facts?.[idx] || "",
                time_ago: source.time_ago || "just now",
                post_url: source.post_url || "https://x.com",
                profile_image_url: source.profile_image_url || undefined,
                label: source.label || "official"
            })).slice(0, 5),
            media: (parsed.media || []).map((item: any) => ({
                url: item.url || "",
                type: item.type || "image",
                caption: item.caption || "Related content",
                sourceUrl: item.sourceUrl || undefined
            })).slice(0, 6),
            audio_url: parsed.audio_url || ""
        };
    } catch (e) {
        return {
            id: `briefing_${Date.now()}`,
            topic,
            generated_at: new Date().toISOString(),
            headline: topic,
            summary: content || "Generated briefing from Grok AI",
            status: "confirmed",
            video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            script: {
                headline: topic,
                confirmed_facts: [content || "Content generated"],
                unconfirmed_claims: [],
                recent_changes: [],
                watch_next: []
            },
            sources: []
        };
    }
};

export const generateScript = async (topic: string): Promise<BriefingData> => {
    try {
        const response = await fetch('http://localhost:8000/generate-script', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ topic }),
        });

        if (!response.ok) {
            throw new Error(`Failed to generate script: ${response.statusText}`);
        }

        const data = await response.json();

        // Ensure parsing consistency
        return parseBriefing('tech' as BriefingTopic, data.script);

    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};

export const generateBriefing = async (topic: BriefingTopic): Promise<BriefingData> => {
    try {
        const response = await fetch('http://localhost:8000/generate-briefing', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ topic }),
        });

        if (!response.ok) {
            throw new Error(`Failed to generate briefing: ${response.statusText}`);
        }

        const data = await response.json();
        const briefing = parseBriefing(topic, data.script);

        // Add audio URL if present (from the backend response, not the inner script JSON)
        if (data.audio_url) {
            briefing.audio_url = data.audio_url;
        }

        return briefing;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};

export const streamBriefing = (
    topic: BriefingTopic,
    location: BriefingLocation,
    handlers: {
        onChunk?: (chunk: string) => void;
        onResult?: (data: BriefingData) => void;
        onError?: (message: string) => void;
    }
) => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.hostname || 'localhost';
    const ws = new WebSocket(`${protocol}://${host}:8000/ws/briefing`);

    ws.onopen = () => {
        handlers.onChunk?.('Connected. Warming up Grok...\n');
        ws.send(JSON.stringify({ topic, location }));
    };

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'chunk' && msg.content) {
                // Don't show raw JSON chunks
            } else if (msg.type === 'thinking' && msg.content) {
                handlers.onChunk?.(msg.content);
            } else if (msg.type === 'tool' && msg.content) {
                handlers.onChunk?.(msg.content);
            } else if (msg.type === 'status' && msg.content) {
                handlers.onChunk?.(msg.content);
            } else if (msg.type === 'result') {
                const briefing = parseBriefing(topic, msg.content || '');
                handlers.onResult?.(briefing);
            } else if (msg.type === 'audio_ready') {  // ✅ NEW
                // Update the briefing with audio URL
                handlers.onChunk?.(`\n✅ Audio ready!\n`);
                // You'll need to pass this back or update state
                // For now, you could emit a custom event or callback
            } else if (msg.type === 'error') {
                handlers.onError?.(msg.message || 'Unknown error');
            }
        } catch (e) {
            handlers.onError?.('Failed to parse streaming message');
        }
    };

    ws.onerror = () => {
        handlers.onError?.('WebSocket error');
    };

    ws.onclose = () => {
        // Notify only if nothing arrived
        handlers.onChunk?.('Connection closed.');
    };

    return () => ws.close();
};