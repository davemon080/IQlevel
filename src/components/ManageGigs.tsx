import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserProfile, Job, Proposal } from '../types';
import { supabaseService } from '../services/supabaseService';
import { ArrowLeft, Briefcase, Users, CheckCircle2, XCircle, Trash2, Search } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { formatMoneyFromUSD } from '../utils/currency';
import { useConfirmDialog } from './ConfirmDialog';

interface ManageGigsProps {
  profile: UserProfile;
}

export default function ManageGigs({ profile }: ManageGigsProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currency } = useCurrency();
  const requestedJobId = searchParams.get('jobId');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [isApprovedCompany, setIsApprovedCompany] = useState<boolean | null>(null);
  const { confirm, confirmDialog } = useConfirmDialog();

  useEffect(() => {
    supabaseService.getMyCompanyPartnerRequest(profile.uid).then((request) => {
      setIsApprovedCompany(request?.status === 'approved');
    }).catch(() => undefined);
  }, [profile.uid]);

  useEffect(() => {
    if (profile.role !== 'client' && isApprovedCompany === null) {
      return;
    }
    if (profile.role !== 'client' && !isApprovedCompany) {
      navigate('/');
      return;
    }

    const unsubscribe = supabaseService.subscribeToClientJobs(profile.uid, (clientJobs) => {
      setJobs(clientJobs);
      if (!selectedJob && clientJobs.length > 0) {
        const initial = requestedJobId ? clientJobs.find((j) => j.id === requestedJobId) || clientJobs[0] : clientJobs[0];
        setSelectedJob(initial);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isApprovedCompany, navigate, profile.role, profile.uid, requestedJobId, selectedJob]);

  useEffect(() => {
    if (!selectedJob) {
      setApplications([]);
      return;
    }
    const unsubscribe = supabaseService.subscribeToJobProposals(selectedJob.id, setApplications);
    return () => unsubscribe();
  }, [selectedJob]);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesStatus = statusFilter === 'all' ? true : app.status === statusFilter;
      const matchesQuery = query
        ? app.content.toLowerCase().includes(query.toLowerCase()) || app.freelancerUid.toLowerCase().includes(query.toLowerCase())
        : true;
      return matchesStatus && matchesQuery;
    });
  }, [applications, query, statusFilter]);

  const handleToggleStatus = async (job: Job) => {
    const nextStatus = job.status === 'open' ? 'closed' : 'open';
    await supabaseService.updateJobStatus(job.id, nextStatus);
  };

  const handleDeleteJob = async (jobId: string) => {
    const confirmed = await confirm({
      title: 'Delete this gig?',
      description: 'This will permanently remove the gig and cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;
    await supabaseService.deleteJob(jobId);
    if (selectedJob?.id === jobId) setSelectedJob(null);
  };

  const handleApplicationStatus = async (applicationId: string, nextStatus: 'accepted' | 'rejected') => {
    await supabaseService.updateProposalStatus(applicationId, nextStatus);
  };

  const stats = useMemo(() => {
    const openJobs = jobs.filter((j) => j.status === 'open').length;
    const pending = applications.filter((a) => a.status === 'pending').length;
    return { openJobs, totalJobs: jobs.length, totalApplications: applications.length, pending };
  }, [applications, jobs]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Gigs</h1>
          <p className="text-sm text-gray-500">Structured dashboard for your gigs and received applications.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Gigs" value={stats.totalJobs} />
        <StatCard label="Open Gigs" value={stats.openJobs} />
        <StatCard label="Applications" value={stats.totalApplications} />
        <StatCard label="Pending Review" value={stats.pending} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-3xl p-4 space-y-3">
          <p className="text-sm font-bold text-gray-900">Your Posted Gigs</p>
          {loading && <p className="text-sm text-gray-500">Loading gigs...</p>}
          {!loading && jobs.length === 0 && <p className="text-sm text-gray-500">No gigs posted yet.</p>}
          {jobs.map((job) => (
            <button
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className={`w-full p-3 rounded-2xl border text-left ${
                selectedJob?.id === job.id ? 'bg-teal-50 border-teal-200' : 'bg-white border-gray-100 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-gray-900 line-clamp-1">{job.title}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${job.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {job.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{formatMoneyFromUSD(job.budget, currency)}</p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-3xl p-5">
          {!selectedJob ? (
            <div className="h-full min-h-[300px] flex items-center justify-center text-sm text-gray-500">Select a gig to manage.</div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedJob.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">{selectedJob.category} • {formatMoneyFromUSD(selectedJob.budget, currency)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(selectedJob)}
                    className="px-3 py-2 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    {selectedJob.status === 'open' ? 'Close Gig' : 'Reopen Gig'}
                  </button>
                  <button
                    onClick={() => handleDeleteJob(selectedJob.id)}
                    className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedJob.description}</p>

              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search applications..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="px-3 py-2.5 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-bold text-gray-900">Received Applications ({filteredApplications.length})</p>
                {filteredApplications.length === 0 && (
                  <div className="p-8 text-sm text-gray-500 text-center bg-gray-50 rounded-2xl">No applications found for this filter.</div>
                )}
                {filteredApplications.map((application) => (
                  <div key={application.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Applicant: {application.freelancerUid}</p>
                        <p className="text-xs text-gray-500 mt-1">Proposed: {formatMoneyFromUSD(application.budget, currency)}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                        application.status === 'accepted'
                          ? 'bg-emerald-100 text-emerald-700'
                          : application.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {application.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{application.content}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {application.status === 'accepted' && (
                        <button
                          onClick={() => navigate(`/messages?uid=${application.freelancerUid}`)}
                          className="px-3 py-2 text-xs font-semibold rounded-xl bg-teal-700 text-white hover:bg-teal-800"
                        >
                          Message Applicant
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/profile/${application.freelancerUid}`)}
                        className="px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                      >
                        View Profile
                      </button>
                      {application.status !== 'accepted' && (
                        <button
                          onClick={() => handleApplicationStatus(application.id, 'accepted')}
                          className="px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 inline-flex items-center gap-1"
                        >
                          <CheckCircle2 size={14} />
                          Accept
                        </button>
                      )}
                      {application.status !== 'rejected' && (
                        <button
                          onClick={() => handleApplicationStatus(application.id, 'rejected')}
                          className="px-3 py-2 text-xs font-semibold rounded-xl bg-red-100 text-red-700 hover:bg-red-200 inline-flex items-center gap-1"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {confirmDialog}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">{label}</p>
      <p className="text-2xl font-black text-gray-900 mt-1">{value}</p>
    </div>
  );
}
