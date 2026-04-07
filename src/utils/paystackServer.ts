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

function getPaystackEdgeFunctionErrorMessage(error: { message?: string; name?: string } | null) {
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
    return 'The "paystack-proxy" function returned an error. Check that PAYSTACK_SECRET_KEY is set in Supabase and that the function code is deployed.';
  }

  return error.message || 'Unable to reach Paystack right now.';
}

async function invokePaystack<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('paystack-proxy', {
    body,
  });

  if (error) {
    throw new Error(getPaystackEdgeFunctionErrorMessage(error));
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
