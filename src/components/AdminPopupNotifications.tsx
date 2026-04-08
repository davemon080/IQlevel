import React from 'react';
import { Link } from 'react-router-dom';
import { BellRing, X } from 'lucide-react';
import { AdminAnnouncement, UserProfile } from '../types';
import { supabaseService } from '../services/supabaseService';

export default function AdminPopupNotifications({ profile }: { profile: UserProfile }) {
  const [items, setItems] = React.useState<AdminAnnouncement[]>([]);
  const activeItem = items[0] || null;

  React.useEffect(() => {
    const unsubscribe = supabaseService.subscribeToAdminPopups(
      profile.uid,
      (nextItems) => setItems(nextItems),
      () => setItems([])
    );
    return () => unsubscribe();
  }, [profile.uid]);

  if (!activeItem) return null;

  const dismiss = () => {
    supabaseService.dismissAdminPopup(profile.uid, activeItem.id);
    setItems((prev) => prev.filter((item) => item.id !== activeItem.id));
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[95] flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-[1.75rem] border border-teal-100 bg-white shadow-2xl">
        <div className="flex items-start gap-3 p-5">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <BellRing size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700">
              {activeItem.targetUid ? 'Private admin message' : 'Connect update'}
            </p>
            <h3 className="mt-2 text-lg font-black text-gray-900">{activeItem.title}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">{activeItem.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {activeItem.link ? (
                <Link
                  to={activeItem.link}
                  onClick={dismiss}
                  className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800"
                >
                  Open
                </Link>
              ) : null}
              <button
                type="button"
                onClick={dismiss}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
            aria-label="Close popup"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
