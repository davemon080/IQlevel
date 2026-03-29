import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, User, Briefcase, FileText } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { Job, Post, UserProfile } from '../types';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    if (!isOpen || loadedOnce) return;
    let active = true;
    setLoading(true);

    Promise.all([
      supabaseService.getAllUsers(),
      supabaseService.listJobs(),
      supabaseService.listPosts(50),
    ])
      .then(([allUsers, allJobs, allPosts]) => {
        if (!active) return;
        setUsers(allUsers);
        setJobs(allJobs);
        setPosts(allPosts);
        setLoadedOnce(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, loadedOnce]);

  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!normalizedQuery) return [];

    const userResults = users
      .filter(
        (u) =>
          u.displayName.toLowerCase().includes(normalizedQuery) ||
          u.email.toLowerCase().includes(normalizedQuery) ||
          u.skills?.some((skill) => skill.toLowerCase().includes(normalizedQuery))
      )
      .slice(0, 6)
      .map((u) => ({
        id: `user-${u.uid}`,
        title: u.displayName,
        subtitle: `Profile • ${u.role}`,
        icon: User,
        action: () => navigate(`/profile/${u.uid}`),
      }));

    const jobResults = jobs
      .filter(
        (j) =>
          j.title.toLowerCase().includes(normalizedQuery) ||
          j.description.toLowerCase().includes(normalizedQuery) ||
          j.category.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 6)
      .map((j) => ({
        id: `job-${j.id}`,
        title: j.title,
        subtitle: `Gig • ${j.category}`,
        icon: Briefcase,
        action: () => navigate(`/jobs/${j.id}`),
      }));

    const postResults = posts
      .filter(
        (p) =>
          p.content.toLowerCase().includes(normalizedQuery) ||
          p.authorName.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 6)
      .map((p) => ({
        id: `post-${p.id}`,
        title: p.authorName,
        subtitle: `Post • ${p.content.slice(0, 72)}${p.content.length > 72 ? '...' : ''}`,
        icon: FileText,
        action: () => navigate(`/profile/${p.authorUid}`),
      }));

    return [...userResults, ...jobResults, ...postResults];
  }, [jobs, navigate, normalizedQuery, posts, users]);

  const handleResultClick = (action: () => void) => {
    action();
    onClose();
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-sm flex items-start justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <Search size={18} className="text-gray-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, gigs, and posts..."
            className="flex-1 text-sm md:text-base outline-none"
          />
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {loading && <p className="p-6 text-sm text-gray-500">Loading searchable content...</p>}
          {!loading && !normalizedQuery && (
            <p className="p-6 text-sm text-gray-500">Type to search across the app.</p>
          )}
          {!loading && normalizedQuery && results.length === 0 && (
            <p className="p-6 text-sm text-gray-500">No results found.</p>
          )}
          {!loading &&
            results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleResultClick(result.action)}
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 border-b border-gray-50"
              >
                <div className="p-2 rounded-xl bg-gray-100 text-gray-700">
                  <result.icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{result.title}</p>
                  <p className="text-xs text-gray-500">{result.subtitle}</p>
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
