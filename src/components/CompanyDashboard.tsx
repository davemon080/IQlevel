import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserProfile, Job, CompanyPartnerRequest } from '../types';
import { supabaseService } from '../services/supabaseService';
import { ArrowLeft, Briefcase, Plus, Search, Users, MessageSquare, Building2 } from 'lucide-react';
import CachedImage from './CachedImage';
import { useCurrency } from '../context/CurrencyContext';
import { formatMoneyFromUSD } from '../utils/currency';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'motion/react';

interface CompanyDashboardProps {
  profile?: UserProfile | null;
  accessUid?: string;
}

export default function CompanyDashboard({ profile, accessUid }: CompanyDashboardProps) {
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const [request, setRequest] = useState<CompanyPartnerRequest | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newJob, setNewJob] = useState({
    title: '',
    description: '',
    budget: 0,
    category: 'Design',
    isStudentFriendly: true,
    isRemote: true,
  });
  const ownerUid = profile?.uid || accessUid;

  useEffect(() => {
    if (!ownerUid) {
      navigate('/company/dashboard-login', { replace: true });
      return;
    }
    let active = true;
    supabaseService.getMyCompanyPartnerRequest(ownerUid).then((nextRequest) => {
      if (!active) return;
      setRequest(nextRequest);
      setLoading(false);
      if (!nextRequest) navigate(profile ? '/partner-with-connect' : '/company/dashboard-login', { replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate, ownerUid, profile]);

  useEffect(() => {
    if (request?.status !== 'approved' || !ownerUid) return;
    const unsubscribe = supabaseService.subscribeToClientJobs(ownerUid, setJobs);
    return () => unsubscribe();
  }, [ownerUid, request?.status]);

  const handleCreateJob = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ownerUid) return;
    await supabaseService.createJob({
      clientUid: ownerUid,
      ...newJob,
    });
    setShowCreateModal(false);
    setNewJob({
      title: '',
      description: '',
      budget: 0,
      category: 'Design',
      isStudentFriendly: true,
      isRemote: true,
    });
  };

  const openJobs = useMemo(() => jobs.filter((job) => job.status === 'open').length, [jobs]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading company dashboard...</div>;
  }

  if (!request) {
    return null;
  }

  if (request.status !== 'approved') {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Company Dashboard</h1>
            <p className="text-sm text-gray-500">Your company must be approved before this dashboard unlocks.</p>
          </div>
        </div>
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-center">
          <p className="text-lg font-bold text-amber-800">Partner request is {request.status}</p>
          <p className="mt-2 text-sm text-amber-700">Return to the partnership page to review or update your company details.</p>
          <button onClick={() => navigate(profile ? '/partner-with-connect' : '/company/dashboard-login')} className="mt-4 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white">
            {profile ? 'Open Partnership Page' : 'Open Company Dashboard Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Company Dashboard</h1>
            <p className="text-sm text-gray-500">Post gigs, manage openings, and review company activity.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {profile ? (
            <Link to="/partner-with-connect" className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50">
              Company Profile
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('connect_company_dashboard_session');
                navigate('/company/dashboard-login');
              }}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              Sign Out
            </button>
          )}
          <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-bold text-white hover:bg-teal-800">
            <Plus size={18} />
            Post Gig
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <CachedImage src={request.companyLogoUrl} alt={request.companyName} wrapperClassName="h-14 w-14 rounded-2xl" imgClassName="h-full w-full rounded-2xl object-cover" />
            <div>
              <p className="text-lg font-bold text-gray-900">{request.companyName}</p>
              <p className="text-xs text-gray-500">{request.location}</p>
            </div>
          </div>
        </div>
        <StatCard label="Total Gigs" value={jobs.length} icon={<Briefcase size={18} className="text-teal-600" />} />
        <StatCard label="Open Gigs" value={openJobs} icon={<Users size={18} className="text-emerald-600" />} />
      </div>

      <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Posted Gigs</h2>
            <p className="text-sm text-gray-500">Manage your approved company jobs from here.</p>
          </div>
          <Link to="/manage-gigs" className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50">
            <MessageSquare size={16} />
            Manage Applicants
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {jobs.length === 0 ? (
            <div className="col-span-full rounded-[1.5rem] border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
              <Building2 size={32} className="mx-auto text-gray-300" />
              <p className="mt-4 text-lg font-bold text-gray-900">No gigs posted yet</p>
              <p className="mt-2 text-sm text-gray-500">Publish your first company gig to start receiving freelancer applications.</p>
            </div>
          ) : (
            jobs.map((job) => (
              <motion.div key={job.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CachedImage src={request.companyLogoUrl} alt={request.companyName} wrapperClassName="h-12 w-12 rounded-2xl bg-white" imgClassName="h-full w-full rounded-2xl object-cover" />
                    <div>
                      <p className="text-lg font-bold text-gray-900">{job.title}</p>
                      <p className="text-xs text-gray-500">{request.companyName}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${job.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                    {job.status}
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm text-gray-600">{job.description}</p>
                <div className="mt-4 flex items-center justify-between gap-3 text-xs text-gray-500">
                  <span>{formatMoneyFromUSD(job.budget, currency)}</span>
                  <span>{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Link to={`/jobs/${job.id}`} className="flex-1 rounded-2xl bg-gray-900 px-4 py-3 text-center text-sm font-bold text-white hover:bg-teal-700">
                    View Job
                  </Link>
                  <Link to={`/manage-gigs?jobId=${job.id}`} className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-white">
                    Manage
                  </Link>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Post a New Gig</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateJob} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Gig Title</label>
                <input required value={newJob.title} onChange={(e) => setNewJob({ ...newJob, title: e.target.value })} className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Description</label>
                <textarea required value={newJob.description} onChange={(e) => setNewJob({ ...newJob, description: e.target.value })} className="min-h-[150px] w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Budget ($)</label>
                  <input type="number" required value={newJob.budget} onChange={(e) => setNewJob({ ...newJob, budget: parseInt(e.target.value || '0', 10) })} className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Category</label>
                  <select value={newJob.category} onChange={(e) => setNewJob({ ...newJob, category: e.target.value })} className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500">
                    <option>Design</option>
                    <option>Development</option>
                    <option>Writing</option>
                    <option>Marketing</option>
                    <option>Data Science</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
                  <input type="checkbox" checked={newJob.isStudentFriendly} onChange={(e) => setNewJob({ ...newJob, isStudentFriendly: e.target.checked })} className="h-5 w-5 rounded-lg border-gray-300 text-teal-600 focus:ring-teal-500" />
                  Student Friendly
                </label>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
                  <input type="checkbox" checked={newJob.isRemote} onChange={(e) => setNewJob({ ...newJob, isRemote: e.target.checked })} className="h-5 w-5 rounded-lg border-gray-300 text-teal-600 focus:ring-teal-500" />
                  Remote Gig
                </label>
              </div>
              <button type="submit" className="w-full rounded-2xl bg-teal-700 px-4 py-4 text-sm font-bold text-white hover:bg-teal-800">
                Post Gig
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p>
          <p className="mt-2 text-3xl font-black text-gray-900">{value}</p>
        </div>
        <div className="rounded-2xl bg-gray-50 p-3">{icon}</div>
      </div>
    </div>
  );
}
