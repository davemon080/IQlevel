import React, { useMemo, useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, Wallet, WalletCurrency } from '../types';
import { supabaseService } from '../services/supabaseService';
import { useCurrency } from '../context/CurrencyContext';
import { formatAmount } from '../utils/currency';

interface ProcessTransferProps {
  profile: UserProfile;
}

export default function ProcessTransfer({ profile }: ProcessTransferProps) {
  const navigate = useNavigate();
  const { currency, setCurrency } = useCurrency();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState(0);
  const [pin, setPin] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    supabaseService
      .getOrCreateWallet(profile.uid)
      .then((nextWallet) => {
        if (!active) return;
        setWallet(nextWallet);
      })
      .catch((e: any) => {
        if (!active) return;
        setError(e.message || 'Failed to load wallet balance.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profile.uid]);

  const availableBalance = useMemo(() => {
    if (!wallet) return 0;
    if (currency === 'USD') return wallet.usdBalance;
    if (currency === 'NGN') return wallet.ngnBalance;
    return wallet.eurBalance;
  }, [wallet, currency]);

  const submitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!recipientId.trim()) {
      setError('Recipient ID is required.');
      return;
    }
    if (amount <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('Enter your 4-digit transaction PIN.');
      return;
    }

    setProcessing(true);
    try {
      await supabaseService.transferByUserIdWithPin(profile.uid, recipientId.trim(), currency, amount, pin);
      setSuccess('Transfer completed successfully.');
      setRecipientId('');
      setAmount(0);
      setPin('');
      const refreshed = await supabaseService.getOrCreateWallet(profile.uid);
      setWallet(refreshed);
    } catch (e: any) {
      setError(e.message || 'Transfer failed.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/wallets')} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Process Transfer</h1>
          <p className="text-sm text-gray-500">Complete wallet transfer securely with transaction PIN.</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-teal-700 to-emerald-700 text-white rounded-3xl p-6 shadow-lg space-y-3">
        <p className="text-xs uppercase tracking-wider opacity-80">Available Balance</p>
        <p className="text-3xl font-black">{formatAmount(availableBalance, currency)}</p>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as WalletCurrency)}
          className="w-full sm:w-52 px-3 py-2.5 rounded-xl bg-white/10 border border-white/30 text-white text-sm"
        >
          <option value="USD" className="text-gray-900">USD</option>
          <option value="NGN" className="text-gray-900">NGN</option>
          <option value="EUR" className="text-gray-900">EUR</option>
        </select>
      </div>

      <form onSubmit={submitTransfer} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Recipient ID</label>
          <input
            type="text"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            placeholder="Enter recipient public ID or UID"
            className="w-full px-3 py-2.5 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-teal-500"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Amount ({currency})</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
            className="w-full px-3 py-2.5 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-teal-500"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 inline-flex items-center gap-1">
            <ShieldCheck size={12} />
            Transaction PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="Enter 4-digit PIN"
            className="w-full px-3 py-2.5 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-teal-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={processing}
          className="w-full py-2.5 rounded-xl bg-teal-700 text-white font-bold hover:bg-teal-800 disabled:opacity-70"
        >
          {processing ? 'Processing...' : 'Complete Transfer'}
        </button>
      </form>

      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">{error}</div>}
      {success && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold">{success}</div>}
    </div>
  );
}
