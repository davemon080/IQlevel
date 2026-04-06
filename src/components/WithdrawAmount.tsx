import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Landmark, ShieldCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserProfile, Wallet, WalletCurrency, WithdrawalAccount } from '../types';
import { supabaseService } from '../services/supabaseService';
import { useCurrency } from '../context/CurrencyContext';
import { formatAmount } from '../utils/currency';
import { getErrorMessage } from '../utils/errors';
import { AnimatePresence, motion } from 'motion/react';

interface WithdrawAmountProps {
  profile: UserProfile;
}

export default function WithdrawAmount({ profile }: WithdrawAmountProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currency, setCurrency } = useCurrency();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [account, setAccount] = useState<WithdrawalAccount | null>(null);
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [showPinPad, setShowPinPad] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const accountId = searchParams.get('accountId');
    const savedAccounts = supabaseService.listWithdrawalAccounts(profile.uid);
    const selected = savedAccounts.find((item) => item.id === accountId) || null;
    setAccount(selected);

    let active = true;
    supabaseService
      .getOrCreateWallet(profile.uid)
      .then((nextWallet) => {
        if (active) setWallet(nextWallet);
      })
      .catch((nextError) => {
        if (active) setError(getErrorMessage(nextError, 'Failed to load wallet balance.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const unsubscribeWallet = supabaseService.subscribeToWallet(
      profile.uid,
      (nextWallet) => {
        if (!active) return;
        setWallet(nextWallet);
        setLoading(false);
      },
      (nextError) => {
        if (!active) return;
        setError(getErrorMessage(nextError, 'Failed to load wallet balance.'));
        setLoading(false);
      }
    );

    return () => {
      active = false;
      unsubscribeWallet();
    };
  }, [profile.uid, searchParams]);

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
    if (!account) {
      setError('Select a withdrawal account first.');
      return;
    }
    if (amountNumber <= 0) {
      setError('Enter a valid withdrawal amount.');
      return;
    }
    if (amountNumber > availableBalance) {
      setError('Insufficient balance.');
      return;
    }
    setPin('');
    setShowPinPad(true);
  };

  const completeWithdrawal = async () => {
    if (!account) return;
    if (!/^\d{4}$/.test(pin)) {
      setError('Enter your 4-digit transaction PIN.');
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      await supabaseService.withdrawToBankAccountWithPin(profile.uid, currency, amountNumber, pin, account);
      setShowPinPad(false);
      setSuccess('Withdrawal completed successfully.');
      window.setTimeout(() => navigate('/wallets/history'), 1200);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Withdrawal failed.'));
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
        <button onClick={() => navigate('/wallets/withdraw')} className="rounded-full p-2 hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Withdrawal Amount</h1>
          <p className="text-sm text-gray-500">Choose the amount to withdraw, then confirm with your transaction PIN.</p>
        </div>
      </div>

      {account && (
        <div className="rounded-3xl border border-violet-100 bg-white/95 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Landmark size={20} />
            </span>
            <div>
              <p className="text-sm font-bold text-gray-900">{account.accountName}</p>
              <p className="text-xs text-gray-500">{account.bankName} • {account.accountNumber}</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-[2rem] border border-violet-300/30 bg-[radial-gradient(circle_at_top_left,_rgba(196,181,253,0.18),_transparent_24%),linear-gradient(135deg,#12071f_0%,#241042_52%,#090312_100%)] p-6 text-white shadow-[0_22px_70px_rgba(15,6,33,0.45)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-violet-200/90">Available Balance</p>
        <p className="mt-3 text-3xl font-black md:text-4xl">{formatAmount(availableBalance, currency)}</p>
      </div>

      <form onSubmit={openPinPad} className="space-y-4 rounded-3xl border border-violet-100 bg-white/95 p-6 shadow-sm">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value as WalletCurrency)} className="w-full rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500">
            <option value="USD">USD</option>
            <option value="NGN">NGN</option>
            <option value="EUR">EUR</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Amount ({currency})</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Enter withdrawal amount"
          />
        </div>

        <button type="submit" className="w-full rounded-2xl bg-violet-700 py-3 text-sm font-bold text-white hover:bg-violet-800">
          Complete Withdrawal
        </button>
      </form>

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
      {success && <div className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{success}</div>}

      <AnimatePresence>
        {showPinPad && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40" onClick={() => !processing && setShowPinPad(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-gray-200 bg-white p-5"
            >
              <div className="mx-auto max-w-md space-y-4">
                <div className="text-center">
                  <p className="inline-flex items-center gap-1 text-sm font-bold text-gray-900">
                    <ShieldCheck size={14} />
                    Enter Transaction PIN
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Withdrawing {formatAmount(amountNumber, currency)} to {account?.bankName}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <span key={idx} className={`h-3 w-3 rounded-full ${idx < pin.length ? 'bg-violet-600' : 'bg-gray-300'}`} />
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (key === 'clear') return setPin('');
                        if (key === 'back') return setPin((prev) => prev.slice(0, -1));
                        setPin((prev) => (prev.length < 4 ? `${prev}${key}` : prev));
                      }}
                      disabled={processing}
                      className="h-12 rounded-xl bg-gray-100 font-bold text-gray-900 disabled:opacity-60"
                    >
                      {key === 'back' ? 'Del' : key === 'clear' ? 'Clear' : key}
                    </button>
                  ))}
                </div>

                <button type="button" onClick={completeWithdrawal} disabled={processing || pin.length !== 4} className="w-full rounded-xl bg-violet-700 py-3 font-bold text-white disabled:opacity-60">
                  {processing ? 'Processing Withdrawal...' : 'Confirm Withdrawal'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed left-1/2 top-4 z-[70] inline-flex -translate-x-1/2 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
          >
            <CheckCircle2 size={16} />
            {success}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
