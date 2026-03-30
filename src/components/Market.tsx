import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingBag, Sparkles, ShieldCheck, Truck, Star } from 'lucide-react';
import { UserProfile } from '../types';

interface MarketProps {
  profile: UserProfile;
}

const MARKET_ITEMS = [
  {
    id: 'market-1',
    title: 'Brand Identity Starter Pack',
    seller: 'Amina Design Studio',
    category: 'Design Assets',
    price: '$24',
    rating: '4.9',
    accent: 'from-orange-200 via-amber-100 to-white',
  },
  {
    id: 'market-2',
    title: 'React Landing Page Template',
    seller: 'Frontend Forge',
    category: 'Templates',
    price: '$36',
    rating: '4.8',
    accent: 'from-sky-200 via-cyan-100 to-white',
  },
  {
    id: 'market-3',
    title: 'Social Media Content Bundle',
    seller: 'Campus Creative',
    category: 'Marketing',
    price: '$18',
    rating: '4.7',
    accent: 'from-emerald-200 via-teal-100 to-white',
  },
  {
    id: 'market-4',
    title: 'Portfolio Copywriting Kit',
    seller: 'Wordsmith Lab',
    category: 'Writing',
    price: '$15',
    rating: '4.8',
    accent: 'from-fuchsia-200 via-pink-100 to-white',
  },
];

export default function Market({ profile }: MarketProps) {
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return MARKET_ITEMS;
    return MARKET_ITEMS.filter((item) =>
      [item.title, item.seller, item.category].some((value) => value.toLowerCase().includes(normalized))
    );
  }, [query]);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-gray-200 bg-white px-6 py-7 shadow-sm">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-teal-100/70 to-transparent" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-teal-700">
              <Sparkles size={14} />
              Market
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Digital goods and ready-to-ship creative tools.</h1>
              <p className="mt-2 text-sm text-gray-600">
                Browse useful templates, assets, and packs from sellers in your network. Welcome back, {profile.displayName}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Secure</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">Trusted seller profiles</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Fast</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">Instant delivery-ready assets</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Flexible</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">Student-friendly pricing</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Discover products</h2>
            <p className="text-sm text-gray-500">Search the market and jump back to gigs anytime.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-[260px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products, sellers, or categories..."
                className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-teal-200 focus:bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <Link
              to="/jobs"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              <ShoppingBag size={16} />
              Back to Jobs
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4">
        {filteredItems.map((item) => (
          <article
            key={item.id}
            className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-teal-200 hover:shadow-lg"
          >
            <div className={`h-40 bg-gradient-to-br ${item.accent} p-5`}>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-700">
                {item.category}
              </div>
            </div>
            <div className="space-y-4 p-5">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-500">by {item.seller}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-teal-700">{item.price}</p>
                <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                  <Star size={12} className="fill-current" />
                  {item.rating}
                </div>
              </div>
              <button className="w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-700">
                View Product
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-3">
        <div className="rounded-2xl bg-gray-50 p-4">
          <ShieldCheck className="text-teal-700" size={18} />
          <p className="mt-3 text-sm font-bold text-gray-900">Verified creators</p>
          <p className="mt-1 text-sm text-gray-500">Keep buying inside a professional network you already trust.</p>
        </div>
        <div className="rounded-2xl bg-gray-50 p-4">
          <Truck className="text-teal-700" size={18} />
          <p className="mt-3 text-sm font-bold text-gray-900">Instant delivery feel</p>
          <p className="mt-1 text-sm text-gray-500">Perfect for templates, assets, and production-ready starter kits.</p>
        </div>
        <div className="rounded-2xl bg-gray-50 p-4">
          <Sparkles className="text-teal-700" size={18} />
          <p className="mt-3 text-sm font-bold text-gray-900">Built for bigger updates</p>
          <p className="mt-1 text-sm text-gray-500">This page is ready for us to connect to real marketplace data next.</p>
        </div>
      </section>
    </div>
  );
}
