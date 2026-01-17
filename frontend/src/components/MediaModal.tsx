import React from 'react';
import { MediaItem } from '../types';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

interface MediaModalProps {
    media: MediaItem[];
    initialIndex: number;
    onClose: () => void;
}

export const MediaModal: React.FC<MediaModalProps> = ({ media, initialIndex, onClose }) => {
    const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
    const current = media[currentIndex];

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
    };

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowRight') handleNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="relative w-full h-full max-w-6xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button - Inside the modal */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all flex items-center justify-center text-white z-20"
                    title="Close (ESC)"
                >
                    <X size={24} />
                </button>

                {/* Media Display */}
                <div className="relative flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center">
                    {current.type === 'image' ? (
                        <img
                            src={current.url}
                            alt={current.caption}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                                e.currentTarget.alt = 'Image failed to load';
                            }}
                        />
                    ) : (
                        <video
                            key={current.url}
                            controls
                            autoPlay
                            className="max-w-full max-h-full object-contain"
                        >
                            <source src={current.url} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    )}

                    {/* Navigation Arrows */}
                    {media.length > 1 && (
                        <>
                            <button
                                onClick={handlePrev}
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all flex items-center justify-center text-white hover:scale-110"
                            >
                                <ChevronLeft size={32} />
                            </button>
                            <button
                                onClick={handleNext}
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all flex items-center justify-center text-white hover:scale-110"
                            >
                                <ChevronRight size={32} />
                            </button>
                        </>
                    )}

                    {/* Counter */}
                    {media.length > 1 && (
                        <div className="absolute bottom-6 right-6 px-4 py-2 rounded-full bg-black/60 backdrop-blur text-sm text-white/80 font-semibold">
                            {currentIndex + 1} / {media.length}
                        </div>
                    )}
                </div>

                {/* Caption */}
                <div className="mt-4 text-center">
                    <p className="text-lg text-gray-200">{current.caption}</p>
                    <div className="flex items-center justify-center gap-4 mt-3">
                        {current.sourceUrl && (
                            <a
                                href={current.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                View Source
                                <ExternalLink size={14} />
                            </a>
                        )}
                        {media.length > 1 && (
                            <p className="text-sm text-gray-400">Use arrow keys to navigate</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
