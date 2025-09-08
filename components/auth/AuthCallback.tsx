import React, { useEffect, useState } from 'react';
import { authService } from '../../services/api.ts';
import { useToast } from '../ToastContext.tsx';
import Spinner from '../ui/Spinner.tsx';
import Card from '../ui/Card.tsx';
import Button from '../ui/Button.tsx';

/**
 * Component to handle Magic Link authentication callback
 * This should be rendered when users click the magic link in their email
 */
const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('processing');
        
        // Handle the auth callback
        const response = await authService.handleAuthCallback();
        
        if (response.success && response.data?.session) {
          setStatus('success');
          showToast('Successfully authenticated! Welcome to INTOURCAMS.', 'success');
          
          // Redirect to dashboard after a brief success message
          setTimeout(() => {
            // The AppContext will handle the auth state change automatically
            // due to the Supabase auth state listener
            window.location.href = '/';
          }, 2000);
        } else {
          throw new Error(response.error || 'Authentication failed');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Authentication failed');
        showToast('Authentication failed. Please try again.', 'error');
      }
    };

    // Only run if we're in the browser and have URL parameters
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const fragment = window.location.hash.substring(1);
      const fragmentParams = new URLSearchParams(fragment);
      
      // Check if this looks like an auth callback
      if (urlParams.has('code') || fragmentParams.has('access_token') || fragmentParams.has('error')) {
        handleAuthCallback();
      } else {
        // Not an auth callback, redirect to home
        setStatus('error');
        setErrorMessage('Invalid authentication link');
      }
    }
  }, [showToast]);

  const handleRetry = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg-light dark:bg-brand-bg p-4">
      <Card className="w-full max-w-md">
        <div className="text-center space-y-6">
          {status === 'processing' && (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900">
                <Spinner className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-brand-text-light dark:text-brand-text mb-2">
                  Signing you in...
                </h2>
                <p className="text-brand-text-secondary-light dark:text-brand-text-secondary">
                  Please wait while we authenticate your magic link.
                </p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900">
                <svg 
                  className="h-8 w-8 text-green-600 dark:text-green-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-brand-text-light dark:text-brand-text mb-2">
                  Welcome to INTOURCAMS!
                </h2>
                <p className="text-brand-text-secondary-light dark:text-brand-text-secondary">
                  You have been successfully authenticated. Redirecting you to the dashboard...
                </p>
              </div>
              <div className="animate-pulse">
                <Spinner className="w-6 h-6 text-brand-green dark:text-brand-dark-green-text mx-auto" />
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900">
                <svg 
                  className="h-8 w-8 text-red-600 dark:text-red-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-brand-text-light dark:text-brand-text mb-2">
                  Authentication Failed
                </h2>
                <p className="text-brand-text-secondary-light dark:text-brand-text-secondary mb-4">
                  {errorMessage || 'We couldn\'t authenticate your magic link. This could happen if the link has expired or been used already.'}
                </p>
              </div>
              <div className="space-y-3">
                <Button 
                  onClick={handleRetry} 
                  variant="primary"
                  className="w-full"
                >
                  Go to Home Page
                </Button>
                <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary">
                  You can request a new magic link from the sign-in page.
                </p>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AuthCallback;