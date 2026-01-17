export type BriefingTopic = 'global' | 'tech' | 'markets' | 'sports';

export type BriefingStatus = 'confirmed' | 'developing';

export interface Source {
    account_handle: string;
    display_name: string;
    excerpt: string;
    time_ago: string;
    post_url: string;
    label: 'eyewitness' | 'official' | 'journalist' | 'other';
}

export interface ScriptContent {
    headline: string;
    confirmed_facts: string[];
    unconfirmed_claims: string[];
    recent_changes: string[];
    watch_next: string[];
}

export interface BriefingData {
    id: string;
    topic: BriefingTopic;
    generated_at: string;
    headline: string;
    summary: string;
    status: BriefingStatus;
    video_url: string; // URL to video file
    script: ScriptContent;
    sources: Source[];
}
