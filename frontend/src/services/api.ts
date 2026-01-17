import { BriefingData, BriefingTopic } from '../types';

const MOCK_SOURCE_IMAGES = [
    "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&auto=format&fit=crop&q=60"
];

export const generateBriefing = async (topic: BriefingTopic): Promise<BriefingData> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    return {
        id: `briefing_${Date.now()}`,
        topic,
        generated_at: new Date().toISOString(),
        headline: "Global Markets Rally Following Tech Breakthrough",
        summary: "Major indices hit record highs as breakthrough in quantum computing stability is announced by leading consortium. Details remain sparse but initial confirmations suggest a viable path to commercialization by 2027.",
        status: "confirmed",
        video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", // Placeholder video
        script: {
            headline: "Quantum Leap for Global Markets",
            confirmed_facts: [
                "Consortium announces 99.9% stable qubits",
                "Nasdaq jumps 4% in pre-market trading",
                "Major tech stocks halted due to volatility"
            ],
            unconfirmed_claims: [
                "Rumors of government contract worth $50B",
                "Leaked internal memos suggest prototype exists"
            ],
            recent_changes: [
                "Official press conference scheduled for 2 PM EST"
            ],
            watch_next: [
                "Tech sector earnings reports later today"
            ]
        },
        sources: [
            {
                account_handle: "@tech_insider",
                display_name: "Tech Insider",
                excerpt: "Sources at the lab confirm the breakthrough is real. This changes everything.",
                time_ago: "12m ago",
                post_url: "#",
                label: "journalist"
            },
            {
                account_handle: "@market_watch",
                display_name: "Market Watch",
                excerpt: "Unprecedented volume in semiconductor stocks. The market is pricing in a massive shift.",
                time_ago: "5m ago",
                post_url: "#",
                label: "official"
            },
            {
                account_handle: "@deep_research",
                display_name: "Dr. Alice Chen",
                excerpt: "I've seen the data. The error correction rates are theoretically impossible, yet here we are.",
                time_ago: "2m ago",
                post_url: "#",
                label: "eyewitness"
            }
        ]
    };
};
