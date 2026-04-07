import React, { useEffect, useMemo, useState } from 'react';
import { UserProfile, Wallet, WalletCurrency } from '../types';
import { supabaseService } from '../services/supabaseService';
import { ArrowLeft, ChevronDown, HandCoins, Landmark, PlusCircle, RefreshCw, SendHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatAmount } from '../utils/currency';
import { useCurrency } from '../context/CurrencyContext';
import { showAppToast } from '../utils/appToast';

interface WalletsProps {
  profile: UserProfile;
}

export default function Wallets({ profile }: WalletsProps) {
  const navigate = useNavigate();
  const { currency, setCurrency } = useCurrency();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWalletData = async () => {
    setLoading(true);
    setError(null);
    try {
      const walletData = await supabaseService.getOrCreateWallet(profile.uid);
      setWallet(walletData);
      showAppToast({
        tone: 'success',
        title: 'Wallet refreshed',
        message: 'Your available balance is now up to date.',
      });
    } catch (e: any) {
      setError(e.message || 'Failed to load wallet.');
      showAppToast({
        tone: 'error',
        title: 'Wallet refresh failed',
        message: e?.message || 'We could not load your wallet right now.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribeWallet = supabaseService.subscribeToWallet(
      profile.uid,
      (walletData) => {
        setWallet(walletData);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError?.message || 'Failed to load wallet.');
        setLoading(false);
      }
    );

    return () => {
      unsubscribeWallet();
    };
  }, [profile.uid]);

  const availableBalance = useMemo(() => {
    if (!wallet) return 0;
    if (currency === 'USD') return wallet.usdBalance;
    if (currency === 'NGN') return wallet.ngnBalance;
    return wallet.eurBalance;
  }, [wallet, currency]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
          <p className="text-sm text-gray-500">Track your live available balance.</p>
        </div>
        <button
          onClick={loadWalletData}
          className="ml-auto flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-violet-300/30 bg-[radial-gradient(circle_at_top_left,_rgba(196,181,253,0.18),_transparent_22%),linear-gradient(135deg,#12071f_0%,#241042_52%,#090312_100%)] p-5 text-white shadow-[0_22px_70px_rgba(15,6,33,0.45)] md:p-7">
        <div className="rounded-[1.6rem] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-[0.22em] text-violet-200/80">Available Balance</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-3xl font-black md:text-4xl">{formatAmount(availableBalance, currency)}</p>
                <div className="relative w-full sm:w-44">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as WalletCurrency)}
                    className="w-full appearance-none rounded-2xl border border-white/20 bg-black/20 px-4 py-3 pr-10 text-sm font-semibold text-white outline-none backdrop-blur-sm"
                  >
                    <option value="USD" className="text-gray-900">USD</option>
                    <option value="NGN" className="text-gray-900">NGN</option>
                    <option value="EUR" className="text-gray-900">EUR</option>
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/70" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/settings?section=security')}
                className="mt-3 text-xs font-semibold text-violet-100 underline underline-offset-4 hover:text-white"
              >
                Manage transfer PIN in Security
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <button
            onClick={() => navigate('/wallets/transfer')}
            className="flex items-center justify-center gap-2 rounded-2xl border border-violet-200/30 bg-white/10 px-4 py-3 text-center text-sm font-bold text-white transition-all hover:bg-white/16"
          >
            <SendHorizontal size={18} />
            Transfer
          </button>
          <button
            onClick={() => navigate('/wallets/withdraw')}
            className="flex items-center justify-center gap-2 rounded-2xl border border-violet-200/30 bg-white/10 px-4 py-3 text-center text-sm font-bold text-white transition-all hover:bg-white/16"
          >
            <Landmark size={18} />
            Withdraw
          </button>
          <button
            onClick={() => navigate('/wallets/add-funds')}
            className="flex items-center justify-center gap-2 rounded-2xl border border-violet-200/30 bg-white/10 px-4 py-3 text-center text-sm font-bold text-white transition-all hover:bg-white/16"
          >
            <PlusCircle size={18} />
            Add Funds
          </button>
          <button
            onClick={() => navigate('/wallets/history')}
            className="flex items-center justify-center gap-2 rounded-2xl border border-violet-200/30 bg-white/10 px-4 py-3 text-center text-sm font-bold text-white transition-all hover:bg-white/16"
          >
            <HandCoins size={18} />
            History
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
    </div>
  );
}
