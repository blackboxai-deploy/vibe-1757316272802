import React, { useMemo, useState, useRef, useEffect } from 'react';
import Card from '../ui/Card.tsx';
import Button from '../ui/Button.tsx';
import { 
    UsersIcon, 
    SuitcaseIcon, 
    CheckListIcon, 
    CalendarDaysIcon, 
    TourismClusterIcon, 
    EventsCalendarIcon,
    PlusIcon,
    SearchIcon,
} from '../../constants.tsx';
import SearchInput from '../ui/SearchInput.tsx';
import { ViewName, GrantApplication, Cluster, AppEvent } from '../../types.ts';
import { useAppContext } from '../AppContext.tsx';
import PromotionCarousel from '../ui/PromotionCarousel.tsx';
import Spinner from '../ui/Spinner.tsx';
import PromotionManagementModal from '../ui/PromotionManagementModal.tsx';
import BannerEditModal from '../ui/BannerEditModal.tsx';
import SearchResultsModal from '../ui/SearchResultsModal.tsx';
import { searchItems } from '../../utils/fuzzySearch.ts';
import { useDebounce } from '../../hooks/useDebounce.ts';

interface StatCardProps {
  title: string;
  value: string;
  percentage?: string;
  icon: React.ReactNode;
  detailsLabel?: string;
  onDetailsClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, percentage, icon, detailsLabel = "View Details", onDetailsClick }) => (
  <Card className="flex-1 min-w-[150px]">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-brand-text-secondary-light dark:text-brand-text-secondary text-sm">{title}</p>
        <p className="text-3xl font-bold text-brand-green-text dark:text-brand-dark-green-text mt-1">{value}</p>
        {percentage && <p className="text-sm text-green-500 dark:text-green-400 mt-1">{percentage}</p>}
      </div>
      <div className="p-2 bg-neutral-200-light dark:bg-neutral-700-dark rounded-lg text-brand-green dark:text-brand-dark-green-text">
        {icon}
      </div>
    </div>
    <button 
        onClick={onDetailsClick} 
        className="text-sm text-brand-green-text dark:text-brand-dark-green-text hover:underline mt-4 cursor-pointer"
        aria-label={`${detailsLabel} for ${title}`}
    >
        {detailsLabel}
    </button>
  </Card>
);

const getStatusBadgeClasses = (status: GrantApplication['status']) => {
    switch (status) {
      case 'Approved':
      case 'Complete':
      case 'Early Report Submitted':
      case 'Final Report Submitted':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Rejected': 
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Pending':
      case 'Conditional Offer':
      case 'Early Report Required':
      case 'Final Report Required':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: 
        return 'bg-neutral-200 text-neutral-800 dark:bg-neutral-600 dark:text-neutral-200';
    }
};

// A valid 1x1 transparent GIF, replacing the corrupted base64 string.
const SAGO_PALM_IMAGE_BASE64 = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const SAGO_PALM_IMAGE_URL = `data:image/gif;base64,${SAGO_PALM_IMAGE_BASE64}`;


