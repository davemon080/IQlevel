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

  const balances = useMemo(
    () => [
      { code: 'USD' as WalletCurrency, label: 'US Dollar', value: wallet?.usdBalance || 0 },
      { code: 'NGN' as WalletCurrency, label: 'Nigerian Naira', value: wallet?.ngnBalance || 0 },
      { code: 'EUR' as WalletCurrency, label: 'Euro', value: wallet?.eurBalance || 0 },
    ],
    [wallet]
  );

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

      <div className="overflow-hidden rounded-[2rem] border border-violet-300/30 bg-[radial-gradient(circle_at_top_left,_rgba(196,181,253,0.18),_transparent_22%),linear-gradient(135deg,#12071f_0%,#241042_52%,#090312_100%)] p-5 text-white shadow-[0_22px_70px_rgba(15,6,33,0.45)] md:p-7">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-violet-200/90">Wallet command</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">Your balance is clear, fast, and in sync.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
              Switch currency views, track available funds, and jump straight into transfers, funding, withdrawals, or history without losing visibility.
            </p>

            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-violet-200/80">Available Balance</p>
                  <p className="mt-2 text-3xl font-black md:text-4xl">{formatAmount(availableBalance, currency)}</p>
                  <button
                    type="button"
                    onClick={() => navigate('/settings?section=security')}
                    className="mt-3 text-xs font-semibold text-violet-100 underline underline-offset-4 hover:text-white"
                  >
                    Manage transfer PIN in Security
                  </button>
                </div>

                <div className="relative w-full sm:w-56">
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
            </div>
          </div>

          <div className="grid gap-3">
            {balances.map((item) => {
              const active = item.code === currency;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setCurrency(item.code)}
                  className={`rounded-[1.4rem] border p-4 text-left transition-all ${
                    active
                      ? 'border-violet-300/60 bg-white/14 shadow-[0_14px_35px_rgba(124,58,237,0.2)]'
                      : 'border-white/10 bg-white/6 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-100/80">{item.code}</p>
                      <p className="mt-1 text-sm text-slate-200">{item.label}</p>
                    </div>
                    <p className="text-lg font-black text-white">{formatAmount(item.value, item.code)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-3xl border border-violet-100 bg-white/90 p-4 shadow-sm md:grid-cols-4">
        <button
          onClick={() => navigate('/wallets/transfer')}
          className="flex flex-col items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4 text-center text-sm font-bold text-violet-700 transition-all hover:bg-violet-100"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
            <SendHorizontal size={20} />
          </span>
          Transfer
        </button>
        <button
          onClick={() => navigate('/wallets/withdraw')}
          className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-center text-sm font-bold text-gray-700 transition-all hover:bg-gray-100"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
            <Landmark size={20} />
          </span>
          Withdraw
        </button>
        <button
          onClick={() => navigate('/wallets/add-funds')}
          className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-center text-sm font-bold text-gray-700 transition-all hover:bg-gray-100"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
            <PlusCircle size={20} />
          </span>
          Add Funds
        </button>
        <button
          onClick={() => navigate('/wallets/history')}
          className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-center text-sm font-bold text-gray-700 transition-all hover:bg-gray-100"
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
