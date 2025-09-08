import React, { useState } from 'react';
import Modal from '../ui/Modal.tsx';
import Button from '../ui/Button.tsx';
import Input from '../ui/Input.tsx';
import { useAsyncAction } from '../../hooks/useApi.ts';
import { useAppContext } from '../AppContext.tsx';
import { useToast } from '../ToastContext.tsx';
import { UserRole } from '../../types.ts';

interface MagicLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'register';
  onSwitchMode: () => void;
}

const MagicLinkModal: React.FC<MagicLinkModalProps> = ({
  isOpen,
  onClose,
  mode,
  onSwitchMode
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('Visitor');
  const [emailSent, setEmailSent] = useState(false);
  const { showToast } = useToast();
  const { sendMagicLink } = useAppContext();
  const { isLoading, execute } = useAsyncAction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      showToast('Please enter your email address', 'error');
      return;
    }

    if (mode === 'register' && !name.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }

    const success = await execute(async () => {
      const options = mode === 'register' ? {
        name: name.trim(),
        role,
        shouldCreateUser: true
      } : {
        shouldCreateUser: false
      };
      
      await sendMagicLink(email, options);
    });

    if (success) {
      setEmailSent(true);
      showToast(
        mode === 'register' 
          ? 'Registration link sent! Check your email to complete your account setup.'
          : 'Magic link sent! Check your email to sign in.',
        'success'
      );
    }
  };

  const handleClose = () => {
    setEmail('');
    setName('');
    setRole('Visitor');
    setEmailSent(false);
    onClose();
  };

  const handleTryDifferentEmail = () => {
    setEmailSent(false);
    setEmail('');
  };

  // Check if we're in a browser environment for Magic Link support
  const isMagicLinkSupported = typeof window !== 'undefined' && typeof window.location !== 'undefined';

  if (!isMagicLinkSupported) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Authentication Not Available">
        <div className="text-center space-y-4">
          <p className="text-brand-text-secondary-light dark:text-brand-text-secondary">
            Magic link authentication is not supported in this environment. Please use traditional login.
          </p>
          <Button onClick={onClose} variant="primary">
            OK
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title={emailSent ? 'Check Your Email' : (mode === 'register' ? 'Create Account' : 'Sign In')}
      className="sm:max-w-md"
    >
      {emailSent ? (
        // Email sent confirmation
        <div className="space-y-6 text-center">
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
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
              />
            </svg>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-brand-text-light dark:text-brand-text mb-2">
              {mode === 'register' ? 'Registration Link Sent!' : 'Magic Link Sent!'}
            </h3>
            <p className="text-brand-text-secondary-light dark:text-brand-text-secondary">
              We've sent a secure link to <strong>{email}</strong>. Click the link in your email to{' '}
              {mode === 'register' ? 'complete your registration' : 'sign in to your account'}.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Didn't receive the email?
                </h4>
                <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Check your spam/junk folder</li>
                  <li>• Make sure the email address is correct</li>
                  <li>• Wait a few minutes for delivery</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="secondary" 
              onClick={handleTryDifferentEmail}
              className="flex-1"
            >
              Try Different Email
            </Button>
            <Button 
              variant="primary" 
              onClick={handleClose}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      ) : (
        // Magic link form
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <p className="text-brand-text-secondary-light dark:text-brand-text-secondary mb-4">
              {mode === 'register' 
                ? 'Enter your details below and we\'ll send you a secure link to create your account.'
                : 'Enter your email and we\'ll send you a secure link to sign in. No password required!'
              }
            </p>
          </div>

          {mode === 'register' && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-brand-text-light dark:text-brand-text mb-2">
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
                disabled={isLoading}
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-brand-text-light dark:text-brand-text mb-2">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              disabled={isLoading}
              autoComplete="email"
              autoFocus
            />
          </div>

          {mode === 'register' && (
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-brand-text-light dark:text-brand-text mb-2">
                Account Type
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="block w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-brand-text-light dark:text-brand-text focus:ring-2 focus:ring-brand-green dark:focus:ring-brand-dark-green focus:border-brand-green dark:focus:border-brand-dark-green"
                disabled={isLoading}
              >
                <option value="Visitor">Visitor</option>
                <option value="Tourism Player">Tourism Player</option>
                <option value="Grant Applicant">Grant Applicant</option>
              </select>
              <p className="mt-1 text-xs text-brand-text-secondary-light dark:text-brand-text-secondary">
                Choose the type that best describes your role in the tourism ecosystem.
              </p>
            </div>
          )}

          <div className="flex flex-col space-y-4">
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading 
                ? 'Sending...' 
                : mode === 'register' 
                  ? 'Send Registration Link' 
                  : 'Send Magic Link'
              }
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={onSwitchMode}
                className="text-sm text-brand-green-text dark:text-brand-dark-green-text hover:underline focus:outline-none focus:ring-2 focus:ring-brand-green dark:focus:ring-brand-dark-green rounded"
                disabled={isLoading}
              >
                {mode === 'register' 
                  ? 'Already have an account? Sign in instead' 
                  : 'New to INTOURCAMS? Create an account'
                }
              </button>
            </div>

            <div className="text-center border-t border-neutral-200 dark:border-neutral-700 pt-4">
              <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default MagicLinkModal;