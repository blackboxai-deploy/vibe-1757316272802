import React, { useState } from 'react';
import Input from '../ui/Input.tsx';
import Button from '../ui/Button.tsx';
import { LogoIcon, LoginIcon } from '../../constants.tsx';
import { useAppContext } from '../AppContext.tsx';
import { useToast } from '../ToastContext.tsx';
import RegistrationModal from '../auth/RegistrationModal.tsx';
import MagicLinkModal from '../auth/MagicLinkModal.tsx';

interface LoginViewProps {
  onGuestAccess: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onGuestAccess }) => {
  const { loginUserWithPassword } = useAppContext();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isMagicLinkModalOpen, setIsMagicLinkModalOpen] = useState(false);
  const [magicLinkMode, setMagicLinkMode] = useState<'login' | 'register'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await loginUserWithPassword(email, password);
      showToast('Login successful!', 'success');
      // The App component will handle the view change automatically via onAuthStateChange
    } catch (err: any) {
      const errorMessage = err.message.includes("Invalid login credentials")
        ? "Invalid email or password. If you just registered, please verify your email."
        : err.message.includes("Email not confirmed")
        ? "Please check your inbox to verify your email address first."
        : err.message || 'An unexpected error occurred.';
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkLogin = () => {
    setMagicLinkMode('login');
    setIsMagicLinkModalOpen(true);
  };

  const handleMagicLinkRegister = () => {
    setMagicLinkMode('register');
    setIsMagicLinkModalOpen(true);
  };

  const switchMagicLinkMode = () => {
    setMagicLinkMode(prev => prev === 'login' ? 'register' : 'login');
  };

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-brand-bg-light dark:bg-brand-bg p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <LogoIcon className="mx-auto h-20 w-auto" />
            <h1 className="mt-4 text-2xl font-bold text-brand-green-text dark:text-brand-dark-green-text">INTOURCAMS</h1>
            <p className="mt-1 text-sm text-brand-text-secondary-light dark:text-brand-text-secondary">
                Integrated Tourism Coordination and Monitoring System
            </p>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-brand-text-light dark:text-brand-text">
              Sign in to your account
            </h2>
            <p className="mt-2 text-center text-sm text-brand-text-secondary-light dark:text-brand-text-secondary">
              Or{' '}
              <button onClick={onGuestAccess} className="font-medium text-brand-green dark:text-brand-dark-green-text hover:text-brand-green-dark dark:hover:text-brand-dark-green-text">
                continue as a Guest
              </button>
            </p>
          </div>
          <div className="bg-card-bg-light dark:bg-card-bg p-8 rounded-lg shadow-xl border border-neutral-300-light dark:border-neutral-700-dark">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <Input
                label="Email Address"
                type="email"
                id="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
              <Input
                label="Password"
                type="password"
                id="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <div className="text-sm text-right">
                <a href="#" className="font-medium text-brand-green dark:text-brand-dark-green-text hover:text-brand-green-dark dark:hover:text-brand-dark-green-text">
                  Forgot your password?
                </a>
              </div>
              <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading} leftIcon={<LoginIcon className="w-5 h-5" />}>
                Sign In
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-300 dark:border-neutral-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-card-bg-light dark:bg-card-bg px-2 text-brand-text-secondary-light dark:text-brand-text-secondary">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                size="lg" 
                className="w-full" 
                onClick={handleMagicLinkLogin}
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              >
                Magic Link (No Password)
              </Button>
            </form>
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-brand-text-secondary-light dark:text-brand-text-secondary">
              Don't have an account?{' '}
              <button onClick={() => setIsRegistrationModalOpen(true)} className="font-medium text-brand-green dark:text-brand-dark-green-text hover:text-brand-green-dark dark:hover:text-brand-dark-green-text">
                Register with password
              </button>
            </p>
            <p className="text-sm text-brand-text-secondary-light dark:text-brand-text-secondary">
              Or{' '}
              <button onClick={handleMagicLinkRegister} className="font-medium text-brand-green dark:text-brand-dark-green-text hover:text-brand-green-dark dark:hover:text-brand-dark-green-text">
                create account with Magic Link
              </button>
            </p>
          </div>
        </div>
      </div>
      <RegistrationModal isOpen={isRegistrationModalOpen} onClose={() => setIsRegistrationModalOpen(false)} />
      <MagicLinkModal 
        isOpen={isMagicLinkModalOpen} 
        onClose={() => setIsMagicLinkModalOpen(false)}
        mode={magicLinkMode}
        onSwitchMode={switchMagicLinkMode}
      />
    </>
  );
};

export default LoginView;