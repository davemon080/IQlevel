import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserProfile, Post } from '../types';
import { supabaseService } from '../services/supabaseService';
import { ArrowLeft, Camera, MessageSquare, Save, Share2, Plus, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProfileProps {
  profile: UserProfile;
}

export default function Profile({ profile: loggedInProfile }: ProfileProps) {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'about' | 'portfolio' | 'activity'>('about');
  const [saving, setSaving] = useState(false);

  const isOwnProfile = uid === loggedInProfile.uid;

  useEffect(() => {
    if (!uid) return;
    let active = true;
    setLoading(true);
    Promise.all([supabaseService.getUserProfile(uid), supabaseService.getPostsByUser(uid)])
      .then(([profile, profilePosts]) => {
        if (!active) return;
        setUserProfile(profile);
        setDraft(profile || {});
        setPosts(profilePosts);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [uid]);

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

  if (loading) return <div className="max-w-5xl mx-auto p-6 text-sm text-gray-500">Loading profile...</div>;
  if (!userProfile) return <div className="max-w-5xl mx-auto p-6 text-sm text-gray-500">Profile not found.</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
        <div className="relative h-48 bg-gradient-to-r from-teal-600 to-emerald-600">
          {(editing ? draft.coverPhotoURL : userProfile.coverPhotoURL) && (
            <img
              src={(editing ? draft.coverPhotoURL : userProfile.coverPhotoURL) || ''}
              alt="cover"
              className="w-full h-full object-cover"
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

        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative -mt-16">
              <img
                src={(editing ? draft.photoURL : userProfile.photoURL) || ''}
                alt={userProfile.displayName}
                className="w-28 h-28 rounded-2xl border-4 border-white object-cover"
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
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{editing ? draft.displayName : userProfile.displayName}</h2>
              <p className="text-sm text-gray-500 mt-1 capitalize">{userProfile.role}</p>
              <p className="text-xs text-gray-400 mt-1">Profile completion: {completion}%</p>
            </div>
            {isOwnProfile ? (
              <div className="flex gap-2">
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
              <div className="flex gap-2">
                <button onClick={() => navigate(`/messages?uid=${userProfile.uid}`)} className="px-4 py-2 rounded-xl bg-teal-700 text-white hover:bg-teal-800 text-sm font-semibold inline-flex items-center gap-2">
                  <MessageSquare size={14} />
                  Message
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-4 mt-6 border-b border-gray-100">
            {(['about', 'portfolio', 'activity'] as const).map((value) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={`pb-3 text-sm font-bold capitalize ${tab === value ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-400'}`}
              >
                {value}
              </button>
            ))}
          </div>

          {tab === 'about' && (
            <div className="mt-6 space-y-6">
              <EditableField label="Display Name" value={editing ? draft.displayName : userProfile.displayName} editing={editing} onChange={(v) => setDraft((prev) => ({ ...prev, displayName: v }))} />
              <EditableField label="Bio" value={editing ? draft.bio : userProfile.bio} textarea editing={editing} onChange={(v) => setDraft((prev) => ({ ...prev, bio: v }))} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EditableField label="Location" value={editing ? draft.location : userProfile.location} editing={editing} onChange={(v) => setDraft((prev) => ({ ...prev, location: v }))} />
                <EditableField label="Status" value={editing ? draft.status : userProfile.status} editing={editing} onChange={(v) => setDraft((prev) => ({ ...prev, status: v }))} />
              </div>

              <section>
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
                </div>
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
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900">Experience</p>
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
                <p className="text-sm font-bold text-gray-900">Company Info</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <EditableField label="Company Name" value={editing ? draft.companyInfo?.name : userProfile.companyInfo?.name} editing={editing} onChange={(v) => setDraft((prev) => ({ ...prev, companyInfo: { ...(prev.companyInfo || { name: '', about: '' }), name: v } }))} />
                  <EditableField label="About Company" value={editing ? draft.companyInfo?.about : userProfile.companyInfo?.about} editing={editing} textarea onChange={(v) => setDraft((prev) => ({ ...prev, companyInfo: { ...(prev.companyInfo || { name: '', about: '' }), about: v } }))} />
                </div>
              </section>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(editing ? draft.portfolio : userProfile.portfolio || []).map((item, index) => (
                  <div key={index} className="p-4 border border-gray-100 rounded-2xl space-y-3">
                    <img src={item.imageUrl || 'https://via.placeholder.com/600x400?text=Project'} alt={item.title} className="w-full h-44 object-cover rounded-xl" />
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
            <div className="mt-6 space-y-3">
              {posts.length === 0 && <p className="text-sm text-gray-500">No activity yet.</p>}
              {posts.map((post) => (
                <div key={post.id} className="p-4 border border-gray-100 rounded-2xl">
                  <p className="text-xs text-gray-400 mb-2">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{post.content}</p>
                  {post.imageUrl && <img src={post.imageUrl} alt="post" className="w-full mt-3 rounded-xl" />}
                </div>
              ))}
            </div>
          )}
        </div>
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
}: {
  label: string;
  value?: string;
  editing: boolean;
  onChange: (value: string) => void;
  textarea?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-wider font-bold text-gray-400">{label}</p>
      {editing ? (
        textarea ? (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-teal-500 min-h-[88px]"
          />
        ) : (
          <input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-teal-500"
          />
        )
      ) : (
        <p className="text-sm text-gray-800">{value || 'Not set'}</p>
      )}
    </div>
  );
}
