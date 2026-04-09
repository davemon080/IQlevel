import { supabase } from '../supabase';
import { NigerianBankOption } from '../types';

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

type PaystackTransferResponse = {
  reference: string;
  transferCode: string;
  status: string;
  amountKobo: number;
  currency: string;
  recipientCode: string;
  recipientName?: string;
};

type PaystackBankListResponse = {
  banks: NigerianBankOption[];
};

async function getFunctionsHttpErrorMessage(error: { context?: Response | null } | null) {
  const response = error?.context;
  if (!response) {
    return null;
  }

  try {
    const cloned = response.clone();
    const contentType = cloned.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      const body = await cloned.json();
      if (typeof body?.error === 'string' && body.error.trim()) {
        return body.error;
      }
      if (typeof body?.message === 'string' && body.message.trim()) {
        return body.message;
      }
    } else {
      const text = await cloned.text();
      if (text.trim()) {
        return text.trim();
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function getPaystackEdgeFunctionErrorMessage(error: { message?: string; name?: string; context?: Response | null } | null) {
  if (!error) {
    return 'Unable to reach Paystack right now.';
  }

  if (error.name === 'FunctionsFetchError') {
    return 'Unable to reach the Supabase Edge Function "paystack-proxy". Deploy the function and add PAYSTACK_SECRET_KEY to your Supabase Edge Function secrets.';
  }

  if (error.name === 'FunctionsRelayError') {
    return 'Supabase could not relay the request to "paystack-proxy". Confirm the function is deployed and healthy.';
  }

  if (error.name === 'FunctionsHttpError') {
    const functionMessage = await getFunctionsHttpErrorMessage(error);
    return functionMessage || 'The "paystack-proxy" function returned an error. Check that PAYSTACK_SECRET_KEY is set in Supabase and that the function code is deployed.';
  }

  return error.message || 'Unable to reach Paystack right now.';
}

async function invokePaystack<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('paystack-proxy', {
    body,
  });

  if (error) {
    throw new Error(await getPaystackEdgeFunctionErrorMessage(error));
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

export function initiatePaystackBankTransfer(params: {
  accountNumber: string;
  bankCode: string;
  bankName?: string;
  accountName: string;
  recipientCode?: string;
  amountKobo: number;
  reference: string;
  reason?: string;
}) {
  return invokePaystack<PaystackTransferResponse>({
    action: 'initiate_transfer',
    accountNumber: params.accountNumber,
    bankCode: params.bankCode,
    bankName: params.bankName,
    accountName: params.accountName,
    recipientCode: params.recipientCode,
    amountKobo: params.amountKobo,
    currency: 'NGN',
    reference: params.reference,
    reason: params.reason,
  });
}

export function listPaystackBanks() {
  return invokePaystack<PaystackBankListResponse>({
    action: 'list_banks',
    country: 'nigeria',
  });
}
