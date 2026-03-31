import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CompanyPartnerRequest, Job, Message, Proposal, UserProfile } from '../types';
import { supabaseService } from '../services/supabaseService';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import CachedImage from './CachedImage';
import { useCurrency } from '../context/CurrencyContext';
import { formatMoneyFromUSD } from '../utils/currency';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'motion/react';

interface CompanyDashboardProps {
  profile?: UserProfile | null;
  accessUid?: string;
}

type CompanyWorkspaceView = 'gigs' | 'messages';

type ApprovedConversation = {
  proposal: Proposal;
  job: Job;
  freelancer: UserProfile;
};

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
  const [approvedConversations, setApprovedConversations] = useState<ApprovedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);
  const [activeView, setActiveView] = useState<CompanyWorkspaceView>('gigs');
  const [selectedConversationUid, setSelectedConversationUid] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
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

  useEffect(() => {
    if (request?.status !== 'approved' || !ownerUid) return;

    let active = true;
    const loadApprovedConversations = async () => {
      try {
        const nextItems = await supabaseService.listAcceptedCompanyApplicants(ownerUid);
        if (!active) return;
        setApprovedConversations(nextItems);
        setSelectedConversationUid((current) => {
          if (current && nextItems.some((item) => item.freelancer.uid === current)) {
            return current;
          }
          return nextItems[0]?.freelancer.uid || null;
        });
      } catch {
        if (!active) return;
        setApprovedConversations([]);
      }
    };

    void loadApprovedConversations();
    const intervalId = window.setInterval(loadApprovedConversations, 25000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [jobs, ownerUid, request?.status]);

  const selectedConversation = useMemo(
    () => approvedConversations.find((item) => item.freelancer.uid === selectedConversationUid) || null,
    [approvedConversations, selectedConversationUid]
  );

  useEffect(() => {
    if (!ownerUid || !selectedConversation) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);
    const unsubscribe = supabaseService.subscribeToMessages(
      ownerUid,
      selectedConversation.freelancer.uid,
      (nextMessages) => {
        setMessages(nextMessages);
        setMessagesLoading(false);
        void supabaseService.markMessagesAsRead(ownerUid, selectedConversation.freelancer.uid).catch(() => undefined);
      },
      () => {
        setMessagesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ownerUid, selectedConversation]);

  const openJobs = useMemo(() => jobs.filter((job) => job.status === 'open').length, [jobs]);

  const handleCreateJob = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ownerUid) return;

    setCreatingJob(true);
    try {
      await supabaseService.createJob({
        clientUid: ownerUid,
        ...newJob,
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

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ownerUid || !selectedConversation || !messageDraft.trim()) return;

    setSendingMessage(true);
    try {
      await supabaseService.sendMessage({
        senderUid: ownerUid,
        receiverUid: selectedConversation.freelancer.uid,
        content: messageDraft.trim(),
      });
      setMessageDraft('');
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb]">
        <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-600 shadow-lg">
          <Loader2 size={18} className="animate-spin" />
          Loading company workspace...
        </div>
      </div>
    );
  }

  if (!request) {
    return null;
  }

  if (request.status !== 'approved') {
    return (
      <div className="min-h-screen bg-[#f5f7fb] px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-white">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Company Dashboard</h1>
              <p className="text-sm text-slate-500">Your company must be approved before this workspace unlocks.</p>
            </div>
          </div>
          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-center">
            <p className="text-lg font-bold text-amber-800">Partner request is {request.status}</p>
            <p className="mt-2 text-sm text-amber-700">Return to the partnership page to review or update your company details.</p>
            <button
              onClick={() => navigate(profile ? '/partner-with-connect' : '/company/dashboard-login')}
              className="mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
            >
              {profile ? 'Open Partnership Page' : 'Open Company Dashboard Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ffffff,_#eef3f8_55%,_#e4ebf4)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
                  <ArrowLeft size={18} />
                </button>
                <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-teal-700">
                  <Building2 size={14} />
                  Company Workspace
                </span>
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  Manage gigs and talk only to freelancers your company approved.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  This dashboard stays separate from the full product so companies can focus on hiring, reviewing active gigs, and keeping conversations with accepted freelancers in one place.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setActiveView('gigs')}
                  className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    activeView === 'gigs' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Gig Control
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('messages')}
                  className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    activeView === 'messages' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Approved Chats
                </button>
                {profile ? (
                  <Link
                    to="/partner-with-connect"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Company Profile
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-slate-950 p-6 text-white">
              <div className="flex items-center gap-4">
                <CachedImage
                  src={request.companyLogoUrl}
                  alt={request.companyName}
                  wrapperClassName="h-16 w-16 rounded-3xl overflow-hidden bg-white/10"
                  imgClassName="h-full w-full object-cover"
                />
                <div>
                  <p className="text-xl font-bold">{request.companyName}</p>
                  <p className="text-sm text-slate-300">{request.location}</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <HeaderMetric label="Total gigs" value={jobs.length} />
                <HeaderMetric label="Open gigs" value={openJobs} />
                <HeaderMetric label="Approved freelancers" value={approvedConversations.length} />
              </div>
            </div>
          </div>
        </header>

        {actionMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {actionMessage}
          </div>
        ) : null}

        {activeView === 'gigs' ? (
          <section className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard label="Published Gigs" value={jobs.length} icon={<Briefcase size={18} className="text-teal-600" />} />
              <StatCard label="Live Openings" value={openJobs} icon={<Users size={18} className="text-emerald-600" />} />
              <StatCard
                label="Approved Chat Lines"
                value={approvedConversations.length}
                icon={<MessageSquare size={18} className="text-sky-600" />}
              />
            </div>

            <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Your uploaded gigs</h2>
                  <p className="text-sm text-slate-500">Open, close, delete, and monitor the gigs your company has posted.</p>
                </div>
                <p className="text-sm text-slate-400">Use the floating button to add a new gig fast.</p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
                {jobs.length === 0 ? (
                  <div className="col-span-full rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
                    <Building2 size={34} className="mx-auto text-slate-300" />
                    <p className="mt-4 text-lg font-bold text-slate-900">No gigs posted yet</p>
                    <p className="mt-2 text-sm text-slate-500">Tap the floating plus button to publish your first company gig.</p>
                  </div>
                ) : (
                  jobs.map((job) => {
                    const acceptedCount = approvedConversations.filter((item) => item.job.id === job.id).length;
                    return (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <CachedImage
                                src={request.companyLogoUrl}
                                alt={request.companyName}
                                wrapperClassName="h-12 w-12 rounded-2xl overflow-hidden bg-white"
                                imgClassName="h-full w-full object-cover"
                              />
                              <div className="min-w-0">
                                <p className="truncate text-lg font-bold text-slate-900">{job.title}</p>
                                <p className="truncate text-xs text-slate-500">{job.category}</p>
                              </div>
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${
                              job.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>

                        <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{job.description}</p>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                          <MetaPill label="Budget" value={formatMoneyFromUSD(job.budget, currency)} />
                          <MetaPill label="Accepted freelancers" value={String(acceptedCount)} />
                          <MetaPill label="Remote" value={job.isRemote ? 'Yes' : 'No'} />
                          <MetaPill label="Posted" value={formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })} />
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(job)}
                            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
                          >
                            {job.status === 'open' ? 'Close Gig' : 'Reopen Gig'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const firstApproved = approvedConversations.find((item) => item.job.id === job.id);
                              setActiveView('messages');
                              if (firstApproved) {
                                setSelectedConversationUid(firstApproved.freelancer.uid);
                              }
                            }}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
                          >
                            Open Approved Chats
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteJob(job.id)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 size={15} />
                            Delete
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
            <div className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Approved freelancers</h2>
                <p className="mt-1 text-sm text-slate-500">Only freelancers with accepted applications appear here.</p>
              </div>

              <div className="mt-5 space-y-3">
                {approvedConversations.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    Accepted applicants will unlock chat access here.
                  </div>
                ) : null}

                {approvedConversations.map((item) => {
                  const active = item.freelancer.uid === selectedConversationUid;
                  return (
                    <button
                      key={`${item.job.id}-${item.freelancer.uid}`}
                      type="button"
                      onClick={() => setSelectedConversationUid(item.freelancer.uid)}
                      className={`w-full rounded-[1.5rem] border p-4 text-left transition ${
                        active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CachedImage
                          src={item.freelancer.photoURL}
                          alt={item.freelancer.displayName}
                          wrapperClassName="h-12 w-12 rounded-2xl overflow-hidden bg-white/10"
                          imgClassName="h-full w-full object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{item.freelancer.displayName}</p>
                          <p className={`truncate text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>{item.job.title}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              {!selectedConversation ? (
                <div className="flex min-h-[560px] items-center justify-center px-6 text-center text-sm text-slate-500">
                  Select an approved freelancer to open the company chat view.
                </div>
              ) : (
                <div className="flex min-h-[560px] flex-col">
                  <div className="border-b border-slate-200 p-5">
                    <div className="flex items-center gap-3">
                      <CachedImage
                        src={selectedConversation.freelancer.photoURL}
                        alt={selectedConversation.freelancer.displayName}
                        wrapperClassName="h-14 w-14 rounded-3xl overflow-hidden bg-slate-100"
                        imgClassName="h-full w-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-lg font-bold text-slate-900">{selectedConversation.freelancer.displayName}</p>
                        <p className="truncate text-sm text-slate-500">
                          Accepted for {selectedConversation.job.title}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-5">
                    {messagesLoading ? (
                      <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
                        Loading conversation...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
                        Start the conversation with this approved freelancer.
                      </div>
                    ) : (
                      messages.map((message) => {
                        const mine = message.senderUid === ownerUid;
                        return (
                          <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[78%] rounded-[1.5rem] px-4 py-3 text-sm shadow-sm ${
                                mine ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'
                              }`}
                            >
                              <p className="whitespace-pre-wrap leading-6">{message.content}</p>
                              <p className={`mt-2 text-[11px] ${mine ? 'text-slate-300' : 'text-slate-400'}`}>
                                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={handleSendMessage} className="border-t border-slate-200 p-4">
                    <div className="flex gap-3">
                      <textarea
                        value={messageDraft}
                        onChange={(event) => setMessageDraft(event.target.value)}
                        placeholder={`Message ${selectedConversation.freelancer.displayName}`}
                        rows={2}
                        className="min-h-[56px] flex-1 resize-none rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-teal-500"
                      />
                      <button
                        type="submit"
                        disabled={sendingMessage || !messageDraft.trim()}
                        className="inline-flex h-[56px] w-[56px] items-center justify-center rounded-2xl bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-60"
                      >
                        {sendingMessage ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex h-16 w-16 items-center justify-center rounded-full bg-teal-700 text-white shadow-[0_18px_40px_rgba(13,148,136,0.35)] transition hover:scale-105 hover:bg-teal-800"
        aria-label="Post new gig"
      >
        <Plus size={26} />
      </button>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-7 shadow-2xl"
          >
            <div className="mb-7 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Post a new gig</h2>
                <p className="mt-1 text-sm text-slate-500">Create a fresh opening without leaving the company workspace.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Gig title</label>
                <input
                  required
                  value={newJob.title}
                  onChange={(event) => setNewJob({ ...newJob, title: event.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Description</label>
                <textarea
                  required
                  value={newJob.description}
                  onChange={(event) => setNewJob({ ...newJob, description: event.target.value })}
                  className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Budget (USD)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newJob.budget}
                    onChange={(event) => setNewJob({ ...newJob, budget: parseInt(event.target.value || '0', 10) })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Category</label>
                  <select
                    value={newJob.category}
                    onChange={(event) => setNewJob({ ...newJob, category: event.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
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
                <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={newJob.isStudentFriendly}
                    onChange={(event) => setNewJob({ ...newJob, isStudentFriendly: event.target.checked })}
                    className="h-5 w-5 rounded-lg border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  Student friendly
                </label>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={newJob.isRemote}
                    onChange={(event) => setNewJob({ ...newJob, isRemote: event.target.checked })}
                    className="h-5 w-5 rounded-lg border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  Remote gig
                </label>
              </div>

              <button
                type="submit"
                disabled={creatingJob}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-4 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-70"
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

function HeaderMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.25rem] bg-white/10 px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-300">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">{icon}</div>
      </div>
    </div>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}
