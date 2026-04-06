import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { Mail, Lock, User as UserIcon, LogIn, UserPlus, Link2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { supabase } from './supabase';
import { supabaseService } from './services/supabaseService';
import { UserProfile } from './types';
import { getCartoonAvatar } from './utils/avatar';
import { getErrorMessage } from './utils/errors';

import Layout from './components/Layout';
import Onboarding from './components/Onboarding';
import Feed from './components/Feed';
import JobBoard from './components/JobBoard';
import Profile from './components/Profile';
import Network from './components/Network';
import Chat from './components/Chat';
import Settings from './components/Settings';
import FriendRequests from './components/FriendRequests';
import ManageGigs from './components/ManageGigs';
import Wallets from './components/Wallets';
import WalletHistory from './components/WalletHistory';
import ProcessTransfer from './components/ProcessTransfer';
import ProcessTransferDetails from './components/ProcessTransferDetails';
import AddFunds from './components/AddFunds';
import WithdrawFunds from './components/WithdrawFunds';
import WithdrawAmount from './components/WithdrawAmount';
import JobDetails from './components/JobDetails';
import JobApply from './components/JobApply';
import Notifications from './components/Notifications';
import Comments from './components/Comments';
import Market from './components/Market';
import SellItem from './components/SellItem';
import MarketItemDetails from './components/MarketItemDetails';
import EditMarketItem from './components/EditMarketItem';
import EditPost from './components/EditPost';
import PartnershipPage from './components/PartnershipPage';
import ActiveGigs from './components/ActiveGigs';

export default function App() {
  const ONBOARDING_KEY = 'connect_onboarding_uid';
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const createDefaultProfile = async (sessionUser: User): Promise<UserProfile> => {
      const defaultProfile: UserProfile = {
        uid: sessionUser.id,
        publicId: `SL-${sessionUser.id.replace(/-/g, '').slice(0, 10).toUpperCase()}`,
        email: sessionUser.email || '',
        displayName: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || 'Anonymous',
        photoURL: sessionUser.user_metadata?.avatar_url || getCartoonAvatar(sessionUser.user_metadata?.full_name || sessionUser.id),
        role: 'freelancer',
        bio: '',
        skills: [],
        education: {
          university: '',
          degree: '',
          verified: false,
        },
        portfolio: [],
        companyInfo: {
          name: '',
          about: '',
        },
      };
      await supabaseService.createUserProfile(defaultProfile);
      return defaultProfile;
    };

    const loadProfile = async (sessionUser: User | null) => {
      if (!active) return;
      setUser(sessionUser);

      if (!sessionUser) {
        setProfile(null);
        setShowOnboarding(false);
        setLoading(false);
        return;
      }

      try {
        const userProfile = await supabaseService.getUserProfile(sessionUser.id);
        if (userProfile) {
          setProfile(userProfile);
          setShowOnboarding(false);
        } else {
          const pendingOnboardingUid = localStorage.getItem(ONBOARDING_KEY);
          if (pendingOnboardingUid === sessionUser.id) {
            setShowOnboarding(true);
            setProfile(null);
          } else {
            const quickProfile = await createDefaultProfile(sessionUser);
            setProfile(quickProfile);
            setShowOnboarding(false);
          }
        }
      } catch (nextError) {
        console.error('Error fetching profile:', nextError);
      } finally {
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      loadProfile(data.session?.user ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session?.user ?? null);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = supabaseService.subscribeToUserProfile(user.id, (nextProfile) => {
      if (!nextProfile) return;
      setProfile(nextProfile);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      supabaseService.stopPresenceTracking();
      return;
    }
    const stopPresence = supabaseService.startPresenceTracking(user.id);
    return () => stopPresence();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabaseService.syncConnectedDeviceSession(user.id).catch(() => undefined);
  }, [user]);

  const handleGoogleLogin = async () => {
    try {
      setAuthSubmitting(true);
      setError('');
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (authError) {
        setError(getErrorMessage(authError, 'Google sign-in could not be started.'));
      }
    } catch (nextError) {
      console.error('Login error:', nextError);
      setError(getErrorMessage(nextError, 'Login failed. Please try again.'));
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAuthSubmitting(true);

    try {
      if (authMode === 'register') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: displayName,
            },
          },
        });
        if (authError) throw authError;
        if (data.user) {
          localStorage.setItem(ONBOARDING_KEY, data.user.id);
        }
        if (!data.session) {
          setError('Check your email to confirm your account before signing in.');
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      }
    } catch (nextError) {
      console.error('Auth error:', nextError);
      setError(getErrorMessage(nextError, authMode === 'login' ? 'Unable to sign you in right now.' : 'Unable to create your account right now.'));
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      supabaseService.stopPresenceTracking();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        throw signOutError;
      }
      setProfile(null);
      setUser(null);
      setShowOnboarding(false);
    } catch (nextError) {
      console.error('Logout error:', nextError);
      throw nextError;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <Router>
      {!user ? (
        <Routes>
          <Route
            path="/partner-with-connect"
            element={<PartnershipPage onBack={() => (window.history.length > 1 ? window.history.back() : undefined)} />}
          />
          <Route
            path="*"
            element={
              <AuthScreen
                authMode={authMode}
                setAuthMode={setAuthMode}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                displayName={displayName}
                setDisplayName={setDisplayName}
                error={error}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                authSubmitting={authSubmitting}
                onEmailAuth={handleEmailAuth}
                onGoogleLogin={handleGoogleLogin}
              />
            }
          />
        </Routes>
      ) : !profile ? (
        showOnboarding ? (
          <Onboarding
            user={user}
            onComplete={(nextProfile) => {
              localStorage.removeItem(ONBOARDING_KEY);
              setShowOnboarding(false);
              setProfile(nextProfile);
            }}
          />
        ) : (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-teal-600" />
          </div>
        )
      ) : (
        <Layout user={user} profile={profile} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Feed profile={profile} />} />
            <Route path="/jobs" element={<JobBoard profile={profile} />} />
            <Route path="/jobs/:jobId" element={<JobDetails profile={profile} />} />
            <Route path="/jobs/:jobId/apply" element={<JobApply profile={profile} />} />
            <Route path="/market" element={<MarketAccessGuard profile={profile}><Market profile={profile} /></MarketAccessGuard>} />
            <Route path="/market/sell" element={<MarketAccessGuard profile={profile}><SellItem profile={profile} /></MarketAccessGuard>} />
            <Route path="/market/:itemId" element={<MarketAccessGuard profile={profile}><MarketItemDetails profile={profile} /></MarketAccessGuard>} />
            <Route path="/market/:itemId/edit" element={<MarketAccessGuard profile={profile}><EditMarketItem profile={profile} /></MarketAccessGuard>} />
            <Route path="/network" element={<Network profile={profile} />} />
            <Route path="/requests" element={<FriendRequests profile={profile} />} />
            <Route path="/manage-gigs" element={<ManageGigs profile={profile} />} />
            <Route path="/notifications" element={<Notifications profile={profile} />} />
            <Route path="/profile/:uid" element={<Profile profile={profile} />} />
            <Route path="/messages" element={<Chat profile={profile} />} />
            <Route path="/wallets" element={<Wallets profile={profile} />} />
            <Route path="/wallets/add-funds" element={<AddFunds profile={profile} />} />
            <Route path="/wallets/withdraw" element={<WithdrawFunds profile={profile} />} />
            <Route path="/wallets/withdraw/amount" element={<WithdrawAmount profile={profile} />} />
            <Route path="/wallets/history" element={<WalletHistory profile={profile} />} />
            <Route path="/wallets/transfer" element={<ProcessTransfer profile={profile} />} />
            <Route path="/wallets/transfer/details" element={<ProcessTransferDetails profile={profile} />} />
            <Route path="/comments/:postId" element={<Comments profile={profile} />} />
            <Route path="/posts/:postId/edit" element={<EditPost profile={profile} />} />
            <Route path="/active-gigs" element={<ActiveGigs profile={profile} />} />
            <Route path="/settings/*" element={<Settings profile={profile} onLogout={handleLogout} onProfileUpdate={setProfile} />} />
            <Route path="/partner-with-connect" element={<PartnershipPage profile={profile} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      )}
    </Router>
  );
}

