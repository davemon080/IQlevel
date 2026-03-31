import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import CompanyDashboard from './CompanyDashboard';
import { supabaseService } from '../services/supabaseService';
import { UserProfile } from '../types';

const COMPANY_DASHBOARD_SESSION_KEY = 'connect_company_dashboard_session';

type CompanySession = {
  userUid: string;
  email: string;
  companyName: string;
  companyLogoUrl: string;
  passwordSet: boolean;
};

export default function CompanyDashboardAccess() {
  const [session, setSession] = useState<CompanySession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const raw = localStorage.getItem(COMPANY_DASHBOARD_SESSION_KEY);
    if (!raw) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as CompanySession;
      setSession(parsed);
      supabaseService.getUserProfile(parsed.userUid).then((nextProfile) => {
        if (!active) return;
        setProfile(nextProfile);
        setLoading(false);
      }).catch(() => {
        if (!active) return;
        setLoading(false);
      });
    } catch {
      localStorage.removeItem(COMPANY_DASHBOARD_SESSION_KEY);
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/company/dashboard-login" replace />;
  }

  return <CompanyDashboard profile={profile} accessUid={session.userUid} />;
}
