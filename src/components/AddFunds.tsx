import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Wallet2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, Wallet } from '../types';
import { supabaseService } from '../services/supabaseService';
import { formatAmount } from '../utils/currency';
import { getErrorMessage } from '../utils/errors';
import { startPaystackTransaction } from '../utils/paystack';

interface AddFundsProps {
  profile: UserProfile;
}

export default function AddFunds({ profile }: AddFundsProps) {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabaseService
      .getOrCreateWallet(profile.uid)
      .then((nextWallet) => {
        if (active) setWallet(nextWallet);
      })
      .catch((nextError) => {
        if (active) setError(getErrorMessage(nextError, 'Failed to load wallet.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profile.uid]);

  const amountNumber = useMemo(() => {
    const parsed = parseFloat(amount);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amount]);

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (amountNumber <= 0) {
      setError('Enter a valid amount to add.');
      return;
    }

    setProcessing(true);
    try {
      const response = await startPaystackTransaction({
        email: profile.email,
        amountKobo: Math.round(amountNumber * 100),
        reference: `connect-topup-${profile.uid.slice(0, 8)}-${Date.now()}`,
        metadata: {
          custom_fields: [
            {
              display_name: 'Connect User',
              variable_name: 'connect_user_id',
              value: profile.publicId || profile.uid,
            },
          ],
        },
      });

      await supabaseService.topUpWallet(profile.uid, 'NGN', amountNumber, 'card');
      const refreshed = await supabaseService.getOrCreateWallet(profile.uid);
      setWallet(refreshed);
      setAmount('');
      setSuccess(`Funds added successfully. Reference: ${response?.reference || 'Paystack payment confirmed'}`);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Unable to start Paystack right now.'));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/wallets')} className="rounded-full p-2 hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Funds</h1>
          <p className="text-sm text-gray-500">Fund your wallet with Paystack and add the money directly to your NGN balance.</p>
        </div>
      </div>

      <div className="rounded-[2rem] border border-violet-300/30 bg-[radial-gradient(circle_at_top_left,_rgba(196,181,253,0.18),_transparent_24%),linear-gradient(135deg,#12071f_0%,#241042_52%,#090312_100%)] p-6 text-white shadow-[0_22px_70px_rgba(15,6,33,0.45)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-violet-200/90">Current NGN Balance</p>
        <p className="mt-3 text-3xl font-black md:text-4xl">{formatAmount(wallet?.ngnBalance || 0, 'NGN')}</p>
        <p className="mt-3 max-w-xl text-sm leading-6 text-white/82">
          Wallet funding uses Paystack checkout and credits your NGN balance immediately after a successful payment response.
        </p>
      </div>

      <form onSubmit={handleAddFunds} className="space-y-4 rounded-3xl border border-violet-100 bg-white/95 p-6 shadow-sm">
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-800">
          Paystack funding is configured for NGN. If checkout does not open, confirm your `VITE_PAYSTACK_PUBLIC_KEY` is set correctly.
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Amount (NGN)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Enter amount to fund"
            required
          />
        </div>
        <button type="submit" disabled={processing} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 py-3 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-60">
          <Wallet2 size={18} />
          {processing ? 'Launching Paystack...' : 'Add Funds'}
        </button>
      </form>

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
      {success && <div className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{success}</div>}
    </div>
  );
}