interface AuthScreenProps {
  authMode: 'login' | 'register';
  setAuthMode: React.Dispatch<React.SetStateAction<'login' | 'register'>>;
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  confirmPassword: string;
  setConfirmPassword: React.Dispatch<React.SetStateAction<string>>;
  displayName: string;
  setDisplayName: React.Dispatch<React.SetStateAction<string>>;
  error: string;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  authSubmitting: boolean;
  onEmailAuth: (e: React.FormEvent) => Promise<void>;
  onGoogleLogin: () => Promise<void>;
}

function AuthScreen({
  authMode,
  setAuthMode,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  displayName,
  setDisplayName,
  error,
  showPassword,
  setShowPassword,
  authSubmitting,
  onEmailAuth,
  onGoogleLogin,
}: AuthScreenProps) {
  const navigate = useNavigate();

  const socials = [
    { label: 'Facebook', href: 'https://facebook.com', icon: FacebookBrandIcon },
    { label: 'TikTok', href: 'https://tiktok.com', icon: TikTokBrandIcon },
    { label: 'Instagram', href: 'https://instagram.com', icon: InstagramBrandIcon },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(91,33,182,0.24),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(76,29,149,0.22),_transparent_28%),linear-gradient(135deg,#07030f_0%,#12071e_42%,#1c0c33_100%)] p-3 md:p-4">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-5xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/95 shadow-[0_24px_90px_rgba(9,3,20,0.45)] lg:grid-cols-[0.98fr_1.02fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(192,132,252,0.22),_transparent_28%),linear-gradient(155deg,#13061f,#261041_38%,#090312_100%)] px-7 py-8 text-white lg:flex">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -left-16 top-16 h-52 w-52 rounded-full border border-white/30" />
            <div className="absolute right-10 top-10 h-28 w-28 rounded-full bg-white/10" />
            <div className="absolute bottom-16 right-14 h-40 w-40 rounded-full border border-white/20" />
          </div>
          <div className="pointer-events-none absolute inset-0 opacity-45">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:42px_42px]" />
            <div className="absolute inset-y-0 left-[18%] w-px bg-gradient-to-b from-transparent via-violet-300/70 to-transparent" />
            <div className="absolute inset-y-0 right-[20%] w-px bg-gradient-to-b from-transparent via-fuchsia-300/60 to-transparent" />
          </div>

          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/12 px-4 py-2 text-sm font-bold uppercase tracking-[0.25em] shadow-[0_0_30px_rgba(167,139,250,0.14)]">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-violet-700">
                <Link2 size={18} />
              </span>
              Connect
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-black/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-violet-100/85">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.9)]" />
              Network online
            </div>
            <h1 className="mt-6 text-4xl font-black leading-tight">
              Build your network, land gigs, and grow your student brand in one place.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-white/82">
              Connect brings social discovery, professional identity, and student-friendly opportunities together so freelancers, clients, and campus talent can move faster.
            </p>
          </div>

          <div className="relative z-10 grid gap-3 md:grid-cols-3">
            {[
              { title: 'Live profiles', value: 'Verified identity, skills, and portfolio visibility.' },
              { title: 'Real gigs', value: 'Find work, manage proposals, and stay active on the feed.' },
              { title: 'Built for students', value: 'Show education, campus context, and creative progress.' },
            ].map((item) => (
              <div key={item.title} className="rounded-[1.35rem] border border-white/15 bg-white/10 p-3.5 backdrop-blur-sm">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">{item.title}</p>
                <p className="mt-2 text-xs leading-6 text-white/90">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="relative z-10 mt-6 flex flex-wrap items-center gap-2.5">
            {socials.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-xs font-bold text-white transition-all hover:bg-white/18"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-violet-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  {social.label}
                </a>
              );
            })}
          </div>
        </section>

        <section className="relative flex items-center justify-center overflow-hidden px-4 py-6 sm:px-7 lg:px-8">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(124,58,237,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.08)_1px,transparent_1px)] bg-[size:28px_28px]" />
            <div className="absolute left-8 top-10 h-24 w-24 rounded-full bg-violet-200/20 blur-3xl" />
            <div className="absolute bottom-10 right-6 h-28 w-28 rounded-full bg-fuchsia-200/20 blur-3xl" />
          </div>
          <div className="relative z-10 w-full max-w-sm">
            <div className="mb-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 text-violet-700 lg:hidden">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-700 text-white">
                  <Link2 size={18} />
                </span>
                <span className="text-2xl font-black">Connect</span>
              </div>
              <h2 className="mt-3 text-2xl font-black text-gray-900">
                {authMode === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {authMode === 'login'
                  ? 'Sign in to continue building your network and managing gigs.'
                  : 'Start with your account, then finish your profile in the new onboarding flow.'}
              </p>
            </div>

            <form onSubmit={onEmailAuth} className="relative space-y-3 rounded-[1.6rem] border border-violet-100/70 bg-white/88 p-4 shadow-[0_18px_50px_rgba(76,29,149,0.08)] backdrop-blur-sm">
              <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-violet-300 to-transparent" />
              {authMode === 'register' && (
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Full name"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  placeholder="Email address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-12 text-sm outline-none transition-all focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {authMode === 'register' && (
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={authSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-violet-800 disabled:opacity-60"
              >
                {authMode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                {authSubmitting
                  ? authMode === 'login'
                    ? 'Signing in...'
                    : 'Creating account...'
                  : authMode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
              </button>
            </form>

            <div className="my-4 flex items-center gap-4">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Or continue with</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <button
              onClick={onGoogleLogin}
              disabled={authSubmitting}
              className="mb-4 inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5" />
              Continue with Google
            </button>

            <div className="rounded-[1.5rem] border border-violet-100/70 bg-white/78 p-3.5 shadow-[0_16px_40px_rgba(76,29,149,0.06)]">
              <p className="text-sm text-gray-600">
                {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="font-bold text-violet-700 hover:underline"
                >
                  {authMode === 'login' ? 'Register now' : 'Sign in instead'}
                </button>
              </p>
              <button
                type="button"
                onClick={() => navigate('/partner-with-connect')}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition-all hover:border-violet-200 hover:bg-violet-50"
              >
                Partner with Connect
                <ArrowRight size={16} />
              </button>
              <p className="mt-2.5 text-xs text-gray-500">
                Companies can also use the dedicated <Link to="/partner-with-connect" className="font-bold text-violet-700 hover:underline">partnership page</Link>.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function FacebookBrandIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.6 1.6-1.6h1.7V4.8c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V11H8v3h2.4v8h3.1Z" />
    </svg>
  );
}

function InstagramBrandIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokBrandIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M14.9 3c.4 1.8 1.5 3.2 3.3 4v2.7a8.1 8.1 0 0 1-3.3-1.1v5.4a5.5 5.5 0 1 1-5.5-5.5c.4 0 .8 0 1.2.1v2.9a2.8 2.8 0 1 0 1.6 2.5V3h2.7Z" />
    </svg>
  );
}

function MarketAccessGuard({ profile, children }: { profile: UserProfile; children: React.ReactNode }) {
  const [allowed, setAllowed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    supabaseService
      .getMarketSettings(profile.uid)
      .then((settings) => {
        if (!active) return;
        setAllowed(settings.isRegistered);
      })
      .catch(() => {
        if (!active) return;
        setAllowed(false);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [profile.uid]);

  if (loading) {
    return <div className="rounded-[2rem] border border-gray-200 bg-white p-8 text-sm text-gray-500 shadow-sm">Checking marketplace access...</div>;
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-black text-gray-900">Marketplace Locked</h2>
        <p className="mt-3 text-sm leading-7 text-gray-500">
          Marketplace access stays locked until you complete the one-time N500 registration payment from market settings.
        </p>
        <Link
          to="/settings/market"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-800"
        >
          Open Market Settings
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
