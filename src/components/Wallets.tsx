import React, { useEffect, useMemo, useState } from 'react';
import { UserProfile, Wallet, WalletCurrency, WalletTransaction } from '../types';
import { supabaseService } from '../services/supabaseService';
import { ArrowLeft, ArrowDownRight, ArrowUpRight, Wallet as WalletIcon, RefreshCw, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { formatAmount } from '../utils/currency';
import { useCurrency } from '../context/CurrencyContext';

interface WalletsProps {
  profile: UserProfile;
}

const currencyOptions: WalletCurrency[] = ['USD', 'NGN', 'EUR'];

export default function Wallets({ profile }: WalletsProps) {
  const navigate = useNavigate();
  const { currency, setCurrency } = useCurrency();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [topUpAmount, setTopUpAmount] = useState(0);
  const [topUpMethod, setTopUpMethod] = useState<'card' | 'transfer'>('card');
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [withdrawMethod, setWithdrawMethod] = useState<'card' | 'transfer'>('transfer');

  const loadWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      const [walletData, tx] = await Promise.all([
        supabaseService.getOrCreateWallet(profile.uid),
        supabaseService.listWalletTransactions(profile.uid),
      ]);
      setWallet(walletData);
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

  const activeBalance = useMemo(() => {
    if (!wallet) return 0;
    if (currency === 'USD') return wallet.usdBalance;
    if (currency === 'NGN') return wallet.ngnBalance;
    return wallet.eurBalance;
  }, [currency, wallet]);

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topUpAmount <= 0) return;
    setError(null);
    try {
      await supabaseService.topUpWallet(profile.uid, currency, topUpAmount, topUpMethod);
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
      await supabaseService.withdrawFromWallet(profile.uid, currency, withdrawAmount, withdrawMethod);
      setWithdrawAmount(0);
      await loadWallet();
    } catch (e: any) {
      setError(e.message || 'Withdrawal failed.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet Center</h1>
          <p className="text-sm text-gray-500">Professional finance view for your marketplace activity.</p>
        </div>
        <button
          onClick={loadWallet}
          className="ml-auto flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">{error}</div>}

      <div className="bg-gradient-to-br from-teal-700 to-emerald-700 text-white rounded-3xl p-6 md:p-8 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider opacity-80">Available Balance</p>
            <p className="text-3xl md:text-4xl font-black mt-2">{formatAmount(activeBalance, currency)}</p>
            <p className="text-sm opacity-80 mt-2">Preferred currency used app-wide for gig pricing.</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/15">
            <WalletIcon size={24} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          {currencyOptions.map((option) => (
            <button
              key={option}
              onClick={() => setCurrency(option)}
              className={`px-3 py-1.5 rounded-xl text-sm font-bold ${
                currency === option ? 'bg-white text-teal-700' : 'bg-white/15 text-white hover:bg-white/20'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {wallet && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BalanceCard label="USD Wallet" value={formatAmount(wallet.usdBalance, 'USD')} />
          <BalanceCard label="NGN Wallet" value={formatAmount(wallet.ngnBalance, 'NGN')} />
          <BalanceCard label="EUR Wallet" value={formatAmount(wallet.eurBalance, 'EUR')} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleTopUp} className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowDownRight className="text-emerald-600" size={20} />
            <h2 className="text-lg font-bold text-gray-900">Add Funds ({currency})</h2>
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={topUpAmount}
            onChange={(e) => setTopUpAmount(parseFloat(e.target.value))}
            placeholder="Enter amount"
            className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
          />
          <MethodSwitch value={topUpMethod} onChange={setTopUpMethod} />
          <button type="submit" className="w-full bg-teal-700 text-white font-bold py-3 rounded-2xl hover:bg-teal-800">
            Top-up Wallet
          </button>
        </form>

        <form onSubmit={handleWithdraw} className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="text-amber-600" size={20} />
            <h2 className="text-lg font-bold text-gray-900">Withdraw Funds ({currency})</h2>
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(parseFloat(e.target.value))}
            placeholder="Enter amount"
            className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
          />
          <MethodSwitch value={withdrawMethod} onChange={setWithdrawMethod} />
          <button type="submit" className="w-full bg-gray-900 text-white font-bold py-3 rounded-2xl hover:bg-teal-700">
            Withdraw
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500">No transactions yet.</p>
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
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <CreditCard size={12} />
                      {tx.method} • {format(new Date(tx.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{formatAmount(tx.amount, tx.currency)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{tx.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BalanceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wider text-gray-400 font-bold">{label}</p>
      <p className="text-2xl font-black text-gray-900 mt-2">{value}</p>
    </div>
  );
}

function MethodSwitch({
  value,
  onChange,
}: {
  value: 'card' | 'transfer';
  onChange: (value: 'card' | 'transfer') => void;
}) {
  return (
    <div className="flex gap-2">
      {(['card', 'transfer'] as const).map((method) => (
        <button
          key={method}
          type="button"
          onClick={() => onChange(method)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border ${
            value === method ? 'bg-teal-700 text-white border-teal-700' : 'bg-white border-gray-200 text-gray-700'
          }`}
        >
          {method === 'card' ? 'Card' : 'Transfer'}
        </button>
      ))}
    </div>
  );
}
