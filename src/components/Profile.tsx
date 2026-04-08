import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserProfile, Post, CompanyPartnerRequest, CompanyFollow } from '../types';
import { supabaseService } from '../services/supabaseService';
import { ArrowLeft, Building2, Camera, ExternalLink, Globe, Heart, MapPin, MessageCircle, MessageSquare, Save, Share2, Plus, Trash2, Copy, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import CachedImage from './CachedImage';
import { PostComment, PostLike } from '../types';

interface ProfileProps {
  profile: UserProfile;
}

export default function Profile({ profile: loggedInProfile }: ProfileProps) {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [companyPartner, setCompanyPartner] = useState<CompanyPartnerRequest | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'about' | 'portfolio' | 'activity'>('about');
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCompanyLink, setCopiedCompanyLink] = useState<string | null>(null);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [companyFollowers, setCompanyFollowers] = useState<CompanyFollow[]>([]);
  const [myCompanyFollows, setMyCompanyFollows] = useState<CompanyFollow[]>([]);
  const [followedCompanies, setFollowedCompanies] = useState<Record<string, CompanyPartnerRequest>>({});
  const [likes, setLikes] = useState<PostLike[]>([]);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [canMessageUser, setCanMessageUser] = useState(false);

  const isOwnProfile = uid === loggedInProfile.uid;

  useEffect(() => {
    if (!uid || uid === loggedInProfile.uid) {
      setCanMessageUser(true);
      return;
    }
    supabaseService.areUsersConnected(loggedInProfile.uid, uid).then(setCanMessageUser).catch(() => setCanMessageUser(false));
  }, [loggedInProfile.uid, uid]);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);

    let initialized = false;
    const finishInitialLoad = () => {
      if (initialized) return;
      initialized = true;
      setLoading(false);
    };

    const unsubscribeProfile = supabaseService.subscribeToUserProfile(uid, (profile) => {
      setUserProfile(profile);
      setDraft((prev) => (Object.keys(prev).length > 0 && editing ? prev : profile || {}));
      finishInitialLoad();
    });

    const unsubscribePosts = supabaseService.subscribeToPostsByUser(uid, (profilePosts) => {
      setPosts(profilePosts);
      finishInitialLoad();
    });

    const unsubscribePartners = supabaseService.subscribeToApprovedCompanyPartnerRequests(50, (partners) => {
      setCompanyPartner(partners.find((item) => item.userUid === uid) || null);
      finishInitialLoad();
    });

    const unsubscribeFollowerState = supabaseService.subscribeToCompanyFollowsByFollowerUid(loggedInProfile.uid, setMyCompanyFollows);

    return () => {
      unsubscribeProfile();
      unsubscribePosts();
      unsubscribePartners();
      unsubscribeFollowerState();
    };
  }, [editing, loggedInProfile.uid, uid]);

  useEffect(() => {
    const unsubscribeLikes = supabaseService.subscribeToPostLikes(setLikes);
    const unsubscribeComments = supabaseService.subscribeToAllPostComments(setComments);
    return () => {
      unsubscribeLikes();
      unsubscribeComments();
    };
  }, []);

  useEffect(() => {
    if (!companyPartner) {
      setCompanyFollowers([]);
      return;
    }
    const unsubscribe = supabaseService.subscribeToCompanyFollowsByCompanyUid(companyPartner.userUid, setCompanyFollowers);
    return () => unsubscribe();
  }, [companyPartner]);

  useEffect(() => {
    const companyUids = Array.from(new Set(myCompanyFollows.map((item) => item.companyUid)));
    if (companyUids.length === 0) {
      setFollowedCompanies({});
      return;
    }
    supabaseService.getApprovedCompanyPartnerRequestsByUserUids(companyUids).then(setFollowedCompanies).catch(() => undefined);
  }, [myCompanyFollows]);

  const completion = useMemo(() => {
    if (!userProfile) return 0;
    const checks = [
      userProfile.displayName,
      userProfile.bio,
      userProfile.location,
      userProfile.status,
      userProfile.skills?.length,
      userProfile.education?.university,
      userProfile.experience?.length,
      userProfile.socialLinks?.linkedin || userProfile.socialLinks?.github,
      userProfile.portfolio?.length,
      userProfile.companyInfo?.name,
    ];
    const filled = checks.filter((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v))).length;
    return Math.round((filled / checks.length) * 100);
  }, [userProfile]);
  const likeCountMap = useMemo(
    () =>
      likes.reduce<Record<string, number>>((acc, like) => {
        acc[like.postId] = (acc[like.postId] || 0) + 1;
        return acc;
      }, {}),
    [likes]
  );
  const commentCountMap = useMemo(
    () =>
      comments.reduce<Record<string, number>>((acc, comment) => {
        acc[comment.postId] = (acc[comment.postId] || 0) + 1;
        return acc;
      }, {}),
    [comments]
  );
  const likedPostIds = useMemo(
    () => new Set(likes.filter((like) => like.userUid === loggedInProfile.uid).map((like) => like.postId)),
    [likes, loggedInProfile.uid]
  );
  const togglePostLike = async (postId: string) => {
    const shouldLike = !likedPostIds.has(postId);
    await supabaseService.setPostLike(postId, loggedInProfile.uid, shouldLike);
  };
  const sharePost = async (postId: string) => {
    const url = `${window.location.origin}/#/comments/${postId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Connect post', url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
  };

  const handleSave = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      await supabaseService.updateUserProfile(uid, draft);
      setUserProfile((prev) => ({ ...(prev as UserProfile), ...(draft as UserProfile) }));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUserId = async () => {
    const value = (editing ? draft.publicId : userProfile.publicId) || userProfile.uid;
    await navigator.clipboard.writeText(value);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1200);
  };

  const handleUploadImage = async (file: File, target: 'photoURL' | 'coverPhotoURL') => {
    const url = await supabaseService.uploadUserAsset(file, target === 'photoURL' ? 'profile/avatar' : 'profile/cover');
    setDraft((prev) => ({ ...prev, [target]: url }));
  };

  const handleAddSkill = () => {
    const skill = window.prompt('Enter skill');
    if (!skill) return;
    setDraft((prev) => ({ ...prev, skills: [...(prev.skills || []), skill.trim()] }));
  };

  const removeSkill = (skill: string) => {
    setDraft((prev) => ({ ...prev, skills: (prev.skills || []).filter((s) => s !== skill) }));
  };

  const addExperience = () => {
    setDraft((prev) => ({
      ...prev,
      experience: [
        ...(prev.experience || []),
        { title: '', company: '', type: '', period: '', description: '' },
      ],
    }));
  };

  const updateExperience = (index: number, key: keyof NonNullable<UserProfile['experience']>[number], value: string) => {
    setDraft((prev) => {
      const next = [...(prev.experience || [])];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, experience: next };
    });
  };

  const removeExperience = (index: number) => {
    setDraft((prev) => ({ ...prev, experience: (prev.experience || []).filter((_, i) => i !== index) }));
  };

  const addPortfolio = () => {
    setDraft((prev) => ({
      ...prev,
      portfolio: [...(prev.portfolio || []), { title: '', imageUrl: '', link: '' }],
    }));
  };

  const updatePortfolio = (index: number, key: 'title' | 'imageUrl' | 'link', value: string) => {
    setDraft((prev) => {
      const next = [...(prev.portfolio || [])];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, portfolio: next };
    });
  };

  const uploadPortfolioImage = async (file: File, index: number) => {
    const url = await supabaseService.uploadUserAsset(file, 'profile/portfolio');
    updatePortfolio(index, 'imageUrl', url);
  };

  if (loading) return <div className="px-4 py-6 text-sm text-gray-500 sm:px-6 lg:px-8">Loading profile...</div>;
  if (!userProfile) return <div className="px-4 py-6 text-sm text-gray-500 sm:px-6 lg:px-8">Profile not found.</div>;

  if (companyPartner) {
    const isFollowingCompany = myCompanyFollows.some((item) => item.companyUid === companyPartner.userUid);

    return (
      <div className="-mx-4 -mt-4 bg-[linear-gradient(180deg,#f5fffb_0%,#ffffff_24%,#f8fafc_100%)] pb-8 md:mx-0 md:mt-0 md:bg-none">
        <div className="space-y-4 px-4 pt-6 sm:px-6 lg:space-y-6 lg:px-8 lg:pt-8">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Company Profile</h1>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-sm">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.2),_transparent_24%),linear-gradient(120deg,#052e2b_0%,#0f766e_45%,#34d399_100%)] px-4 py-7 text-white sm:px-6 lg:px-8 lg:py-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
                <CachedImage
                  src={companyPartner.companyLogoUrl}
                  alt={companyPartner.companyName}
                  fallbackMode="logo"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  wrapperClassName="h-20 w-20 rounded-3xl border border-white/30 bg-white/15 p-2 shadow-lg shadow-black/10 sm:h-24 sm:w-24"
                  imgClassName="h-full w-full rounded-[1.25rem] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]">
                    <Building2 size={12} />
                    Approved Partner
                  </p>
                  <h2 className="mt-3 break-words text-2xl font-black leading-tight sm:text-4xl">{companyPartner.companyName}</h2>
                  <p className="mt-1 break-words text-sm text-emerald-50/90">{companyPartner.location}</p>
                  {!isOwnProfile && (
                    <button
                      type="button"
                      onClick={async () => {
                        const optimisticFollow: CompanyFollow = {
                          id: `temp-follow-${companyPartner.userUid}-${loggedInProfile.uid}`,
                          companyUid: companyPartner.userUid,
                          followerUid: loggedInProfile.uid,
                          createdAt: new Date().toISOString(),
                        };
                        const previousFollows = myCompanyFollows;
                        try {
                          setMyCompanyFollows((current) =>
                            isFollowingCompany
                              ? current.filter((item) => item.companyUid !== companyPartner.userUid)
                              : [...current.filter((item) => item.companyUid !== companyPartner.userUid), optimisticFollow]
                          );
                          await supabaseService.setCompanyFollow(companyPartner.userUid, loggedInProfile.uid, !isFollowingCompany);
                        } catch (error) {
                          setMyCompanyFollows(previousFollows);
                          console.error('Error updating company follow:', error);
                        }
                      }}
                      className={`mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold transition-colors sm:w-auto ${
                        isFollowingCompany ? 'bg-white text-emerald-700' : 'border border-white/30 text-white hover:bg-white/10'
                      }`}
                    >
                      {isFollowingCompany ? 'Following company' : 'Follow company'}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:max-w-sm lg:justify-end">
                <button
                  onClick={() => navigate(`/messages?uid=${userProfile.uid}`)}
                  className="min-h-11 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 sm:min-w-[170px]"
                >
                  Message Company
                </button>
                {companyPartner.websiteUrl && (
                  <a
                    href={companyPartner.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/30 px-4 py-3 text-sm font-bold text-white hover:bg-white/10 sm:min-w-[170px]"
                  >
                    <ExternalLink size={14} />
                    Visit Website
                  </a>
                )}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-3 text-sm text-white/90 sm:grid-cols-2 xl:max-w-xl">
              <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/12 px-4 py-2 font-semibold">
                <Users size={14} />
                {companyFollowers.length} follower{companyFollowers.length === 1 ? '' : 's'}
              </span>
              <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/12 px-4 py-2 font-semibold">
                <Building2 size={14} />
                Approved company profile
              </span>
            </div>
          </div>

          <div className="grid gap-5 bg-[linear-gradient(180deg,#f7fffc_0%,#ffffff_32%,#f8fafc_100%)] px-4 py-5 sm:gap-6 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
            <div className="min-w-0 space-y-6">
              <section className="rounded-[1.75rem] border border-emerald-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700/70">About this company</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
                  {companyPartner.about || userProfile.companyInfo?.about || 'No company description added yet.'}
                </p>
              </section>

              {posts.length > 0 && (
                <section className="space-y-3 sm:space-y-4">
                  <div className="rounded-[1.75rem] border border-emerald-100 bg-white px-4 py-4 shadow-sm sm:rounded-3xl sm:px-5">
                    <p className="text-sm font-bold text-gray-900">Latest Highlights</p>
                    <p className="mt-1 text-xs text-gray-500">Company posts stay aligned inside the profile page so every detail remains visible on mobile and desktop.</p>
                  </div>
                  {posts.map((post) => (
                    <article key={post.id} className="overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-white shadow-sm sm:rounded-3xl">
                      <div className="px-4 py-4 sm:px-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                            company update
                          </span>
                          <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</p>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-gray-800">{post.content}</p>
                      </div>
                      {post.imageUrl && (
                        <CachedImage
                          src={post.imageUrl}
                          alt="company post"
                          fallbackMode="post"
                          loading="lazy"
                          decoding="async"
                          wrapperClassName="w-full"
                          imgClassName="max-h-[26rem] w-full object-cover"
                        />
                      )}
                    </article>
                  ))}
                </section>
              )}
            </div>

            <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700/70">Company details</p>
                <div className="mt-4 space-y-3 text-sm text-gray-700">
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="mt-0.5 text-teal-700" />
                    <span>{companyPartner.location}</span>
                  </div>
                  {companyPartner.websiteUrl && (
                    <div className="flex items-start gap-3">
                      <Globe size={16} className="mt-0.5 text-teal-700" />
                      <a href={companyPartner.websiteUrl} target="_blank" rel="noopener noreferrer" className="break-all text-teal-700 hover:underline">
                        {companyPartner.websiteUrl}
                      </a>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Copy size={16} className="mt-0.5 text-teal-700" />
                    <button onClick={handleCopyUserId} type="button" className="text-left text-teal-700 hover:underline">
                      {copiedId ? 'Copied company ID' : `Company ID: ${userProfile.publicId || userProfile.uid}`}
                    </button>
                  </div>
                </div>
              </div>

              {companyPartner.socialLinks.length > 0 && (
                <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700/70">Social links</p>
                  <div className="mt-4 space-y-2">
                    {companyPartner.socialLinks.map((link) => (
                      <div key={link} className="flex flex-col gap-2 rounded-2xl bg-gray-50 px-4 py-3 sm:flex-row sm:items-center">
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700 hover:text-teal-700"
                        >
                          {link}
                        </a>
                        <button
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard.writeText(link);
                            setCopiedCompanyLink(link);
                            setTimeout(() => setCopiedCompanyLink(null), 1200);
                          }}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-50 sm:self-auto self-start"
                        >
                          {copiedCompanyLink === link ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      </div>

      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-teal-100 bg-white shadow-sm">
        <div className="relative h-44 bg-gradient-to-r from-teal-600 to-emerald-600 sm:h-52 lg:h-60">
          {(editing ? draft.coverPhotoURL : userProfile.coverPhotoURL) && (
            <CachedImage
              src={(editing ? draft.coverPhotoURL : userProfile.coverPhotoURL) || ''}
              alt="cover"
              loading="lazy"
              decoding="async"
              wrapperClassName="w-full h-full"
              imgClassName="w-full h-full object-cover"
            />
          )}
          {isOwnProfile && editing && (
            <label className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/30 text-white cursor-pointer">
              <Camera size={16} />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUploadImage(e.target.files[0], 'coverPhotoURL')}
              />
            </label>
          )}
        </div>

        <div className="space-y-6 px-4 pb-5 sm:px-6 lg:px-8 lg:pb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
            <div className="relative -mt-14 sm:-mt-16">
              <CachedImage
                src={(editing ? draft.photoURL : userProfile.photoURL) || ''}
                alt={userProfile.displayName}
                fallbackMode="avatar"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                wrapperClassName="w-28 h-28 rounded-2xl border-4 border-white"
                imgClassName="w-full h-full rounded-2xl object-cover"
              />
              {isOwnProfile && editing && (
                <label className="absolute bottom-1 right-1 p-1.5 rounded-lg bg-black/30 text-white cursor-pointer">
                  <Camera size={14} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUploadImage(e.target.files[0], 'photoURL')}
                  />
                </label>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-2xl font-bold text-gray-900 sm:text-[1.9rem]">{editing ? draft.displayName : userProfile.displayName}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700">{userProfile.role}</span>
                <span className="text-xs text-gray-400">Profile completion: {completion}%</span>
              </div>
              <button
                onClick={handleCopyUserId}
                type="button"
                className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-left text-xs font-semibold text-gray-600 hover:bg-gray-200"
              >
                <Copy size={12} />
                {copiedId ? 'Copied' : `User ID: ${(editing ? draft.publicId : userProfile.publicId) || userProfile.uid}`}
              </button>
            </div>
            </div>
            {isOwnProfile ? (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold text-sm">
                    Edit
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-teal-700 text-white hover:bg-teal-800 font-semibold text-sm inline-flex items-center gap-2"
                  >
                    <Save size={14} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                )}
                <button
                  onClick={() => navigator.clipboard.writeText(window.location.href)}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200"
                >
                  <Share2 size={16} />
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {canMessageUser ? (
                  <button onClick={() => navigate(`/messages?uid=${userProfile.uid}`)} className="px-4 py-2 rounded-xl bg-teal-700 text-white hover:bg-teal-800 text-sm font-semibold inline-flex items-center gap-2">
                    <MessageSquare size={14} />
                    Message
                  </button>
                ) : (
                  <button onClick={() => navigate('/network')} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-semibold inline-flex items-center gap-2">
                    <Users size={14} />
                    Connect First
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto border-b border-gray-100 px-1 pb-1">
            {(['about', 'portfolio', 'activity'] as const).map((value) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold capitalize transition ${tab === value ? 'bg-teal-50 text-teal-700' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'}`}
              >
                {value}
              </button>
            ))}
          </div>

          {tab === 'about' && (
            <div className="mt-6 space-y-7">
              <section className="space-y-4 rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                <p className="text-sm font-bold text-gray-900">Personal Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField label="Display Name" value={editing ? draft.displayName : userProfile.displayName} editing={editing} onChange={(v) => setDraft((prev) => ({ ...prev, displayName: v }))} />
                  <EditableField label="Public User ID" value={editing ? draft.publicId : userProfile.publicId || userProfile.uid} editing={false} onChange={() => undefined} />
                  <EditableField label="Phone Number" value={editing ? draft.phoneNumber : userProfile.phoneNumber} editing={editing} onChange={(v) => setDraft((prev) => ({ ...prev, phoneNumber: v }))} />
                  <EditableField label="Status" value={editing ? draft.status : userProfile.status} editing={editing} onChange={(v) => setDraft((prev) => ({ ...prev, status: v }))} />
                </div>
              </section>

              <section className="space-y-4 rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                <p className="text-sm font-bold text-gray-900">Location & Date Of Birth</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField label="Location" value={editing ? draft.location : userProfile.location} editing={editing} onChange={(v) => setDraft((prev) => ({ ...prev, location: v }))} />
                  <EditableField label="Date Of Birth" value={editing ? draft.dateOfBirth : userProfile.dateOfBirth} editing={editing} onChange={(v) => setDraft((prev) => ({ ...prev, dateOfBirth: v }))} inputType="date" />
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-900">Skills</p>
                  {editing && (
                    <button onClick={handleAddSkill} className="px-2 py-1 text-xs rounded-lg bg-gray-100 hover:bg-gray-200">
                      <Plus size={12} />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(editing ? draft.skills : userProfile.skills || []).map((skill) => (
                    <span key={skill} className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700 flex items-center gap-1">
                      {skill}
                      {editing && (
                        <button onClick={() => removeSkill(skill)}>
                          <Trash2 size={11} />
                        </button>
                      )}
                    </span>
                  ))}
                  {(!(editing ? draft.skills : userProfile.skills) || (editing ? draft.skills : userProfile.skills || []).length === 0) && (
                    <p className="text-sm text-gray-500">No skills added yet.</p>
                  )}
                </div>
              </section>

              <section className="space-y-4 rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">More details</p>
                    <p className="text-xs text-gray-500">Experience, education, social links, and extended bio.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMoreDetails((prev) => !prev)}
                    className="text-sm font-semibold text-teal-700 hover:text-teal-800"
                  >
                    {showMoreDetails ? 'Hide details' : 'See more details'}
                  </button>
                </div>

                {showMoreDetails && (
                  <div className="space-y-6">
                    <section className="space-y-3">
                      <p className="text-sm font-bold text-gray-900">Experience</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Work history</span>
                        {editing && (
                          <button onClick={addExperience} className="px-2 py-1 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 inline-flex items-center gap-1">
                            <Plus size={12} />
                            Add
                          </button>
                        )}
                      </div>
                      {(editing ? draft.experience : userProfile.experience || []).map((exp, index) => (
                        <div key={index} className="p-3 rounded-xl border border-gray-100 space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <EditableField label="Title" value={exp.title} editing={editing} onChange={(v) => updateExperience(index, 'title', v)} />
                            <EditableField label="Company" value={exp.company} editing={editing} onChange={(v) => updateExperience(index, 'company', v)} />
                            <EditableField label="Type" value={exp.type} editing={editing} onChange={(v) => updateExperience(index, 'type', v)} />
                            <EditableField label="Period" value={exp.period} editing={editing} onChange={(v) => updateExperience(index, 'period', v)} />
                          </div>
                          <EditableField label="Description" value={exp.description} editing={editing} textarea onChange={(v) => updateExperience(index, 'description', v)} />
                          {editing && (
                            <button onClick={() => removeExperience(index)} className="text-xs text-red-600 font-semibold">Remove</button>
                          )}
                        </div>
                      ))}
                      {(!(editing ? draft.experience : userProfile.experience) || (editing ? draft.experience : userProfile.experience || []).length === 0) && (
                        <p className="text-sm text-gray-500">No experience added yet.</p>
                      )}
                    </section>

                    <section className="space-y-3">
                      <p className="text-sm font-bold text-gray-900">Education</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <EditableField label="University" value={editing ? draft.education?.university : userProfile.education?.university} editing={editing} onChange={(v) => setDraft((prev) => ({ ...prev, education: { ...(prev.education || { university: '', degree: '', verified: false }), university: v } }))} />
                        <EditableField label="Degree" value={editing ? draft.education?.degree : userProfile.education?.degree} editing={editing} onChange={(v) => setDraft((prev) => ({ ...prev, education: { ...(prev.education || { university: '', degree: '', verified: false }), degree: v } }))} />
                        <EditableField label="Year" value={editing ? draft.education?.year : userProfile.education?.year} editing={editing} onChange={(v) => setDraft((prev) => ({ ...prev, education: { ...(prev.education || { university: '', degree: '', verified: false }), year: v } }))} />
                      </div>
                    </section>

                    <section className="space-y-3">
                      <p className="text-sm font-bold text-gray-900">Social Links</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <EditableField label="LinkedIn" value={editing ? draft.socialLinks?.linkedin : userProfile.socialLinks?.linkedin} editing={editing} onChange={(v) => setDraft((prev) => ({ ...prev, socialLinks: { ...(prev.socialLinks || {}), linkedin: v } }))} />
                        <EditableField label="GitHub" value={editing ? draft.socialLinks?.github : userProfile.socialLinks?.github} editing={editing} onChange={(v) => setDraft((prev) => ({ ...prev, socialLinks: { ...(prev.socialLinks || {}), github: v } }))} />
                        <EditableField label="Twitter" value={editing ? draft.socialLinks?.twitter : userProfile.socialLinks?.twitter} editing={editing} onChange={(v) => setDraft((prev) => ({ ...prev, socialLinks: { ...(prev.socialLinks || {}), twitter: v } }))} />
                        <EditableField label="Website" value={editing ? draft.socialLinks?.website : userProfile.socialLinks?.website} editing={editing} onChange={(v) => setDraft((prev) => ({ ...prev, socialLinks: { ...(prev.socialLinks || {}), website: v } }))} />
                      </div>
                    </section>

                    <section className="space-y-3">
                      <EditableField label="Bio" value={editing ? draft.bio : userProfile.bio} textarea editing={editing} onChange={(v) => setDraft((prev) => ({ ...prev, bio: v }))} />
                    </section>
                  </div>
                )}
              </section>

              {myCompanyFollows.length > 0 && (
                <section className="space-y-4 rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900">Following</p>
                    <span className="text-xs font-semibold text-gray-400">{myCompanyFollows.length} compan{myCompanyFollows.length === 1 ? 'y' : 'ies'}</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {myCompanyFollows.map((follow) => {
                      const company = followedCompanies[follow.companyUid];
                      if (!company) return null;
                      return (
                        <button
                          key={follow.id}
                          type="button"
                          onClick={() => navigate(`/profile/${company.userUid}`)}
                          className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-left hover:border-teal-200 hover:bg-teal-50"
                        >
                          <CachedImage
                            src={company.companyLogoUrl}
                            alt={company.companyName}
                            fallbackMode="logo"
                            wrapperClassName="h-14 w-14 rounded-2xl"
                            imgClassName="h-full w-full rounded-2xl object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-gray-900">{company.companyName}</p>
                            <p className="truncate text-xs text-gray-500">{company.location}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}

          {tab === 'portfolio' && (
            <div className="mt-6 space-y-4">
              {editing && (
                <button onClick={addPortfolio} className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold inline-flex items-center gap-2">
                  <Plus size={14} />
                  Add Portfolio Item
                </button>
              )}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {(editing ? draft.portfolio : userProfile.portfolio || []).map((item, index) => (
                  <div key={index} className="space-y-3 rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm">
                    <CachedImage
                      src={item.imageUrl || 'https://via.placeholder.com/600x400?text=Project'}
                      alt={item.title}
                      fallbackMode="media"
                      loading="lazy"
                      decoding="async"
                      wrapperClassName="w-full h-44 rounded-xl"
                      imgClassName="w-full h-full rounded-xl object-cover"
                    />
                    <EditableField label="Project Title" value={item.title} editing={editing} onChange={(v) => updatePortfolio(index, 'title', v)} />
                    <EditableField label="Project Link" value={item.link} editing={editing} onChange={(v) => updatePortfolio(index, 'link', v)} />
                    {editing && (
                      <>
                        <EditableField label="Image URL" value={item.imageUrl} editing={editing} onChange={(v) => updatePortfolio(index, 'imageUrl', v)} />
                        <label className="text-xs font-semibold text-teal-700 cursor-pointer">
                          Upload image
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPortfolioImage(e.target.files[0], index)} />
                        </label>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'activity' && (
            <div className="space-y-3">
              {posts.length === 0 && <div className="rounded-3xl bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">No activity yet.</div>}
              {posts.map((post) => (
                <div key={post.id} className="rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-xs text-gray-400 mb-2">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{post.content}</p>
                  {post.imageUrl && (
                    <CachedImage
                      src={post.imageUrl}
                      alt="post"
                      fallbackMode="post"
                      loading="lazy"
                      decoding="async"
                      wrapperClassName="w-full mt-3 rounded-xl"
                      imgClassName="w-full h-full rounded-xl object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <section className="space-y-4 rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-400">Posts</p>
                <h3 className="mt-2 text-lg font-bold text-gray-900">All Posts</h3>
              </div>
              <p className="text-sm text-gray-500">
                {posts.length === 0 ? 'No posts published yet.' : `${posts.length} post${posts.length === 1 ? '' : 's'} from this profile`}
              </p>
            </div>

            {posts.length === 0 ? (
              <div className="rounded-3xl bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                This profile has not shared any posts yet.
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                {posts.map((post) => (
                  <article key={post.id} className="flex h-full flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="ml-4 mt-4 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700 shadow-sm">
                        {post.type}
                      </span>
                      <span className="mr-4 mt-4 text-xs text-gray-400">
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="px-4 pb-4">
                      <p className="text-sm leading-7 text-gray-800 whitespace-pre-wrap">{post.content}</p>
                    </div>
                    {post.imageUrl && (
                      <CachedImage
                        src={post.imageUrl}
                        alt="post"
                        fallbackMode="post"
                        loading="lazy"
                        decoding="async"
                        wrapperClassName="w-full overflow-hidden"
                        imgClassName="h-full w-full object-cover"
                      />
                    )}
                    <div className="flex items-center gap-5 border-t border-gray-100 px-4 py-3">
                      <button onClick={() => void togglePostLike(post.id)} className={`inline-flex items-center gap-1 text-xs font-bold ${likedPostIds.has(post.id) ? 'text-rose-600' : 'text-gray-500 hover:text-teal-700'}`}>
                        <Heart size={14} className={likedPostIds.has(post.id) ? 'fill-current' : ''} />
                        Like ({likeCountMap[post.id] || 0})
                      </button>
                      <button onClick={() => navigate(`/comments/${post.id}`)} className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-teal-700">
                        <MessageCircle size={14} />
                        Comment ({commentCountMap[post.id] || 0})
                      </button>
                      <button onClick={() => void sharePost(post.id)} className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-teal-700">
                        <Share2 size={14} />
                        Share
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
        </section>
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  editing,
  onChange,
  textarea = false,
  placeholder,
  inputType = 'text',
}: {
  label: string;
  value?: string;
  editing: boolean;
  onChange: (value: string) => void;
  textarea?: boolean;
  placeholder?: string;
  inputType?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-wider font-bold text-gray-400">{label}</p>
      {editing ? (
        textarea ? (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-teal-500 min-h-[88px]"
          />
        ) : (
          <input
            type={inputType}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-teal-500"
          />
        )
      ) : (
        <p className="text-sm text-gray-800">{value || 'Not set'}</p>
      )}
    </div>
  );
}
