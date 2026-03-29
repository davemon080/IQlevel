import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, Post, Job, PostLike, PostComment } from '../types';
import { supabaseService } from '../services/supabaseService';
import { Image, Send, Briefcase, Star, MapPin, DollarSign, Plus, X, Heart, MessageCircle, Share2, Copy, Link as LinkIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { useCurrency } from '../context/CurrencyContext';
import { formatMoneyFromUSD } from '../utils/currency';

interface FeedProps {
  profile: UserProfile;
}

export default function Feed({ profile }: FeedProps) {
  const { currency } = useCurrency();
  const [posts, setPosts] = useState<Post[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [likes, setLikes] = useState<PostLike[]>([]);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [topStudents, setTopStudents] = useState<UserProfile[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribePosts = supabaseService.subscribeToPosts(setPosts);
    const unsubscribeJobs = supabaseService.subscribeToJobs((allJobs) => setJobs(allJobs.slice(0, 3)));
    const unsubscribeLikes = supabaseService.subscribeToPostLikes(setLikes);
    const unsubscribeComments = supabaseService.subscribeToAllPostComments(setComments);

    const fetchTopStudents = async () => {
      const students = await supabaseService.getTopStudents(5);
      setTopStudents(students.slice(0, 3));
    };
    fetchTopStudents();

    return () => {
      unsubscribePosts();
      unsubscribeJobs();
      unsubscribeLikes();
      unsubscribeComments();
    };
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !postImageFile) return;
    setIsPosting(true);

    let imageUrl: string | undefined;
    if (postImageFile) {
      const upload = await supabaseService.uploadFile(postImageFile, 'posts');
      imageUrl = upload.url;
    }

    const optimistic: Post = {
      id: `temp-${Date.now()}`,
      authorUid: profile.uid,
      authorName: profile.displayName,
      authorPhoto: profile.photoURL,
      content: newPostContent,
      imageUrl,
      type: 'social',
      createdAt: new Date().toISOString(),
    };
    setPosts((prev) => [optimistic, ...prev]);

    await supabaseService.createPost({
      authorUid: profile.uid,
      authorName: profile.displayName,
      authorPhoto: profile.photoURL,
      content: newPostContent,
      imageUrl,
      type: 'social',
    });

    setNewPostContent('');
    setPostImageFile(null);
    setPostImagePreview(null);
    setShowComposer(false);
    setIsPosting(false);
  };

  const likeCountMap = likes.reduce<Record<string, number>>((acc, like) => {
    acc[like.postId] = (acc[like.postId] || 0) + 1;
    return acc;
  }, {});

  const commentCountMap = comments.reduce<Record<string, number>>((acc, comment) => {
    acc[comment.postId] = (acc[comment.postId] || 0) + 1;
    return acc;
  }, {});

  const likedPostIds = new Set(likes.filter((item) => item.userUid === profile.uid).map((item) => item.postId));

  const handleToggleLike = async (postId: string) => {
    if (postId.startsWith('temp-')) return;
    await supabaseService.togglePostLike(postId, profile.uid);
  };

  const getPostShareLink = (post: Post) => `${window.location.origin}/comments/${post.id}`;

  const openShareSheet = (post: Post) => {
    setCopied(false);
    setSharePost(post);
  };

  const shareTo = (platform: 'whatsapp' | 'facebook' | 'x' | 'linkedin' | 'telegram' | 'email') => {
    if (!sharePost) return;
    const link = encodeURIComponent(getPostShareLink(sharePost));
    const text = encodeURIComponent(`Check out this post from ${sharePost.authorName} on Connect`);

    const urls: Record<typeof platform, string> = {
      whatsapp: `https://wa.me/?text=${text}%20${link}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${link}`,
      x: `https://twitter.com/intent/tweet?text=${text}&url=${link}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${link}`,
      telegram: `https://t.me/share/url?url=${link}&text=${text}`,
      email: `mailto:?subject=${encodeURIComponent('Connect post')}&body=${text}%0A${link}`,
    };

    window.open(urls[platform], '_blank', 'noopener,noreferrer');
  };

  const copyPostLink = async () => {
    if (!sharePost) return;
    await navigator.clipboard.writeText(getPostShareLink(sharePost));
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="hidden lg:block lg:col-span-3 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-20 bg-teal-600"></div>
          <div className="px-6 pb-6 -mt-10 text-center">
            <img src={profile.photoURL} alt={profile.displayName} className="w-20 h-20 rounded-2xl border-4 border-white mx-auto mb-4 object-cover shadow-md" />
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
            {profile.skills?.length ? (
              profile.skills.map((skill) => (
                <span key={skill} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                  {skill}
                </span>
              ))
            ) : (
              <p className="text-xs text-gray-400 italic">No skills added yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-6 space-y-4 sm:space-y-6">
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
                      <p className="text-[10px] sm:text-xs text-gray-500">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</p>
                    </div>
                  </div>
                  {post.type === 'job' && (
                    <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-teal-50 text-teal-700 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider rounded-full">
                      Job Highlight
                    </span>
                  )}
                </div>
                <p className="text-gray-700 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                {post.imageUrl && <img src={post.imageUrl} alt="Post content" className="mt-3 sm:mt-4 rounded-xl w-full object-cover max-h-64 sm:max-h-96" />}
              </div>
              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-4 sm:gap-6">
                <button
                  onClick={() => handleToggleLike(post.id)}
                  className={`text-[10px] sm:text-xs font-bold transition-colors inline-flex items-center gap-1 ${likedPostIds.has(post.id) ? 'text-rose-600' : 'text-gray-500 hover:text-teal-700'}`}
                >
                  <Heart size={14} className={likedPostIds.has(post.id) ? 'fill-current' : ''} />
                  Like ({likeCountMap[post.id] || 0})
                </button>
                <button onClick={() => navigate(`/comments/${post.id}`)} className="text-[10px] sm:text-xs font-bold text-gray-500 hover:text-teal-700 transition-colors inline-flex items-center gap-1">
                  <MessageCircle size={14} />
                  Comment ({commentCountMap[post.id] || 0})
                </button>
                <button onClick={() => openShareSheet(post)} className="text-[10px] sm:text-xs font-bold text-gray-500 hover:text-teal-700 transition-colors inline-flex items-center gap-1">
                  <Share2 size={14} />
                  Share
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button
        onClick={() => setShowComposer(true)}
        className="fixed bottom-24 md:bottom-8 right-6 z-30 w-14 h-14 rounded-full bg-teal-600 text-white shadow-xl hover:bg-teal-700 transition-all flex items-center justify-center"
        aria-label="Create post"
      >
        <Plus size={24} />
      </button>

      {showComposer && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Create Post</h2>
              <button onClick={() => setShowComposer(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="flex gap-3 sm:gap-4">
                <img src={profile.photoURL} alt={profile.displayName} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover" />
                <div className="flex-1 space-y-2">
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="Share an update or a project..."
                    className="w-full bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl p-3 sm:p-4 text-sm resize-none transition-all min-h-[120px]"
                  />
                  {postImagePreview && (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200">
                      <img src={postImagePreview} alt="Post preview" className="w-full max-h-56 object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setPostImageFile(null);
                          setPostImagePreview(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/55 text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100">
                <div className="flex gap-1 sm:gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                    <Image size={18} />
                  </button>
                  <button type="button" className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                    <Star size={18} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setPostImageFile(file);
                      setPostImagePreview(URL.createObjectURL(file));
                      e.currentTarget.value = '';
                    }}
                  />
                </div>
                <button type="submit" disabled={(!newPostContent.trim() && !postImageFile) || isPosting} className="bg-teal-700 text-white px-4 sm:px-6 py-2 rounded-xl font-bold text-xs sm:text-sm hover:bg-teal-800 disabled:opacity-50 transition-all flex items-center gap-2">
                  {isPosting ? 'Posting...' : 'Post Update'}
                  <Send size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="hidden lg:block lg:col-span-3 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2">
            <Briefcase size={16} className="text-teal-600" />
            Recommended Gigs
          </h4>
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                <p className="text-sm font-bold text-gray-900 mb-1">{job.title}</p>
                <div className="flex items-center gap-3 text-[10px] text-gray-500 font-medium">
                  <span className="flex items-center gap-1">
                    <DollarSign size={10} /> {formatMoneyFromUSD(job.budget, currency)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={10} /> {job.isRemote ? 'Remote' : 'On-site'}
                  </span>
                </div>
              </div>
            ))}
            <button onClick={() => navigate('/jobs')} className="w-full py-2 text-xs font-bold text-teal-700 hover:bg-teal-50 rounded-lg transition-colors">
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
            {topStudents.map((student) => (
              <div key={student.uid} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-all" onClick={() => navigate(`/profile/${student.uid}`)}>
                <img src={student.photoURL} alt={student.displayName} className="w-10 h-10 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{student.displayName}</p>
                  <p className="text-[10px] text-gray-500 truncate">{student.skills?.[0] || 'Student'} · 4.9 ★</p>
                </div>
              </div>
            ))}
            {topStudents.length === 0 && <p className="text-xs text-gray-400 italic text-center">No students found.</p>}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {sharePost && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/35 z-40" onClick={() => setSharePost(null)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl border-t border-gray-200 shadow-2xl p-5"
            >
              <div className="max-w-2xl mx-auto">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">Share Post</h3>
                <p className="text-xs text-gray-500 mb-4">Share to social platforms or copy post link.</p>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                  {[
                    { key: 'whatsapp', label: 'WhatsApp' },
                    { key: 'facebook', label: 'Facebook' },
                    { key: 'x', label: 'X' },
                    { key: 'linkedin', label: 'LinkedIn' },
                    { key: 'telegram', label: 'Telegram' },
                    { key: 'email', label: 'Email' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => shareTo(item.key as 'whatsapp' | 'facebook' | 'x' | 'linkedin' | 'telegram' | 'email')}
                      className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                  <LinkIcon size={14} className="text-gray-500" />
                  <input readOnly value={getPostShareLink(sharePost)} className="flex-1 bg-transparent text-xs text-gray-600 outline-none" />
                  <button onClick={copyPostLink} className="px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1">
                    <Copy size={12} />
                    {copied ? 'Copied' : 'Copy Link'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
