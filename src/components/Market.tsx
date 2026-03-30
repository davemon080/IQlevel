import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, Tag, MessageCircle, Plus } from 'lucide-react';
import { UserProfile, MarketItem } from '../types';
import { supabaseService } from '../services/supabaseService';
import CachedImage, { preloadCachedImage } from './CachedImage';
import { useCurrency } from '../context/CurrencyContext';
import { formatMoneyFromUSD } from '../utils/currency';
import { formatDistanceToNow } from 'date-fns';
import { MARKET_CATEGORIES } from '../constants/market';

interface MarketProps {
  profile: UserProfile;
}

export default function Market({ profile }: MarketProps) {
  const { currency } = useCurrency();
  const [items, setItems] = useState<MarketItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [negotiableOnly, setNegotiableOnly] = useState(false);
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high'>('newest');

  useEffect(() => {
    const unsubscribe = supabaseService.subscribeToMarketItems(setItems);
    return () => unsubscribe();
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    let nextItems = items.filter((item) => {
      if (negotiableOnly && !item.isNegotiable) return false;
      if (category !== 'All' && item.category !== category) return false;
      if (!normalizedQuery) return true;
      return [item.title, item.description || '', item.seller?.displayName || '', item.category]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });

    nextItems = [...nextItems].sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return nextItems;
  }, [category, items, negotiableOnly, searchQuery, sortBy]);

  useEffect(() => {
    filteredItems.slice(0, 8).forEach((item) => {
      preloadCachedImage(item.imageUrls[0]);
    });
  }, [filteredItems]);

  return (
    <div className="relative space-y-5 pb-24">
      <div className="rounded-[2rem] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search items for sale..."
              className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-teal-200 focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2">
              <SlidersHorizontal size={16} className="text-gray-400" />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as 'newest' | 'price-low' | 'price-high')}
                className="bg-transparent text-sm font-semibold text-gray-700 outline-none"
              >
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>

            <label className="inline-flex items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={negotiableOnly}
                onChange={(event) => setNegotiableOnly(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              Negotiable only
            </label>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2">
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="bg-transparent text-sm font-semibold text-gray-700 outline-none"
              >
                <option value="All">All categories</option>
                {MARKET_CATEGORIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="ml-auto text-xs font-bold uppercase tracking-wider text-gray-400">
              {filteredItems.length} item{filteredItems.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      </div>

      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item, index) => (
            <Link
              key={item.id}
              to={`/market/${item.id}`}
              className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-teal-200 hover:shadow-lg"
            >
              <div className="aspect-[4/3] bg-gray-100">
                  <CachedImage
                    src={item.imageUrls[0]}
                    alt={item.title}
                    loading={index < 4 ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchPriority={index < 4 ? 'high' : 'auto'}
                    referrerPolicy="no-referrer"
                    wrapperClassName="h-full w-full"
                    imgClassName="h-full w-full object-cover"
                />
              </div>

              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">{item.category}</p>
                    <h2 className="line-clamp-2 text-base font-bold text-gray-900">{item.title}</h2>
                  </div>
                  {item.isNegotiable && (
                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      Negotiable
                    </span>
                  )}
                </div>

                <p className="text-xl font-black text-teal-700">{formatMoneyFromUSD(item.price, currency)}</p>

                <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-700">
                      {item.isAnonymous ? 'Anonymous Seller' : item.seller?.displayName || 'Seller'}
                    </p>
                    <p>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 font-semibold text-gray-600">
                    <Tag size={12} />
                    For Sale
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-lg font-bold text-gray-900">No items found</p>
          <p className="mt-2 text-sm text-gray-500">
            Try another search, or be the first to post something for sale.
          </p>
        </div>
      )}

      <Link
        to="/market/sell"
        className="fixed bottom-24 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-teal-700 px-5 py-4 text-sm font-bold text-white shadow-xl transition-all hover:bg-teal-800 md:bottom-8 md:right-8"
      >
        <Plus size={18} />
        Sell Item
      </Link>
    </div>
  );
}
