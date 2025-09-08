
import React, { useState, useMemo } from 'react';
import { ViewName, Cluster, AppEvent, ItineraryItem } from '../../types.ts';
import { useAppContext } from '../AppContext.tsx';
import { useToast } from '../ToastContext.tsx';
import Card from '../ui/Card.tsx';
import Button from '../ui/Button.tsx';
import Input from '../ui/Input.tsx';
import Spinner from '../ui/Spinner.tsx';
import { SparklesIcon, TourismClusterIcon, EventsCalendarIcon, PlusIcon, MapPinIcon } from '../../constants.tsx';
// FIX: Use modern GoogleGenAI and Type imports instead of deprecated ones.
import { GoogleGenAI, Type } from "@google/genai";

interface AIPlannerViewProps {
  setCurrentView: (view: ViewName) => void;
  onAuthRequired?: (message?: string) => void;
}

interface Recommendation {
    id: string; // This will be the original ID from the database
    type: 'cluster' | 'event';
    name: string;
    justification: string;
    location: string;
}

const activityOptions = ['Nature', 'Culture', 'Adventure', 'Food', 'Festivals', 'History', 'Relaxation'];

const AIPlannerView: React.FC<AIPlannerViewProps> = ({ setCurrentView, onAuthRequired }) => {
    // FIX: Correctly destructure addItineraryItem from useAppContext
    const { clusters, events, currentUser, addItineraryItem } = useAppContext();
    const { showToast } = useToast();
    
    const [preferences, setPreferences] = useState({
        location: '',
        activities: new Set<string>(),
        duration: 3,
        budget: 500,
    });
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const handleActivityToggle = (activity: string) => {
        setPreferences(prev => {
            const newActivities = new Set(prev.activities);
            if (newActivities.has(activity)) {
                newActivities.delete(activity);
            } else {
                newActivities.add(activity);
            }
            return { ...prev, activities: newActivities };
        });
    };

    const handleGetRecommendations = async () => {
        setIsLoading(true);
        setError(null);
        setRecommendations([]);

        try {
            // FIX: Use modern GoogleGenAI initialization.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            // Simple pre-filtering to reduce token usage
            const locationLower = preferences.location.toLowerCase();
            const relevantClusters = clusters.filter(c => !locationLower || (c.display_address || c.location).toLowerCase().includes(locationLower));
            const relevantEvents = events.filter(e => !locationLower || (e.display_address || e.location_name).toLowerCase().includes(locationLower));
            
            if (relevantClusters.length === 0 && relevantEvents.length === 0) {
                 setError("We couldn't find any locations or events matching your search criteria. Please try a broader location like 'Kuching' or 'Miri'.");
                 setIsLoading(false);
                 return;
            }

            const prompt = `
                You are an expert travel planner for Sarawak, Malaysia. Your task is to analyze the user's preferences holistically and recommend the top 5 most suitable activities or locations from the provided data. You must consider how the preferences interact with each other to create a practical and enjoyable itinerary.

                User Preferences:
                - Location Focus: ${preferences.location || 'Anywhere in Sarawak'}
                - Desired Activities: ${Array.from(preferences.activities).join(', ') || 'Any'}
                - Trip Duration: ${preferences.duration} days
                - Budget: Approximately RM ${preferences.budget} per person

                Your Reasoning Framework:
                1.  **Duration & Location:** A short duration (${preferences.duration} days) means recommendations should be geographically clustered to minimize travel time. For longer durations, you can suggest a wider area. If a location is specified, prioritize options within or very near that location.
                2.  **Budget & Activities:** A lower budget suggests prioritizing free attractions, affordable food spots, or clusters with no entry fees. A higher budget allows for paid tours, ticketed events, and more premium experiences.
                3.  **Interests & Synergy:** Combine interests intelligently. For a user interested in 'Nature' and 'Adventure', a national park with trekking is a better fit than a cultural village. For 'Food' and 'Culture', a historic bazaar with famous local dishes is ideal.
                4.  **Events vs. Clusters:** Prioritize events if their dates align with a potential trip and match the user's interests. Otherwise, focus on clusters which are generally always available.

                Available Data:
                Clusters:
                ${JSON.stringify(relevantClusters.map(c => ({ id: c.id, name: c.name, description: c.description, location: c.display_address || c.location, category: c.category.join(', ') })), null, 2)}

                Events:
                ${JSON.stringify(relevantEvents.map(e => ({ id: e.id, name: e.title, description: e.description, location: e.display_address || e.location_name, category: e.category, start_date: e.start_date, end_date: e.end_date })), null, 2)}

                Based on your holistic analysis, return a JSON array of the top 5 recommendations. For each recommendation, provide a concise justification explaining *why* it's a great match, referencing the interactions between the user's preferences. Ensure the 'type' is either 'cluster' or 'event'.
            `;

            // FIX: Use Type enum for response schema definition.
            const responseSchema = {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING, description: "The original ID of the cluster or event from the provided data." },
                        type: { type: Type.STRING, description: "Must be either 'cluster' or 'event'." },
                        name: { type: Type.STRING, description: "The name of the cluster or event." },
                        location: { type: Type.STRING, description: "The location or address of the item." },
                        justification: { type: Type.STRING, description: "A short, engaging explanation of why this is a good match for the user's preferences." }
                    },
                    required: ["id", "type", "name", "location", "justification"]
                }
            };
            
            // FIX: Use modern ai.models.generateContent method with correct parameters.
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                },
            });
            
            // FIX: Access response text directly and parse.
            const result = JSON.parse(response.text);
            setRecommendations(result);

        } catch (err) {
            console.error("AI Planner Error:", err);
            setError("Sorry, we couldn't generate recommendations at this time. Please try adjusting your preferences or try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewDetails = (item: Recommendation) => {
        if (item.type === 'cluster') {
            sessionStorage.setItem('initialClusterSearch', item.name);
            setCurrentView(ViewName.TourismCluster);
        } else {
            sessionStorage.setItem('initialEventSearch', item.name);
            setCurrentView(ViewName.EventsCalendar);
        }
    };
    
    const handleAddToItinerary = (item: Recommendation) => {
        if (!currentUser) {
            onAuthRequired?.("Please log in or register to save items to your itinerary.");
            return;
        }
        addItineraryItem(item.id, item.type, item.name);
    };

    return (
        <div className="space-y-6">
            <Card title="AI Trip Planner" titleIcon={<SparklesIcon className="w-6 h-6" />}>
                <div className="space-y-4">
                    <p className="text-brand-text-secondary-light dark:text-brand-text-secondary">
                        Tell us about your ideal trip, and our AI will craft personalized recommendations for you.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input
                            label="Location"
                            placeholder="e.g., Kuching, Miri"
                            value={preferences.location}
                            onChange={e => setPreferences(p => ({ ...p, location: e.target.value }))}
                        />
                        <Input
                            label="Trip Duration (days)"
                            type="number"
                            min="1"
                            value={preferences.duration}
                            onChange={e => setPreferences(p => ({ ...p, duration: parseInt(e.target.value, 10) || 1 }))}
                        />
                        <Input
                            label="Budget per person (RM)"
                            type="number"
                            min="0"
                            step="50"
                            value={preferences.budget}
                            onChange={e => setPreferences(p => ({ ...p, budget: parseInt(e.target.value, 10) || 0 }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-brand-text-secondary-light dark:text-brand-text-secondary mb-2">Interests</label>
                        <div className="flex flex-wrap gap-2">
                            {activityOptions.map(activity => (
                                <button
                                    key={activity}
                                    onClick={() => handleActivityToggle(activity)}
                                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                                        preferences.activities.has(activity)
                                            ? 'bg-brand-green dark:bg-brand-dark-green text-white font-semibold'
                                            : 'bg-neutral-200-light dark:bg-neutral-700-dark hover:bg-neutral-300-light dark:hover:bg-neutral-600-dark'
                                    }`}
                                >
                                    {activity}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleGetRecommendations}
                            isLoading={isLoading}
                            leftIcon={<SparklesIcon className="w-5 h-5" />}
                        >
                            Get Recommendations
                        </Button>
                    </div>
                </div>
            </Card>

            {isLoading && (
                <div className="text-center py-12">
                    <Spinner className="w-12 h-12 mx-auto" />
                    <p className="mt-4 text-lg font-semibold text-brand-text-light dark:text-brand-text">
                        Our AI is crafting your personalized trip...
                    </p>
                    <p className="text-brand-text-secondary-light dark:text-brand-text-secondary">This may take a moment.</p>
                </div>
            )}

            {error && (
                <Card>
                    <p className="text-center text-red-500 dark:text-red-400 py-8">{error}</p>
                </Card>
            )}

            {recommendations.length > 0 && (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold text-brand-text-light dark:text-brand-text">Your Personalized Recommendations</h2>
                    {recommendations.map((rec, index) => (
                        <Card key={`${rec.id}-${index}`} className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2">
                                    <div className="flex items-center gap-3">
                                        {rec.type === 'cluster' ? <TourismClusterIcon className="w-8 h-8 text-brand-green dark:text-brand-dark-green-text" /> : <EventsCalendarIcon className="w-8 h-8 text-brand-green dark:text-brand-dark-green-text" />}
                                        <div>
                                            <span className="text-xs uppercase font-semibold text-brand-text-secondary-light dark:text-brand-text-secondary">{rec.type}</span>
                                            <h3 className="text-xl font-bold text-brand-text-light dark:text-brand-text">{rec.name}</h3>
                                        </div>
                                    </div>
                                    <p className="mt-1 text-sm flex items-center text-brand-text-secondary-light dark:text-brand-text-secondary">
                                        <MapPinIcon className="w-4 h-4 mr-1.5 flex-shrink-0" /> {rec.location}
                                    </p>
                                    <div className="mt-4 p-4 bg-neutral-100-light dark:bg-neutral-800-dark rounded-lg">
                                        <h4 className="font-semibold text-brand-green-text dark:text-brand-dark-green-text flex items-center gap-2">
                                            <SparklesIcon className="w-5 h-5" /> Why it's a great match for you:
                                        </h4>
                                        <p className="mt-2 text-brand-text-secondary-light dark:text-brand-text-secondary">{rec.justification}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center items-center gap-3 md:border-l md:pl-6 border-neutral-200-light dark:border-neutral-700-dark">
                                    <Button variant="secondary" size="lg" className="w-full" onClick={() => handleViewDetails(rec)}>
                                        View Details
                                    </Button>
                                    <Button variant="primary" size="lg" className="w-full" onClick={() => handleAddToItinerary(rec)} leftIcon={<PlusIcon className="w-5 h-5"/>}>
                                        Add to Itinerary
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AIPlannerView;