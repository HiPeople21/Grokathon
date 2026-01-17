import { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { BrieflyControls } from './components/BrieflyControls';
import { BrieflyView } from './components/BrieflyView';
import { streamBriefing } from './services/api';
import { BriefingData, BriefingTopic, BriefingLocation } from './types';
import { clsx } from 'clsx';

function App() {
    const [topic, setTopic] = useState<BriefingTopic>('general');
    const [location, setLocation] = useState<BriefingLocation>('worldwide');
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<BriefingData | null>(null);
    const [streamLog, setStreamLog] = useState('');
    const [stopStream, setStopStream] = useState<(() => void) | null>(null);
    const [showThinking, setShowThinking] = useState(true);
    const [generateAudio, setGenerateAudio] = useState(true);
    const [generateVideo, setGenerateVideo] = useState(false);
    const thinkingPanelRef = useRef<HTMLDivElement>(null);

    // Auto-scroll thinking panel to bottom when new messages arrive
    useEffect(() => {
        if (thinkingPanelRef.current) {
            thinkingPanelRef.current.scrollTop = thinkingPanelRef.current.scrollHeight;
        }
    }, [streamLog]);

    const handleGenerate = async () => {
        if (stopStream) {
            stopStream();
            setStopStream(null);
        }
        setIsLoading(true);
        setStreamLog('');
        try {
            const cancel = streamBriefing(topic, location, {
                generateAudio,
                generateVideo,
                onChunk: (chunk) => {
                    // Force immediate DOM update for each message
                    flushSync(() => setStreamLog((prev) => prev + chunk));
                },
                onResult: (result) => {
                    flushSync(() => setData(result));
                    setIsLoading(false);
                    setStreamLog('');
                    setStopStream(null);
                },
                onError: (msg) => {
                    console.error("Streaming error", msg);
                    alert(msg);
                    setIsLoading(false);
                    setStopStream(null);
                }
            });
            setStopStream(() => cancel);
        } catch (error) {
            console.error("Failed to stream briefing", error);
            setIsLoading(false);
        }
    };

    const resetApp = () => {
        setData(null);
        setStreamLog('');
        if (stopStream) {
            stopStream();
            setStopStream(null);
        }
    };

    return (
        <div className="min-h-screen bg-background relative overflow-x-hidden selection:bg-blue-500/30">

            {/* Dynamic Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute -top-[10%] left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute top-[20%] right-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[400px] bg-blue-900/5 rounded-full blur-[100px]" />
            </div>

            <div className={clsx(
                "relative z-10 min-h-screen transition-all duration-700 p-6 flex flex-col",
                data ? "justify-start pt-12" : "justify-center items-center"
            )}>

                {/* Top Controls Bar (When data exists) */}
                <div className={clsx(
                    "w-full max-w-4xl mx-auto flex justify-between items-center mb-12 transition-all duration-500",
                    data ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10 absolute pointer-events-none"
                )}>
                    <div
                        className="text-xl font-display font-bold cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={resetApp}
                    >
                        Briefly
                    </div>
                    <button
                        onClick={resetApp}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        New Search
                    </button>
                </div>

                <BrieflyControls
                    topic={topic}
                    setTopic={setTopic}
                    location={location}
                    setLocation={setLocation}
                    onGenerate={handleGenerate}
                    isLoading={isLoading}
                    hasData={!!data}
                    generateAudio={generateAudio}
                    setGenerateAudio={setGenerateAudio}
                    generateVideo={generateVideo}
                    setGenerateVideo={setGenerateVideo}
                />
                {(isLoading || streamLog) && !data && (
                    <div className="w-full max-w-4xl mx-auto my-6">
                        <button
                            onClick={() => setShowThinking(!showThinking)}
                            className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400 hover:text-gray-300 transition-colors mb-2 font-semibold"
                        >
                            <span>{showThinking ? '▼' : '▶'}</span>
                            <span>✨ AI Thinking Process</span>
                        </button>
                        {showThinking && (
                            <div ref={thinkingPanelRef} className="thinking-panel glass-panel p-4 text-sm text-gray-300 rounded-xl border border-white/10 max-h-48 overflow-y-auto space-y-1" style={{ fontFamily: 'monospace', fontSize: '0.875rem', lineHeight: '1.5' }}>
                                {streamLog ? (
                                    streamLog.split('\n').map((line, i) => (
                                        line.trim() && <div key={i}>{line}</div>
                                    ))
                                ) : (
                                    <div className="text-gray-500 italic">Connecting...</div>
                                )}
                            </div>
                        )}
                    </div>
                )}
                {data && <BrieflyView data={data} />}

            </div>
        </div>
    );
}

export default App;
