import React from 'react';
import { BriefingTopic } from '../types';
import { Loader2, Zap } from 'lucide-react';
import { clsx } from 'clsx';

interface BrieflyControlsProps {
    topic: BriefingTopic;
    setTopic: (topic: BriefingTopic) => void;
    onGenerate: () => void;
    isLoading: boolean;
    hasData: boolean;
}

export const BrieflyControls: React.FC<BrieflyControlsProps> = ({
    topic,
    setTopic,
    onGenerate,
    isLoading,
    hasData
}) => {
    return (
        <div className={clsx(
            "transition-all duration-700 ease-in-out flex flex-col items-center gap-6",
            hasData ? "mb-8 opacity-0 pointer-events-none absolute" : "mb-0 opacity-100 relative z-10"
        )}>

            {/* Logo / Header Area if no data */}
            {!hasData && (
                <div className="mb-12 text-center animate-fade-in">
                    <h1 className="text-6xl font-display font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-white text-glow">
                        Briefly
                    </h1>
                    <p className="text-gray-400 text-lg font-sans">
                        Button-driven real-time news briefings.
                    </p>
                </div>
            )}

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md animate-slide-up">

                <div className="relative flex-1">
                    <select
                        value={topic}
                        onChange={(e) => setTopic(e.target.value as BriefingTopic)}
                        disabled={isLoading}
                        className="w-full appearance-none glass-panel rounded-xl pl-4 pr-12 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer text-white [&>option]:bg-gray-900 [&>option]:text-gray-200"
                    >
                        <option value="global">Global Events</option>
                        <option value="tech">Technology</option>
                        <option value="markets">Markets</option>
                        <option value="sports">Sports</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        ▼
                    </div>
                </div>

                <button
                    onClick={onGenerate}
                    disabled={isLoading}
                    className="group relative flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="animate-spin w-5 h-5" />
                            <span>Scanning X...</span>
                        </>
                    ) : (
                        <>
                            <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span>Get Update</span>
                        </>
                    )}

                    {/* Shine effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </button>
            </div>

        </div>
    );
};
