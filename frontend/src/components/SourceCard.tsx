import React from 'react';
import { Source } from '../types';
import { ExternalLink, Twitter } from 'lucide-react';

export const SourceCard: React.FC<{ source: Source }> = ({ source }) => {
    return (
        <a
            href={source.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-panel p-4 rounded-xl hover:bg-white/10 transition-colors group flex flex-col gap-3"
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <Twitter size={16} />
                    </div>
                    <div>
                        <div className="font-semibold text-sm text-gray-200">{source.display_name}</div>
                        <div className="text-xs text-gray-500">{source.account_handle}</div>
                    </div>
                </div>
                <span className="text-xs text-gray-500 font-mono">{source.time_ago}</span>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">
                "{source.excerpt}"
            </p>

            <div className="mt-auto pt-2 flex items-center gap-2 text-xs text-blue-400/80 group-hover:text-blue-400 transition-colors">
                <span>View Post</span>
                <ExternalLink size={12} />
            </div>
        </a>
    );
};
