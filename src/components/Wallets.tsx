import React, { useEffect, useMemo, useState } from 'react';
import { UserProfile, Wallet, WalletCurrency } from '../types';
import { supabaseService } from '../services/supabaseService';
import { ArrowLeft, ChevronDown, HandCoins, Landmark, PlusCircle, RefreshCw, SendHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatAmount } from '../utils/currency';
import { useCurrency } from '../context/CurrencyContext';

interface WalletsProps {
  profile: UserProfile;
}

export default function Wallets({ profile }: WalletsProps) {
  const navigate = useNavigate();
  const { currency, setCurrency } = useCurrency();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadWalletData = async () => {
    setLoading(true);
    setError(null);
    try {
      const walletData = await supabaseService.getOrCreateWallet(profile.uid);
      setWallet(walletData);
    } catch (e: any) {
      setError(e.message || 'Failed to load wallet.');
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
          <p className="text-sm text-gray-500">Manage balances, transfers, withdrawals and receipts.</p>
        </div>
        <button
          onClick={loadWalletData}
          className="ml-auto flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="space-y-5 rounded-3xl bg-gradient-to-br from-teal-700 to-emerald-700 p-5 text-white shadow-lg md:p-7">
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider opacity-80">Currency</p>
          <div className="relative w-full sm:w-52">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as WalletCurrency)}
              className="w-full appearance-none rounded-xl border border-white/30 bg-white/15 px-3 py-2.5 pr-10 text-sm font-semibold text-white outline-none"
            >
              <option value="USD" className="text-gray-900">USD</option>
              <option value="NGN" className="text-gray-900">NGN</option>
              <option value="EUR" className="text-gray-900">EUR</option>
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-80" />
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider opacity-80">Available Balance</p>
          <p className="mt-1 text-2xl font-black md:text-3xl">{formatAmount(availableBalance, currency)}</p>
          <button
            type="button"
            onClick={() => navigate('/settings?section=security')}
            className="mt-2 text-xs font-semibold text-white/85 underline underline-offset-4 hover:text-white"
          >
            Manage transfer PIN in Security
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <button
          onClick={() => navigate('/wallets/transfer')}
          className="flex flex-col items-center gap-2 rounded-2xl bg-teal-50 px-4 py-4 text-center text-sm font-bold text-teal-700 transition-all hover:bg-teal-100"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
            <SendHorizontal size={20} />
          </span>
          Transfer
        </button>
        <button
          onClick={() => navigate('/wallets/withdraw')}
          className="flex flex-col items-center gap-2 rounded-2xl bg-gray-50 px-4 py-4 text-center text-sm font-bold text-gray-700 transition-all hover:bg-gray-100"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
            <Landmark size={20} />
          </span>
          Withdraw
        </button>
        <button
          onClick={() => navigate('/wallets/add-funds')}
          className="flex flex-col items-center gap-2 rounded-2xl bg-gray-50 px-4 py-4 text-center text-sm font-bold text-gray-700 transition-all hover:bg-gray-100"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
            <PlusCircle size={20} />
          </span>
          Add Funds
        </button>
        <button
          onClick={() => navigate('/wallets/history')}
          className="flex flex-col items-center gap-2 rounded-2xl bg-gray-50 px-4 py-4 text-center text-sm font-bold text-gray-700 transition-all hover:bg-gray-100"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
            <HandCoins size={20} />
          </span>
          History
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
      {success && <div className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{success}</div>}
    </div>
  );
}
