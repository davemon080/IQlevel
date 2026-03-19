import React, { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';
import { UserProfile, FriendRequest } from '../types';
import { Check, X, Clock, UserPlus, ArrowLeft, UserCheck, UserX, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';

interface FriendRequestsProps {
  profile: UserProfile;
}

export default function FriendRequests({ profile }: FriendRequestsProps) {
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubIncoming = supabaseService.subscribeToIncomingFriendRequests(profile.uid, (requests) => {
      setIncomingRequests(requests);
      if (loading) setLoading(false);
    });

    const unsubOutgoing = supabaseService.subscribeToOutgoingFriendRequests(profile.uid, (requests) => {
      setOutgoingRequests(requests);
    });

    return () => {
      unsubIncoming();
      unsubOutgoing();
    };
  }, [profile.uid]);

  const handleAccept = async (request: FriendRequest) => {
    try {
      await supabaseService.acceptFriendRequest(request, profile);
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleReject = async (request: FriendRequest) => {
    try {
      await supabaseService.rejectFriendRequest(request.id);
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      await supabaseService.deleteFriendRequest(requestId);
    } catch (error) {
      console.error('Error canceling request:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Friend Requests</h1>
          <p className="text-gray-500 text-sm">Manage your connections and pending invites</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`flex-1 py-4 text-sm font-bold transition-all relative ${
              activeTab === 'incoming' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <UserPlus size={18} />
              Received
              {incomingRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="bg-teal-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {incomingRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </div>
            {activeTab === 'incoming' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-teal-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('outgoing')}
            className={`flex-1 py-4 text-sm font-bold transition-all relative ${
              activeTab === 'outgoing' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Send size={18} />
              Sent
              {outgoingRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="bg-gray-400 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {outgoingRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </div>
            {activeTab === 'outgoing' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-teal-600" />
            )}
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'incoming' ? (
                <motion.div
                  key="incoming"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                >
                  {incomingRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UserPlus size={32} className="text-gray-300" />
                      </div>
                      <p className="text-gray-500">No incoming requests yet.</p>
                    </div>
                  ) : (
                    incomingRequests.map((request) => (
                      <div 
                        key={request.id} 
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          request.status === 'pending' ? 'bg-white border-gray-100 shadow-sm' : 'bg-gray-50 border-transparent opacity-75'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Link to={`/profile/${request.fromUid}`}>
                            <img src={request.fromPhoto} className="w-12 h-12 rounded-xl object-cover" alt="" />
                          </Link>
                          <div>
                            <Link to={`/profile/${request.fromUid}`} className="font-bold text-gray-900 hover:text-teal-600 transition-colors">
                              {request.fromName}
                            </Link>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              <Clock size={12} />
                              {new Date(request.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {request.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleAccept(request)}
                                className="px-4 py-2 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 transition-all flex items-center gap-2"
                              >
                                <Check size={16} />
                                Accept
                              </button>
                              <button
                                onClick={() => handleReject(request)}
                                className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2"
                              >
                                <X size={16} />
                                Decline
                              </button>
                            </>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                              request.status === 'accepted' ? 'bg-teal-100 text-teal-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {request.status === 'accepted' ? <UserCheck size={14} /> : <UserX size={14} />}
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="outgoing"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  {outgoingRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Send size={32} className="text-gray-300" />
                      </div>
                      <p className="text-gray-500">You haven't sent any requests yet.</p>
                    </div>
                  ) : (
                    outgoingRequests.map((request) => (
                      <div 
                        key={request.id} 
                        className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
                            <UserPlus size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">Request to User</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              <Clock size={12} />
                              Sent on {new Date(request.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                            request.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                            request.status === 'accepted' ? 'bg-teal-100 text-teal-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {request.status === 'pending' ? <Clock size={14} /> : 
                             request.status === 'accepted' ? <UserCheck size={14} /> : <UserX size={14} />}
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                          {request.status === 'pending' && (
                            <button
                              onClick={() => handleCancel(request.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Cancel Request"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
