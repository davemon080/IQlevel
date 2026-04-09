import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BadgeCheck, Building2, Landmark, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NigerianBankOption, UserProfile, WithdrawalAccount } from '../types';
import { supabaseService } from '../services/supabaseService';
import { NIGERIAN_BANKS } from '../constants/banks';
import { getErrorMessage } from '../utils/errors';
import { listPaystackBanks, resolvePaystackAccountName } from '../utils/paystackServer';

interface WithdrawFundsProps {
  profile: UserProfile;
}

export default function WithdrawFunds({ profile }: WithdrawFundsProps) {
  const navigate = useNavigate();
  const [banks, setBanks] = useState<NigerianBankOption[]>(NIGERIAN_BANKS.map((bank) => ({ ...bank })));
  const [bankSearch, setBankSearch] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState<string>(NIGERIAN_BANKS[0].code);
  const [verifiedAccount, setVerifiedAccount] = useState<WithdrawalAccount | null>(null);
  const [accounts, setAccounts] = useState<WithdrawalAccount[]>(() => supabaseService.listWithdrawalAccounts(profile.uid));
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    listPaystackBanks()
      .then((response) => {
        if (!active) return;
        const merged = [...response.banks, ...NIGERIAN_BANKS]
          .filter((bank, index, array) => array.findIndex((item) => item.code === bank.code) === index)
          .sort((a, b) => a.name.localeCompare(b.name));
        setBanks(merged);
        if (!merged.some((bank) => bank.code === bankCode)) {
          setBankCode(merged[0]?.code || NIGERIAN_BANKS[0].code);
        }
      })
      .catch(() => {
        if (!active) return;
        setBanks(NIGERIAN_BANKS.map((bank) => ({ ...bank })));
      })
      .finally(() => {
        if (active) setLoadingBanks(false);
      });

    return () => {
      active = false;
    };
  }, [bankCode]);

  const filteredBanks = useMemo(() => {
    const query = bankSearch.trim().toLowerCase();
    if (!query) return banks;
    return banks.filter((bank) => bank.name.toLowerCase().includes(query));
  }, [bankSearch, banks]);

  const selectedBank = useMemo(
    () => banks.find((bank) => bank.code === bankCode) || filteredBanks[0] || banks[0] || { ...NIGERIAN_BANKS[0] },
    [bankCode, banks, filteredBanks]
  );

  const verifyAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setVerifiedAccount(null);

    if (!/^\d{10}$/.test(accountNumber)) {
      setError('Bank account numbers must be exactly 10 digits.');
      return;
    }

    setVerifying(true);
    try {
      const resolved = await resolvePaystackAccountName(accountNumber, selectedBank.code, selectedBank.name);
      setVerifiedAccount({
        id: 'verified-preview',
        accountNumber: resolved.accountNumber,
        bankCode: resolved.bankCode,
        bankName: resolved.bankName || selectedBank.name,
        accountName: resolved.accountName,
        createdAt: new Date().toISOString(),
      });
      setSuccess('Account verified. You can save it or continue with this account.');
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Unable to verify this account right now.'));
    } finally {
      setVerifying(false);
    }
  };

  const saveAccount = async () => {
    if (!verifiedAccount) return;
    setSaving(true);
    setError(null);
    try {
      const next = supabaseService.saveWithdrawalAccount(profile.uid, {
        accountNumber: verifiedAccount.accountNumber,
        bankCode: verifiedAccount.bankCode,
        bankName: verifiedAccount.bankName,
        accountName: verifiedAccount.accountName,
        recipientCode: verifiedAccount.recipientCode,
      });
      setAccounts(next);
      setSuccess('Withdrawal account saved.');
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Unable to save withdrawal account.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = (accountId: string) => {
    setDeletingId(accountId);
    setError(null);
    try {
      const next = supabaseService.deleteWithdrawalAccount(profile.uid, accountId);
      setAccounts(next);
      setSuccess('Withdrawal account removed.');
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Unable to remove this withdrawal account.'));
    } finally {
      setDeletingId(null);
    }
  };

  const proceedToAmount = (account: WithdrawalAccount) => {
    navigate(`/wallets/withdraw/amount?accountId=${encodeURIComponent(account.id)}`);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/wallets')} className="rounded-full p-2 hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Withdraw Funds</h1>
          <p className="text-sm text-gray-500">Add a withdrawal account, verify it, then continue to complete a bank withdrawal.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <form onSubmit={verifyAccount} className="space-y-4 rounded-3xl border border-violet-100 bg-white/95 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <Landmark size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add Withdrawal Account</h2>
              <p className="text-sm text-gray-500">Verify a Nigerian bank account, including OPay and PalmPay where Paystack supports them.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Account Number</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="w-full rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="0123456789"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Bank Name</label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                className="w-full rounded-2xl border border-violet-100 bg-violet-50/60 py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Search banks, OPay, PalmPay..."
              />
            </div>
            <select value={bankCode} onChange={(e) => setBankCode(e.target.value)} className="w-full rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500">
              {filteredBanks.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              {loadingBanks
                ? 'Loading live bank list from Paystack...'
                : 'The list includes Paystack-supported Nigerian banks and fintech accounts.'}
            </p>
          </div>

          <button type="submit" disabled={verifying} className="w-full rounded-2xl bg-violet-700 py-3 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-60">
            {verifying ? 'Verifying...' : 'Verify Account'}
          </button>

          {verifiedAccount && (
            <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <BadgeCheck size={20} className="mt-0.5 text-emerald-600" />
                <div>
                  <p className="text-sm font-bold text-emerald-900">{verifiedAccount.accountName}</p>
                  <p className="text-xs text-emerald-700">
                    {verifiedAccount.bankName} • {verifiedAccount.accountNumber}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={saveAccount} disabled={saving} className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save Account'}
                </button>
                <button type="button" onClick={() => proceedToAmount(verifiedAccount)} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700">
                  Continue Withdrawal
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="space-y-4 rounded-3xl border border-violet-100 bg-white/95 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
              <Building2 size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Saved Accounts</h2>
              <p className="text-sm text-gray-500">Manage saved withdrawal accounts and choose one whenever you want to cash out.</p>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              No saved withdrawal accounts yet.
            </div>
          ) : (
            accounts.map((account) => (
              <div key={account.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <button type="button" onClick={() => proceedToAmount(account)} className="w-full text-left">
                  <p className="text-sm font-bold text-gray-900">{account.accountName}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {account.bankName} • {account.accountNumber}
                  </p>
                </button>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => proceedToAmount(account)} className="flex-1 rounded-xl bg-violet-700 px-3 py-2 text-sm font-bold text-white hover:bg-violet-800">
                    Withdraw
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAccount(account.id)}
                    disabled={deletingId === account.id}
                    className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
                    aria-label={`Delete ${account.bankName} account`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}

          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-800">
            Account-name verification uses Paystack account resolution. Saved accounts can be reused or removed here, and withdrawals will reuse an existing Paystack recipient or create one automatically before transfer.
          </div>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
      {success && <div className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{success}</div>}
    </div>
  );
}
