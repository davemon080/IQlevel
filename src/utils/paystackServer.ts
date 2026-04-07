import { supabase } from '../supabase';

type PaystackResolveAccountResponse = {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName?: string;
};

type PaystackVerifyTransactionResponse = {
  reference: string;
  status: string;
  amountKobo: number;
  currency: string;
  paidAt?: string | null;
};

async function invokePaystack<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('paystack-proxy', {
    body,
  });

  if (error) {
    throw new Error(error.message || 'Unable to reach Paystack right now.');
  }

  if (!data?.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'Paystack request failed.');
  }

  return data.data as T;
}

export function resolvePaystackAccountName(accountNumber: string, bankCode: string, bankName?: string) {
  return invokePaystack<PaystackResolveAccountResponse>({
    action: 'resolve_account',
    accountNumber,
    bankCode,
    bankName,
  });
}

export function verifyPaystackTransaction(reference: string) {
  return invokePaystack<PaystackVerifyTransactionResponse>({
    action: 'verify_transaction',
    reference,
  });
}
