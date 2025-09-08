import { useState, useCallback, useMemo } from 'react';
import { ViewName } from '../types.ts';

interface BreadcrumbItem {
  label: string;
  view: ViewName;
  isActive: boolean;
}

interface NavigationState {
  currentView: ViewName;
  previousView: ViewName | null;
  breadcrumbs: BreadcrumbItem[];
  history: ViewName[];
}

// View hierarchy for generating breadcrumbs
const VIEW_HIERARCHY: Record<ViewName, { parent?: ViewName; label: string }> = {
  [ViewName.MainMenu]: { label: 'Home' },
  [ViewName.Dashboard]: { label: 'Dashboard' },
  [ViewName.TourismCluster]: { parent: ViewName.Dashboard, label: 'Tourism Clusters' },
  [ViewName.TourismMapping]: { parent: ViewName.TourismCluster, label: 'Tourism Mapping' },
  [ViewName.ManageMyClusters]: { parent: ViewName.TourismCluster, label: 'Manage My Clusters' },
  [ViewName.GrantApplications]: { parent: ViewName.Dashboard, label: 'Grant Applications' },
  [ViewName.TourismStatistics]: { parent: ViewName.Dashboard, label: 'Tourism Statistics' },
  [ViewName.EventsCalendar]: { parent: ViewName.Dashboard, label: 'Events Calendar' },
  [ViewName.AIPlanner]: { parent: ViewName.Dashboard, label: 'AI Planner' },
  [ViewName.UserManagement]: { parent: ViewName.Settings, label: 'User Management' },
  [ViewName.WebsiteManagement]: { parent: ViewName.Settings, label: 'Website Management' },
  [ViewName.SystemFeedback]: { parent: ViewName.Settings, label: 'System Feedback' },
  [ViewName.Settings]: { parent: ViewName.Dashboard, label: 'Settings' },
};

/**
 * Custom hook for managing application navigation state and breadcrumbs
 */
export function useNavigation(initialView: ViewName = ViewName.Dashboard) {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentView: initialView,
    previousView: null,
    breadcrumbs: [],
    history: [initialView],
  });

  // Generate breadcrumbs based on current view
  const generateBreadcrumbs = useCallback((view: ViewName): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [];
    let currentView = view;

    // Build breadcrumb chain by following parent hierarchy
    while (currentView) {
      const viewInfo = VIEW_HIERARCHY[currentView];
      if (viewInfo) {
        breadcrumbs.unshift({
          label: viewInfo.label,
          view: currentView,
          isActive: currentView === view,
        });
        currentView = viewInfo.parent || (null as unknown as ViewName);
      } else {
        break;
      }
    }

    return breadcrumbs;
  }, []);

  // Navigate to a new view
  const navigateTo = useCallback((view: ViewName) => {
    setNavigationState(prev => {
      const newHistory = [...prev.history];
      
      // Don't add duplicate consecutive entries
      if (newHistory[newHistory.length - 1] !== view) {
        newHistory.push(view);
      }
      
      // Keep history to reasonable size
      if (newHistory.length > 50) {
        newHistory.splice(0, newHistory.length - 50);
      }

      return {
        currentView: view,
        previousView: prev.currentView,
        breadcrumbs: generateBreadcrumbs(view),
        history: newHistory,
      };
    });
  }, [generateBreadcrumbs]);

  // Go back to previous view
  const goBack = useCallback(() => {
    setNavigationState(prev => {
      if (prev.history.length <= 1) {
        return prev; // Can't go back further
      }

      const newHistory = [...prev.history];
      newHistory.pop(); // Remove current view
      const previousView = newHistory[newHistory.length - 1];

      return {
        currentView: previousView,
        previousView: prev.currentView,
        breadcrumbs: generateBreadcrumbs(previousView),
        history: newHistory,
      };
    });
  }, [generateBreadcrumbs]);

  // Navigate to breadcrumb item
  const navigateToBreadcrumb = useCallback((view: ViewName) => {
    navigateTo(view);
  }, [navigateTo]);

  // Check if can go back
  const canGoBack = useMemo(() => {
    return navigationState.history.length > 1;
  }, [navigationState.history.length]);

  // Get view info
  const getCurrentViewInfo = useCallback((view?: ViewName) => {
    const targetView = view || navigationState.currentView;
    return VIEW_HIERARCHY[targetView] || { label: 'Unknown View' };
  }, [navigationState.currentView]);

  // Reset navigation (useful for logout or app reset)
  const resetNavigation = useCallback((newInitialView: ViewName = ViewName.Dashboard) => {
    setNavigationState({
      currentView: newInitialView,
      previousView: null,
      breadcrumbs: generateBreadcrumbs(newInitialView),
      history: [newInitialView],
    });
  }, [generateBreadcrumbs]);

  return {
    // State
    currentView: navigationState.currentView,
    previousView: navigationState.previousView,
    breadcrumbs: navigationState.breadcrumbs,
    history: navigationState.history,
    
    // Actions
    navigateTo,
    goBack,
    navigateToBreadcrumb,
    resetNavigation,
    
    // Utilities
    canGoBack,
    getCurrentViewInfo,
  };
}