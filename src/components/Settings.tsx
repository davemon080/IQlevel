import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { NotificationSettings, UserProfile } from '../types';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../supabase';
import {
  User, 
  Lock, 
  Bell, 
  Shield, 
  LogOut, 
  ChevronRight, 
  Camera, 
  Check, 
  AlertCircle,
  Globe,
  Moon,
  Smartphone,
  Wallet,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CachedImage from './CachedImage';

interface SettingsProps {
  profile: UserProfile;
  onLogout: () => void;
  onProfileUpdate: (profile: UserProfile) => void;
}

export default function Settings({ profile, onLogout, onProfileUpdate }: SettingsProps) {
  const [activeSection, setActiveSection] = useState<'main' | 'profile' | 'security' | 'notifications'>('main');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Profile Form State
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio || '');
  const [photoURL, setPhotoURL] = useState(profile.photoURL);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    wallet: true,
    gigs: true,
    feed: true,
    friendRequests: true,
  });
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  React.useEffect(() => {
    setNotificationSettings(supabaseService.getNotificationSettings(profile.uid));
  }, [profile.uid]);

  const handleUpdateProfile = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: displayName,
          avatar_url: photoURL,
        },
      });
      const updatedProfile = { ...profile, displayName, bio, photoURL };
      await supabaseService.updateUserProfile(profile.uid, { displayName, bio, photoURL });
      onProfileUpdate(updatedProfile);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setActiveSection('main'), 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword,
      });
      if (reauthError) throw reauthError;

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setActiveSection('main'), 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const url = await supabaseService.uploadUserAsset(file, 'profile/avatar');
      setPhotoURL(url);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveNotificationSettings = () => {
    setSavingNotifications(true);
    setMessage(null);
    try {
      supabaseService.updateNotificationSettings(profile.uid, notificationSettings);
      setMessage({ type: 'success', text: 'Notification preferences updated.' });
      setTimeout(() => setActiveSection('main'), 1000);
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleCopyUserId = async () => {
    const value = profile.publicId || profile.uid;
    await navigator.clipboard.writeText(value);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1200);
  };

  const SettingItem = ({ icon: Icon, label, sublabel, onClick, color = "text-gray-600" }: any) => (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
    >
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-xl bg-gray-50 ${color}`}>
          <Icon size={20} />
        </div>
        <div className="text-left">
          <p className="text-sm font-bold text-gray-900">{label}</p>
          {sublabel && <p className="text-xs text-gray-500">{sublabel}</p>}
        </div>
      </div>
      <ChevronRight size={18} className="text-gray-300" />
    </button>
  );

  const SettingLink = ({ icon: Icon, label, sublabel, to, color = "text-gray-600" }: any) => (
    <Link
      to={to}
      className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
    >
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-xl bg-gray-50 ${color}`}>
          <Icon size={20} />
        </div>
        <div className="text-left">
          <p className="text-sm font-bold text-gray-900">{label}</p>
          {sublabel && <p className="text-xs text-gray-500">{sublabel}</p>}
        </div>
      </div>
      <ChevronRight size={18} className="text-gray-300" />
    </Link>
  );

  return (
    <div className="max-w-2xl mx-auto pb-24 md:pb-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account and preferences</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeSection === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="p-6 bg-gray-50/50 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CachedImage
                      src={profile.photoURL}
                      alt={profile.displayName}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      wrapperClassName="w-16 h-16 rounded-2xl shadow-md"
                      imgClassName="w-full h-full rounded-2xl object-cover"
                    />
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{profile.displayName}</h2>
                      <p className="text-sm text-gray-500">{profile.email}</p>
                      <button
                        type="button"
                        onClick={handleCopyUserId}
                        className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
                      >
                        <Copy size={12} />
                        {copiedId ? 'Copied' : `ID: ${profile.publicId || profile.uid}`}
                      </button>
                    </div>
                  </div>
                  <Link 
                    to={`/profile/${profile.uid}`}
                    className="p-3 bg-white border border-gray-200 text-teal-700 rounded-xl hover:bg-teal-50 transition-all shadow-sm"
                  >
                    <User size={20} />
                  </Link>
                </div>
              </div>

              <div className="py-2">
                <div className="px-6 py-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account</p>
                </div>
                <SettingItem 
                  icon={User} 
                  label="Personal Information" 
                  sublabel="Name, bio, and profile picture"
                  onClick={() => setActiveSection('profile')}
                  color="text-teal-600"
                />
                <SettingItem 
                  icon={Lock} 
                  label="Security" 
                  sublabel="Password and authentication"
                  onClick={() => setActiveSection('security')}
                  color="text-amber-600"
                />
                <SettingItem 
                  icon={Bell} 
                  label="Notifications" 
                  sublabel="Push and email alerts"
                  onClick={() => setActiveSection('notifications')}
                  color="text-blue-600"
                />
                <SettingLink
                  to="/wallets"
                  icon={Wallet}
                  label="Wallets"
                  sublabel="Balances, top-ups, withdrawals"
                  color="text-emerald-600"
                />
              </div>

              <div className="py-2 border-t border-gray-100">
                <div className="px-6 py-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Preferences</p>
                </div>
                <SettingItem icon={Globe} label="Language" sublabel="English (US)" />
                <SettingItem icon={Moon} label="Appearance" sublabel="Light Mode" />
                <SettingItem icon={Smartphone} label="Connected Devices" sublabel="2 active sessions" />
              </div>

              <div className="p-4 bg-gray-50/50">
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 p-4 text-red-600 font-bold hover:bg-red-50 rounded-2xl transition-all"
                >
                  <LogOut size={20} />
                  Log Out
                </button>
              </div>
            </motion.div>
          )}

          {activeSection === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <button onClick={() => setActiveSection('main')} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                  <ChevronRight size={24} className="rotate-180" />
                </button>
                <h2 className="text-xl font-bold text-gray-900">Personal Info</h2>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <CachedImage
                    src={photoURL}
                    alt="Profile"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    wrapperClassName="w-32 h-32 rounded-3xl shadow-xl"
                    imgClassName="w-full h-full rounded-3xl object-cover"
                  />
                  <label className="absolute bottom-2 right-2 p-2 bg-teal-600 text-white rounded-xl shadow-lg hover:bg-teal-700 transition-all cursor-pointer">
                    <Camera size={18} />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                    />
                  </label>
                </div>
                {uploadingPhoto && <p className="text-xs text-gray-500">Uploading photo...</p>}
                <div className="w-full space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Profile Picture URL</label>
                  <input 
                    type="text" 
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl text-sm transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl text-sm transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Bio</label>
                  <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl text-sm transition-all min-h-[100px]"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                  {message.text}
                </div>
              )}

              <button 
                onClick={handleUpdateProfile}
                disabled={loading}
                className="w-full bg-teal-700 text-white font-bold py-4 rounded-2xl hover:bg-teal-800 disabled:opacity-50 transition-all shadow-lg shadow-teal-100"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </motion.div>
          )}

          {activeSection === 'security' && (
            <motion.div
              key="security"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <button onClick={() => setActiveSection('main')} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                  <ChevronRight size={24} className="rotate-180" />
                </button>
                <h2 className="text-xl font-bold text-gray-900">Security</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Current Password</label>
                  <input 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl text-sm transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">New Password</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl text-sm transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Confirm New Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl text-sm transition-all"
                  />
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                  {message.text}
                </div>
              )}

              <button 
                onClick={handleChangePassword}
                disabled={loading}
                className="w-full bg-teal-700 text-white font-bold py-4 rounded-2xl hover:bg-teal-800 disabled:opacity-50 transition-all shadow-lg shadow-teal-100"
              >
                {loading ? 'Changing Password...' : 'Update Password'}
              </button>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <div className="flex gap-3">
                  <Shield className="text-amber-600 shrink-0" size={20} />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Changing your password will require you to re-authenticate. Make sure you remember your new password!
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <button onClick={() => setActiveSection('main')} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                  <ChevronRight size={24} className="rotate-180" />
                </button>
                <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
              </div>

              <div className="space-y-2">
                {[
                  { key: 'wallet', label: 'Wallet Activity', desc: 'Transfers, withdrawals and top-ups.' },
                  { key: 'gigs', label: 'Gig Activity', desc: 'Applications and updates on your gigs.' },
                  { key: 'feed', label: 'Feed Activity', desc: 'Likes and comments on your posts.' },
                  { key: 'friendRequests', label: 'Friend Requests', desc: 'New connection requests.' }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setNotificationSettings((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key as keyof NotificationSettings],
                        }))
                      }
                      className={`w-12 h-6 rounded-full relative p-1 transition-all ${
                        notificationSettings[item.key as keyof NotificationSettings] ? 'bg-teal-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${
                          notificationSettings[item.key as keyof NotificationSettings] ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                  {message.text}
                </div>
              )}

              <button 
                onClick={handleSaveNotificationSettings}
                disabled={savingNotifications}
                className="w-full bg-teal-700 text-white font-bold py-4 rounded-2xl hover:bg-teal-800 transition-all shadow-lg shadow-teal-100 disabled:opacity-70"
              >
                {savingNotifications ? 'Saving...' : 'Save Preferences'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
