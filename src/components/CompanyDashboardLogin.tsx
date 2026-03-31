import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Loader2, Lock, Mail } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../supabase';

export default function CompanyDashboardLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) {
        throw new Error(error.message || 'Unable to sign in to company dashboard.');
      }
      const access = await supabaseService.getCompanyDashboardAccessByEmail(normalizedEmail);
      if (!access || !access.passwordSet) {
        await supabase.auth.signOut();
        throw new Error('This email does not have an approved company dashboard or the company password has not been set yet.');
      }
      navigate('/company/dashboard', { replace: true });
    } catch (error: any) {
      setMessage(error?.message || 'Unable to log in to company dashboard.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 rounded-full px-2 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100">
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <Building2 size={26} />
            </div>
            <h1 className="mt-4 text-3xl font-bold text-gray-900">Company Dashboard Login</h1>
            <p className="mt-2 text-sm text-gray-500">
              Approved companies can sign in here with the same account email and the company dashboard password set from the partnership page.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Company account email"
                className="w-full rounded-2xl bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Company dashboard password"
                className="w-full rounded-2xl bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {message ? (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-4 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-70"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
              {submitting ? 'Signing In...' : 'Open Company Dashboard'}
            </button>
          </form>

          <div className="mt-6 rounded-[1.5rem] border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            Need to create or update the password first? Go to the <Link to="/partner-with-connect" className="font-bold text-teal-700 hover:underline">Partner With Us page</Link>.
          </div>
        </div>
      </div>
    </div>
  );
}
