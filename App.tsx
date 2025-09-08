

import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { Theme } from './types.ts';
import { AppProvider, useAppContext } from './components/AppContext.tsx';
import { ThemeContext } from './components/ThemeContext.tsx';
import { ToastProvider } from './components/ToastContext.tsx';
import { ToastContainer } from './components/ui/Toast.tsx';
import { LogoIcon } from './constants.tsx';
import Spinner from './components/ui/Spinner.tsx';
import { AccessibilityProvider } from './components/AccessibilityContext.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';

// Lazy load components for better performance
const LoginView = lazy(() => import('./components/views/LoginView.tsx'));
const GuestLayout = lazy(() => import('./components/layouts/GuestLayout.tsx'));
const AuthenticatedLayout = lazy(() => import('./components/layouts/AuthenticatedLayout.tsx'));
const MaintenanceView = lazy(() => import('./components/views/MaintenanceView.tsx'));
const AuthCallback = lazy(() => import('./components/auth/AuthCallback.tsx'));

/**
 * A full-screen loader displayed during critical initialization phases.
 */
const FullScreenLoader: React.FC<{ message?: string }> = React.memo(({ message = "Initializing System..." }) => (
    <div className="flex h-screen w-screen items-center justify-center bg-brand-bg-light dark:bg-brand-bg">
        <div className="flex flex-col items-center space-y-4 text-center">
            <LogoIcon className="h-24 w-auto animate-pulse" />
            <div>
                <h1 className="text-2xl font-bold text-brand-green-text dark:text-brand-dark-green-text">INTOURCAMS</h1>
                <p className="text-sm text-brand-text-secondary-light dark:text-brand-text-secondary">
                    Integrated Tourism Coordination and Monitoring System
                </p>
            </div>
            <Spinner className="w-8 h-8 text-brand-green dark:text-brand-dark-green-text" />
            <p className="text-brand-text-secondary-light dark:text-brand-text-secondary">{message}</p>
        </div>
    </div>
));

FullScreenLoader.displayName = 'FullScreenLoader';

/**
 * Suspense fallback component for lazy-loaded components
 */
const SuspenseFallback: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
    <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-4 text-center">
            <Spinner className="w-8 h-8 text-brand-green dark:text-brand-dark-green-text" />
            <p className="text-brand-text-secondary-light dark:text-brand-text-secondary">{message}</p>
        </div>
    </div>
);

/**
 * Renders the main content based on authentication, initialization, and maintenance states.
 * This component acts as a router, directing the user to the appropriate layout or view.
 */
const AppContent: React.FC = () => {
    const { 
        currentUser, 
        isInitializing, 
        isLoggingOut,
        logoutUser, 
        isAuthenticated,
        isMaintenanceMode,
        maintenanceMessage
    } = useAppContext();

    // State to control whether to show the GuestLayout or the LoginView for unauthenticated users.
    const [showGuestLayout, setShowGuestLayout] = useState(true);

    // Check if this is an auth callback URL
    const isAuthCallback = typeof window !== 'undefined' && 
        (window.location.pathname === '/auth/callback' || 
         window.location.search.includes('code=') || 
         window.location.hash.includes('access_token='));

    // Handle auth callback
    if (isAuthCallback) {
        return (
            <Suspense fallback={<SuspenseFallback message="Authenticating..." />}>
                <AuthCallback />
            </Suspense>
        );
    }

    // Initial check for loading states. This is the highest priority.
    if (isInitializing) {
        return <FullScreenLoader message="Initializing System..." />;
    }
    
    if (isLoggingOut) {
        return <FullScreenLoader message="Logging out..." />;
    }

    // --- Maintenance Mode Flow ---
    if (isMaintenanceMode) {
        // Authenticated users (like admins) might be able to bypass maintenance.
        if (isAuthenticated && currentUser) {
            if (currentUser.role === 'Admin' || currentUser.role === 'Editor') {
                return (
                    <Suspense fallback={<SuspenseFallback message="Loading dashboard..." />}>
                        <AuthenticatedLayout handleLogout={logoutUser} />
                    </Suspense>
                );
            }
            // Other authenticated users see the maintenance page with a logout option.
            return (
                <Suspense fallback={<SuspenseFallback message="Loading maintenance page..." />}>
                    <MaintenanceView message={maintenanceMessage} onLogout={logoutUser} />
                </Suspense>
            );
        }
        
        // Unauthenticated users see the maintenance page with an option to log in (for admins).
        // If they try to log in, we show the LoginView.
        if (!showGuestLayout) {
            return (
                <Suspense fallback={<SuspenseFallback message="Loading login..." />}>
                    <LoginView onGuestAccess={() => setShowGuestLayout(true)} />
                </Suspense>
            );
        }
        return (
            <Suspense fallback={<SuspenseFallback message="Loading maintenance page..." />}>
                <MaintenanceView message={maintenanceMessage} onAdminLogin={() => setShowGuestLayout(false)} />
            </Suspense>
        );
    }

    // --- Normal Flow (Maintenance Mode OFF) ---
    if (isAuthenticated) {
        return (
            <Suspense fallback={<SuspenseFallback message="Loading dashboard..." />}>
                <AuthenticatedLayout handleLogout={logoutUser} />
            </Suspense>
        );
    }
    
    // Unauthenticated flow: show either the guest-facing content or the login form.
    if (showGuestLayout) {
        return (
            <Suspense fallback={<SuspenseFallback message="Loading guest view..." />}>
                <GuestLayout onSwitchToLogin={() => setShowGuestLayout(false)} />
            </Suspense>
        );
    }
    
    return (
        <Suspense fallback={<SuspenseFallback message="Loading login..." />}>
            <LoginView onGuestAccess={() => setShowGuestLayout(true)} />
        </Suspense>
    );
};

/**
 * The root component of the application.
 * It sets up global providers for Toast notifications, application state (AppContext), and theming.
 */
const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('dark');

  // Effect to apply the current theme to the root HTML element.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, [theme]);

  // Memoized callback to prevent re-creation on every render.
  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  // Memoized context value to prevent unnecessary re-renders of consumers.
  const themeContextValue = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log error to console in development
        if (import.meta.env.MODE === 'development') {
          console.error('App Error Boundary caught error:', error, errorInfo);
        }
        // In production, you might want to send this to an error reporting service
        // Example: sendToErrorReporting(error, errorInfo);
      }}
    >
      <ToastProvider>
        <ErrorBoundary fallback={<div className="p-4 text-center text-red-500">Error loading app context</div>}>
          <AppProvider>
            <ErrorBoundary fallback={<div className="p-4 text-center text-red-500">Error loading accessibility settings</div>}>
              <AccessibilityProvider>
                <ThemeContext.Provider value={themeContextValue}>
                    <div className="font-sans bg-brand-bg-light dark:bg-brand-bg text-brand-text-light dark:text-brand-text">
                        <ErrorBoundary fallback={<div className="p-4 text-center text-red-500">Error loading main content</div>}>
                            <AppContent />
                        </ErrorBoundary>
                        <ToastContainer />
                    </div>
                </ThemeContext.Provider>
              </AccessibilityProvider>
            </ErrorBoundary>
          </AppProvider>
        </ErrorBoundary>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;