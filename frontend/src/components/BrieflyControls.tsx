import React from 'react';
import { BriefingTopic, BriefingLocation } from '../types';
import { Loader2, Zap, Film, Search } from 'lucide-react';
import { clsx } from 'clsx';

interface BrieflyControlsProps {
    topic: BriefingTopic;
    setTopic: (topic: BriefingTopic) => void;
    location: BriefingLocation;
    setLocation: (location: BriefingLocation) => void;
    onGenerate: () => void;
    isLoading: boolean;
    hasData: boolean;
    onSwitchToScript?: () => void;
}

export const BrieflyControls: React.FC<BrieflyControlsProps> = ({
    topic,
    setTopic,
    location,
    setLocation,
    onGenerate,
    isLoading,
    hasData,
    onSwitchToScript
}) => {
    const [countrySearch, setCountrySearch] = React.useState('');
    const [showCountryDropdown, setShowCountryDropdown] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowCountryDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const countries = [
        { value: 'worldwide', label: 'Worldwide', group: '' },
        // North America
        { value: 'united-states', label: '🇺🇸 United States', group: 'North America' },
        { value: 'canada', label: '🇨🇦 Canada', group: 'North America' },
        { value: 'mexico', label: '🇲🇽 Mexico', group: 'North America' },
        // Central America & Caribbean
        { value: 'costa-rica', label: '🇨🇷 Costa Rica', group: 'Central America & Caribbean' },
        { value: 'panama', label: '🇵🇦 Panama', group: 'Central America & Caribbean' },
        { value: 'cuba', label: '🇨🇺 Cuba', group: 'Central America & Caribbean' },
        { value: 'dominican-republic', label: '🇩🇴 Dominican Republic', group: 'Central America & Caribbean' },
        { value: 'guatemala', label: '🇬🇹 Guatemala', group: 'Central America & Caribbean' },
        { value: 'honduras', label: '🇭🇳 Honduras', group: 'Central America & Caribbean' },
        { value: 'el-salvador', label: '🇸🇻 El Salvador', group: 'Central America & Caribbean' },
        { value: 'nicaragua', label: '🇳🇮 Nicaragua', group: 'Central America & Caribbean' },
        { value: 'jamaica', label: '🇯🇲 Jamaica', group: 'Central America & Caribbean' },
        { value: 'haiti', label: '🇭🇹 Haiti', group: 'Central America & Caribbean' },
        // South America
        { value: 'brazil', label: '🇧🇷 Brazil', group: 'South America' },
        { value: 'argentina', label: '🇦🇷 Argentina', group: 'South America' },
        { value: 'colombia', label: '🇨🇴 Colombia', group: 'South America' },
        { value: 'chile', label: '🇨🇱 Chile', group: 'South America' },
        { value: 'peru', label: '🇵🇪 Peru', group: 'South America' },
        { value: 'venezuela', label: '🇻🇪 Venezuela', group: 'South America' },
        { value: 'ecuador', label: '🇪🇨 Ecuador', group: 'South America' },
        { value: 'bolivia', label: '🇧🇴 Bolivia', group: 'South America' },
        { value: 'paraguay', label: '🇵🇾 Paraguay', group: 'South America' },
        { value: 'uruguay', label: '🇺🇾 Uruguay', group: 'South America' },
        // Western Europe
        { value: 'united-kingdom', label: '🇬🇧 United Kingdom', group: 'Western Europe' },
        { value: 'germany', label: '🇩🇪 Germany', group: 'Western Europe' },
        { value: 'france', label: '🇫🇷 France', group: 'Western Europe' },
        { value: 'italy', label: '🇮🇹 Italy', group: 'Western Europe' },
        { value: 'spain', label: '🇪🇸 Spain', group: 'Western Europe' },
        { value: 'netherlands', label: '🇳🇱 Netherlands', group: 'Western Europe' },
        { value: 'belgium', label: '🇧🇪 Belgium', group: 'Western Europe' },
        { value: 'switzerland', label: '🇨🇭 Switzerland', group: 'Western Europe' },
        { value: 'austria', label: '🇦🇹 Austria', group: 'Western Europe' },
        { value: 'portugal', label: '🇵🇹 Portugal', group: 'Western Europe' },
        { value: 'ireland', label: '🇮🇪 Ireland', group: 'Western Europe' },
        // Northern Europe
        { value: 'sweden', label: '🇸🇪 Sweden', group: 'Northern Europe' },
        { value: 'norway', label: '🇳🇴 Norway', group: 'Northern Europe' },
        { value: 'denmark', label: '🇩🇰 Denmark', group: 'Northern Europe' },
        { value: 'finland', label: '🇫🇮 Finland', group: 'Northern Europe' },
        { value: 'iceland', label: '🇮🇸 Iceland', group: 'Northern Europe' },
        { value: 'estonia', label: '🇪🇪 Estonia', group: 'Northern Europe' },
        { value: 'latvia', label: '🇱🇻 Latvia', group: 'Northern Europe' },
        { value: 'lithuania', label: '🇱🇹 Lithuania', group: 'Northern Europe' },
        // Eastern Europe
        { value: 'poland', label: '🇵🇱 Poland', group: 'Eastern Europe' },
        { value: 'czech-republic', label: '🇨🇿 Czech Republic', group: 'Eastern Europe' },
        { value: 'romania', label: '🇷🇴 Romania', group: 'Eastern Europe' },
        { value: 'hungary', label: '🇭🇺 Hungary', group: 'Eastern Europe' },
        { value: 'ukraine', label: '🇺🇦 Ukraine', group: 'Eastern Europe' },
        { value: 'russia', label: '🇷🇺 Russia', group: 'Eastern Europe' },
        { value: 'bulgaria', label: '🇧🇬 Bulgaria', group: 'Eastern Europe' },
        { value: 'slovakia', label: '🇸🇰 Slovakia', group: 'Eastern Europe' },
        { value: 'slovenia', label: '🇸🇮 Slovenia', group: 'Eastern Europe' },
        { value: 'serbia', label: '🇷🇸 Serbia', group: 'Eastern Europe' },
        { value: 'croatia', label: '🇭🇷 Croatia', group: 'Eastern Europe' },
        // Southern Europe & Mediterranean
        { value: 'greece', label: '🇬🇷 Greece', group: 'Southern Europe & Mediterranean' },
        { value: 'turkey', label: '🇹🇷 Turkey', group: 'Southern Europe & Mediterranean' },
        // East Asia
        { value: 'china', label: '🇨🇳 China', group: 'East Asia' },
        { value: 'japan', label: '🇯🇵 Japan', group: 'East Asia' },
        { value: 'south-korea', label: '🇰🇷 South Korea', group: 'East Asia' },
        { value: 'taiwan', label: '🇹🇼 Taiwan', group: 'East Asia' },
        { value: 'hong-kong', label: '🇭🇰 Hong Kong', group: 'East Asia' },
        { value: 'mongolia', label: '🇲🇳 Mongolia', group: 'East Asia' },
        // South Asia
        { value: 'india', label: '🇮🇳 India', group: 'South Asia' },
        { value: 'pakistan', label: '🇵🇰 Pakistan', group: 'South Asia' },
        { value: 'bangladesh', label: '🇧🇩 Bangladesh', group: 'South Asia' },
        { value: 'sri-lanka', label: '🇱🇰 Sri Lanka', group: 'South Asia' },
        { value: 'nepal', label: '🇳🇵 Nepal', group: 'South Asia' },
        // Southeast Asia
        { value: 'indonesia', label: '🇮🇩 Indonesia', group: 'Southeast Asia' },
        { value: 'thailand', label: '🇹🇭 Thailand', group: 'Southeast Asia' },
        { value: 'vietnam', label: '🇻🇳 Vietnam', group: 'Southeast Asia' },
        { value: 'philippines', label: '🇵🇭 Philippines', group: 'Southeast Asia' },
        { value: 'malaysia', label: '🇲🇾 Malaysia', group: 'Southeast Asia' },
        { value: 'singapore', label: '🇸🇬 Singapore', group: 'Southeast Asia' },
        { value: 'myanmar', label: '🇲🇲 Myanmar', group: 'Southeast Asia' },
        { value: 'cambodia', label: '🇰🇭 Cambodia', group: 'Southeast Asia' },
        { value: 'laos', label: '🇱🇦 Laos', group: 'Southeast Asia' },
        // Middle East
        { value: 'uae', label: '🇦🇪 UAE', group: 'Middle East' },
        { value: 'saudi-arabia', label: '🇸🇦 Saudi Arabia', group: 'Middle East' },
        { value: 'israel', label: '🇮🇱 Israel', group: 'Middle East' },
        { value: 'iran', label: '🇮🇷 Iran', group: 'Middle East' },
        { value: 'iraq', label: '🇮🇶 Iraq', group: 'Middle East' },
        { value: 'qatar', label: '🇶🇦 Qatar', group: 'Middle East' },
        { value: 'kuwait', label: '🇰🇼 Kuwait', group: 'Middle East' },
        { value: 'oman', label: '🇴🇲 Oman', group: 'Middle East' },
        { value: 'bahrain', label: '🇧🇭 Bahrain', group: 'Middle East' },
        { value: 'jordan', label: '🇯🇴 Jordan', group: 'Middle East' },
        { value: 'lebanon', label: '🇱🇧 Lebanon', group: 'Middle East' },
        { value: 'yemen', label: '🇾🇪 Yemen', group: 'Middle East' },
        { value: 'syria', label: '🇸🇾 Syria', group: 'Middle East' },
        // North Africa
        { value: 'egypt', label: '🇪🇬 Egypt', group: 'North Africa' },
        { value: 'morocco', label: '🇲🇦 Morocco', group: 'North Africa' },
        { value: 'algeria', label: '🇩🇿 Algeria', group: 'North Africa' },
        { value: 'tunisia', label: '🇹🇳 Tunisia', group: 'North Africa' },
        { value: 'libya', label: '🇱🇾 Libya', group: 'North Africa' },
        { value: 'sudan', label: '🇸🇩 Sudan', group: 'North Africa' },
        // Sub-Saharan Africa
        { value: 'south-africa', label: '🇿🇦 South Africa', group: 'Sub-Saharan Africa' },
        { value: 'nigeria', label: '🇳🇬 Nigeria', group: 'Sub-Saharan Africa' },
        { value: 'kenya', label: '🇰🇪 Kenya', group: 'Sub-Saharan Africa' },
        { value: 'ethiopia', label: '🇪🇹 Ethiopia', group: 'Sub-Saharan Africa' },
        { value: 'ghana', label: '🇬🇭 Ghana', group: 'Sub-Saharan Africa' },
        { value: 'tanzania', label: '🇹🇿 Tanzania', group: 'Sub-Saharan Africa' },
        { value: 'uganda', label: '🇺🇬 Uganda', group: 'Sub-Saharan Africa' },
        { value: 'zimbabwe', label: '🇿🇼 Zimbabwe', group: 'Sub-Saharan Africa' },
        { value: 'senegal', label: '🇸🇳 Senegal', group: 'Sub-Saharan Africa' },
        { value: 'cameroon', label: '🇨🇲 Cameroon', group: 'Sub-Saharan Africa' },
        { value: 'ivory-coast', label: '🇨🇮 Ivory Coast', group: 'Sub-Saharan Africa' },
        { value: 'angola', label: '🇦🇴 Angola', group: 'Sub-Saharan Africa' },
        { value: 'mozambique', label: '🇲🇿 Mozambique', group: 'Sub-Saharan Africa' },
        { value: 'madagascar', label: '🇲🇬 Madagascar', group: 'Sub-Saharan Africa' },
        { value: 'botswana', label: '🇧🇼 Botswana', group: 'Sub-Saharan Africa' },
        { value: 'namibia', label: '🇳🇦 Namibia', group: 'Sub-Saharan Africa' },
        { value: 'zambia', label: '🇿🇲 Zambia', group: 'Sub-Saharan Africa' },
        { value: 'mali', label: '🇲🇱 Mali', group: 'Sub-Saharan Africa' },
        // Oceania
        { value: 'australia', label: '🇦🇺 Australia', group: 'Oceania' },
        { value: 'new-zealand', label: '🇳🇿 New Zealand', group: 'Oceania' },
        { value: 'fiji', label: '🇫🇯 Fiji', group: 'Oceania' },
        { value: 'papua-new-guinea', label: '🇵🇬 Papua New Guinea', group: 'Oceania' },
    ];

    const filteredCountries = countries.filter(country =>
        country.label.toLowerCase().includes(countrySearch.toLowerCase())
    );

    const selectedCountry = countries.find(c => c.value === location);

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
            <div className="flex flex-col gap-4 w-full max-w-md animate-slide-up">

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <select
                            value={topic}
                            onChange={(e) => setTopic(e.target.value as BriefingTopic)}
                            disabled={isLoading}
                            className="w-full appearance-none glass-panel rounded-xl pl-4 pr-12 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer text-white [&>option]:bg-gray-900 [&>option]:text-gray-200"
                        >
                            <option value="general">General</option>
                            <option value="tech">Technology</option>
                            <option value="financial-markets">Financial Markets</option>
                            <option value="sports">Sports</option>
                            <option value="entertainment">Entertainment</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            ▼
                        </div>
                    </div>

                    <div className="relative flex-1" ref={dropdownRef}>
                        <div className="relative">
                            <input
                                type="text"
                                value={countrySearch}
                                onChange={(e) => {
                                    setCountrySearch(e.target.value);
                                    setShowCountryDropdown(true);
                                    if (e.target.value === '') {
                                        setLocation('worldwide');
                                    }
                                }}
                                onFocus={() => setShowCountryDropdown(true)}
                                onBlur={() => {
                                    if (countrySearch === '') {
                                        // Show selected country when not searching
                                        setCountrySearch('');
                                    }
                                }}
                                disabled={isLoading}
                                placeholder={selectedCountry?.label || "Search location..."}
                                className="w-full glass-panel rounded-xl pl-10 pr-12 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-gray-500"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <div 
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                                onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                            >
                                {showCountryDropdown ? '▲' : '▼'}
                            </div>
                        </div>

                        {showCountryDropdown && (
                            <div className="absolute z-50 w-full mt-2 bg-gray-900 border border-gray-700 rounded-xl max-h-80 overflow-y-auto shadow-xl">
                                {filteredCountries.length > 0 ? (
                                    <div className="py-2">
                                        {filteredCountries.reduce((acc, country, index) => {
                                            const prevCountry = filteredCountries[index - 1];
                                            const showGroupLabel = !prevCountry || prevCountry.group !== country.group;

                                            if (showGroupLabel && country.group) {
                                                acc.push(
                                                    <div key={`group-${country.group}`} className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                        {country.group}
                                                    </div>
                                                );
                                            }

                                            acc.push(
                                                <button
                                                    key={country.value}
                                                    onClick={() => {
                                                        setLocation(country.value as BriefingLocation);
                                                        setCountrySearch('');
                                                        setShowCountryDropdown(false);
                                                    }}
                                                    className={clsx(
                                                        "w-full text-left px-4 py-2 hover:bg-white/10 transition-colors",
                                                        location === country.value && "bg-blue-500/20"
                                                    )}
                                                >
                                                    {country.label}
                                                </button>
                                            );

                                            return acc;
                                        }, [] as React.ReactNode[])}
                                    </div>
                                ) : (
                                    <div className="px-4 py-8 text-center text-gray-400">
                                        No countries found
                                    </div>
                                )}
                            </div>
                        )}
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

            {/* Script Generation Button */}
            {!hasData && (
                <button
                    onClick={onSwitchToScript}
                    className="text-sm text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-2 mt-4"
                >
                    <Film className="w-4 h-4" />
                    Or generate a video script with Grok
                </button>
            )}

        </div>
    );
};
