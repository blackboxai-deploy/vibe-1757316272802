
import React, { createContext, useState, useEffect, useCallback, ReactNode, useContext, useMemo, useRef } from 'react';
import { createClient, type SupabaseClient, type PostgrestError, type User as SupabaseUser, AuthError, type Session, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
// FIX: Added Itinerary and ItineraryItem to imports
import { AppEvent, Cluster, GrantApplication, Notification, User, UserRole, StatusHistoryEntry, GrantCategory, PrimaryCreativeCategoryDef, ReportFile, ClusterReview, PublicHoliday, PromotionItem, AddGrantApplicationData, AddClusterData, AddEventData, AddPromotionData, ClusterProduct, AddClusterProductData, VisitorAnalyticsData, Feedback, FeedbackStatus, UserTier, ClusterAnalytic, Itinerary, ItineraryItem } from '../types.ts';
import { useToast, type ToastType } from './ToastContext.tsx';
import { MOCK_GRANT_CATEGORIES, MOCK_CREATIVE_CATEGORIES } from '../constants.tsx';
import type { Database, Tables, TablesInsert, TablesUpdate, Json } from '../database.types.ts';

// --- Constants & Supabase Client ---
const SUPABASE_URL = 'https://rxwcwwyjgfehldjaxxfj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4d2N3d3lqZ2ZlaGxkamF4eGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4ODc0OTUsImV4cCI6MjA2NzQ2MzQ5NX0.aOXYEiWgPqEevXSAZqvmQie_leV1M4Jlt4QStv5k4e0';
// FIX: Genericize the Supabase client with the Database type to enable type-safe queries and RPCs.
const supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

const BANNER_CONFIG_KEY = 'dashboard_banner_url';
const BANNER_OPACITY_KEY = 'dashboard_banner_opacity';
const MAINTENANCE_ENABLED_KEY = 'maintenance_mode_enabled';
const MAINTENANCE_MESSAGE_KEY = 'maintenance_mode_message';

// --- Helper Types ---
interface EditUserData { name: string; role: UserRole; tier: UserTier; }

// --- Context Value Interface ---
interface AppContextValue {
    // State
    clusters: Cluster[]; events: AppEvent[]; grantApplications: GrantApplication[]; notifications: Notification[]; users: User[];
    grantCategories: GrantCategory[]; creativeCategories: PrimaryCreativeCategoryDef[]; holidays: PublicHoliday[]; promotions: PromotionItem[];
    visitorAnalyticsData: VisitorAnalyticsData[]; clusterAnalytics: ClusterAnalytic[]; bannerImageUrl: string | null; bannerOverlayOpacity: number; isMaintenanceMode: boolean; maintenanceMessage: string;
    // Loading State
    isLoadingClusters: boolean; isLoadingEvents: boolean; isLoadingGrantApplications: boolean; isLoadingNotifications: boolean;
    isLoadingUsers: boolean; isLoadingGrantCategories: boolean; isLoadingCreativeCategories: boolean; isLoadingHolidays: boolean;
    isLoadingPromotions: boolean; isLoadingVisitorAnalytics: boolean; isLoadingClusterAnalytics: boolean; isLoadingBannerImage: boolean; isLoadingMaintenanceMode: boolean;
    // Auth State
    currentUser: User | null; isAuthenticated: boolean; isInitializing: boolean; isLoggingOut: boolean; isPremiumUser: boolean;
    // UI State
    isPhoneView: boolean; togglePhoneView: () => void;
    // Auth actions
    loginUserWithPassword: (email: string, pass: string) => Promise<void>;
    registerUserWithEmailPassword: (name: string, email: string, pass: string, role: UserRole) => Promise<void>;
    sendMagicLink: (email: string, options?: { name?: string; role?: UserRole; shouldCreateUser?: boolean }) => Promise<void>;
    logoutUser: () => Promise<void>;
    // Grant application actions
    addGrantApplication: (data: AddGrantApplicationData) => Promise<void>;
    reapplyForGrant: (originalApp: GrantApplication, newData: AddGrantApplicationData) => Promise<void>;
    rejectPendingApplication: (appId: string, notes: string) => Promise<void>;
    makeConditionalOffer: (appId: string, notes: string, amount: number) => Promise<void>;
    acceptConditionalOffer: (appId: string) => Promise<boolean>;
    declineConditionalOffer: (appId: string) => Promise<boolean>;
    submitEarlyReport: (appId: string, file: File) => Promise<void>;
    submitFinalReport: (appId: string, file: File) => Promise<void>;
    approveEarlyReportAndDisburse: (appId: string, amount: number, notes: string) => Promise<void>;
    rejectEarlyReportSubmission: (appId: string, notes: string) => Promise<void>;
    rejectFinalReportSubmission: (appId: string, notes: string) => Promise<void>;
    completeGrantApplication: (appId: string, amount: number, notes: string) => Promise<void>;
    createSignedUrl: (bucket: string, path: string) => Promise<string | null>;
    // Cluster actions
    addCluster: (data: AddClusterData) => Promise<void>;
    addClustersBatch: (data: AddClusterData[]) => Promise<void>;
    updateCluster: (id: string, data: Partial<AddClusterData>) => Promise<void>;
    deleteCluster: (id: string) => Promise<boolean>;
    uploadClusterImage: (file: File, oldImageUrl?: string) => Promise<string>;
    incrementClusterView: (clusterId: string) => void;
    incrementClusterClick: (clusterId: string) => void;
    transferClusterOwnership: (clusterId: string, newOwnerId: string) => Promise<boolean>;
    // Cluster Review actions
    fetchReviewsForCluster: (clusterId: string) => Promise<ClusterReview[]>;
    addReviewForCluster: (clusterId: string, rating: number, comment: string) => Promise<ClusterReview | null>;
    // Cluster Product Actions
    fetchProductsForCluster: (clusterId: string) => Promise<ClusterProduct[]>;
    addProduct: (data: AddClusterProductData) => Promise<void>;
    updateProduct: (id: string, data: Partial<AddClusterProductData>) => Promise<void>;
    deleteProduct: (id: string, imageUrl: string | null) => Promise<boolean>;
    uploadProductImage: (file: File, oldImageUrl?: string | null) => Promise<string>;
    // Event actions
    addEvent: (data: AddEventData) => Promise<void>;
    updateEvent: (id: string, data: Partial<AddEventData>) => Promise<void>;
    deleteEvent: (id: string) => Promise<boolean>;
    uploadEventImage: (file: File, oldImageUrl?: string | null) => Promise<string>;
    // Notification actions
    getNotificationsForCurrentUser: () => Notification[];
    markNotificationAsRead: (notification: Notification) => Promise<void>;
    markAllNotificationsAsRead: () => void;
    clearAllNotifications: () => Promise<void>;
    deleteGlobalNotification: (notificationId: string) => Promise<void>;
    // User Management actions
    editUser: (id: string, data: EditUserData) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;
    updateCurrentUserName: (name: string) => Promise<void>;
    updateCurrentUserPassword: (pass: string) => Promise<void>;
    deleteCurrentUserAccount: () => Promise<boolean>;
    // Promotions actions
    fetchAllPromotions: () => Promise<PromotionItem[]>;
    addPromotion: (data: AddPromotionData) => Promise<void>;
    updatePromotion: (id: number, data: Partial<AddPromotionData>) => Promise<void>;
    deletePromotion: (id: number, imageUrl: string) => Promise<void>;
    uploadPromotionImage: (file: File, oldImageUrl?: string) => Promise<string>;
    refreshDashboardPromotions: () => Promise<void>;
    // Banner actions
    uploadBannerImage: (file: File, oldImageUrl?: string) => Promise<string>;
    updateBannerImageUrl: (url: string) => Promise<void>;
    deleteBannerImage: (url: string) => Promise<void>;
    updateBannerOverlayOpacity: (opacity: number) => Promise<void>;
    // Website Management Actions
    setMaintenanceStatus: (enabled: boolean, message: string) => Promise<void>;
    setSiteBanner: (message: string, expires_at: string | null) => Promise<void>;
    sendGlobalPanelNotification: (message: string) => Promise<void>;
    // Analytics Actions
    getDailyClusterAnalytics: (clusterId: string, periodDays: number) => Promise<{ date: string, views: number, clicks: number }[]>;
    uploadVisitorAnalyticsBatch: (data: VisitorAnalyticsData[]) => Promise<void>;
    feedback: Feedback[];
    isLoadingFeedback: boolean;
    addFeedback: (content: string, isAnonymous: boolean, pageContext: string | null) => Promise<void>;
    updateFeedbackStatus: (id: string, status: FeedbackStatus) => Promise<void>;
    // AI Insight Caching Actions
    // FIX: Added addItineraryItem to the context value interface
    addItineraryItem: (itemId: string, itemType: 'cluster' | 'event', itemName: string) => Promise<void>;
    getCachedAiInsight: (viewName: string, filterKey: string) => Promise<{ content: string; data_last_updated_at: string } | null>;
    setCachedAiInsight: (viewName: string, filterKey: string, content: string, dataLastUpdatedAt: string) => Promise<void>;
    getLatestEventTimestampForYear: (year: number) => Promise<string | null>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const useAppContext = (): AppContextValue => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within an AppProvider');
    return context;
};

// --- Helper Functions ---
const parseJsonbColumn = (item: any, key: string, defaultValue: any) => {
    try {
        if (typeof item[key] === 'string') return JSON.parse(item[key]);
        return item[key] || defaultValue;
    } catch {
        return defaultValue;
    }
};

const parseGrantApplication = (app: any): GrantApplication => ({
    ...app,
    status_history: parseJsonbColumn(app, 'status_history', []),
    early_report_files: parseJsonbColumn(app, 'early_report_files', []),
    final_report_files: parseJsonbColumn(app, 'final_report_files', []),
});

const initialDataState = {
    clusters: [] as Cluster[],
    events: [] as AppEvent[],
    grantApplications: [] as GrantApplication[],
    notifications: [] as Notification[],
    users: [] as User[],
    grantCategories: MOCK_GRANT_CATEGORIES,
    creativeCategories: MOCK_CREATIVE_CATEGORIES,
    holidays: [] as PublicHoliday[],
    promotions: [] as PromotionItem[],
    visitorAnalyticsData: [] as VisitorAnalyticsData[],
    clusterAnalytics: [] as ClusterAnalytic[],
    feedback: [] as Feedback[],
    bannerImageUrl: null as string | null,
    bannerOverlayOpacity: 0.5,
    isMaintenanceMode: false,
    maintenanceMessage: '',
    isLoadingClusters: true,
    isLoadingEvents: true,
    isLoadingGrantApplications: true,
    isLoadingNotifications: true,
    isLoadingUsers: true,
    isLoadingGrantCategories: false,
    isLoadingCreativeCategories: false,
    isLoadingHolidays: true,
    isLoadingPromotions: true,
    isLoadingVisitorAnalytics: true,
    isLoadingClusterAnalytics: true,
    isLoadingFeedback: true,
    isLoadingBannerImage: true,
    isLoadingMaintenanceMode: true,
};


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { showToast } = useToast();
    const [state, setState] = useState(initialDataState);
    const [auth, setAuth] = useState<{
        currentUser: User | null;
        isAuthenticated: boolean;
        isInitializing: boolean;
        isLoggingOut: boolean;
    }>({ currentUser: null, isAuthenticated: false, isInitializing: true, isLoggingOut: false });
    const [isPhoneView, setIsPhoneView] = useState(false);
    const initialAuthCheckCompleted = useRef(false);

    const isPremiumUser = useMemo(() => {
        if (!auth.currentUser) return false;
        // Admins and Editors are always considered premium
        if (auth.currentUser.role === 'Admin' || auth.currentUser.role === 'Editor') {
            return true;
        }
        // Other users are premium if their tier is set to 'Premium'
        return auth.currentUser.tier === 'Premium';
    }, [auth.currentUser]);

    const getErrorMessage = useCallback((error: unknown): string => {
        if (error && typeof error === 'object' && 'message' in error) return String((error as any).message);
        if (error instanceof Error) return error.message;
        return 'An unknown error occurred.';
    }, []);

    const handleError = useCallback((error: unknown, context: string, show: boolean = true) => {
        const message = getErrorMessage(error);
        console.error(`${context}:`, message, error);
        if(show) showToast(message, 'error');
    }, [getErrorMessage, showToast]);

    // --- DATA FETCHING ---
    const fetchClusters = useCallback(async () => {
        setState(prev => ({ ...prev, isLoadingClusters: true }));
        try {
            const { data, error } = await supabaseClient.from('clusters').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            const parsedData = ((data as Tables<'clusters'>[] | null) || []).map(cluster => ({
                ...cluster,
                category: (Array.isArray(cluster.category) ? cluster.category.filter(item => typeof item === 'string') : [])
            }));
            setState(prev => ({ ...prev, clusters: parsedData as Cluster[] }));
        } catch (e) { handleError(e, 'Fetching clusters'); } 
        finally { setState(prev => ({ ...prev, isLoadingClusters: false })); }
    }, [handleError]);

    const fetchEvents = useCallback(async () => {
        setState(prev => ({ ...prev, isLoadingEvents: true }));
        try {
            const { data, error } = await supabaseClient.from('events').select('*').order('start_date', { ascending: false });
            if (error) throw error;
            setState(prev => ({ ...prev, events: (data as AppEvent[]) || [] }));
        } catch (e) { handleError(e, 'Fetching events'); } 
        finally { setState(prev => ({ ...prev, isLoadingEvents: false })); }
    }, [handleError]);

    const fetchGrantApplications = useCallback(async () => {
        setState(prev => ({ ...prev, isLoadingGrantApplications: true }));
        try {
            const { data, error } = await supabaseClient.from('grant_applications').select('*').order('last_update_timestamp', { ascending: false });
            if (error) throw error;
            setState(prev => ({ ...prev, grantApplications: data.map(parseGrantApplication) }));
        } catch (e) { handleError(e, 'Fetching grant applications'); } 
        finally { setState(prev => ({ ...prev, isLoadingGrantApplications: false })); }
    }, [handleError]);

    const fetchNotifications = useCallback(async () => {
        setState(prev => ({ ...prev, isLoadingNotifications: true }));
        try {
            const { data, error } = await supabaseClient.from('notifications').select('*').order('timestamp', { ascending: false });
            if (error) throw error;
            const parsedData = ((data as Tables<'notifications'>[] | null) || []).map(n => ({...n, read_by: n.read_by || [], cleared_by: n.cleared_by || [] }));
            setState(prev => ({ ...prev, notifications: parsedData as Notification[] }));
        } catch (e) { handleError(e, 'Fetching notifications'); } 
        finally { setState(prev => ({ ...prev, isLoadingNotifications: false })); }
    }, [handleError]);
    
    const fetchUsers = useCallback(async () => {
        setState(prev => ({ ...prev, isLoadingUsers: true }));
        try {
            const { data, error } = await supabaseClient.from('users').select('*');
            if (error) throw error;
            setState(prev => ({ ...prev, users: data as User[] || [] }));
        } catch (e) { handleError(e, 'Fetching users'); } 
        finally { setState(prev => ({ ...prev, isLoadingUsers: false })); }
    }, [handleError]);

    const fetchHolidays = useCallback(async () => {
        setState(prev => ({ ...prev, isLoadingHolidays: true }));
        try {
            const { data, error } = await supabaseClient.from('public_holidays').select('*');
            if (error) throw error;
            setState(prev => ({ ...prev, holidays: data as PublicHoliday[] || [] }));
        } catch (e) { handleError(e, 'Fetching holidays'); } 
        finally { setState(prev => ({ ...prev, isLoadingHolidays: false })); }
    }, [handleError]);

    const refreshDashboardPromotions = useCallback(async () => {
        setState(prev => ({ ...prev, isLoadingPromotions: true }));
        try {
            const { data, error } = await supabaseClient.from('promotions').select('*').eq('is_active', true).order('sort_order');
            if (error) throw error;
            setState(prev => ({ ...prev, promotions: data as PromotionItem[] || [] }));
        } catch (e) { handleError(e, 'Fetching promotions'); } 
        finally { setState(prev => ({ ...prev, isLoadingPromotions: false })); }
    }, [handleError]);

    const fetchVisitorAnalytics = useCallback(async () => {
        setState(prev => ({ ...prev, isLoadingVisitorAnalytics: true }));
        try {
            const { data, error } = await supabaseClient.from('visitor_analytics').select('*');
            if (error) throw error;
            setState(prev => ({ ...prev, visitorAnalyticsData: (data as VisitorAnalyticsData[]) || [] }));
        } catch (e) {
            handleError(e, 'Fetching visitor analytics');
            setState(prev => ({ ...prev, visitorAnalyticsData: [] })); // Ensure it's an empty array on error
        } finally {
            setState(prev => ({ ...prev, isLoadingVisitorAnalytics: false }));
        }
    }, [handleError]);
    
    const fetchClusterAnalytics = useCallback(async () => {
        setState(prev => ({ ...prev, isLoadingClusterAnalytics: true }));
        try {
            const { data, error } = await supabaseClient.from('cluster_analytics').select('*');
            if (error) throw error;
            setState(prev => ({ ...prev, clusterAnalytics: (data as ClusterAnalytic[]) || [] }));
        } catch (e) { handleError(e, 'Fetching cluster analytics'); }
        finally { setState(prev => ({ ...prev, isLoadingClusterAnalytics: false })); }
    }, [handleError]);

    const fetchFeedback = useCallback(async () => {
        setState(prev => ({ ...prev, isLoadingFeedback: true }));
        try {
            const { data, error } = await supabaseClient.from('feedback').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setState(prev => ({ ...prev, feedback: data as Feedback[] || [] }));
        } catch (e) { handleError(e, 'Fetching feedback'); } 
        finally { setState(prev => ({ ...prev, isLoadingFeedback: false })); }
    }, [handleError]);

    const uploadVisitorAnalyticsBatch = useCallback(async (data: VisitorAnalyticsData[]) => {
        const { error } = await supabaseClient.rpc('upload_visitor_analytics_batch', { p_data: data as unknown as Json });
        if (error) { handleError(error, "Uploading visitor analytics"); throw error; }
        showToast(`${data.length} records uploaded successfully!`, 'success');
        fetchVisitorAnalytics(); // Refresh data in the background
    }, [handleError, showToast, fetchVisitorAnalytics]);

    const fetchConfig = useCallback(async () => {
        setState(prev => ({ ...prev, isLoadingBannerImage: true, isLoadingMaintenanceMode: true }));
        try {
            const { data, error } = await supabaseClient.from('app_config').select('*');
            if (error) throw error;
            const config = ((data as Tables<'app_config'>[] | null) || []).reduce((acc, item) => ({...acc, [item.key]: item.value }), {} as Record<string, string | null>);
            setState(prev => ({
                ...prev,
                bannerImageUrl: config[BANNER_CONFIG_KEY] || null,
                bannerOverlayOpacity: parseFloat(config[BANNER_OPACITY_KEY] || '0.5'),
                isMaintenanceMode: config[MAINTENANCE_ENABLED_KEY] === 'true',
                maintenanceMessage: config[MAINTENANCE_MESSAGE_KEY] || '',
            }));
        } catch(e) { handleError(e, 'Fetching app config'); }
        finally { setState(prev => ({ ...prev, isLoadingBannerImage: false, isLoadingMaintenanceMode: false })); }
    }, [handleError]);

    const fetchAllData = useCallback(async () => {
        await Promise.allSettled([
            fetchClusters(), fetchEvents(), fetchGrantApplications(), fetchNotifications(),
            fetchUsers(), fetchHolidays(), refreshDashboardPromotions(), fetchVisitorAnalytics(), 
            fetchFeedback(), fetchClusterAnalytics()
        ]);
    }, [fetchClusters, fetchEvents, fetchGrantApplications, fetchNotifications, fetchUsers, fetchHolidays, refreshDashboardPromotions, fetchVisitorAnalytics, fetchFeedback, fetchClusterAnalytics]);
    
    useEffect(() => {
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
            try {
                if (session) {
                    // This logic is for silent token refreshes after the app has already initialized.
                    // It prevents the full loading sequence on events like window refocus.
                    if (initialAuthCheckCompleted.current) {
                        const { data: userProfile, error: profileError } = await supabaseClient
                            .from('users').select('*').eq('id', session.user.id).single();
                        if (profileError || !userProfile) {
                            console.error('User profile check failed on refresh, signing out.', profileError);
                            await supabaseClient.auth.signOut();
                        } else {
                            setAuth(prev => ({ ...prev, currentUser: userProfile as User, isAuthenticated: true }));
                        }
                        return; // Stop further execution for silent refreshes
                    }
    
                    // This is the main, one-time initialization for a logged-in user.
                    setAuth(prev => ({ ...prev, isInitializing: true }));
    
                    // 1. Fetch critical data needed to render the layout (user profile, maintenance mode).
                    const profilePromise = supabaseClient.from('users').select('*').eq('id', session.user.id).single();
                    // fetchConfig fetches maintenance status and sets its own loading flags. We await it to ensure maintenance mode is known.
                    const configPromise = fetchConfig();
                    
                    const [profileResult] = await Promise.all([profilePromise, configPromise]);
    
                    const { data: userProfile, error: profileError } = profileResult;
                    if (profileError || !userProfile) {
                        console.error('User profile fetch failed on initial load, signing out.', profileError);
                        await supabaseClient.auth.signOut();
                        setAuth({ currentUser: null, isAuthenticated: false, isInitializing: false, isLoggingOut: false });
                        return;
                    }
    
                    // 2. Unblock the UI by setting isInitializing to false. The app can now render.
                    setAuth({
                        currentUser: userProfile as User,
                        isAuthenticated: true,
                        isInitializing: false,
                        isLoggingOut: false,
                    });
                    initialAuthCheckCompleted.current = true;
    
                    // 3. Fetch all other non-critical data in the background. Components will show their own loading states.
                    fetchAllData(); // No 'await'
    
                } else { // No session (guest or signed out)
                    if (_event === 'SIGNED_OUT') {
                        // Reset all state on logout
                        setState(initialDataState); 
                        setAuth({ currentUser: null, isAuthenticated: false, isInitializing: false, isLoggingOut: false });
                        initialAuthCheckCompleted.current = false;
                        showToast("You have been logged out.", "success");
                        // Re-fetch public data for the guest view.
                        fetchConfig(); // no await, let it load in background
                        fetchAllData(); // no await
                    } else {
                        // This is the initial load for a guest user.
                        setAuth(prev => ({ ...prev, isInitializing: true }));
                        setState(initialDataState);
    
                        // 1. Fetch critical config data (maintenance mode).
                        await fetchConfig();
                        
                        // 2. Unblock the UI for the guest.
                        setAuth({ currentUser: null, isAuthenticated: false, isInitializing: false, isLoggingOut: false });
                        initialAuthCheckCompleted.current = false;
    
                        // 3. Fetch non-critical public data in the background.
                        fetchAllData(); // no await
                    }
                }
            } catch (e) {
                handleError(e, "Error during authentication state change.", true);
                setAuth({ currentUser: null, isAuthenticated: false, isInitializing: false, isLoggingOut: false });
            }
        });
    
        return () => { subscription.unsubscribe(); };
    }, [fetchAllData, fetchConfig, handleError, showToast]);

    useEffect(() => {
        const handleDbChange = (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => {
            console.log('DB Change received:', payload);
            const { table, eventType, new: newRecord, old } = payload;
            const oldRecordId = (old as { id?: any })?.id;
    
        const handleTableUpdate = <T extends {id: string | number}>(
            prevItems: T[], 
            parser: (item: any) => T = (item) => item as T,
            sorter: (a: T, b: T) => number
        ): T[] => {
            let newItems = [...prevItems];
            if (eventType === 'INSERT') {
                newItems.unshift(parser(newRecord));
            } else if (eventType === 'UPDATE') {
                const index = newItems.findIndex(item => item.id === newRecord.id);
                if (index > -1) {
                    newItems[index] = parser(newRecord);
                } else {
                    newItems.unshift(parser(newRecord));
                }
            } else if (eventType === 'DELETE') {
                newItems = newItems.filter(item => item.id !== oldRecordId);
            }
            return newItems.sort(sorter);
        };
    
        switch (table) {
            case 'notifications':
                setState(prev => ({
                    ...prev,
                    notifications: handleTableUpdate(
                        prev.notifications,
                        (item) => ({ ...(item as Tables<'notifications'>), read_by: item.read_by || [], cleared_by: item.cleared_by || [] }) as Notification,
                        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    )
                }));
                break;
            case 'grant_applications':
                setState(prev => ({
                    ...prev,
                    grantApplications: handleTableUpdate(
                        prev.grantApplications,
                        parseGrantApplication,
                        (a, b) => new Date(b.last_update_timestamp).getTime() - new Date(a.last_update_timestamp).getTime()
                    )
                }));
                break;
            case 'clusters':
            case 'cluster_reviews':
            case 'cluster_products':
                fetchClusters();
                break;
            case 'events':
                fetchEvents();
                break;
            case 'users':
                fetchUsers();
                break;
            case 'promotions':
                refreshDashboardPromotions();
                break;
            case 'app_config':
                fetchConfig();
                break;
            case 'visitor_analytics':
                fetchVisitorAnalytics();
                break;
            case 'cluster_analytics':
                fetchClusterAnalytics();
                break;
            case 'feedback':
                fetchFeedback();
                break;
            }
        };
    
        const channel = supabaseClient.channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, handleDbChange)
            .subscribe();
    
        return () => { supabaseClient.removeChannel(channel); };
    }, [fetchClusters, fetchEvents, fetchUsers, refreshDashboardPromotions, fetchConfig, fetchVisitorAnalytics, fetchFeedback, fetchClusterAnalytics]);

    const loginUserWithPassword = useCallback(async (email: string, pass: string) => {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
    }, []);

    const registerUserWithEmailPassword = useCallback(async (name: string, email: string, pass: string, role: UserRole) => {
        const { error } = await supabaseClient.auth.signUp({
            email, password: pass, options: { data: { name, role } }
        });
        if (error) throw error;
    }, []);

    const sendMagicLink = useCallback(async (email: string, options?: { name?: string; role?: UserRole; shouldCreateUser?: boolean }) => {
        const { error } = await supabaseClient.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
                shouldCreateUser: options?.shouldCreateUser ?? true,
                data: options?.name ? { name: options.name, role: options.role || 'Visitor' } : undefined,
            },
        });
        if (error) throw error;
    }, []);
    
    const logoutUser = useCallback(async () => {
        setAuth(prev => ({ ...prev, isLoggingOut: true }));
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            handleError(error, 'Logout');
            setAuth(prev => ({ ...prev, isLoggingOut: false }));
        }
    }, [handleError]);

    const uploadFile = useCallback(async (bucket: string, file: File, userId: string, oldFileUrl?: string | null) => {
        if (oldFileUrl) {
            try {
                const oldFilePath = new URL(oldFileUrl).pathname.split(`/${bucket}/`)[1];
                if (oldFilePath) await supabaseClient.storage.from(bucket).remove([oldFilePath]);
            } catch (e) { console.error("Could not parse or remove old file:", e); }
        }
        const filePath = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
        const { error: uploadError } = await supabaseClient.storage.from(bucket).upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabaseClient.storage.from(bucket).getPublicUrl(filePath);
        if (!publicUrl) throw new Error("Could not get public URL for uploaded file.");
        return publicUrl;
    }, []);

    const deleteFile = useCallback(async(bucket: string, fileUrl: string) => {
        try {
            const filePath = new URL(fileUrl).pathname.split(`/${bucket}/`)[1];
            if(filePath) {
                const { error } = await supabaseClient.storage.from(bucket).remove([filePath]);
                if (error) throw error;
            }
        } catch (e) {
            handleError(e, `Deleting file from ${bucket}`);
        }
    }, [handleError]);
    
    const addGrantApplication = useCallback(async(data: AddGrantApplicationData) => {
        if (!auth.currentUser) throw new Error("Authentication required.");
        const now = new Date();
        const grantId = `GA-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        const initialStatus: StatusHistoryEntry = {
            status: 'Pending', timestamp: now.toISOString(),
            notes: 'Application submitted by applicant.', changed_by: auth.currentUser.name
        };
        const newApplication: TablesInsert<'grant_applications'> = {
            ...data,
            id: grantId,
            applicant_id: auth.currentUser.id,
            status: 'Pending',
            submission_timestamp: now.toISOString(),
            last_update_timestamp: now.toISOString(),
            status_history: [initialStatus] as unknown as Json,
            early_report_files: [],
            final_report_files: [],
            resubmission_count: 0,
        };
        const { error: appError } = await supabaseClient.from('grant_applications').insert([newApplication]);
        if (appError) { 
            handleError(appError, "Submitting grant application"); 
            throw appError; 
        }

        const notificationMessage = `New grant application "${data.project_name}" submitted by ${auth.currentUser.name}.`;
        const notificationPayload: TablesInsert<'notifications'> = {
            id: crypto.randomUUID(),
            recipient_id: 'grant_admins',
            message: notificationMessage,
            related_application_id: grantId,
            type: 'new_app',
            timestamp: now.toISOString()
        };
        const { error: notificationError } = await supabaseClient.from('notifications').insert([notificationPayload]);
        if (notificationError) {
            handleError(notificationError, "Creating admin notification for new grant", false);
        }

        showToast("Application submitted successfully!", "success");
    }, [auth.currentUser, handleError, showToast]);
    
    const reapplyForGrant = useCallback(async(originalApp: GrantApplication, newData: AddGrantApplicationData) => {
        if (!auth.currentUser) throw new Error("Authentication required.");
        const now = new Date();
        const newId = `GA-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        const initialStatus: StatusHistoryEntry = {
            status: 'Pending', timestamp: now.toISOString(),
            notes: `Re-submitted from previous application ${originalApp.id}.`, changed_by: auth.currentUser.name
        };
        const newApplication: TablesInsert<'grant_applications'> = {
            ...newData,
            id: newId,
            applicant_id: auth.currentUser.id,
            status: 'Pending',
            submission_timestamp: now.toISOString(),
            last_update_timestamp: now.toISOString(),
            status_history: [initialStatus] as unknown as Json,
            resubmitted_from_id: originalApp.id,
            resubmission_count: (originalApp.resubmission_count || 0) + 1,
            early_report_files: [],
            final_report_files: [],
        };
        const { error: appError } = await supabaseClient.from('grant_applications').insert([newApplication]);
        if (appError) { 
            handleError(appError, "Re-submitting grant"); 
            throw appError; 
        }

        const notificationMessage = `Grant re-application "${newData.project_name}" submitted by ${auth.currentUser.name}.`;
        const notificationPayload: TablesInsert<'notifications'> = {
            id: crypto.randomUUID(),
            recipient_id: 'grant_admins',
            message: notificationMessage,
            related_application_id: newId,
            type: 'resubmission',
            timestamp: now.toISOString()
        };
        const { error: notificationError } = await supabaseClient.from('notifications').insert([notificationPayload]);
        if (notificationError) {
            handleError(notificationError, "Creating admin notification for grant re-application", false);
        }

        showToast("Re-application submitted successfully!", "success");
    }, [auth.currentUser, handleError, showToast]);

    const rejectPendingApplication = useCallback(async (appId: string, notes: string) => {
        const { error } = await supabaseClient.rpc('admin_reject_application', { p_application_id: appId, p_notes: notes });
        if (error) { handleError(error, "Rejecting application"); throw error; }
    }, [handleError]);

    const makeConditionalOffer = useCallback(async (appId: string, notes: string, amount: number) => {
        const { error } = await supabaseClient.rpc('admin_make_conditional_offer', { p_application_id: appId, p_notes: notes, p_amount_approved: amount });
        if (error) { handleError(error, "Making conditional offer"); throw error; }
    }, [handleError]);

    const acceptConditionalOffer = useCallback(async (appId: string): Promise<boolean> => {
        const { error } = await supabaseClient.rpc('handle_grant_offer_response', { p_application_id: appId, p_accepted: true });
        if (error) { handleError(error, "Accepting offer"); return false; }
        showToast("Offer accepted! Please proceed to the next step.", "success");
        return true;
    }, [handleError, showToast]);
    
    const declineConditionalOffer = useCallback(async (appId: string): Promise<boolean> => {
        const { error } = await supabaseClient.rpc('handle_grant_offer_response', { p_application_id: appId, p_accepted: false });
        if (error) { handleError(error, "Declining offer"); return false; }
        showToast("Offer declined.", "info");
        return true;
    }, [handleError, showToast]);
    
    const submitReport = useCallback(async (appId: string, file: File, reportType: 'early' | 'final') => {
        if (!auth.currentUser) throw new Error("Authentication required.");
        const bucket = reportType === 'early' ? 'grant-early-report-files' : 'grant-final-report-files';
        const filePath = `${auth.currentUser.id}/${appId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabaseClient.storage.from(bucket).upload(filePath, file);
        if (uploadError) { handleError(uploadError, "Uploading report file"); throw uploadError; }

        const reportFile: ReportFile = { path: filePath, file_name: file.name, submitted_at: new Date().toISOString() };
        // FIX: Use 'as unknown as Json' for stricter type casting from a specific interface to the generic Json type.
        const { error: rpcError } = await supabaseClient.rpc('submit_report', { p_application_id: appId, p_report_file: reportFile as unknown as Json, p_report_type: reportType });
        if (rpcError) { handleError(rpcError, "Submitting report"); throw rpcError; }
        showToast(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report submitted for review.`, "success");
    }, [auth.currentUser, handleError, showToast]);
    
    const submitEarlyReport = useCallback((appId: string, file: File) => submitReport(appId, file, 'early'), [submitReport]);
    const submitFinalReport = useCallback((appId: string, file: File) => submitReport(appId, file, 'final'), [submitReport]);

    const approveEarlyReportAndDisburse = useCallback(async (appId: string, amount: number, notes: string) => {
        const { error } = await supabaseClient.rpc('admin_approve_early_report', { p_application_id: appId, p_disbursement_amount: amount, p_notes: notes });
        if (error) { handleError(error, "Approving early report"); throw error; }
        showToast("Early report approved and applicant notified.", "success");
    }, [handleError, showToast]);

    const rejectEarlyReportSubmission = useCallback(async (appId: string, notes: string) => {
        const { error } = await supabaseClient.rpc('admin_reject_early_report', { p_application_id: appId, p_notes: notes });
        if (error) { handleError(error, "Rejecting early report"); throw error; }
        showToast("Early report rejected and applicant notified.", "info");
    }, [handleError, showToast]);
    
    const rejectFinalReportSubmission = useCallback(async (appId: string, notes: string) => {
        const { error } = await supabaseClient.rpc('admin_reject_final_report', { p_application_id: appId, p_notes: notes });
        if (error) { handleError(error, "Rejecting final report"); throw error; }
        showToast("Final report rejected and applicant notified.", "info");
    }, [handleError, showToast]);

    const completeGrantApplication = useCallback(async (appId: string, amount: number, notes: string) => {
        const { error } = await supabaseClient.rpc('admin_complete_application', { p_application_id: appId, p_final_disbursement_amount: amount, p_notes: notes });
        if (error) { handleError(error, "Completing application"); throw error; }
        showToast("Grant completed successfully.", "success");
    }, [handleError, showToast]);
    
    const createSignedUrl = useCallback(async (bucket: string, path: string): Promise<string | null> => {
        try {
            const { data, error } = await supabaseClient.storage.from(bucket).createSignedUrl(path, 60);
            if (error) throw error;
            return data.signedUrl;
        } catch(e) { handleError(e, "Creating signed URL"); return null; }
    }, [handleError]);
    
    const addCluster = useCallback(async (data: AddClusterData) => {
        if (!auth.currentUser) throw new Error("Authentication required.");
        const newCluster: TablesInsert<'clusters'> = { ...data, owner_id: auth.currentUser.id };
        const { error } = await supabaseClient.from('clusters').insert([newCluster]);
        if (error) { handleError(error, "Adding cluster"); throw error; }
        showToast("Cluster added successfully!", "success");
    }, [auth.currentUser, handleError, showToast]);

    const addClustersBatch = useCallback(async(data: AddClusterData[]) => {
        if (!auth.currentUser) throw new Error("Authentication required.");
        
        const BATCH_SIZE = 500;

        for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batch = data.slice(i, i + BATCH_SIZE);
            const payload: TablesInsert<'clusters'>[] = batch.map((d) => ({
                ...d,
                owner_id: auth.currentUser!.id
            }));
            
            const { error } = await supabaseClient.from('clusters').insert(payload);
            
            if (error) {
                const enrichedError = new Error(`Upload failed on batch starting at row ${i + 1}. Supabase error: ${error.message}`);
                handleError(enrichedError, "Batch adding clusters");
                throw enrichedError;
            }
        }

        showToast(`${data.length} clusters uploaded successfully!`, "success");
    }, [auth.currentUser, handleError, showToast]);
    
    const updateCluster = useCallback(async (id: string, data: Partial<AddClusterData>) => {
        const updatePayload: TablesUpdate<'clusters'> = data;
        const { error } = await supabaseClient.from('clusters').update(updatePayload).eq('id', id);
        if (error) { handleError(error, "Updating cluster"); throw error; }
        showToast("Cluster updated successfully!", "success");
    }, [handleError, showToast]);

    const deleteCluster = useCallback(async (id: string): Promise<boolean> => {
        const clusterToDelete = state.clusters.find(c => c.id === id);

        const { error } = await supabaseClient.from('clusters').delete().eq('id', id);
        if (error) { 
            handleError(error, "Deleting cluster"); 
            return false; 
        }

        if (clusterToDelete?.image) {
            await deleteFile('cluster-images', clusterToDelete.image);
        }

        return true;
    }, [handleError, state.clusters, deleteFile]);
    
    const uploadClusterImage = useCallback((file: File, oldImageUrl?: string) => {
        if (!auth.currentUser) throw new Error("Authentication required.");
        return uploadFile('cluster-images', file, auth.currentUser.id, oldImageUrl);
    }, [auth.currentUser, uploadFile]);
    
    const transferClusterOwnership = useCallback(async (clusterId: string, newOwnerId: string): Promise<boolean> => {
        const { error } = await supabaseClient.rpc('transfer_cluster_ownership', { p_cluster_id: clusterId, p_new_owner_id: newOwnerId });
        if (error) {
            handleError(error, "Transferring cluster ownership");
            return false;
        }
        showToast("Cluster ownership transferred successfully!", "success");
        await fetchClusters(); // Refresh the cluster list
        return true;
    }, [handleError, showToast, fetchClusters]);

    const incrementClusterView = useCallback((clusterId: string) => {
        supabaseClient.rpc('increment_cluster_view', { cluster_id_to_increment: clusterId }).then(({ error }: { error: PostgrestError | null }) => {
            if (error) console.error("Error incrementing view:", error.message);
        });
    }, []);

    const incrementClusterClick = useCallback((clusterId: string) => {
        supabaseClient.rpc('increment_cluster_click', { cluster_id_to_increment: clusterId }).then(({ error }: { error: PostgrestError | null }) => {
            if (error) console.error("Error incrementing click:", error.message);
        });
    }, []);

    const fetchReviewsForCluster = useCallback(async (clusterId: string): Promise<ClusterReview[]> => {
        try {
            const { data, error } = await supabaseClient.rpc('get_reviews_with_usernames', { p_cluster_id: clusterId });
            if (error) throw error;
            return data || [];
        } catch(e) { handleError(e, "Fetching reviews"); return []; }
    }, [handleError]);
    
    const addReviewForCluster = useCallback(async (clusterId: string, rating: number, comment: string): Promise<ClusterReview | null> => {
        if (!auth.currentUser) throw new Error("Authentication required.");
        try {
            const newReview: TablesInsert<'cluster_reviews'> = { cluster_id: clusterId, user_id: auth.currentUser.id, rating, comment };
            const { data, error } = await supabaseClient.from('cluster_reviews')
                .insert([newReview]).select().single();
            if (error) throw error;
            showToast("Review submitted!", "success");
            return { ...(data as any), user_name: auth.currentUser.name };
        } catch(e) { handleError(e, "Adding review"); return null; }
    }, [auth.currentUser, handleError, showToast]);

    const fetchProductsForCluster = useCallback(async (clusterId: string): Promise<ClusterProduct[]> => {
        try {
            const { data, error } = await supabaseClient
                .from('cluster_products')
                .select('*')
                .eq('cluster_id', clusterId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (e) {
            handleError(e, "Fetching cluster products");
            return [];
        }
    }, [handleError]);

    const addProduct = useCallback(async (data: AddClusterProductData) => {
        if (!auth.currentUser) throw new Error("Authentication required.");
        const newProduct: TablesInsert<'cluster_products'> = {
            ...data,
            owner_id: auth.currentUser.id
        };
        const { error } = await supabaseClient.from('cluster_products').insert([newProduct]);
        if (error) { handleError(error, "Adding product"); throw error; }
        showToast("Product added successfully!", "success");
    }, [auth.currentUser, handleError, showToast]);

    const updateProduct = useCallback(async (id: string, data: Partial<AddClusterProductData>) => {
        const { error } = await supabaseClient.from('cluster_products').update(data).eq('id', id);
        if (error) { handleError(error, "Updating product"); throw error; }
        showToast("Product updated successfully!", "success");
    }, [handleError, showToast]);

    const deleteProduct = useCallback(async (id: string, imageUrl: string | null): Promise<boolean> => {
        const { error } = await supabaseClient.from('cluster_products').delete().eq('id', id);
        if (error) {
            handleError(error, "Deleting product");
            return false;
        }
        if (imageUrl) {
            await deleteFile('product-images', imageUrl);
        }
        showToast("Product deleted successfully.", "success");
        return true;
    }, [handleError, showToast, deleteFile]);
    
    const uploadProductImage = useCallback((file: File, oldImageUrl?: string | null) => {
        if (!auth.currentUser) throw new Error("Authentication required.");
        return uploadFile('product-images', file, auth.currentUser.id, oldImageUrl);
    }, [auth.currentUser, uploadFile]);

    const addEvent = useCallback(async (data: AddEventData) => {
        if (!auth.currentUser) throw new Error("Authentication required.");
        const newEvent: TablesInsert<'events'> = { ...data, created_by: auth.currentUser.id };
        const { error } = await supabaseClient.from('events').insert([newEvent]);
        if (error) { handleError(error, "Adding event"); throw error; }
        showToast("Event added successfully!", "success");
    }, [auth.currentUser, handleError, showToast]);

    const updateEvent = useCallback(async (id: string, data: Partial<AddEventData>) => {
        const updatePayload: TablesUpdate<'events'> = data;
        const { error } = await supabaseClient.from('events').update(updatePayload).eq('id', id);
        if (error) { handleError(error, "Updating event"); throw error; }
        showToast("Event updated successfully!", "success");
    }, [handleError, showToast]);

    const deleteEvent = useCallback(async (id: string): Promise<boolean> => {
        const { error } = await supabaseClient.from('events').delete().eq('id', id);
        if (error) { handleError(error, "Deleting event"); return false; }
        showToast("Event deleted successfully.", "success");
        return true;
    }, [handleError, showToast]);
    
    const uploadEventImage = useCallback((file: File, oldImageUrl?: string | null) => {
        if (!auth.currentUser) throw new Error("Authentication required.");
        return uploadFile('event-images', file, auth.currentUser.id, oldImageUrl);
    }, [auth.currentUser, uploadFile]);

    const getNotificationsForCurrentUser = useCallback(() => {
        if (!auth.currentUser) return [];
        const isAdmin = auth.currentUser.role === 'Admin';
        const isEditor = auth.currentUser.role === 'Editor';

        return state.notifications.filter(n => {
            const isCleared = n.cleared_by?.includes(auth.currentUser!.id);
            if (isCleared) return false;
            
            if (n.recipient_id === auth.currentUser!.id) return true;
            if ((isAdmin || isEditor) && n.recipient_id === 'admins') return true;
            if (isAdmin && n.recipient_id === 'grant_admins') return true;

            return false;
        });
    }, [auth.currentUser, state.notifications]);

    const markNotificationAsRead = useCallback(async(notification: Notification) => {
        if (!auth.currentUser) return;
        const newReadBy = [...(notification.read_by || []), auth.currentUser.id];
        const payload: TablesUpdate<'notifications'> = { read_by: newReadBy };
        const { error } = await supabaseClient.from('notifications').update(payload).eq('id', notification.id);
        if (error) handleError(error, "Marking notification as read");
    }, [auth.currentUser, handleError]);
    
    const markAllNotificationsAsRead = useCallback(() => {
        const unread = getNotificationsForCurrentUser().filter(n => !(n.read_by || []).includes(auth.currentUser!.id));
        unread.forEach(markNotificationAsRead);
    }, [auth.currentUser, getNotificationsForCurrentUser, markNotificationAsRead]);

    const clearAllNotifications = useCallback(async () => {
        if (!auth.currentUser) return;
        const currentUser = auth.currentUser;
        const notificationsToClear = getNotificationsForCurrentUser();
        if (notificationsToClear.length === 0) {
            return;
        }

        const notificationIds = notificationsToClear.map(n => n.id);

        const { error } = await supabaseClient.rpc('mark_notifications_cleared_by_user', { p_notification_ids: notificationIds });

        if (error) {
            handleError(error, "Clearing notifications");
            return;
        }

        showToast("Notifications cleared.", "success");

        setState(prevState => {
            const clearedIdsSet = new Set(notificationIds);
            const updatedNotifications = prevState.notifications.map(notification => {
                if (clearedIdsSet.has(notification.id)) {
                    const newClearedBy = Array.from(new Set([...(notification.cleared_by || []), currentUser.id]));
                    return { ...notification, cleared_by: newClearedBy };
                }
                return notification;
            });
            return { ...prevState, notifications: updatedNotifications };
        });
    }, [auth.currentUser, getNotificationsForCurrentUser, handleError, showToast]);

    const deleteGlobalNotification = useCallback(async (notificationId: string) => {
        const { error } = await supabaseClient.from('notifications').delete().eq('id', notificationId);
        if (error) { handleError(error, "Deleting global notification"); throw error; }
        showToast("Site-wide banner taken down.", 'success');
    }, [handleError, showToast]);

    const editUser = useCallback(async (id: string, data: EditUserData) => {
        const payload: TablesUpdate<'users'> = { name: data.name, role: data.role, tier: data.tier };
        const { error } = await supabaseClient.from('users').update(payload).eq('id', id);
        if (error) { handleError(error, "Editing user"); throw error; }
        showToast("User updated successfully.", "success");
    }, [handleError, showToast]);
    
    const deleteUser = useCallback(async (id: string) => {
        showToast("User deletion is not implemented in this version.", "info");
    }, [showToast]);
    
    const updateCurrentUserName = useCallback(async(name: string) => {
        const { error } = await supabaseClient.auth.updateUser({ data: { name }});
        if (error) { handleError(error, "Updating user name"); throw error; }
        if(auth.currentUser) {
            setAuth(prev => ({ ...prev, currentUser: { ...prev.currentUser!, name } }));
        }
        showToast("Name updated successfully.", "success");
    }, [handleError, showToast, auth.currentUser]);

    const updateCurrentUserPassword = useCallback(async(pass: string) => {
        const { error } = await supabaseClient.auth.updateUser({ password: pass });
        if (error) { handleError(error, "Updating password"); throw error; }
        showToast("Password updated successfully. You may need to log in again.", "success");
    }, [handleError, showToast]);
    
    const deleteCurrentUserAccount = useCallback(async (): Promise<boolean> => {
        if (!auth.currentUser) {
            showToast("You must be logged in to delete your account.", "error");
            return false;
        }
        try {
            const { error } = await supabaseClient.rpc('delete_own_user_account');
            if (error) throw error;
            
            showToast("Your account has been successfully deleted. You have been logged out.", "success");
            await supabaseClient.auth.signOut();
            return true;
        } catch (e) {
            handleError(e, "Deleting user account");
            return false;
        }
    }, [auth.currentUser, handleError, showToast]);

    const addFeedback = useCallback(async (content: string, isAnonymous: boolean, pageContext: string | null) => {
        if (!auth.currentUser && !isAnonymous) {
            showToast("You must be logged in to submit non-anonymous feedback.", "error");
            throw new Error("Authentication required for non-anonymous feedback.");
        }

        const payload: TablesInsert<'feedback'> = {
            content,
            page_context: pageContext,
            user_id: isAnonymous ? null : auth.currentUser?.id,
            user_email: isAnonymous ? null : auth.currentUser?.email,
            status: 'new'
        };

        const { error } = await supabaseClient.from('feedback').insert([payload]);
        if (error) {
            handleError(error, "Submitting feedback");
            throw error;
        }
    }, [auth.currentUser, handleError, showToast]);

    const updateFeedbackStatus = useCallback(async (id: string, status: FeedbackStatus) => {
        if (!auth.currentUser || (auth.currentUser.role !== 'Admin' && auth.currentUser.role !== 'Editor')) {
            showToast("You don't have permission to perform this action.", "error");
            throw new Error("Permission denied.");
        }

        const { error } = await supabaseClient.from('feedback').update({ status }).eq('id', id);

        if (error) {
            handleError(error, "Updating feedback status");
            throw error;
        }
        showToast(`Feedback status updated to '${status}'.`, "success");
    }, [auth.currentUser, handleError, showToast]);

    // Promotions actions
    const fetchAllPromotions = useCallback(async(): Promise<PromotionItem[]> => {
        try {
            const { data, error } = await supabaseClient.from('promotions').select('*').order('sort_order');
            if (error) throw error;
            return (data as PromotionItem[]) || [];
        } catch(e) { handleError(e, "Fetching all promotions"); return []; }
    }, [handleError]);

    const addPromotion = useCallback(async(data: AddPromotionData) => {
        if (!auth.currentUser) throw new Error("Auth required.");
        const newPromotion: TablesInsert<'promotions'> = { ...data, created_by: auth.currentUser.id };
        const { error } = await supabaseClient.from('promotions').insert([newPromotion]);
        if (error) { handleError(error, "Adding promotion"); throw error; }
        showToast("Promotion added.", "success");
    }, [auth.currentUser, handleError, showToast]);

    const updatePromotion = useCallback(async(id: number, data: Partial<AddPromotionData>) => {
        const updatePayload: TablesUpdate<'promotions'> = data;
        const { error } = await supabaseClient.from('promotions').update(updatePayload).eq('id', id);
        if (error) { handleError(error, "Updating promotion"); throw error; }
        showToast("Promotion updated.", "success");
    }, [handleError, showToast]);

    const deletePromotion = useCallback(async(id: number, imageUrl: string) => {
        const { error } = await supabaseClient.from('promotions').delete().eq('id', id);
        if (error) { handleError(error, "Deleting promotion"); throw error; }
        await deleteFile('promotion-images', imageUrl);
        showToast("Promotion deleted.", "success");
    }, [handleError, showToast, deleteFile]);

    const uploadPromotionImage = useCallback((file: File, oldImageUrl?: string) => {
        if (!auth.currentUser) throw new Error("Auth required.");
        return uploadFile('promotion-images', file, auth.currentUser.id, oldImageUrl);
    }, [auth.currentUser, uploadFile]);
    
    const uploadBannerImage = useCallback((file: File, oldImageUrl?: string) => {
        if (!auth.currentUser) throw new Error("Auth required.");
        return uploadFile('banner-images', file, auth.currentUser.id, oldImageUrl);
    }, [auth.currentUser, uploadFile]);

    const updateBannerImageUrl = useCallback(async(url: string) => {
        const payload: TablesUpdate<'app_config'> = { value: url };
        const { error } = await supabaseClient.from('app_config').update(payload).eq('key', BANNER_CONFIG_KEY);
        if (error) { handleError(error, "Updating banner URL"); throw error; }
        showToast("Banner image updated.", "success");
    }, [handleError, showToast]);

    const deleteBannerImage = useCallback((url: string) => deleteFile('banner-images', url), [deleteFile]);
    
    const updateBannerOverlayOpacity = useCallback(async(opacity: number) => {
        if (!auth.currentUser) throw new Error("Authentication required.");
        const payload: TablesInsert<'app_config'> = {
            key: BANNER_OPACITY_KEY,
            value: String(opacity),
            updated_by: auth.currentUser.id
        };
        const { error } = await supabaseClient.from('app_config').upsert(payload);
        if (error) { handleError(error, "Updating banner opacity"); throw error; }
        setState(prev => ({ ...prev, bannerOverlayOpacity: opacity }));
        showToast("Banner darkness updated.", "success");
    }, [auth.currentUser, handleError, showToast]);

    const setMaintenanceStatus = useCallback(async(enabled: boolean, message: string) => {
        const enablePayload: TablesUpdate<'app_config'> = { value: String(enabled) };
        const messagePayload: TablesUpdate<'app_config'> = { value: message };
        const updates = [
            supabaseClient.from('app_config').update(enablePayload).eq('key', MAINTENANCE_ENABLED_KEY),
            supabaseClient.from('app_config').update(messagePayload).eq('key', MAINTENANCE_MESSAGE_KEY)
        ];
        const results = await Promise.all(updates);
        const firstError = results.find(r => r.error)?.error;
        if (firstError) { handleError(firstError, "Setting maintenance status"); throw firstError; }
        showToast("Maintenance mode settings saved.", "success");
    }, [handleError, showToast]);

    const setSiteBanner = useCallback(async(message: string, expires_at: string | null) => {
        const bannersToDelete = state.notifications.filter(n => n.recipient_id === 'global_banner');
        if (bannersToDelete.length > 0) {
            const ids = bannersToDelete.map(b => b.id);
            const { error: deleteError } = await supabaseClient.from('notifications').delete().in('id', ids);
            if (deleteError) { handleError(deleteError, "Clearing old site banner"); throw deleteError; }
        }

        const newBanner: TablesInsert<'notifications'> = { 
            id: crypto.randomUUID(), recipient_id: 'global_banner', message, 
            type: 'status_change', timestamp: new Date().toISOString(), expires_at 
        };
        const { error } = await supabaseClient.from('notifications').insert([newBanner]);
        if (error) { handleError(error, "Setting new site banner"); throw error; }
        showToast("Site-wide banner has been updated.", "success");
    }, [handleError, showToast, state.notifications]);

    const sendGlobalPanelNotification = useCallback(async(message: string) => {
        const { error } = await supabaseClient.rpc('send_notification_to_all_users', { p_message: message });
        if (error) { handleError(error, "Sending notification to all users"); throw error; }
        showToast("Notification sent to all current users.", "success");
    }, [handleError, showToast]);

    const getDailyClusterAnalytics = useCallback(async(clusterId: string, periodDays: number): Promise<{ date: string, views: number, clicks: number }[]> => {
        try {
            const { data, error } = await supabaseClient.rpc('get_daily_cluster_analytics', { p_cluster_id: clusterId, p_period_days: periodDays });
            if (error) throw error;
            return data || [];
        } catch(e) {
            handleError(e, "Fetching daily analytics");
            return [];
        }
    }, [handleError]);

    // AI Caching Functions
    const getCachedAiInsight = useCallback(async (viewName: string, filterKey: string) => {
        try {
            const { data, error } = await supabaseClient
                .from('ai_insights')
                .select('content, data_last_updated_at')
                .eq('view_name', viewName)
                .eq('filter_key', filterKey)
                .single();
            if (error) { 
                if (error.code === 'PGRST116') return null; // "Not a single row was found"
                throw error;
            }
            return data;
        } catch(e) {
            handleError(e, "Fetching cached AI insight", false); // Don't show toast for cache miss
            return null;
        }
    }, [handleError]);

    const setCachedAiInsight = useCallback(async (viewName: string, filterKey: string, content: string, dataLastUpdatedAt: string) => {
        try {
            const { error } = await supabaseClient
                .from('ai_insights')
                .upsert(
                    [{ view_name: viewName, filter_key: filterKey, content, data_last_updated_at: dataLastUpdatedAt }],
                    { onConflict: 'view_name,filter_key' }
                );
            if (error) throw error;
        } catch(e) {
            handleError(e, "Setting cached AI insight", false);
        }
    }, [handleError]);

    const getLatestEventTimestampForYear = useCallback(async (year: number) => {
        try {
            const startDate = `${year}-01-01T00:00:00.000Z`;
            const endDate = `${year}-12-31T23:59:59.999Z`;
            const { data, error } = await supabaseClient
                .from('events')
                .select('updated_at')
                .gte('start_date', startDate)
                .lte('start_date', endDate)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null; // No events found
                throw error;
            }
            return data ? (data as any).updated_at : null;
        } catch(e) {
            handleError(e, "Fetching latest event timestamp", false);
            return null;
        }
    }, [handleError]);

    // FIX: Implemented addItineraryItem function
    const addItineraryItem = useCallback(async (itemId: string, itemType: 'cluster' | 'event', itemName: string) => {
        if (!auth.currentUser) {
            showToast("You must be logged in to create an itinerary.", "error");
            return;
        }

        try {
            // This is a simplified implementation. A real app would let users manage multiple itineraries.
            // Here, we find or create a single default itinerary for the user.
            const { data: existingItinerary, error: findError } = await supabaseClient
                .from('itineraries')
                .select('id')
                .eq('user_id', auth.currentUser.id)
                .limit(1)
                .single();
            
            if (findError && findError.code !== 'PGRST116') { // PGRST116: no rows found
                throw findError;
            }

            let itineraryId: string;
            if (existingItinerary) {
                itineraryId = existingItinerary.id;
            } else {
                // Create a new default itinerary
                // FIX: The .insert() method expects an array of objects.
                const { data: newItinerary, error: createError } = await supabaseClient
                    .from('itineraries')
                    .insert([{ user_id: auth.currentUser.id, name: "My Sarawak Trip" }])
                    .select('id')
                    .single();
                if (createError || !newItinerary) {
                    throw createError || new Error("Failed to create itinerary.");
                }
                itineraryId = newItinerary.id;
            }
            
            // Now, add the item to the itinerary, checking for duplicates
            const newItem: TablesInsert<'itinerary_items'> = {
                itinerary_id: itineraryId,
                item_id: itemId,
                item_type: itemType,
                item_name: itemName,
            };
            
            // Use upsert to prevent adding the same item twice to the same itinerary
            // FIX: The .upsert() method expects an array of objects.
            const { error: insertError } = await supabaseClient
                .from('itinerary_items')
                .upsert([newItem], { onConflict: 'itinerary_id,item_id' });

            if (insertError) {
                // If it's a unique constraint violation, it means it's already there.
                if (insertError.code === '23505') {
                     showToast(`"${itemName}" is already in your itinerary.`, 'info');
                } else {
                    throw insertError;
                }
            } else {
                showToast(`Added "${itemName}" to your itinerary!`, 'success');
            }

        } catch (e) {
            handleError(e, "Adding item to itinerary");
        }
    }, [auth.currentUser, showToast, handleError]);

    const togglePhoneView = () => setIsPhoneView(p => !p);

    const contextValue = useMemo(() => ({
        ...state,
        ...auth,
        isPhoneView,
        isPremiumUser,
        togglePhoneView,
        loginUserWithPassword,
        registerUserWithEmailPassword,
        sendMagicLink,
        logoutUser,
        addGrantApplication,
        reapplyForGrant,
        rejectPendingApplication,
        makeConditionalOffer,
        acceptConditionalOffer,
        declineConditionalOffer,
        submitEarlyReport,
        submitFinalReport,
        approveEarlyReportAndDisburse,
        rejectEarlyReportSubmission,
        rejectFinalReportSubmission,
        completeGrantApplication,
        createSignedUrl,
        addCluster,
        addClustersBatch,
        updateCluster,
        deleteCluster,
        uploadClusterImage,
        incrementClusterView,
        incrementClusterClick,
        transferClusterOwnership,
        fetchReviewsForCluster,
        addReviewForCluster,
        fetchProductsForCluster,
        addProduct,
        updateProduct,
        deleteProduct,
        uploadProductImage,
        addEvent,
        updateEvent,
        deleteEvent,
        uploadEventImage,
        getNotificationsForCurrentUser,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearAllNotifications,
        deleteGlobalNotification,
        editUser,
        deleteUser,
        updateCurrentUserName,
        updateCurrentUserPassword,
        deleteCurrentUserAccount,
        addFeedback,
        updateFeedbackStatus,
        fetchAllPromotions,
        addPromotion,
        updatePromotion,
        deletePromotion,
        uploadPromotionImage,
        refreshDashboardPromotions,
        uploadBannerImage,
        updateBannerImageUrl,
        deleteBannerImage,
        updateBannerOverlayOpacity,
        setMaintenanceStatus,
        setSiteBanner,
        sendGlobalPanelNotification,
        getDailyClusterAnalytics,
        uploadVisitorAnalyticsBatch,
        addItineraryItem,
        getCachedAiInsight,
        setCachedAiInsight,
        getLatestEventTimestampForYear,
    }), [
        state, auth, isPhoneView, isPremiumUser,
        loginUserWithPassword, registerUserWithEmailPassword, sendMagicLink, logoutUser, addGrantApplication, reapplyForGrant, rejectPendingApplication,
        makeConditionalOffer, acceptConditionalOffer, declineConditionalOffer, submitEarlyReport, submitFinalReport, approveEarlyReportAndDisburse,
        rejectEarlyReportSubmission, rejectFinalReportSubmission, completeGrantApplication, createSignedUrl, addCluster, addClustersBatch, updateCluster, deleteCluster,
        uploadClusterImage, incrementClusterView, incrementClusterClick, transferClusterOwnership, fetchReviewsForCluster, addReviewForCluster,
        fetchProductsForCluster, addProduct, updateProduct, deleteProduct, uploadProductImage, addEvent, updateEvent, deleteEvent, uploadEventImage, getNotificationsForCurrentUser, markNotificationAsRead, markAllNotificationsAsRead,
        clearAllNotifications, deleteGlobalNotification, editUser, deleteUser, updateCurrentUserName, updateCurrentUserPassword, deleteCurrentUserAccount,
        addFeedback, updateFeedbackStatus,
        fetchAllPromotions, addPromotion, updatePromotion, deletePromotion, uploadPromotionImage, refreshDashboardPromotions,
        uploadBannerImage, updateBannerImageUrl, deleteBannerImage, updateBannerOverlayOpacity, setMaintenanceStatus,
        setSiteBanner, sendGlobalPanelNotification, getDailyClusterAnalytics, uploadVisitorAnalyticsBatch, addItineraryItem, getCachedAiInsight, setCachedAiInsight, getLatestEventTimestampForYear
    ]);

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};