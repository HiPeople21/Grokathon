import { BriefingData, BriefingTopic, BriefingLocation } from '../types';


export const generateScript = async (topic: string): Promise<BriefingData> => {
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
    
    try {
        // Parse the JSON response from Grok
        const parsed = JSON.parse(data.script);
        
        // Transform into BriefingData structure
        return {
            id: `briefing_${Date.now()}`,
            topic: 'tech' as BriefingTopic,
            generated_at: new Date().toISOString(),
            headline: parsed.headline || topic,
            summary: parsed.summary || "Generated content from Grok AI",
            status: "confirmed",
            video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            script: {
                headline: parsed.headline || topic,
                confirmed_facts: parsed.confirmed_facts || [],
                unconfirmed_claims: parsed.unconfirmed_claims || [],
                recent_changes: parsed.recent_changes || [],
                watch_next: parsed.watch_next || []
            },
            sources: (parsed.sources || []).map((source: any) => ({
                account_handle: source.account_handle || `@user_${Math.random().toString(36).substr(2, 9)}`,
                display_name: source.display_name || "Source",
                excerpt: source.excerpt || "",
                time_ago: source.time_ago || "just now",
                post_url: source.post_url || "https://x.com",
                label: source.label || "official"
            })).slice(0, 5)
        };
    } catch (e) {
        // Fallback if JSON parsing fails
        return {
            id: `briefing_${Date.now()}`,
            topic: 'tech' as BriefingTopic,
            generated_at: new Date().toISOString(),
            headline: topic,
            summary: data.script || "Generated content from Grok AI",
            status: "confirmed",
            video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            script: {
                headline: topic,
                confirmed_facts: [data.script || "Content generated"],
                unconfirmed_claims: [],
                recent_changes: [],
                watch_next: []
            },
            sources: []
        };
    }
};

const parseBriefing = (topic: BriefingTopic, content: string): BriefingData => {
    try {
        const parsed = JSON.parse(content);

        return {
            id: `briefing_${Date.now()}`,
            topic,
            generated_at: new Date().toISOString(),
            headline: parsed.headline || topic,
            summary: parsed.summary || "Generated briefing from Grok AI",
            status: "confirmed",
            video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
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
            })).slice(0, 6)
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

export const generateBriefing = async (topic: BriefingTopic): Promise<BriefingData> => {
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
    return parseBriefing(topic, data.script);
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
                // Don't show raw JSON chunks in thinking - only show in final result
            } else if (msg.type === 'thinking' && msg.content) {
                handlers.onChunk?.(msg.content);
            } else if (msg.type === 'tool' && msg.content) {
                handlers.onChunk?.(msg.content);
            } else if (msg.type === 'status' && msg.content) {
                handlers.onChunk?.(msg.content);
            } else if (msg.type === 'result') {
                handlers.onResult?.(parseBriefing(topic, msg.content || ''));
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