import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Flag, Search } from 'lucide-react';
import { UserProfile, UserReport } from '../types';
import { supabaseService } from '../services/supabaseService';
import { getErrorMessage } from '../utils/errors';

const INPUT =
  'w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-500/20';

const REASONS = [
  'Harassment or abuse',
  'Spam or scam',
  'Impersonation',
  'Inappropriate content',
  'Fraudulent activity',
  'Other',
] as const;

export default function ReportedUsers({ profile }: { profile: UserProfile }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedUid = searchParams.get('uid') || '';
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [reports, setReports] = React.useState<UserReport[]>([]);
  const [selectedUid, setSelectedUid] = React.useState(preselectedUid);
  const [search, setSearch] = React.useState('');
  const [reason, setReason] = React.useState<(typeof REASONS)[number]>('Harassment or abuse');
  const [details, setDetails] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    supabaseService
      .getAllUsers()
      .then((items) => setUsers(items.filter((item) => item.uid !== profile.uid)))
      .catch(() => setUsers([]));
  }, [profile.uid]);

  React.useEffect(() => {
    const unsubscribe = supabaseService.subscribeToSubmittedUserReports(
      profile.uid,
      (items) => setReports(items),
      () => setReports([])
    );
    return () => unsubscribe();
  }, [profile.uid]);

  const visibleUsers = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [user.displayName, user.email, user.publicId || '', user.location || ''].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [search, users]);

  const selectedUser = users.find((user) => user.uid === selectedUid) || null;

  const submit = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await supabaseService.createUserReport(profile.uid, selectedUid, reason, details);
      setDetails('');
      setMessage({ tone: 'success', text: 'Your report was submitted. Our team will review it.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getErrorMessage(error, 'Unable to submit this report right now.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Report Users</h1>
          <p className="text-sm text-gray-500">Report harmful behavior and track the reports you have submitted.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Flag size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">Create a report</h2>
              <p className="text-sm text-gray-500">Choose a user, tell us what happened, and send it to admin.</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, public ID, or location"
                className={`${INPUT} pl-11`}
              />
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto rounded-3xl border border-gray-200 bg-gray-50 p-3">
              {visibleUsers.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-gray-500">No users match this search.</p>
              ) : (
                visibleUsers.slice(0, 24).map((user) => {
                  const active = user.uid === selectedUid;
                  return (
                    <button
                      key={user.uid}
                      type="button"
                      onClick={() => setSelectedUid(user.uid)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                        active ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <img src={user.photoURL} alt={user.displayName} className="h-10 w-10 rounded-full object-cover" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{user.displayName}</p>
                        <p className="truncate text-xs text-gray-500">{user.publicId || user.email}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {selectedUser ? (
              <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Reporting</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{selectedUser.displayName}</p>
                <p className="text-xs text-gray-600">{selectedUser.publicId || selectedUser.email}</p>
              </div>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-gray-900">Reason</span>
              <select value={reason} onChange={(event) => setReason(event.target.value as (typeof REASONS)[number])} className={INPUT}>
                {REASONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-gray-900">Details</span>
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="Describe what happened so the admin team can review it properly."
                className={`${INPUT} min-h-[130px]`}
              />
            </label>

            {message ? (
              <div className={`rounded-2xl px-4 py-3 text-sm ${message.tone === 'success' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
                {message.text}
              </div>
            ) : null}

            <button
              type="button"
              onClick={submit}
              disabled={saving || !selectedUid}
              className="w-full rounded-2xl bg-teal-700 py-3 text-sm font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-gray-900">My submitted reports</h2>
          <p className="mt-1 text-sm text-gray-500">These update automatically when admin reviews them.</p>
          <div className="mt-5 space-y-3">
            {reports.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                You have not submitted any user reports yet.
              </div>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900">{report.reportedUser?.displayName || report.reportedUid}</p>
                      <p className="mt-1 text-xs text-gray-500">{report.reason}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold capitalize ${
                      report.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : report.status === 'dismissed'
                        ? 'bg-gray-200 text-gray-700'
                        : report.status === 'reviewing'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                  {report.details ? <p className="mt-3 text-sm leading-6 text-gray-600">{report.details}</p> : null}
                  {report.adminNote ? <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs text-gray-600">Admin note: {report.adminNote}</p> : null}
                  <p className="mt-3 text-[11px] text-gray-400">{new Date(report.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
