import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ShieldCheck, UserCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserProfile, Wallet, WalletCurrency } from '../types';
import { supabaseService } from '../services/supabaseService';
import { useCurrency } from '../context/CurrencyContext';
import { formatAmount } from '../utils/currency';
import { AnimatePresence, motion } from 'motion/react';

interface ProcessTransferDetailsProps {
  profile: UserProfile;
}

export default function ProcessTransferDetails({ profile }: ProcessTransferDetailsProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recipientIdentifier = searchParams.get('recipient') || '';
  const recipientNameFromQuery = searchParams.get('name') || '';
  const { currency, setCurrency } = useCurrency();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [recipientProfile, setRecipientProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [showPinPad, setShowPinPad] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      if (!recipientIdentifier) {
        setError('Recipient was not provided. Please verify user ID first.');
        setLoading(false);
        return;
      }
      try {
        const [nextWallet, recipient] = await Promise.all([
          supabaseService.getOrCreateWallet(profile.uid),
          supabaseService.resolveUserByIdentifier(decodeURIComponent(recipientIdentifier)),
        ]);
        if (!active) return;
        if (!recipient) {
          setError('Recipient not found. Please verify user ID again.');
        } else {
          setRecipientProfile(recipient);
        }
        setWallet(nextWallet);
      } catch (e: any) {
        if (!active) return;
        setError(e.message || 'Failed to load transfer details.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [profile.uid, recipientIdentifier]);

  const availableBalance = useMemo(() => {
    if (!wallet) return 0;
    if (currency === 'USD') return wallet.usdBalance;
    if (currency === 'NGN') return wallet.ngnBalance;
    return wallet.eurBalance;
  }, [wallet, currency]);

  const amountNumber = useMemo(() => {
    const parsed = parseFloat(amount);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amount]);

  const openPinPad = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!recipientProfile) {
      setError('Recipient is missing. Please verify again.');
      return;
    }
    if (amountNumber <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (amountNumber > availableBalance) {
      setError('Insufficient balance.');
      return;
    }
    setPin('');
    setShowPinPad(true);
  };

  const submitTransfer = async () => {
    if (!recipientProfile) return;
    if (!/^\d{4}$/.test(pin)) {
      setError('Enter your 4-digit transaction PIN.');
      return;
    }
    setProcessing(true);
    setError(null);
    setSuccess(null);
    try {
      await supabaseService.transferByUserIdWithPin(
        profile.uid,
        recipientProfile.publicId || recipientProfile.uid,
        currency,
        amountNumber,
        pin
      );
      setSuccess('Transfer completed successfully.');
      setToast('Transfer successful');
      setShowPinPad(false);
      const refreshed = await supabaseService.getOrCreateWallet(profile.uid);
      setWallet(refreshed);
      setTimeout(() => navigate('/wallets'), 1200);
    } catch (e: any) {
      setError(e.message || 'Transfer failed.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/wallets/transfer')} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transfer Details</h1>
          <p className="text-sm text-gray-500">Enter amount and complete transaction with your PIN.</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-teal-700 to-emerald-700 text-white rounded-3xl p-6 shadow-lg space-y-3">
        <p className="text-xs uppercase tracking-wider opacity-80">Available Balance</p>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-3xl font-black">{formatAmount(availableBalance, currency)}</p>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as WalletCurrency)}
            className="w-36 px-3 py-2.5 rounded-xl bg-white/10 border border-white/30 text-white text-sm"
          >
            <option value="USD" className="text-gray-900">USD</option>
            <option value="NGN" className="text-gray-900">NGN</option>
            <option value="EUR" className="text-gray-900">EUR</option>
          </select>
        </div>
      </div>

      {recipientProfile && (
        <form onSubmit={openPinPad} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <UserCheck size={20} className="text-emerald-600" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-900 truncate">
                {recipientProfile.displayName || decodeURIComponent(recipientNameFromQuery)}
              </p>
              <p className="text-xs text-emerald-700 truncate">
                {recipientProfile.publicId || recipientProfile.uid}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Amount ({currency})</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-teal-700 text-white font-bold hover:bg-teal-800"
          >
            Complete Transaction
          </button>
        </form>
      )}

      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">{error}</div>}
      {success && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold">{success}</div>}

      <AnimatePresence>
        {showPinPad && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => !processing && setShowPinPad(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-5 border-t border-gray-200"
            >
              <div className="max-w-md mx-auto space-y-4">
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-900 inline-flex items-center gap-1">
                    <ShieldCheck size={14} />
                    Enter Transaction PIN
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Sending {formatAmount(amountNumber, currency)} to {recipientProfile?.displayName}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`w-3 h-3 rounded-full ${idx < pin.length ? 'bg-teal-600' : 'bg-gray-300'}`}
                    />
                  ))}
                </div>

                <input
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  pattern="\d{4}"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Enter 4-digit PIN"
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 text-center tracking-[0.6em] text-lg font-bold outline-none focus:ring-2 focus:ring-teal-500"
                />

                <button
                  type="button"
                  onClick={submitTransfer}
                  disabled={processing || pin.length !== 4}
                  className="w-full py-3 rounded-xl bg-teal-700 text-white font-bold disabled:opacity-70"
                >
                  {processing ? 'Processing Transfer...' : 'Complete Transfer'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold inline-flex items-center gap-2"
          >
            <CheckCircle2 size={16} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
