import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CompanyPartnerRequest, Job, UserProfile } from '../types';
import { supabaseService } from '../services/supabaseService';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  ChevronRight,
  Globe,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import CachedImage from './CachedImage';
import { useCurrency } from '../context/CurrencyContext';
import { convertToUSD, formatMoneyFromUSD } from '../utils/currency';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'motion/react';

interface CompanyDashboardProps {
  profile?: UserProfile | null;
  accessUid?: string;
}

const INITIAL_JOB_STATE = {
  title: '',
  description: '',
  budget: 0,
  category: 'Design',
  isStudentFriendly: true,
  isRemote: true,
};

export default function CompanyDashboard({ profile, accessUid }: CompanyDashboardProps) {
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const [request, setRequest] = useState<CompanyPartnerRequest | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [newJob, setNewJob] = useState(INITIAL_JOB_STATE);
  const ownerUid = profile?.uid || accessUid;

  useEffect(() => {
    if (!ownerUid) {
      navigate('/company/dashboard-login', { replace: true });
      return;
    }

    let active = true;
    supabaseService
      .getMyCompanyPartnerRequest(ownerUid, { forceRefresh: true })
      .then((nextRequest) => {
        if (!active) return;
        setRequest(nextRequest);
        setLoading(false);
        if (!nextRequest) {
          navigate(profile ? '/partner-with-connect' : '/company/dashboard-login', { replace: true });
        }
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
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

  const openJobs = useMemo(() => jobs.filter((job) => job.status === 'open').length, [jobs]);
  const closedJobs = useMemo(() => jobs.filter((job) => job.status === 'closed').length, [jobs]);
  const latestJob = jobs[0] || null;

  const handleCreateJob = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ownerUid) return;

    setCreatingJob(true);
    try {
      await supabaseService.createJob({
        clientUid: ownerUid,
        ...newJob,
        budget: Number(convertToUSD(newJob.budget, currency).toFixed(2)),
      });
      setActionMessage('Gig posted successfully.');
      setShowCreateModal(false);
      setNewJob(INITIAL_JOB_STATE);
    } finally {
      setCreatingJob(false);
    }
  };

  const handleToggleStatus = async (job: Job) => {
    await supabaseService.updateJobStatus(job.id, job.status === 'open' ? 'closed' : 'open');
    setActionMessage(job.status === 'open' ? 'Gig closed.' : 'Gig reopened.');
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('Delete this gig permanently?')) return;
    await supabaseService.deleteJob(jobId);
    setActionMessage('Gig deleted.');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f1eb]">
        <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-700 shadow-lg">
          <Loader2 size={18} className="animate-spin" />
          Loading company dashboard...
        </div>
      </div>
    );
  }

  if (!request) {
    return null;
  }

  if (request.status !== 'approved') {
    return (
      <div className="min-h-screen bg-[#f3f1eb] px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-white">
              <ArrowLeft size={20} className="text-stone-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Company Dashboard</h1>
              <p className="text-sm text-stone-500">Your company must be approved before this dashboard unlocks.</p>
            </div>
          </div>
          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-center">
            <p className="text-lg font-bold text-amber-800">Partner request is {request.status}</p>
            <p className="mt-2 text-sm text-amber-700">Return to the partnership page to review or update your company details.</p>
            <button
              onClick={() => navigate(profile ? '/partner-with-connect' : '/company/dashboard-login')}
              className="mt-4 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-bold text-white"
            >
              {profile ? 'Open Partnership Page' : 'Open Company Dashboard Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f1eb] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2.2rem] bg-[#1f3c34] text-white shadow-[0_30px_90px_rgba(31,60,52,0.24)]">
          <div className="grid gap-8 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="rounded-full border border-white/20 p-2 text-white/90 hover:bg-white/10"
                >
                  <ArrowLeft size={18} />
                </button>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-emerald-100">
                  <Sparkles size={14} />
                  Hiring Desk
                </span>
              </div>

              <div className="space-y-3">
                <h1 className="max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">
                  A cleaner company dashboard focused only on gigs.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-emerald-50/80">
                  This workspace is now strictly for company hiring operations. Post openings, manage live gigs, and keep your business profile in view. If you want to chat with freelancers, sign in with your normal account and use the main app chat there.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="rounded-2xl bg-[#f4d35e] px-5 py-3 text-sm font-black text-stone-900 transition hover:translate-y-[-1px]"
                >
                  Post New Gig
                </button>
                {profile ? (
                  <Link
                    to="/partner-with-connect"
                    className="rounded-2xl border border-white/18 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/14"
                  >
                    Edit Company Profile
                  </Link>
                ) : null}
                <Link
                  to="/manage-gigs"
                  className="rounded-2xl border border-white/18 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/14"
                >
                  Open Full Gig Manager
                </Link>
              </div>
            </div>

            <div className="grid gap-4 self-start">
              <div className="rounded-[1.8rem] bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <CachedImage
                    src={request.companyLogoUrl}
                    alt={request.companyName}
                    wrapperClassName="h-16 w-16 overflow-hidden rounded-3xl bg-white/10"
                    imgClassName="h-full w-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xl font-black">{request.companyName}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-emerald-50/80">
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={13} />
                        {request.location}
                      </span>
                      {request.websiteUrl ? (
                        <span className="inline-flex items-center gap-1">
                          <Globe size={13} />
                          Website added
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <HeroMetric label="All gigs" value={jobs.length} />
                <HeroMetric label="Open" value={openJobs} />
                <HeroMetric label="Closed" value={closedJobs} />
              </div>
            </div>
          </div>
        </section>

        {actionMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {actionMessage}
          </div>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <DashboardCard className="bg-[#fffdf8]">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-stone-400">Snapshot</p>
              <div className="mt-4 space-y-3">
                <SnapshotRow label="Total uploaded gigs" value={String(jobs.length)} />
                <SnapshotRow label="Currently hiring" value={String(openJobs)} />
                <SnapshotRow label="Paused listings" value={String(closedJobs)} />
              </div>
            </DashboardCard>

            <DashboardCard className="bg-[#fffdf8]">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-stone-400">How this workspace works</p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-stone-600">
                <p>Use this dashboard only for posting and controlling gigs.</p>
                <p>For freelancer conversations, log in with your normal company account and open the chat page in the main app.</p>
                <p>This keeps the company panel simple and focused.</p>
              </div>
            </DashboardCard>

            {latestJob ? (
              <DashboardCard className="bg-[#fffdf8]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-stone-400">Latest post</p>
                <p className="mt-3 text-lg font-black text-stone-900">{latestJob.title}</p>
                <p className="mt-2 text-sm text-stone-500">
                  {formatDistanceToNow(new Date(latestJob.createdAt), { addSuffix: true })}
                </p>
                <div className="mt-4 inline-flex rounded-full bg-stone-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-stone-600">
                  {latestJob.status}
                </div>
              </DashboardCard>
            ) : null}
          </aside>

          <div className="space-y-5">
            <DashboardCard className="bg-white">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-stone-400">Gig Board</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-stone-900">Your active hiring board</h2>
                  <p className="mt-2 text-sm text-stone-500">
                    A cleaner overview of every gig your company has published.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-black text-white hover:bg-stone-800"
                >
                  <Plus size={16} />
                  Add Gig
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {jobs.length === 0 ? (
                  <div className="rounded-[1.8rem] border border-dashed border-stone-300 bg-[#faf7f0] px-6 py-16 text-center">
                    <Building2 size={34} className="mx-auto text-stone-300" />
                    <p className="mt-4 text-xl font-black text-stone-900">No gigs yet</p>
                    <p className="mt-2 text-sm text-stone-500">Start by posting your first hiring opportunity.</p>
                  </div>
                ) : (
                  jobs.map((job, index) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="rounded-[1.8rem] border border-stone-200 bg-[#faf7f0] p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <CachedImage
                              src={request.companyLogoUrl}
                              alt={request.companyName}
                              wrapperClassName="h-12 w-12 overflow-hidden rounded-2xl bg-white"
                              imgClassName="h-full w-full object-cover"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-xl font-black text-stone-900">{job.title}</p>
                              <p className="truncate text-sm text-stone-500">{job.category}</p>
                            </div>
                          </div>

                          <p className="mt-4 line-clamp-3 text-sm leading-7 text-stone-600">{job.description}</p>

                          <div className="mt-5 flex flex-wrap gap-2">
                            <InfoChip label={formatMoneyFromUSD(job.budget, currency)} />
                            <InfoChip label={job.isRemote ? 'Remote' : 'On-site'} />
                            <InfoChip label={job.isStudentFriendly ? 'Student friendly' : 'Professional only'} />
                            <InfoChip label={formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })} />
                          </div>
                        </div>

                        <div className="flex w-full flex-col gap-3 lg:w-[210px]">
                          <div
                            className={`rounded-2xl px-4 py-3 text-center text-xs font-black uppercase tracking-[0.22em] ${
                              job.status === 'open'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-stone-200 text-stone-600'
                            }`}
                          >
                            {job.status}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(job)}
                            className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-black text-white hover:bg-stone-800"
                          >
                            {job.status === 'open' ? 'Close Gig' : 'Reopen Gig'}
                          </button>
                          <Link
                            to="/manage-gigs"
                            className="inline-flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-700 hover:bg-stone-50"
                          >
                            Manage Applicants
                            <ChevronRight size={16} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteJob(job.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 size={15} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </DashboardCard>
          </div>
        </section>
      </div>

      <button
        type="button"
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#1f3c34] text-white shadow-[0_18px_40px_rgba(31,60,52,0.28)] transition hover:scale-105 hover:bg-[#173029]"
        aria-label="Post new gig"
      >
        <Plus size={26} />
      </button>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-[#fffdf8] p-7 shadow-2xl"
          >
            <div className="mb-7 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-stone-900">Post a new gig</h2>
                <p className="mt-1 text-sm text-stone-500">Add a new opening from the company dashboard.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full border border-stone-200 p-2 text-stone-500 hover:bg-stone-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-stone-700">Gig title</label>
                <input
                  required
                  value={newJob.title}
                  onChange={(event) => setNewJob({ ...newJob, title: event.target.value })}
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1f3c34]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-stone-700">Description</label>
                <textarea
                  required
                  value={newJob.description}
                  onChange={(event) => setNewJob({ ...newJob, description: event.target.value })}
                  className="min-h-[170px] w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1f3c34]"
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-black text-stone-700">Budget ({currency})</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newJob.budget}
                    onChange={(event) => setNewJob({ ...newJob, budget: Number(event.target.value || 0) })}
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1f3c34]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-stone-700">Category</label>
                  <select
                    value={newJob.category}
                    onChange={(event) => setNewJob({ ...newJob, category: event.target.value })}
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1f3c34]"
                  >
                    <option>Design</option>
                    <option>Development</option>
                    <option>Writing</option>
                    <option>Marketing</option>
                    <option>Data Science</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-sm font-bold text-stone-600">
                  <input
                    type="checkbox"
                    checked={newJob.isStudentFriendly}
                    onChange={(event) => setNewJob({ ...newJob, isStudentFriendly: event.target.checked })}
                    className="h-5 w-5 rounded-lg border-stone-300 text-[#1f3c34] focus:ring-[#1f3c34]"
                  />
                  Student friendly
                </label>
                <label className="flex items-center gap-2 text-sm font-bold text-stone-600">
                  <input
                    type="checkbox"
                    checked={newJob.isRemote}
                    onChange={(event) => setNewJob({ ...newJob, isRemote: event.target.checked })}
                    className="h-5 w-5 rounded-lg border-stone-300 text-[#1f3c34] focus:ring-[#1f3c34]"
                  />
                  Remote gig
                </label>
              </div>

              <button
                type="submit"
                disabled={creatingJob}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1f3c34] px-4 py-4 text-sm font-black text-white hover:bg-[#173029] disabled:opacity-70"
              >
                {creatingJob ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                {creatingJob ? 'Posting Gig...' : 'Post Gig'}
              </button>
            </form>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}

function DashboardCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`rounded-[2rem] border border-stone-200 p-5 shadow-[0_18px_50px_rgba(120,113,108,0.08)] ${className || 'bg-white'}`}>{children}</section>;
}

function HeroMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.4rem] bg-white/10 px-4 py-4">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-100/80">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-stone-100 px-4 py-3">
      <span className="text-sm font-bold text-stone-600">{label}</span>
      <span className="text-base font-black text-stone-900">{value}</span>
    </div>
  );
}

function InfoChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-stone-600">
      {label}
    </span>
  );
}
