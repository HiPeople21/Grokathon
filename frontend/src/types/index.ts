export type BriefingTopic = 'general' | 'tech' | 'financial-markets' | 'sports' | 'entertainment';

export type BriefingLocation = 'worldwide' | 'united-states' | 'canada' | 'mexico' | 'brazil' | 'argentina' | 'colombia' | 'chile' | 'peru' | 'venezuela' | 'ecuador' | 'bolivia' | 'paraguay' | 'uruguay' | 'costa-rica' | 'panama' | 'cuba' | 'dominican-republic' | 'guatemala' | 'honduras' | 'el-salvador' | 'nicaragua' | 'jamaica' | 'haiti' | 'united-kingdom' | 'germany' | 'france' | 'italy' | 'spain' | 'poland' | 'netherlands' | 'belgium' | 'switzerland' | 'austria' | 'sweden' | 'norway' | 'denmark' | 'finland' | 'ireland' | 'portugal' | 'greece' | 'czech-republic' | 'romania' | 'hungary' | 'ukraine' | 'russia' | 'turkey' | 'serbia' | 'croatia' | 'bulgaria' | 'slovakia' | 'slovenia' | 'estonia' | 'latvia' | 'lithuania' | 'iceland' | 'china' | 'japan' | 'india' | 'south-korea' | 'indonesia' | 'thailand' | 'vietnam' | 'philippines' | 'malaysia' | 'singapore' | 'pakistan' | 'bangladesh' | 'myanmar' | 'sri-lanka' | 'cambodia' | 'laos' | 'nepal' | 'mongolia' | 'taiwan' | 'hong-kong' | 'uae' | 'saudi-arabia' | 'israel' | 'iran' | 'iraq' | 'qatar' | 'kuwait' | 'oman' | 'bahrain' | 'jordan' | 'lebanon' | 'yemen' | 'syria' | 'south-africa' | 'nigeria' | 'egypt' | 'kenya' | 'ethiopia' | 'ghana' | 'morocco' | 'algeria' | 'tunisia' | 'tanzania' | 'uganda' | 'zimbabwe' | 'libya' | 'sudan' | 'senegal' | 'cameroon' | 'ivory-coast' | 'angola' | 'mozambique' | 'madagascar' | 'botswana' | 'namibia' | 'zambia' | 'mali' | 'australia' | 'new-zealand' | 'fiji' | 'papua-new-guinea';

export type BriefingStatus = 'confirmed' | 'developing';

export interface VideoScript {
    script: string;
}

export interface Source {
    account_handle: string;
    display_name: string;
    excerpt: string;
    time_ago: string;
    post_url: string;
    profile_image_url?: string;
    label: 'eyewitness' | 'official' | 'journalist' | 'other';
}

export interface ScriptContent {
    headline: string;
    confirmed_facts: (string | { text: string; sourceUrl?: string })[];
    unconfirmed_claims: string[];
    recent_changes: string[];
    watch_next: string[];
}

export interface MediaItem {
    url: string;
    type: 'image' | 'video';
    caption: string;
    sourceUrl?: string;
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
    audio_url?: string;
    media?: MediaItem[];
}
