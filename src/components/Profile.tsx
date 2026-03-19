import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserProfile, Post } from '../types';
import { supabaseService } from '../services/supabaseService';
import { 
  Edit2, Check, X, MapPin, GraduationCap, Briefcase, 
  Plus, ExternalLink, Award, MessageSquare, 
  Share2, MoreHorizontal, Link as LinkIcon, 
  Github, Linkedin, Twitter, Globe,
  Camera, Zap, Users, Calendar, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

interface ProfileProps {
  profile: UserProfile; // The logged-in user's profile
}

export default function Profile({ profile: loggedInProfile }: ProfileProps) {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'portfolio' | 'activity'>('about');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isOwnProfile = uid === loggedInProfile.uid;

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!uid) return;
      setLoading(true);
      try {
        const p = await supabaseService.getUserProfile(uid);
        setUserProfile(p);
        setEditData(p || {});

        const posts = await supabaseService.getPostsByUser(uid);
        setUserPosts(posts);
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [uid]);

  const handleSave = async () => {
    if (!uid) return;
    await supabaseService.updateUserProfile(uid, editData);
    setUserProfile({ ...userProfile!, ...editData });
    setIsEditing(false);
  };

  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalContent, setProposalContent] = useState('');
  const [proposalBudget, setProposalBudget] = useState(0);

  const handleSendProposal = async () => {
    if (!uid) return;
    await supabaseService.createProposal({
      freelancerUid: uid,
      jobId: 'direct_hire',
      content: proposalContent,
      budget: proposalBudget
    });
    setShowProposalModal(false);
    setProposalContent('');
    setProposalBudget(0);
  };

  const handleMessage = () => {
    if (!uid) return;
    navigate(`/messages?uid=${uid}`);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setToast({ message: 'Profile link copied to clipboard!', type: 'success' });
  };

  const calculateCompletion = () => {
    if (!userProfile) return 0;
    const fields = [
      userProfile.bio,
      userProfile.location,
      userProfile.status,
      userProfile.skills?.length,
      userProfile.experience?.length,
      userProfile.education?.university,
      userProfile.portfolio?.length,
      userProfile.socialLinks?.linkedin
    ];
    const filled = fields.filter(f => f && (Array.isArray(f) ? f.length > 0 : true)).length;
    return Math.round((filled / fields.length) * 100);
  };

  const completion = calculateCompletion();

  const addExperience = () => {
    const newExp = {
      title: '',
      company: '',
      type: 'Full-time',
      period: '',
      description: ''
    };
    setEditData(prev => ({
      ...prev,
      experience: [...(prev.experience || []), newExp]
    }));
  };

  const removeExperience = (index: number) => {
    setEditData(prev => {
      const nextExp = [...(prev.experience || [])];
      nextExp.splice(index, 1);
      return { ...prev, experience: nextExp };
    });
  };

  const updateExperience = (index: number, field: string, value: string) => {
    setEditData(prev => {
      const nextExp = [...(prev.experience || [])];
      nextExp[index] = { ...nextExp[index], [field]: value };
      return { ...prev, experience: nextExp };
    });
  };

  const addSkill = (skill: string) => {
    if (skill && !editData.skills?.includes(skill)) {
      setEditData(prev => ({
        ...prev,
        skills: [...(prev.skills || []), skill]
      }));
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setEditData(prev => ({
      ...prev,
      skills: prev.skills?.filter(s => s !== skillToRemove)
    }));
  };

  const addPortfolioItem = () => {
    const newItem = {
      title: 'New Project',
      description: '',
      imageUrl: 'https://picsum.photos/seed/project/800/600',
      link: '#'
    };
    setEditData(prev => ({
      ...prev,
      portfolio: [...(prev.portfolio || []), newItem]
    }));
  };

  const removePortfolioItem = (index: number) => {
    setEditData(prev => {
      const nextPortfolio = [...(prev.portfolio || [])];
      nextPortfolio.splice(index, 1);
      return { ...prev, portfolio: nextPortfolio };
    });
  };

  const updatePortfolioItem = (index: number, field: string, value: string) => {
    setEditData(prev => {
      const nextPortfolio = [...(prev.portfolio || [])];
      nextPortfolio[index] = { ...nextPortfolio[index], [field]: value };
      return { ...prev, portfolio: nextPortfolio };
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-teal-100 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-teal-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
    </div>
  );

  if (!userProfile) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Users size={32} className="text-gray-400" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900">Profile not found</h2>
      <p className="text-gray-500 mt-2">The user you're looking for doesn't exist or has a private profile.</p>
      <button onClick={() => navigate('/')} className="mt-6 text-teal-600 font-bold hover:underline">Go back home</button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Cover Photo */}
        <div className="relative h-48 md:h-64 bg-gradient-to-r from-teal-600 to-emerald-600">
          {userProfile.coverPhotoURL ? (
            <img src={userProfile.coverPhotoURL} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.4),transparent)]"></div>
          )}
          {isOwnProfile && (
            <button className="absolute bottom-4 right-4 p-2 bg-black/20 backdrop-blur-md text-white rounded-xl hover:bg-black/40 transition-all border border-white/20">
              <Camera size={18} />
            </button>
          )}
        </div>

        {/* Profile Info Section */}
        <div className="px-6 md:px-10 pb-8 relative">
          <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-16 md:-mt-20 mb-6">
            <div className="relative">
              <img 
                src={userProfile.photoURL} 
                alt={userProfile.displayName} 
                className="w-32 h-32 md:w-40 md:h-40 rounded-3xl border-4 border-white shadow-xl object-cover bg-white" 
              />
              {isOwnProfile && isEditing && (
                <button className="absolute bottom-2 right-2 p-2 bg-teal-600 text-white rounded-xl shadow-lg hover:bg-teal-700 transition-all">
                  <Camera size={18} />
                </button>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 truncate">{userProfile.displayName}</h1>
                {userProfile.status && (
                  <span className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-bold rounded-full border border-teal-100 flex items-center gap-1.5">
                    <Zap size={12} className="fill-teal-700" />
                    {userProfile.status}
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap gap-4 text-gray-500 font-medium">
                <span className="flex items-center gap-1.5 text-sm">
                  <Briefcase size={16} className="text-teal-600" /> 
                  <span className="capitalize">{userProfile.role}</span>
                </span>
                <span className="flex items-center gap-1.5 text-sm">
                  <MapPin size={16} className="text-teal-600" /> 
                  {userProfile.location || 'Location not set'}
                </span>
                <span className="flex items-center gap-1.5 text-sm">
                  <GraduationCap size={16} className="text-teal-600" /> 
                  {userProfile.education?.university || 'University not set'}
                </span>
              </div>

              <div className="flex gap-8 mt-6 pt-6 border-t border-gray-100">
                <div className="text-center md:text-left">
                  <p className="text-xl font-bold text-gray-900">{userPosts.length}</p>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Posts</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-xl font-bold text-gray-900">{userProfile.portfolio?.length || 0}</p>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Projects</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-xl font-bold text-gray-900">{userProfile.skills?.length || 0}</p>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Skills</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3">
              {isOwnProfile ? (
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-all font-bold text-sm"
                  >
                    {isEditing ? <X size={18} /> : <Edit2 size={18} />}
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-3 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-all"
                    title="Share Profile"
                  >
                    <Share2 size={20} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => setShowProposalModal(true)}
                    className="flex-1 sm:flex-none bg-teal-600 text-white px-6 sm:px-8 py-3 rounded-2xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-900/10 flex items-center justify-center gap-2"
                  >
                    Hire Me
                  </button>
                  <button 
                    onClick={handleMessage}
                    className="p-3 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    <MessageSquare size={24} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bio Section */}
          <div className="border-t border-gray-100 pt-6">
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Bio</label>
                      <textarea
                        value={editData.bio}
                        onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl text-sm transition-all min-h-[120px] outline-none"
                        placeholder="Write your story..."
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Location</label>
                        <input
                          type="text"
                          value={editData.location}
                          onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl text-sm transition-all outline-none"
                          placeholder="London, UK"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status</label>
                        <input
                          type="text"
                          value={editData.status}
                          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl text-sm transition-all outline-none"
                          placeholder="Open to work"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Profile Photo URL</label>
                          <input
                            type="text"
                            value={editData.photoURL}
                            onChange={(e) => setEditData({ ...editData, photoURL: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl text-sm transition-all outline-none"
                            placeholder="https://example.com/photo.jpg"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cover Photo URL</label>
                          <input
                            type="text"
                            value={editData.coverPhotoURL}
                            onChange={(e) => setEditData({ ...editData, coverPhotoURL: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl text-sm transition-all outline-none"
                            placeholder="https://example.com/cover.jpg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Education</h4>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editData.education?.university}
                          onChange={(e) => setEditData({ ...editData, education: { ...editData.education!, university: e.target.value } })}
                          className="w-full px-4 py-2 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="University"
                        />
                        <input
                          type="text"
                          value={editData.education?.degree}
                          onChange={(e) => setEditData({ ...editData, education: { ...editData.education!, degree: e.target.value } })}
                          className="w-full px-4 py-2 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="Degree"
                        />
                        <input
                          type="text"
                          value={editData.education?.year}
                          onChange={(e) => setEditData({ ...editData, education: { ...editData.education!, year: e.target.value } })}
                          className="w-full px-4 py-2 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="Year"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-4">
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Social Links</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl">
                          <Linkedin size={16} className="text-gray-400" />
                          <input
                            type="text"
                            value={editData.socialLinks?.linkedin}
                            onChange={(e) => setEditData({ ...editData, socialLinks: { ...editData.socialLinks!, linkedin: e.target.value } })}
                            className="flex-1 bg-transparent text-sm outline-none"
                            placeholder="LinkedIn URL"
                          />
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl">
                          <Github size={16} className="text-gray-400" />
                          <input
                            type="text"
                            value={editData.socialLinks?.github}
                            onChange={(e) => setEditData({ ...editData, socialLinks: { ...editData.socialLinks!, github: e.target.value } })}
                            className="flex-1 bg-transparent text-sm outline-none"
                            placeholder="GitHub URL"
                          />
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl">
                          <Globe size={16} className="text-gray-400" />
                          <input
                            type="text"
                            value={editData.socialLinks?.website}
                            onChange={(e) => setEditData({ ...editData, socialLinks: { ...editData.socialLinks!, website: e.target.value } })}
                            className="flex-1 bg-transparent text-sm outline-none"
                            placeholder="Website URL"
                          />
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl">
                          <Twitter size={16} className="text-gray-400" />
                          <input
                            type="text"
                            value={editData.socialLinks?.twitter}
                            onChange={(e) => setEditData({ ...editData, socialLinks: { ...editData.socialLinks!, twitter: e.target.value } })}
                            className="flex-1 bg-transparent text-sm outline-none"
                            placeholder="Twitter URL"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setIsEditing(false)} className="px-6 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold">Save Changes</button>
                  </div>
                </motion.div>
              ) : (
                <p className="text-gray-600 leading-relaxed max-w-3xl">
                  {userProfile.bio || "No bio provided yet."}
                </p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Expertise</h3>
            </div>
            
            {isOwnProfile && isEditing && (
              <div className="mb-4">
                <input 
                  type="text"
                  placeholder="Add skill..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addSkill((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                />
                <p className="text-[10px] text-gray-400 mt-1 ml-1">Press Enter to add</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {(isEditing ? editData.skills : userProfile.skills)?.map(skill => (
                <span key={skill} className="group px-3 py-1.5 bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl border border-gray-100 flex items-center gap-2">
                  {skill}
                  {isEditing && (
                    <button onClick={() => removeSkill(skill)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </span>
              ))}
              {!isEditing && !userProfile.skills?.length && (
                <p className="text-sm text-gray-400 italic">No skills listed.</p>
              )}
            </div>

            <div className="mt-10">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Connect</h3>
              <div className="space-y-4">
                <a href={userProfile.socialLinks?.linkedin || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-600 hover:text-teal-600 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-teal-50 transition-colors">
                    <Linkedin size={18} />
                  </div>
                  <span className="font-bold">LinkedIn</span>
                </a>
                <a href={userProfile.socialLinks?.github || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-600 hover:text-teal-600 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-teal-50 transition-colors">
                    <Github size={18} />
                  </div>
                  <span className="font-bold">GitHub</span>
                </a>
                <a href={userProfile.socialLinks?.website || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-600 hover:text-teal-600 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-teal-50 transition-colors">
                    <Globe size={18} />
                  </div>
                  <span className="font-bold">Website</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100">
              {(['about', 'portfolio', 'activity'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-all relative ${
                    activeTab === tab ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-teal-600" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-8">
              <AnimatePresence mode="wait">
                {activeTab === 'portfolio' && (
                  <motion.div
                    key="portfolio"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-8"
                  >
                    {(isEditing ? editData.portfolio : userProfile.portfolio)?.map((item, idx) => (
                      <div key={idx} className="group space-y-4">
                        <div className="relative aspect-video rounded-2xl overflow-hidden shadow-sm bg-gray-100">
                          <img 
                            src={item.imageUrl} 
                            alt={item.title} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/20 backdrop-blur-md rounded-xl text-white hover:bg-white/40 transition-all">
                              <ExternalLink size={20} />
                            </a>
                            {isEditing && (
                              <button onClick={() => removePortfolioItem(idx)} className="p-3 bg-red-500/20 backdrop-blur-md rounded-xl text-white hover:bg-red-500/40 transition-all">
                                <Trash2 size={20} />
                              </button>
                            )}
                          </div>
                        </div>
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              value={item.title}
                              onChange={(e) => updatePortfolioItem(idx, 'title', e.target.value)}
                              className="w-full px-3 py-1.5 bg-gray-50 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500"
                              placeholder="Project Title"
                            />
                            <input
                              value={item.imageUrl}
                              onChange={(e) => updatePortfolioItem(idx, 'imageUrl', e.target.value)}
                              className="w-full px-3 py-1.5 bg-gray-50 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500"
                              placeholder="Image URL"
                            />
                          </div>
                        ) : (
                          <h4 className="font-bold text-gray-900 group-hover:text-teal-600 transition-colors">{item.title}</h4>
                        )}
                      </div>
                    ))}
                    {isOwnProfile && isEditing && (
                      <button 
                        onClick={addPortfolioItem}
                        className="aspect-video rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-teal-300 hover:text-teal-600 transition-all group bg-gray-50/50"
                      >
                        <Plus size={24} />
                        <span className="text-xs font-bold uppercase tracking-widest">Add Project</span>
                      </button>
                    )}
                    {!isEditing && !userProfile.portfolio?.length && (
                      <div className="col-span-full text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                        <p className="text-gray-400 italic">No projects showcased yet.</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'about' && (
                  <motion.div
                    key="about"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-10"
                  >
                    {/* Profile Completion Bar */}
                    {isOwnProfile && completion < 100 && (
                      <div className="mb-8 p-6 bg-teal-50/50 rounded-3xl border border-teal-100 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-xs font-bold text-teal-700 uppercase tracking-widest mb-1">Profile Completion</p>
                            <p className="text-[10px] text-teal-600/70 font-medium">Complete your profile to stand out to clients and peers</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-black text-teal-700">{completion}%</p>
                          </div>
                        </div>
                        <div className="h-2.5 bg-teal-100 rounded-full overflow-hidden shadow-inner">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${completion}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 shadow-sm"
                          />
                        </div>
                      </div>
                    )}

                    <section>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                          <Award size={24} className="text-teal-600" />
                          Experience
                        </h3>
                        {isOwnProfile && (
                          <button onClick={addExperience} className="p-2 text-teal-600 hover:bg-teal-50 rounded-xl transition-all">
                            <Plus size={20} />
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-8">
                        {isEditing ? (
                          <div className="space-y-6">
                            {editData.experience?.map((exp, idx) => (
                              <div key={idx} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4 relative">
                                <button 
                                  onClick={() => removeExperience(idx)}
                                  className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Title</label>
                                    <input
                                      value={exp.title}
                                      onChange={(e) => updateExperience(idx, 'title', e.target.value)}
                                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                      placeholder="Software Engineer"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Company</label>
                                    <input
                                      value={exp.company}
                                      onChange={(e) => updateExperience(idx, 'company', e.target.value)}
                                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                      placeholder="Google"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Period</label>
                                    <input
                                      value={exp.period}
                                      onChange={(e) => updateExperience(idx, 'period', e.target.value)}
                                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                      placeholder="Jan 2022 - Present"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Type</label>
                                    <input
                                      value={exp.type}
                                      onChange={(e) => updateExperience(idx, 'type', e.target.value)}
                                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                      placeholder="Full-time"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase">Description</label>
                                  <textarea
                                    value={exp.description}
                                    onChange={(e) => updateExperience(idx, 'description', e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none transition-all min-h-[80px]"
                                    placeholder="Describe your role and achievements..."
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          userProfile.experience?.map((exp, i) => (
                            <div key={i} className="flex gap-6 relative group">
                              <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center flex-none">
                                <Briefcase size={20} className="text-teal-600" />
                              </div>
                              <div className="flex-1">
                                <h4 className="text-lg font-bold text-gray-900">{exp.title}</h4>
                                <p className="text-teal-600 font-bold">{exp.company} • {exp.type}</p>
                                <p className="text-gray-400 text-sm mt-1">{exp.period}</p>
                                <p className="text-gray-600 mt-3 text-sm leading-relaxed">
                                  {exp.description}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                        {!isEditing && !userProfile.experience?.length && (
                          <p className="text-gray-400 text-center py-8 italic">No experience listed yet.</p>
                        )}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <GraduationCap size={24} className="text-teal-600" />
                        Education
                      </h3>
                      {isEditing ? (
                        <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">University</label>
                              <input
                                value={editData.education?.university}
                                onChange={(e) => setEditData({ ...editData, education: { ...editData.education!, university: e.target.value } })}
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                placeholder="University Name"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Degree</label>
                              <input
                                value={editData.education?.degree}
                                onChange={(e) => setEditData({ ...editData, education: { ...editData.education!, degree: e.target.value } })}
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                placeholder="Bachelor of Science"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Graduation Year</label>
                            <input
                              value={editData.education?.year}
                              onChange={(e) => setEditData({ ...editData, education: { ...editData.education!, year: e.target.value } })}
                              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                              placeholder="2025"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-none">
                            <GraduationCap size={32} className="text-teal-600" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-gray-900">{userProfile.education?.university || 'University not set'}</h4>
                            <p className="text-gray-600">{userProfile.education?.degree || 'Degree not set'}</p>
                            <p className="text-gray-400 text-sm mt-1">Class of {userProfile.education?.year || '2025'}</p>
                          </div>
                        </div>
                      )}
                    </section>
                  </motion.div>
                )}

                {activeTab === 'activity' && (
                  <motion.div
                    key="activity"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    {userPosts.length > 0 ? userPosts.map((post) => (
                      <div key={post.id} className="p-6 bg-white border border-gray-100 rounded-2xl hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                            <MessageSquare size={18} className="text-teal-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">Shared a post</p>
                            <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(post.createdAt))} ago</p>
                          </div>
                        </div>
                        <p className="text-gray-800 text-sm leading-relaxed">
                          {post.content}
                        </p>
                        {post.imageUrl && (
                          <div className="mt-4 rounded-xl overflow-hidden aspect-video">
                            <img src={post.imageUrl} alt="Post" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    )) : (
                      <div className="text-center py-12">
                        <Zap size={32} className="text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-400 italic">No activity yet.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Proposal Modal */}
      <AnimatePresence>
        {showProposalModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-10 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-teal-400 to-emerald-400"></div>
              <button 
                onClick={() => setShowProposalModal(false)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>

              <h2 className="text-3xl font-bold text-gray-900 mb-2">Send Proposal</h2>
              <p className="text-gray-500 mb-8">Hire {userProfile.displayName} for your project.</p>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Project Details</label>
                  <textarea
                    value={proposalContent}
                    onChange={(e) => setProposalContent(e.target.value)}
                    className="w-full px-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-2xl text-base transition-all min-h-[140px] outline-none"
                    placeholder="What are you looking for?"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Budget ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input
                      type="number"
                      value={proposalBudget}
                      onChange={(e) => setProposalBudget(parseInt(e.target.value))}
                      className="w-full pl-8 pr-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-2xl text-base transition-all outline-none"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleSendProposal} 
                  className="w-full bg-teal-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-teal-700 transition-all shadow-xl shadow-teal-900/10 flex items-center justify-center gap-2"
                >
                  <Zap size={20} />
                  Send Proposal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[100] px-6 py-3 bg-gray-900 text-white rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-teal-400' : 'bg-red-400'}`} />
            <span className="text-sm font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
