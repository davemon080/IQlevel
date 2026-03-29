import React, { useEffect, useMemo, useState } from 'react';
import { UserProfile, Wallet, WalletCurrency, WalletTransaction } from '../types';
import { supabaseService } from '../services/supabaseService';
import { ArrowDownRight, ArrowLeft, ArrowUpRight, ChevronDown, RefreshCw, SendHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { formatAmount } from '../utils/currency';
import { useCurrency } from '../context/CurrencyContext';

interface WalletsProps {
  profile: UserProfile;
}

type ActionType = 'add' | 'withdraw' | 'transfer';

export default function Wallets({ profile }: WalletsProps) {
  const navigate = useNavigate();
  const { currency, setCurrency } = useCurrency();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeAction, setActiveAction] = useState<ActionType>('add');
  const [amount, setAmount] = useState(0);
  const [recipientId, setRecipientId] = useState('');
  const [method, setMethod] = useState<'card' | 'transfer'>('card');
  const [submitting, setSubmitting] = useState(false);

  const loadWalletData = async () => {
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
    loadWalletData();
  }, [profile.uid]);

  const availableBalance = useMemo(() => {
    if (!wallet) return 0;
    if (currency === 'USD') return wallet.usdBalance;
    if (currency === 'NGN') return wallet.ngnBalance;
    return wallet.eurBalance;
  }, [wallet, currency]);

  const submitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (amount <= 0) {
      setError('Enter a valid amount.');
      return;
    }

    setSubmitting(true);
    try {
      if (activeAction === 'add') {
        await supabaseService.topUpWallet(profile.uid, currency, amount, method);
        setSuccess('Funds added successfully.');
      } else if (activeAction === 'withdraw') {
        await supabaseService.withdrawFromWallet(profile.uid, currency, amount, method);
        setSuccess('Withdrawal successful.');
      } else {
        await supabaseService.transferByUserId(profile.uid, recipientId.trim(), currency, amount);
        setSuccess('Transfer completed successfully.');
      }

      setAmount(0);
      setRecipientId('');
      await loadWalletData();
    } catch (e: any) {
      setError(e.message || 'Transaction failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderMethodSwitch = activeAction !== 'transfer';

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
          <p className="text-sm text-gray-500">Manage balances, transfers, withdrawals and history.</p>
        </div>
        <button
          onClick={loadWalletData}
          className="ml-auto flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="bg-gradient-to-br from-teal-700 to-emerald-700 text-white rounded-3xl p-5 md:p-7 shadow-lg space-y-5">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider opacity-80">Currency</p>
          <div className="relative w-full sm:w-56">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as WalletCurrency)}
              className="appearance-none w-full bg-white/15 text-white border border-white/30 rounded-xl px-3 py-2.5 pr-10 text-sm font-semibold outline-none"
            >
              <option value="USD" className="text-gray-900">USD</option>
              <option value="NGN" className="text-gray-900">NGN</option>
              <option value="EUR" className="text-gray-900">EUR</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-80" />
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider opacity-80">Available Balance</p>
          <p className="text-3xl md:text-4xl font-black mt-1">{formatAmount(availableBalance, currency)}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <button
            onClick={() => setActiveAction('transfer')}
            className={`py-2.5 rounded-xl text-sm font-bold border ${activeAction === 'transfer' ? 'bg-white text-teal-700 border-white' : 'bg-white/15 border-white/30 hover:bg-white/20'}`}
          >
            Transfer
          </button>
          <button
            onClick={() => setActiveAction('withdraw')}
            className={`py-2.5 rounded-xl text-sm font-bold border ${activeAction === 'withdraw' ? 'bg-white text-teal-700 border-white' : 'bg-white/15 border-white/30 hover:bg-white/20'}`}
          >
            Withdraw
          </button>
          <button
            onClick={() => setActiveAction('add')}
            className={`py-2.5 rounded-xl text-sm font-bold border ${activeAction === 'add' ? 'bg-white text-teal-700 border-white' : 'bg-white/15 border-white/30 hover:bg-white/20'}`}
          >
            Add Funds
          </button>
        </div>

        <form onSubmit={submitAction} className="bg-white/10 border border-white/25 rounded-2xl p-4 space-y-3">
          {activeAction === 'transfer' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold opacity-90">Recipient User ID</label>
              <input
                type="text"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                placeholder="Enter recipient ID"
                className="w-full px-3 py-2.5 rounded-xl bg-white text-gray-900 text-sm outline-none"
                required
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold opacity-90">Amount ({currency})</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl bg-white text-gray-900 text-sm outline-none"
              required
            />
          </div>

          {renderMethodSwitch && (
            <div className="flex gap-2">
              {(['card', 'transfer'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMethod(item)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border ${
                    method === item ? 'bg-white text-teal-700 border-white' : 'bg-white/15 border-white/30'
                  }`}
                >
                  {item === 'card' ? 'Card' : 'Transfer'}
                </button>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-white text-teal-700 font-bold text-sm hover:bg-gray-100 disabled:opacity-70"
          >
            {submitting
              ? 'Processing...'
              : activeAction === 'add'
              ? 'Add Funds'
              : activeAction === 'withdraw'
              ? 'Withdraw'
              : 'Send Transfer'}
          </button>
        </form>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">{error}</div>}
      {success && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold">{success}</div>}

      <div className="bg-white border border-gray-200 rounded-3xl p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Transaction Histories</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500">No transactions yet.</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const isCredit = tx.type === 'topup';
              const isTransferOut = tx.reference?.startsWith('transfer_out:');
              const isTransferIn = tx.reference?.startsWith('transfer_in:');
              const title = isTransferOut ? 'Transfer Sent' : isTransferIn ? 'Transfer Received' : isCredit ? 'Add Funds' : 'Withdraw';
              const counterparty = isTransferOut
                ? tx.reference?.split(':')[1]
                : isTransferIn
                ? tx.reference?.split(':')[1]
                : '';

              return (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {isTransferIn ? <SendHorizontal size={17} className="rotate-180" /> : isTransferOut ? <SendHorizontal size={17} /> : isCredit ? <ArrowDownRight size={17} /> : <ArrowUpRight size={17} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900">{title}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {counterparty ? `User ID: ${counterparty} • ` : ''}
                        {format(new Date(tx.createdAt), 'MMM d, yyyy, h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatAmount(tx.amount, tx.currency)}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{tx.status}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
