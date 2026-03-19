import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Home, Users, PlusSquare, Briefcase, MessageSquare, User, LogOut, Search, Settings as SettingsIcon, Link2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { UserProfile } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  profile: UserProfile;
  onLogout: () => void;
}

export default function Layout({ children, user, profile, onLogout }: LayoutProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const targetUid = searchParams.get('uid');

  const navItems = [
    { icon: Home, label: 'Feed', path: '/' },
    { icon: Users, label: 'Network', path: '/network' },
    { icon: Briefcase, label: 'Jobs', path: '/jobs' },
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
    { icon: SettingsIcon, label: 'Settings', path: '/settings' },
  ];

  const isMessagesPage = location.pathname === '/messages';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed h-full z-20 transition-all",
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
            <img src={profile.photoURL} alt={profile.displayName} className="w-10 h-10 rounded-full border border-gray-200" />
            {!isMessagesPage && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{profile.displayName}</p>
                <p className="text-xs text-gray-500 capitalize">{profile.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={onLogout}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors font-medium",
              isMessagesPage && "px-0 justify-center"
            )}
            title="Logout"
          >
            <LogOut size={20} />
            {!isMessagesPage && 'Logout'}
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
          <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search for students, jobs, or skills..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl text-base transition-all"
              />
            </div>
            <div className="flex items-center gap-4">
              <button className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors">
                Post a Gig
              </button>
            </div>
          </header>
        )}

        {/* Mobile Header */}
        {!isMessagesPage && (
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-10">
          <span className="flex items-center gap-2 text-xl font-bold text-teal-700">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-teal-600 text-white">
              <Link2 size={14} />
            </span>
            Connect
          </span>
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full">
            <Search size={20} />
          </button>
        </header>
        )}

        <div className={cn(
          "transition-all",
          isMessagesPage 
            ? (targetUid ? "w-full h-[100dvh] md:h-screen" : "w-full") 
            : "max-w-6xl mx-auto p-4 md:p-8"
        )}>
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      {!(isMessagesPage && targetUid) && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around px-2 py-2 z-20">
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
              <item.icon size={22} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
