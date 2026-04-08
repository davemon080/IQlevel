import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Home, Users, Briefcase, MessageSquare, LogOut, Search, Settings as SettingsIcon, Link2, Bell, PartyPopper, ShieldAlert, Store } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { MarketSettings, UserProfile } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabaseService } from '../services/supabaseService';
import GlobalSearch from './GlobalSearch';
import CachedImage from './CachedImage';
import { useConfirmDialog } from './ConfirmDialog';
import { AppToast, subscribeToAppToasts } from '../utils/appToast';
import AdminPopupNotifications from './AdminPopupNotifications';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  profile: UserProfile;
  onLogout: () => Promise<void>;
}

export default function Layout({ children, user, profile, onLogout }: LayoutProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const targetUid = searchParams.get('uid');
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [unreadNotifications, setUnreadNotifications] = React.useState(0);
  const [unreadMessages, setUnreadMessages] = React.useState(0);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [appToasts, setAppToasts] = React.useState<AppToast[]>([]);
  const [marketAccessPopup, setMarketAccessPopup] = React.useState<null | { mode: 'granted' | 'revoked'; title: string; body: string }>(null);
  const previousMarketSettingsRef = React.useRef<MarketSettings | null>(null);
  const { confirm, confirmDialog } = useConfirmDialog();

  const navItems = [
    { icon: Home, label: 'Feed', path: '/' },
    { icon: Users, label: 'Network', path: '/network' },
    { icon: Briefcase, label: 'Jobs', path: '/jobs' },
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
    { icon: SettingsIcon, label: 'Settings', path: '/settings' },
  ];

  const isMessagesPage = location.pathname === '/messages';

  React.useEffect(() => {
    const unsubscribe = supabaseService.subscribeToNotifications(profile.uid, (items) => {
      const unread = items.filter((item) => !item.read).length;
      setUnreadNotifications(unread);
    });
    return () => unsubscribe();
  }, [profile.uid]);

  React.useEffect(() => {
    if (location.pathname !== '/notifications') return;
    supabaseService
      .markNotificationsReadThrough(profile.uid)
      .then(() => setUnreadNotifications(0))
      .catch(() => undefined);
  }, [location.pathname, profile.uid]);

  React.useEffect(() => {
    const unsubscribeUnreadCounts = supabaseService.subscribeToUnreadMessageCounts(profile.uid, (counts) => {
      setUnreadMessages(Object.values(counts).reduce((sum, count) => sum + count, 0));
    });

    if (location.pathname === '/messages' && targetUid) {
      supabaseService.markMessagesAsRead(profile.uid, targetUid).catch(() => undefined);
    }

    return () => {
      unsubscribeUnreadCounts();
    };
  }, [location.pathname, profile.uid, targetUid]);

  React.useEffect(() => {
    const unsubscribe = subscribeToAppToasts((toast) => {
      setAppToasts((prev) => [...prev.slice(-2), toast]);
      window.setTimeout(() => {
        setAppToasts((prev) => prev.filter((item) => item.id !== toast.id));
      }, toast.durationMs ?? 2600);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    let active = true;

    const handleSettings = (settings: MarketSettings) => {
      if (!active) return;
      const previous = previousMarketSettingsRef.current;
      previousMarketSettingsRef.current = settings;
      if (!previous) return;

      const changed =
        previous.isRegistered !== settings.isRegistered ||
        previous.accessSource !== settings.accessSource ||
        previous.adminOverrideUpdatedAt !== settings.adminOverrideUpdatedAt;

      if (!changed) return;

      if (settings.accessSource === 'admin_override_lock') {
        setMarketAccessPopup({
          mode: 'revoked',
          title: 'Marketplace access revoked',
          body: 'Your access to the market page has been revoked pending review from the Connect team.',
        });
        return;
      }

      if (settings.accessSource === 'admin_override_unlock') {
        setMarketAccessPopup({
          mode: 'granted',
          title: 'Marketplace access restored',
          body: 'Your market access has been restored. You can open the market page again now.',
        });
      }
    };

    supabaseService.getMarketSettings(profile.uid).then((settings) => {
      if (!active) return;
      previousMarketSettingsRef.current = settings;
    }).catch(() => undefined);

    const unsubscribe = supabaseService.subscribeToMarketSettings(profile.uid, handleSettings);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [profile.uid]);

  React.useEffect(() => {
    if (!marketAccessPopup) return;
    const timeoutId = window.setTimeout(() => setMarketAccessPopup(null), 5500);
    return () => window.clearTimeout(timeoutId);
  }, [marketAccessPopup]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.08),_transparent_18%),linear-gradient(180deg,#faf7ff_0%,#f5f0ff_48%,#efe8ff_100%)] flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col w-64 bg-white/92 border-r border-violet-100 fixed h-full z-20 transition-all backdrop-blur-sm",
        isMessagesPage && "w-20"
      )}>
        <div className={cn("p-6", isMessagesPage && "px-2 text-center")}>
          <Link to="/" className={cn("flex items-center gap-2 text-2xl font-bold text-teal-700", isMessagesPage && "text-sm justify-center")}>
            <span className={cn("inline-flex items-center justify-center w-8 h-8 rounded-xl bg-teal-600 text-white", isMessagesPage && "w-7 h-7")}>
              <Link2 size={16} />
            </span>
            {!isMessagesPage && 'Connect'}
          </Link>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors",
                location.pathname === item.path 
                  ? "bg-teal-50 text-teal-700" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                isMessagesPage && "px-2 justify-center"
              )}
              title={item.label}
            >
              <item.icon size={20} />
              {!isMessagesPage && item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className={cn("flex items-center gap-3 px-4 py-3 mb-4", isMessagesPage && "px-0 justify-center")}>
            <CachedImage
              src={profile.photoURL}
              alt={profile.displayName}
              fallbackMode="avatar"
              wrapperClassName="w-10 h-10 rounded-full border border-gray-200"
              imgClassName="w-full h-full rounded-full object-cover"
            />
            {!isMessagesPage && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{profile.displayName}</p>
                <p className="text-xs text-gray-500 capitalize">{profile.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={async () => {
              const confirmed = await confirm({
                title: 'Log out now?',
                description: 'You will need to sign back in to continue using your account.',
                confirmLabel: 'Log Out',
                tone: 'danger',
              });
              if (!confirmed) return;
              try {
                setLoggingOut(true);
                await onLogout();
              } catch (error) {
                console.error('Unable to log out:', error);
              } finally {
                setLoggingOut(false);
              }
            }}
            disabled={loggingOut}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors font-medium disabled:cursor-not-allowed disabled:opacity-60",
              isMessagesPage && "px-0 justify-center"
            )}
            title="Logout"
          >
            <LogOut size={20} />
            {!isMessagesPage && (loggingOut ? 'Logging out...' : 'Logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all",
        isMessagesPage 
          ? (targetUid ? "md:ml-20 pb-0" : "md:ml-20 pb-16 md:pb-0") 
          : "md:ml-64 pb-20 md:pb-0"
      )}>
        {/* Top Search Bar (Desktop) */}
        {!isMessagesPage && (
          <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white/88 border-b border-violet-100 sticky top-0 z-10 backdrop-blur-sm">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search market, gigs, partners, settings, or anything..."
                readOnly
                onClick={() => setIsSearchOpen(true)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl text-base transition-all"
              />
            </div>
            <div className="flex items-center gap-4">
              <Link to="/notifications" className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600">
                <Bell size={20} />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </Link>
            </div>
          </header>
        )}

        {/* Mobile Header */}
        {!isMessagesPage && (
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white/88 border-b border-violet-100 sticky top-0 z-10 backdrop-blur-sm">
          <span className="flex items-center gap-2 text-xl font-bold text-teal-700">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-teal-600 text-white">
              <Link2 size={14} />
            </span>
            Connect
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsSearchOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full">
              <Search size={20} />
            </button>
            <Link to="/notifications" className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full">
              <Bell size={20} />
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </Link>
          </div>
        </header>
        )}

        <div className={cn(
          "transition-all",
          isMessagesPage 
            ? (targetUid ? "w-full min-h-[100dvh] md:h-screen" : "w-full") 
            : "max-w-6xl mx-auto p-4 md:p-8"
        )}>
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      {!(isMessagesPage && targetUid) && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/92 border-t border-violet-100 flex items-center justify-around px-2 py-2 z-20 backdrop-blur-sm">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[64px]",
                location.pathname === item.path 
                  ? "text-teal-700" 
                  : "text-gray-500"
              )}
            >
              <div className="relative">
                <item.icon size={22} />
                {item.path === '/messages' && unreadMessages > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      )}
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      {appToasts.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[90] flex flex-col items-center gap-3 px-4">
          {appToasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto w-full max-w-sm rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-sm ${
                toast.tone === 'success'
                  ? 'border-emerald-200 bg-white text-emerald-900'
                  : toast.tone === 'error'
                  ? 'border-red-200 bg-white text-red-900'
                  : 'border-sky-200 bg-white text-sky-900'
              }`}
            >
              <p className="text-sm font-black">{toast.title}</p>
              {toast.message && <p className="mt-1 text-xs leading-5 text-gray-600">{toast.message}</p>}
            </div>
          ))}
        </div>
      )}
      {marketAccessPopup && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex justify-center px-4">
          <div
            className={`pointer-events-auto relative w-full max-w-md overflow-hidden rounded-[1.75rem] border px-5 py-5 shadow-2xl backdrop-blur-sm ${
              marketAccessPopup.mode === 'granted'
                ? 'border-emerald-200 bg-white text-emerald-900'
                : 'border-amber-200 bg-white text-amber-900'
            }`}
          >
            {marketAccessPopup.mode === 'granted' && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <span
                    key={index}
                    className="absolute h-3 w-3 rounded-full bg-emerald-300/70 animate-ping"
                    style={{
                      left: `${10 + index * 15}%`,
                      top: `${12 + (index % 3) * 22}%`,
                      animationDelay: `${index * 140}ms`,
                    }}
                  />
                ))}
              </div>
            )}
            <div className="relative flex items-start gap-3">
              <div
                className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  marketAccessPopup.mode === 'granted' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {marketAccessPopup.mode === 'granted' ? <PartyPopper size={22} /> : <ShieldAlert size={22} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-black">{marketAccessPopup.title}</p>
                <p className="mt-1 text-sm leading-6 text-gray-600">{marketAccessPopup.body}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to={marketAccessPopup.mode === 'granted' ? '/market' : '/settings/market'}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                      marketAccessPopup.mode === 'granted'
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-amber-500 text-white hover:bg-amber-600'
                    }`}
                  >
                    <Store size={15} />
                    {marketAccessPopup.mode === 'granted' ? 'Open Market' : 'Review Access'}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setMarketAccessPopup(null)}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <AdminPopupNotifications profile={profile} />
      {confirmDialog}
    </div>
  );
}
