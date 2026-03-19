import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, Post, Job } from '../types';
import { supabaseService } from '../services/supabaseService';
import { Image, Send, Briefcase, Star, MapPin, DollarSign, Plus, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface FeedProps {
  profile: UserProfile;
}

export default function Feed({ profile }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  const [topStudents, setTopStudents] = useState<UserProfile[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribePosts = supabaseService.subscribeToPosts(setPosts);
    const unsubscribeJobs = supabaseService.subscribeToJobs((allJobs) => {
      setJobs(allJobs.slice(0, 3)); // Only show top 3 in sidebar
    });

    // Fetch top rated students
    const fetchTopStudents = async () => {
      const students = await supabaseService.getTopStudents(5);
      setTopStudents(students.slice(0, 3));
    };
    fetchTopStudents();

    return () => {
      unsubscribePosts();
      unsubscribeJobs();
    };
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    setIsPosting(true);
    await supabaseService.createPost({
      authorUid: profile.uid,
      authorName: profile.displayName,
      authorPhoto: profile.photoURL,
      content: newPostContent,
      type: 'social'
    });
    setNewPostContent('');
    setShowComposer(false);
    setIsPosting(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Mini Profile (Hidden on mobile) */}
      <div className="hidden lg:block lg:col-span-3 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-20 bg-teal-600"></div>
          <div className="px-6 pb-6 -mt-10 text-center">
            <img 
              src={profile.photoURL} 
              alt={profile.displayName} 
              className="w-20 h-20 rounded-2xl border-4 border-white mx-auto mb-4 object-cover shadow-md" 
            />
            <h3 className="text-lg font-bold text-gray-900">{profile.displayName}</h3>
            <p className="text-sm text-gray-500 mb-4 capitalize">{profile.role}</p>
            <div className="pt-4 border-t border-gray-100 flex justify-around text-center">
              <div>
                <p className="text-lg font-bold text-teal-700">12</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Gigs</p>
              </div>
              <div>
                <p className="text-lg font-bold text-teal-700">4.9</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Rating</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">My Skills</h4>
          <div className="flex flex-wrap gap-2">
            {profile.skills?.length ? profile.skills.map(skill => (
              <span key={skill} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                {skill}
              </span>
            )) : (
              <p className="text-xs text-gray-400 italic">No skills added yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Center Column: Feed */}
      <div className="lg:col-span-6 space-y-4 sm:space-y-6">
        {/* Posts List */}
        <AnimatePresence>
          {posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <img src={post.authorPhoto} alt={post.authorName} className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900">{post.authorName}</h4>
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  {post.type === 'job' && (
                    <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-teal-50 text-teal-700 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider rounded-full">
                      Job Highlight
                    </span>
                  )}
                </div>
                <p className="text-gray-700 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
                {post.imageUrl && (
                  <img src={post.imageUrl} alt="Post content" className="mt-3 sm:mt-4 rounded-xl w-full object-cover max-h-64 sm:max-h-96" />
                )}
              </div>
              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-4 sm:gap-6">
                <button className="text-[10px] sm:text-xs font-bold text-gray-500 hover:text-teal-700 transition-colors">Like</button>
                <button className="text-[10px] sm:text-xs font-bold text-gray-500 hover:text-teal-700 transition-colors">Comment</button>
                <button className="text-[10px] sm:text-xs font-bold text-gray-500 hover:text-teal-700 transition-colors">Share</button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Floating Add Post Button */}
      <button
        onClick={() => setShowComposer(true)}
        className="fixed bottom-24 md:bottom-8 right-6 z-30 w-14 h-14 rounded-full bg-teal-600 text-white shadow-xl hover:bg-teal-700 transition-all flex items-center justify-center"
        aria-label="Create post"
      >
        <Plus size={24} />
      </button>

      {/* Create Post Modal */}
      {showComposer && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Create Post</h2>
              <button
                onClick={() => setShowComposer(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="flex gap-3 sm:gap-4">
                <img src={profile.photoURL} alt={profile.displayName} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover" />
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Share an update or a project..."
                  className="flex-1 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl p-3 sm:p-4 text-sm resize-none transition-all min-h-[120px]"
                />
              </div>
              <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100">
                <div className="flex gap-1 sm:gap-2">
                  <button type="button" className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                    <Image size={18} />
                  </button>
                  <button type="button" className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                    <Star size={18} />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!newPostContent.trim() || isPosting}
                  className="bg-teal-700 text-white px-4 sm:px-6 py-2 rounded-xl font-bold text-xs sm:text-sm hover:bg-teal-800 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isPosting ? 'Posting...' : 'Post Update'}
                  <Send size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Right Column: Widgets */}
      <div className="hidden lg:block lg:col-span-3 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2">
            <Briefcase size={16} className="text-teal-600" />
            Recommended Gigs
          </h4>
          <div className="space-y-4">
            {jobs.map(job => (
              <div key={job.id} className="p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                <p className="text-sm font-bold text-gray-900 mb-1">{job.title}</p>
                <div className="flex items-center gap-3 text-[10px] text-gray-500 font-medium">
                  <span className="flex items-center gap-1"><DollarSign size={10} /> {job.budget}</span>
                  <span className="flex items-center gap-1"><MapPin size={10} /> {job.isRemote ? 'Remote' : 'On-site'}</span>
                </div>
              </div>
            ))}
            <button 
              onClick={() => navigate('/jobs')}
              className="w-full py-2 text-xs font-bold text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
            >
              View All Gigs
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2">
            <Star size={16} className="text-yellow-500" />
            Top Rated Students
          </h4>
          <div className="space-y-4">
            {topStudents.map(student => (
              <div 
                key={student.uid} 
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-all"
                onClick={() => navigate(`/profile/${student.uid}`)}
              >
                <img src={student.photoURL} alt={student.displayName} className="w-10 h-10 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{student.displayName}</p>
                  <p className="text-[10px] text-gray-500 truncate">{student.skills?.[0] || 'Student'} · 4.9 ★</p>
                </div>
              </div>
            ))}
            {topStudents.length === 0 && (
              <p className="text-xs text-gray-400 italic text-center">No students found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
