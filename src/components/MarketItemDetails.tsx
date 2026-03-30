import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { UserProfile, MarketItem } from '../types';
import { supabaseService } from '../services/supabaseService';
import CachedImage from './CachedImage';
import { useCurrency } from '../context/CurrencyContext';
import { formatMoneyFromUSD } from '../utils/currency';
import { formatDistanceToNow } from 'date-fns';

interface MarketItemDetailsProps {
  profile: UserProfile;
}

export default function MarketItemDetails({ profile }: MarketItemDetailsProps) {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const [item, setItem] = useState<MarketItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    let active = true;
    if (!itemId) return;

    supabaseService.getMarketItemById(itemId).then((nextItem) => {
      if (!active) return;
      setItem(nextItem);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [itemId]);

  const activeImage = useMemo(() => item?.imageUrls[activeImageIndex] || item?.imageUrls[0], [activeImageIndex, item]);

  if (loading) {
    return <div className="h-40 animate-pulse rounded-[2rem] bg-gray-100" />;
  }

  if (!item) {
    return (
      <div className="rounded-[2rem] border border-gray-200 bg-white p-10 text-center shadow-sm">
        <p className="text-lg font-bold text-gray-900">Item not found</p>
        <button onClick={() => navigate('/market')} className="mt-4 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-bold text-white">
          Back to Market
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/market')} className="rounded-full p-2 hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Item Details</h1>
          <p className="text-sm text-gray-500">View item details and message the seller if interested.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
            {activeImage ? (
              <CachedImage
                src={activeImage}
                alt={item.title}
                wrapperClassName="aspect-[4/3] w-full"
                imgClassName="h-full w-full object-cover"
              />
            ) : (
              <div className="aspect-[4/3] w-full bg-gray-100" />
            )}

            {item.imageUrls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveImageIndex((prev) => (prev - 1 + item.imageUrls.length) % item.imageUrls.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImageIndex((prev) => (prev + 1) % item.imageUrls.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>

          {item.imageUrls.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {item.imageUrls.map((imageUrl, index) => (
                <button
                  key={imageUrl}
                  type="button"
                  onClick={() => setActiveImageIndex(index)}
                  className={`overflow-hidden rounded-2xl border ${index === activeImageIndex ? 'border-teal-500' : 'border-gray-200'}`}
                >
                  <CachedImage
                    src={imageUrl}
                    alt={`${item.title} ${index + 1}`}
                    wrapperClassName="aspect-square w-full"
                    imgClassName="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-bold uppercase tracking-wider text-gray-400">For Sale</p>
              <h2 className="text-3xl font-black text-gray-900">{item.title}</h2>
              <p className="text-3xl font-black text-teal-700">{formatMoneyFromUSD(item.price, currency)}</p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
              {item.isNegotiable && <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">Negotiable</span>}
              <span className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-600">
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </span>
              {item.isAnonymous && <span className="rounded-full bg-gray-900 px-3 py-1.5 text-white">Anonymous Seller</span>}
            </div>

            <div className="rounded-[1.5rem] bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-900">
                {item.isAnonymous ? 'Anonymous Seller' : item.seller?.displayName || 'Seller'}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {item.isAnonymous
                  ? 'The seller chose to hide their profile on the market listing. You will see them in chat after you message them.'
                  : item.seller?.role || 'Marketplace seller'}
              </p>
            </div>

            {item.description && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Details</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{item.description}</p>
              </div>
            )}

            <button
              type="button"
              disabled={item.sellerUid === profile.uid}
              onClick={() => navigate(`/messages?uid=${item.sellerUid}`)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <MessageCircle size={18} />
              {item.sellerUid === profile.uid ? 'This is your item' : 'Message Seller'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
