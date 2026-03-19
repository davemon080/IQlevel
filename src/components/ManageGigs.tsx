import React, { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';
import { UserProfile, Job, Proposal } from '../types';
import { Briefcase, Clock, DollarSign, MapPin, Trash2, CheckCircle2, XCircle, ChevronRight, Users, ArrowLeft, MoreVertical, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface ManageGigsProps {
  profile: UserProfile;
}

export default function ManageGigs({ profile }: ManageGigsProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (profile.role !== 'client') {
      navigate('/');
      return;
    }

    const unsubJobs = supabaseService.subscribeToClientJobs(profile.uid, (clientJobs) => {
      setJobs(clientJobs);
      setLoading(false);
    });

    return () => unsubJobs();
  }, [profile.uid, profile.role]);

  useEffect(() => {
    if (selectedJob) {
      const unsubProposals = supabaseService.subscribeToJobProposals(selectedJob.id, (jobProposals) => {
        setProposals(jobProposals);
      });
      return () => unsubProposals();
    } else {
      setProposals([]);
    }
  }, [selectedJob]);

  const handleToggleStatus = async (job: Job) => {
    const newStatus = job.status === 'open' ? 'closed' : 'open';
    try {
      await supabaseService.updateJobStatus(job.id, newStatus);
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (window.confirm('Are you sure you want to delete this gig? This action cannot be undone.')) {
      try {
        await supabaseService.deleteJob(jobId);
        if (selectedJob?.id === jobId) setSelectedJob(null);
      } catch (error) {
        console.error('Error deleting job:', error);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Your Gigs</h1>
          <p className="text-gray-500 text-sm">Track and manage your posted job opportunities</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Jobs List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Briefcase size={20} className="text-teal-600" />
              Your Postings
            </h2>
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
              {jobs.length} Total
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
              <Briefcase size={32} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">No gigs posted yet.</p>
            </div>
          ) : (
            jobs.map((job) => (
              <motion.div
                key={job.id}
                layoutId={job.id}
                onClick={() => setSelectedJob(job)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedJob?.id === job.id 
                    ? 'bg-teal-50 border-teal-200 shadow-md' 
                    : 'bg-white border-gray-100 hover:border-teal-100 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 line-clamp-1">{job.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    job.status === 'open' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {job.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <DollarSign size={12} />
                    ${job.budget}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(job.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-teal-600">
                    <Users size={14} />
                    Proposals coming in
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Job Details & Proposals */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedJob ? (
              <motion.div
                key={selectedJob.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedJob.title}</h2>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5"><DollarSign size={16} /> ${selectedJob.budget}</span>
                        <span className="flex items-center gap-1.5"><MapPin size={16} /> {selectedJob.isRemote ? 'Remote' : 'On-site'}</span>
                        <span className="flex items-center gap-1.5"><Briefcase size={16} /> {selectedJob.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleToggleStatus(selectedJob)}
                        className={`p-2 rounded-xl transition-all ${
                          selectedJob.status === 'open' 
                            ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' 
                            : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                        }`}
                        title={selectedJob.status === 'open' ? 'Close Posting' : 'Reopen Posting'}
                      >
                        {selectedJob.status === 'open' ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
                      </button>
                      <button 
                        onClick={() => handleDeleteJob(selectedJob.id)}
                        className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all"
                        title="Delete Posting"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-3">{selectedJob.description}</p>
                </div>

                <div className="p-6">
                  <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Users size={20} className="text-teal-600" />
                    Received Proposals
                    <span className="text-xs font-normal text-gray-400">({proposals.length})</span>
                  </h3>

                  {proposals.length === 0 ? (
                    <div className="text-center py-12">
                      <Users size={48} className="text-gray-200 mx-auto mb-4" />
                      <p className="text-gray-500">No proposals received for this gig yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {proposals.map((proposal) => (
                        <div key={proposal.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/30 hover:bg-white hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600 font-bold">
                                {proposal.freelancerUid.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">Freelancer Proposal</p>
                                <p className="text-xs text-gray-500">{new Date(proposal.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-teal-700 text-sm">${proposal.budget}</p>
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                proposal.status === 'pending' ? 'text-amber-500' : 
                                proposal.status === 'accepted' ? 'text-teal-600' : 'text-red-500'
                              }`}>
                                {proposal.status}
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm mb-4">{proposal.content}</p>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => navigate(`/messages?uid=${proposal.freelancerUid}`)}
                              className="flex-1 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700 transition-all"
                            >
                              Message Freelancer
                            </button>
                            <button 
                              onClick={() => navigate(`/profile/${proposal.freelancerUid}`)}
                              className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-50 transition-all"
                            >
                              View Profile
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                  <Briefcase size={40} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Select a gig to manage</h3>
                <p className="text-gray-500 max-w-xs mx-auto">
                  Click on any of your posted gigs from the list to view proposals and manage the posting.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