interface DashboardViewProps {
  setCurrentView: (view: ViewName) => void;
  onAuthRequired?: (message?: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ setCurrentView, onAuthRequired }) => {
  const { grantApplications, clusters: allClusters, events: allEvents, currentUser, promotions, isLoadingPromotions, refreshDashboardPromotions, bannerImageUrl, isLoadingBannerImage, bannerOverlayOpacity } = useAppContext();
  const [isManagePromosOpen, setIsManagePromosOpen] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isBannerEditModalOpen, setIsBannerEditModalOpen] = useState(false);

  // New state for search results
  const [isSearchResultsModalOpen, setIsSearchResultsModalOpen] = useState(false);
  const [searchQueryForModal, setSearchQueryForModal] = useState('');
  const [searchResults, setSearchResults] = useState<{ clusters: Cluster[], events: AppEvent[], grants: GrantApplication[] }>({ clusters: [], events: [], grants: [] });
  
  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(globalSearchTerm, 300);

  const finalBannerUrl = bannerImageUrl || SAGO_PALM_IMAGE_URL;

  const isGuest = !currentUser;
  const canManagePromos = currentUser?.role === 'Admin' || currentUser?.role === 'Editor';
  const isAdminOrEditor = canManagePromos;

  const pendingApplicationsCount = grantApplications.filter(app => app.status === 'Pending').length;
  const activeClustersCount = allClusters.length;
  const totalApplicationsCount = grantApplications.length;

  const pendingReviewCount = useMemo(() => 
    grantApplications.filter(app => app.status === 'Pending').length,
    [grantApplications]
  );
  const reportsToApproveCount = useMemo(() =>
    grantApplications.filter(app => ['Early Report Submitted', 'Final Report Submitted'].includes(app.status)).length,
    [grantApplications]
  );

  const timeAgo = (date: string | Date): string => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `just now`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(months / 12);
    return `${years}y ago`;
  };

  const recentActivities = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const newClusters = allClusters
      .filter(c => new Date(c.created_at) > thirtyDaysAgo)
      .map(c => ({
        id: `cluster-${c.id}`, icon: TourismClusterIcon, text: `New cluster '${c.name}' was added.`, date: new Date(c.created_at),
      }));

    const eventActivities = allEvents
      .filter(e => new Date(e.created_at) > thirtyDaysAgo || (now >= new Date(e.start_date) && now <= new Date(e.end_date)))
      .map(e => ({
        id: `event-${e.id}`, icon: EventsCalendarIcon, text: (now >= new Date(e.start_date) && now <= new Date(e.end_date)) ? `The event '${e.title}' is currently ongoing.` : `New event '${e.title}' has been added to the calendar.`, date: new Date(e.created_at),
      }));
      
    return [...newClusters, ...eventActivities]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 5);

  }, [allClusters, allEvents]);

  const myRecentApplications = useMemo(() => {
    if (!currentUser) return [];
    return grantApplications
      .filter(app => app.applicant_id === currentUser.id)
      .sort((a, b) => new Date(b.last_update_timestamp).getTime() - new Date(a.last_update_timestamp).getTime())
      .slice(0, 4);
  }, [grantApplications, currentUser]);

  const handleNavigation = (view: ViewName, authIsRequired: boolean) => {
    if (isGuest && authIsRequired) {
        let message = '';
        if (view === ViewName.ManageMyClusters) {
            message = "To manage your tourism clusters, please log in or register as a Tourism Player.";
        } else if (view === ViewName.GrantApplications) {
            message = "To apply for or track grants, please log in or create an account.";
        }
        onAuthRequired?.(message);
    } else {
        setCurrentView(view);
    }
  };

  const handleClosePromoModal = () => {
    setIsManagePromosOpen(false);
    refreshDashboardPromotions();
  };

  const handleGlobalSearch = (searchTerm: string = globalSearchTerm) => {
    const term = searchTerm.trim();
    if (!term) {
      setSearchResults({ clusters: [], events: [], grants: [] });
      return;
    }

    setIsSearching(true);

    // Use fuzzy search for better results
    const matchingClusters = searchItems(
      term,
      allClusters,
      (cluster) => [
        cluster.name || '',
        cluster.description || '',
        cluster.location || '',
        cluster.display_address || '',
        ...(cluster.category || []).filter(cat => typeof cat === 'string')
      ],
      { threshold: 0.3, maxResults: 20 }
    );

    const matchingEvents = searchItems(
      term,
      allEvents,
      (event) => [
        event.title || '',
        event.description || '',
        event.category || '',
        event.location_name || '',
        event.display_address || ''
      ],
      { threshold: 0.3, maxResults: 20 }
    );

    const matchingGrants = searchItems(
      term,
      grantApplications,
      (grant) => [
        grant.project_name || '',
        grant.organization_name || '',
        grant.project_description || '',
        grant.id
      ],
      { threshold: 0.3, maxResults: 20 }
    );

    setSearchResults({ 
      clusters: matchingClusters, 
      events: matchingEvents, 
      grants: matchingGrants 
    });
    setSearchQueryForModal(term);
    setIsSearchResultsModalOpen(true);
    setIsSearching(false);
  };

  // Trigger search when debounced term changes
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      handleGlobalSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, allClusters, allEvents, grantApplications]);

  const handleResultClick = (item: Cluster | AppEvent | GrantApplication, type: 'cluster' | 'event' | 'grant') => {
    if (type === 'cluster') {
        sessionStorage.setItem('initialClusterSearch', (item as Cluster).name);
        setCurrentView(ViewName.TourismCluster);
    } else if (type === 'event') {
        sessionStorage.setItem('initialEventSearch', (item as AppEvent).title);
        setCurrentView(ViewName.EventsCalendar);
    } else if (type === 'grant') {
        if (isGuest && onAuthRequired) {
            onAuthRequired("You need to be logged in to view grant applications.");
        } else {
            sessionStorage.setItem('initialGrantSearch', (item as GrantApplication).project_name);
            setCurrentView(ViewName.GrantApplications);
        }
    }
    setIsSearchResultsModalOpen(false); // Close modal on navigation
  };

  return (
    <>
      {isLoadingBannerImage ? (
          <div className="relative w-full h-[calc(100vh-4rem)] bg-neutral-800 flex items-center justify-center">
              <Spinner className="w-8 h-8 text-white"/>
          </div>
      ) : (
        <div 
          className="relative w-full h-[calc(100vh-4rem)] bg-cover bg-center"
          style={{ backgroundImage: `url(${finalBannerUrl})` }}
        >
              <div 
                  className="absolute inset-0 flex flex-col items-center justify-center text-center p-4"
                  style={{ backgroundColor: `rgba(0, 0, 0, ${bannerOverlayOpacity})` }}
              >
                  <h1 className="text-4xl md:text-5xl font-bold text-white text-shadow-md">Welcome to INTOURCAMS</h1>
                  <p className="mt-2 text-lg text-white/90 text-shadow-md max-w-2xl italic">
                      Tourism Compass, Connecting Partners
                  </p>
                  <div className="mt-6 w-full max-w-xl">
                      <SearchInput
                          value={globalSearchTerm}
                          onChange={setGlobalSearchTerm}
                          onSearch={handleGlobalSearch}
                          placeholder="Search for clusters, events, grants..."
                          isLoading={isSearching}
                          className="text-lg"
                          inputClassName="!bg-white/20 dark:!bg-black/30 !border-white/30 focus:!ring-brand-green focus:!border-brand-green !text-white placeholder:!text-white/70"
                          icon={<SearchIcon className="w-5 h-5 text-white/70" />}
                          debounceMs={300}
                          showSuggestions={false}
                      />
                  </div>
              </div>
              <div 
                className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white animate-bounce opacity-70 cursor-pointer group"
                onClick={() => contentRef.current?.scrollIntoView({ behavior: 'smooth' })}
                title="Scroll down"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 group-hover:scale-110 transition-transform">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 12.75 3 3m0 0 3-3m-3 3v-7.5" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
                </svg>
                <span className="sr-only">Scroll down</span>
              </div>
        </div>
      )}
      
      <div ref={contentRef} className="space-y-6 pt-12 p-4 sm:p-6">
        {canManagePromos && (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsBannerEditModalOpen(true)}>
                Edit Welcome Banner
            </Button>
            <Button variant="secondary" onClick={() => setIsManagePromosOpen(true)}>
              Manage Promotions
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Column 1: Promotions */}
            <div>
                {isLoadingPromotions ? (
                  <div className="h-80 flex items-center justify-center bg-neutral-200-light dark:bg-neutral-800-dark/50 rounded-lg">
                    <Spinner />
                    <p className="ml-2">Loading Promotions...</p>
                  </div>
                ) : promotions.length > 0 ? (
                  <PromotionCarousel items={promotions} setCurrentView={setCurrentView} onAuthRequired={onAuthRequired} />
                ) : (
                  <div className="h-80 flex flex-col items-center justify-center bg-neutral-100-light dark:bg-neutral-800-dark/50 rounded-lg border-2 border-dashed border-neutral-300-light dark:border-neutral-700-dark text-center p-4">
                    <h3 className="text-lg font-semibold text-brand-text-light dark:text-brand-text">No Active Promotions</h3>
                    {canManagePromos ? (
                      <>
                        <p className="mt-1 text-sm text-brand-text-secondary-light dark:text-brand-text-secondary max-w-sm">
                          Click the button below to add a new promotional slide to the dashboard carousel.
                        </p>
                        <Button variant="primary" size="sm" className="mt-4" onClick={() => setIsManagePromosOpen(true)} leftIcon={<PlusIcon className="w-4 h-4" />}>
                          Add a Promotion
                        </Button>
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-brand-text-secondary-light dark:text-brand-text-secondary">
                        Check back later for featured content and announcements.
                      </p>
                    )}
                  </div>
                )}
            </div>

            {/* Column 2: Statistics */}
            <div className="grid grid-cols-2 gap-2 sm:gap-6">
                <StatCard 
                    title="Total Visitors" 
                    value="1.2M+" 
                    percentage="+15%" 
                    icon={<UsersIcon className="w-6 h-6"/>} 
                    onDetailsClick={() => handleNavigation(ViewName.TourismStatistics, false)}
                />
                <StatCard 
                    title="Active Clusters" 
                    value={activeClustersCount.toString()} 
                    icon={<SuitcaseIcon className="w-6 h-6"/>}
                    onDetailsClick={() => handleNavigation(ViewName.TourismCluster, false)}
                />
                <StatCard 
                    title="Grant Applications" 
                    value={isGuest ? 'N/A' : totalApplicationsCount.toString()} 
                    detailsLabel={isGuest ? 'Login to View' : `${pendingApplicationsCount} Pending View Details`} 
                    icon={<CheckListIcon className="w-6 h-6"/>}
                    onDetailsClick={() => handleNavigation(ViewName.GrantApplications, true)}
                />
                <StatCard 
                    title="Upcoming Events" 
                    value="Live" 
                    detailsLabel="View Calendar" 
                    icon={<CalendarDaysIcon className="w-6 h-6"/>}
                    onDetailsClick={() => handleNavigation(ViewName.EventsCalendar, false)}
                />
            </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {isAdminOrEditor ? (
              <Card title="Pending Tasks">
                  <p className="text-sm text-brand-text-secondary-light dark:text-brand-text-secondary mb-4">
                      Review new submissions and reports that require your attention.
                  </p>
                  <div className="space-y-3">
                      <button 
                          onClick={() => setCurrentView(ViewName.GrantApplications)}
                          className="w-full p-3 rounded-md bg-neutral-100-light dark:bg-neutral-800-dark/50 hover:bg-neutral-200-light dark:hover:bg-neutral-700-dark transition-colors flex justify-between items-center text-left"
                      >
                          <div>
                              <p className="font-semibold text-brand-text-light dark:text-brand-text">New Grant Applications</p>
                              <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary">Awaiting initial review</p>
                          </div>
                          <span className="text-lg font-bold text-brand-green dark:text-brand-dark-green-text">{pendingReviewCount}</span>
                      </button>
                      <button 
                          onClick={() => setCurrentView(ViewName.GrantApplications)}
                          className="w-full p-3 rounded-md bg-neutral-100-light dark:bg-neutral-800-dark/50 hover:bg-neutral-200-light dark:hover:bg-neutral-700-dark transition-colors flex justify-between items-center text-left"
                      >
                          <div>
                              <p className="font-semibold text-brand-text-light dark:text-brand-text">Submitted Reports</p>
                              <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary">Awaiting approval</p>
                          </div>
                          <span className="text-lg font-bold text-brand-green dark:text-brand-dark-green-text">{reportsToApproveCount}</span>
                      </button>
                  </div>
                  {(pendingReviewCount === 0 && reportsToApproveCount === 0) && (
                      <p className="text-center text-sm text-brand-text-secondary-light dark:text-brand-text-secondary py-4">No pending tasks. Well done!</p>
                  )}
              </Card>
            ) : currentUser ? (
              <Card title="My Recent Grant Applications">
                  {myRecentApplications.length > 0 ? (
                      <div className="space-y-3">
                          {myRecentApplications.map(app => (
                              <div key={app.id} className="p-3 rounded-md bg-neutral-100-light dark:bg-neutral-800-dark/50">
                                  <div className="flex justify-between items-start gap-2">
                                      <p className="font-semibold text-brand-text-light dark:text-brand-text truncate pr-2" title={app.project_name}>{app.project_name}</p>
                                      <span className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${getStatusBadgeClasses(app.status)}`}>{app.status}</span>
                                  </div>
                                  <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary mt-1">
                                      Last updated: {new Date(app.last_update_timestamp).toLocaleDateString()}
                                  </p>
                              </div>
                          ))}
                          <div className="text-center pt-3 border-t border-neutral-200-light dark:border-neutral-700-dark">
                              <Button variant="secondary" onClick={() => setCurrentView(ViewName.GrantApplications)}>
                                  View All My Applications
                              </Button>
                          </div>
                      </div>
                  ) : (
                      <div className="text-center py-8">
                          <p className="text-sm text-brand-text-secondary-light dark:text-brand-text-secondary">
                            You haven't submitted any applications yet.
                          </p>
                          <Button variant="primary" size="sm" className="mt-4" onClick={() => setCurrentView(ViewName.GrantApplications)}>
                              Start a New Application
                          </Button>
                      </div>
                  )}
              </Card>
            ) : (
              <Card title="Quick Actions">
                  <p className="text-sm text-brand-text-secondary-light dark:text-brand-text-secondary mb-4">Access key features quickly.</p>
                  <div className="space-y-3">
                  <Button variant="secondary" className="w-full justify-start" onClick={() => handleNavigation(ViewName.ManageMyClusters, true)}>Manage Clusters</Button>
                  <Button variant="secondary" className="w-full justify-start" onClick={() => handleNavigation(ViewName.EventsCalendar, false)}>Check Events</Button>
                  <Button variant="secondary" className="w-full justify-start" onClick={() => handleNavigation(ViewName.GrantApplications, true)}>Apply Grant</Button>
                  <Button variant="secondary" className="w-full justify-start" onClick={() => handleNavigation(ViewName.TourismStatistics, false)}>View Analytics</Button>
                  </div>
              </Card>
            )}

          <Card title="Recent Activities">
            <ul className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map(activity => (
                  <li key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1 text-brand-green dark:text-brand-dark-green-text">
                      <activity.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-brand-text-light dark:text-brand-text">{activity.text}</p>
                      <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary">{timeAgo(activity.date)}</p>
                    </div>
                  </li>
                ))
              ) : (
                <p className="text-center text-sm text-brand-text-secondary-light dark:text-brand-text-secondary py-4">No recent activities to display.</p>
              )}
            </ul>
          </Card>
        </div>
      </div>
      <SearchResultsModal
          isOpen={isSearchResultsModalOpen}
          onClose={() => setIsSearchResultsModalOpen(false)}
          query={searchQueryForModal}
          results={searchResults}
          onResultClick={handleResultClick}
      />
      {canManagePromos && (
        <PromotionManagementModal isOpen={isManagePromosOpen} onClose={handleClosePromoModal} />
      )}
       {canManagePromos && (
          <BannerEditModal 
              isOpen={isBannerEditModalOpen} 
              onClose={() => setIsBannerEditModalOpen(false)}
              currentImage={finalBannerUrl}
              defaultImage={SAGO_PALM_IMAGE_URL}
          />
      )}
    </>
  );
};

export default React.memo(DashboardView);