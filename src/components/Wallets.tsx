import React, { useEffect, useState } from 'react';
import { UserProfile, Wallet, WalletCurrency, WalletTransaction } from '../types';
import { supabaseService } from '../services/supabaseService';
import { ArrowLeft, ArrowDownRight, ArrowUpRight, Wallet as WalletIcon, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface WalletsProps {
  profile: UserProfile;
}

const currencyLabels: Record<WalletCurrency, string> = {
  USD: 'USD',
  NGN: 'NGN',
  EUR: 'EUR',
};

export default function Wallets({ profile }: WalletsProps) {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [topUpAmount, setTopUpAmount] = useState(0);
  const [topUpCurrency, setTopUpCurrency] = useState<WalletCurrency>('USD');
  const [topUpMethod, setTopUpMethod] = useState<'card' | 'transfer'>('card');

  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [withdrawCurrency, setWithdrawCurrency] = useState<WalletCurrency>('USD');
  const [withdrawMethod, setWithdrawMethod] = useState<'card' | 'transfer'>('transfer');

  const loadWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      const w = await supabaseService.getOrCreateWallet(profile.uid);
      const tx = await supabaseService.listWalletTransactions(profile.uid);
      setWallet(w);
      setTransactions(tx);
    } catch (e: any) {
      setError(e.message || 'Failed to load wallet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, [profile.uid]);

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topUpAmount <= 0) return;
    setError(null);
    try {
      await supabaseService.topUpWallet(profile.uid, topUpCurrency, topUpAmount, topUpMethod);
      setTopUpAmount(0);
      await loadWallet();
    } catch (e: any) {
      setError(e.message || 'Top-up failed.');
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount <= 0) return;
    setError(null);
    try {
      await supabaseService.withdrawFromWallet(profile.uid, withdrawCurrency, withdrawAmount, withdrawMethod);
      setWithdrawAmount(0);
      await loadWallet();
    } catch (e: any) {
      setError(e.message || 'Withdrawal failed.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={22} className="text-gray-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-600 text-white rounded-2xl shadow-md">
            <WalletIcon size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wallets</h1>
            <p className="text-gray-500 text-sm">Manage balances, top-ups, and withdrawals</p>
          </div>
        </div>
        <button
          onClick={loadWallet}
          className="ml-auto flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-gray-50 hover:bg-gray-100 rounded-xl"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 text-red-700 text-sm font-semibold">
          {error}
        </div>
      )}

      {wallet && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">USD Balance</p>
            <p className="text-2xl font-black text-gray-900">${wallet.usdBalance.toFixed(2)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">NGN Balance</p>
            <p className="text-2xl font-black text-gray-900">₦{wallet.ngnBalance.toFixed(2)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">EUR Balance</p>
            <p className="text-2xl font-black text-gray-900">€{wallet.eurBalance.toFixed(2)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleTopUp} className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowDownRight className="text-emerald-600" size={20} />
            <h2 className="text-lg font-bold text-gray-900">Top-up</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(parseFloat(e.target.value))}
                className="w-full mt-1 px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Currency</label>
              <select
                value={topUpCurrency}
                onChange={(e) => setTopUpCurrency(e.target.value as WalletCurrency)}
                className="w-full mt-1 px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
              >
                {Object.keys(currencyLabels).map((c) => (
                  <option key={c} value={c}>{currencyLabels[c as WalletCurrency]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Method</label>
            <div className="flex gap-2 mt-1">
              {['card', 'transfer'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTopUpMethod(m as 'card' | 'transfer')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border ${
                    topUpMethod === m ? 'bg-teal-600 text-white border-teal-600' : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  {m === 'card' ? 'Card' : 'Transfer'}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-teal-700 text-white font-bold py-3 rounded-2xl hover:bg-teal-800 transition-all"
          >
            Add Funds
          </button>
        </form>

        <form onSubmit={handleWithdraw} className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="text-amber-600" size={20} />
            <h2 className="text-lg font-bold text-gray-900">Withdraw</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(parseFloat(e.target.value))}
                className="w-full mt-1 px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Currency</label>
              <select
                value={withdrawCurrency}
                onChange={(e) => setWithdrawCurrency(e.target.value as WalletCurrency)}
                className="w-full mt-1 px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
              >
                {Object.keys(currencyLabels).map((c) => (
                  <option key={c} value={c}>{currencyLabels[c as WalletCurrency]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Method</label>
            <div className="flex gap-2 mt-1">
              {['transfer', 'card'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setWithdrawMethod(m as 'card' | 'transfer')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border ${
                    withdrawMethod === m ? 'bg-teal-600 text-white border-teal-600' : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  {m === 'card' ? 'Card' : 'Transfer'}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-gray-900 text-white font-bold py-3 rounded-2xl hover:bg-teal-700 transition-all"
          >
            Withdraw Funds
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Transaction History</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-sm">No transactions yet.</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    tx.type === 'topup' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {tx.type === 'topup' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 capitalize">{tx.type}</p>
                    <p className="text-xs text-gray-500">{tx.method} • {format(new Date(tx.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {tx.currency === 'USD' ? '$' : tx.currency === 'EUR' ? '€' : '₦'}
                    {tx.amount.toFixed(2)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{tx.currency}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
