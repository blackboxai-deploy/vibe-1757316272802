import { useState, useCallback } from 'react';
import { authService } from '../services/api.ts';
import { useToast } from '../components/ToastContext.tsx';
import { UserRole } from '../types.ts';

interface MagicLinkOptions {
  name?: string;
  role?: UserRole;
  redirectTo?: string;
}

interface MagicLinkState {
  isLoading: boolean;
  emailSent: boolean;
  error: string | null;
}

/**
 * Custom hook for Magic Link authentication
 * Provides a simple interface for passwordless authentication
 */
export function useMagicLink() {
  const [state, setState] = useState<MagicLinkState>({
    isLoading: false,
    emailSent: false,
    error: null,
  });
  const { showToast } = useToast();

  const sendMagicLink = useCallback(async (
    email: string, 
    mode: 'login' | 'register', 
    options: MagicLinkOptions = {}
  ): Promise<boolean> => {
    if (!email.trim()) {
      setState(prev => ({ ...prev, error: 'Email is required' }));
      showToast('Please enter your email address', 'error');
      return false;
    }

    if (mode === 'register' && !options.name?.trim()) {
      setState(prev => ({ ...prev, error: 'Name is required for registration' }));
      showToast('Please enter your name', 'error');
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const metadata = mode === 'register' && options.name ? {
        name: options.name.trim(),
        role: options.role || 'Visitor'
      } : undefined;

      const response = await authService.signInWithMagicLink(email, {
        shouldCreateUser: mode === 'register',
        data: metadata,
        redirectTo: options.redirectTo || `${window.location.origin}/auth/callback`,
      });

      if (response.success) {
        setState(prev => ({ ...prev, isLoading: false, emailSent: true }));
        showToast(
          mode === 'register'
            ? 'Registration link sent! Check your email to complete your account setup.'
            : 'Magic link sent! Check your email to sign in.',
          'success'
        );
        return true;
      } else {
        throw new Error(response.error || 'Failed to send magic link');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send magic link';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      showToast(errorMessage, 'error');
      return false;
    }
  }, [showToast]);

  const resendMagicLink = useCallback(async (
    email: string,
    mode: 'login' | 'register',
    options: MagicLinkOptions = {}
  ): Promise<boolean> => {
    setState(prev => ({ ...prev, emailSent: false }));
    return sendMagicLink(email, mode, options);
  }, [sendMagicLink]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      emailSent: false,
      error: null,
    });
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    isLoading: state.isLoading,
    emailSent: state.emailSent,
    error: state.error,
    
    // Actions
    sendMagicLink,
    resendMagicLink,
    reset,
    clearError,
    
    // Utilities
    isMagicLinkSupported: authService.isMagicLinkSupported(),
  };
}

/**
 * Hook for handling Magic Link callbacks
 * Use this on the auth callback page
 */
export function useMagicLinkCallback() {
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleCallback = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') {
      return false;
    }

    setStatus('processing');
    setError(null);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const fragment = window.location.hash.substring(1);
      const fragmentParams = new URLSearchParams(fragment);

      // Check if this looks like an auth callback
      const hasAuthParams = urlParams.has('code') || 
                           fragmentParams.has('access_token') || 
                           fragmentParams.has('error');

      if (!hasAuthParams) {
        throw new Error('Invalid authentication link');
      }

      const response = await authService.handleAuthCallback();

      if (response.success && response.data?.session) {
        setStatus('success');
        showToast('Successfully authenticated! Welcome to INTOURCAMS.', 'success');
        return true;
      } else {
        throw new Error(response.error || 'Authentication failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setStatus('error');
      setError(errorMessage);
      showToast('Authentication failed. Please try again.', 'error');
      return false;
    }
  }, [showToast]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return {
    status,
    error,
    handleCallback,
    reset,
    isProcessing: status === 'processing',
    isSuccess: status === 'success',
    isError: status === 'error',
  };
}