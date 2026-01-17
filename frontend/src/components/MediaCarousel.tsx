import React, { useState } from 'react';
import { MediaItem } from '../types';
import { ChevronLeft, ChevronRight, Play, Image as ImageIcon } from 'lucide-react';
import { MediaModal } from './MediaModal';

export const MediaCarousel: React.FC<{ media: MediaItem[] }> = ({ media }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    if (!media || media.length === 0) return null;

    const current = media[currentIndex];
    const hasMultiple = media.length > 1;

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
    };

    const openModal = (index: number) => {
        setSelectedIndex(index);
    };

    return (
        <>
            <div className="mb-12">
                <h3 className="text-sm font-bold uppercase text-gray-500 tracking-wider mb-4">
                    Related Content
                </h3>
                
                <div className="relative bg-black rounded-2xl overflow-hidden border border-white/10 shadow-xl cursor-pointer" onClick={() => openModal(currentIndex)}>
                    {/* Media Display */}
                    <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-black flex items-center justify-center group">
                        {current.type === 'image' ? (
                            <img
                                src={current.url}
                                alt={current.caption}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const placeholder = e.currentTarget.nextElementSibling;
                                    if (placeholder) placeholder.classList.remove('hidden');
                                }}
                            />
                        ) : (
                            <video
                                src={current.url}
                                className="w-full h-full object-cover"
                                onError={() => {
                                    // Video failed to load
                                }}
                            />
                        )}

                        {/* Fallback Placeholder */}
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center hidden">
                            <div className="text-center">
                                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">Media unavailable</p>
                            </div>
                        </div>

                        {/* Play icon overlay for videos */}
                        {current.type === 'video' && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-16 h-16 text-white fill-current" />
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        {hasMultiple && (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePrev();
                                    }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all flex items-center justify-center text-white z-10"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleNext();
                                    }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all flex items-center justify-center text-white z-10"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            </>
                        )}

                        {/* Counter */}
                        {hasMultiple && (
                            <div className="absolute bottom-4 right-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur text-sm text-white/80">
                                {currentIndex + 1} / {media.length}
                            </div>
                        )}
                    </div>

                    {/* Caption */}
                    <div className="p-4 bg-gradient-to-t from-black/40 to-transparent">
                        <p className="text-sm text-gray-200">{current.caption}</p>
                        <p className="text-xs text-gray-500 mt-2">Click to expand</p>
                    </div>

                    {/* Thumbnails */}
                    {hasMultiple && (
                        <div className="flex gap-2 p-3 bg-black/30 overflow-x-auto">
                            {media.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentIndex(idx);
                                    }}
                                    className={`relative shrink-0 w-16 h-12 rounded-lg overflow-hidden transition-all border-2 ${
                                        idx === currentIndex
                                            ? 'border-blue-500 scale-105'
                                            : 'border-white/20 hover:border-white/40'
                                    }`}
                                >
                                    {item.type === 'image' ? (
                                        <img
                                            src={item.url}
                                            alt={item.caption}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <>
                                            <video
                                                src={item.url}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <Play size={12} className="text-white fill-current" />
                                            </div>
                                        </>
                                    )}
                                    {/* Fallback for broken thumbs */}
                                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center text-gray-500 hidden">
                                        <ImageIcon size={16} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {selectedIndex !== null && (
                <MediaModal
                    media={media}
                    initialIndex={selectedIndex}
                    onClose={() => setSelectedIndex(null)}
                />
            )}
        </>
    );
};
