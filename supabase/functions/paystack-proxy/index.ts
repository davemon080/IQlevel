declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ResolveAccountPayload = {
  action: 'resolve_account';
  accountNumber: string;
  bankCode: string;
  bankName?: string;
};

type VerifyTransactionPayload = {
  action: 'verify_transaction';
  reference: string;
};

type ListBanksPayload = {
  action: 'list_banks';
  country?: string;
};

type InitiateTransferPayload = {
  action: 'initiate_transfer';
  accountNumber: string;
  bankCode: string;
  bankName?: string;
  accountName: string;
  recipientCode?: string;
  amountKobo: number;
  currency?: string;
  reference: string;
  reason?: string;
};

type PaystackApiResponse<T> = {
  status?: boolean;
  message?: string;
  data?: T;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

async function parsePaystackJson<T>(response: Response): Promise<PaystackApiResponse<T> | null> {
  try {
    return (await response.json()) as PaystackApiResponse<T>;
  } catch {
    return null;
  }
}

async function paystackRequest<T>(secretKey: string, path: string, init?: RequestInit) {
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const body = await parsePaystackJson<T>(response);
  return { response, body };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const secretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!secretKey) {
    return jsonResponse(500, { ok: false, error: 'Missing PAYSTACK_SECRET_KEY in function environment.' });
  }

  try {
    const payload = (await request.json()) as ResolveAccountPayload | VerifyTransactionPayload | ListBanksPayload | InitiateTransferPayload;

    if (payload.action === 'resolve_account') {
      const accountNumber = String(payload.accountNumber || '').trim();
      const bankCode = String(payload.bankCode || '').trim();

      if (!/^\d{10}$/.test(accountNumber)) {
        return jsonResponse(400, { ok: false, error: 'Account number must be exactly 10 digits.' });
      }

      if (!bankCode) {
        return jsonResponse(400, { ok: false, error: 'Bank code is required.' });
      }

      const { response: paystackResponse, body: resolved } = await paystackRequest<{
        account_name?: string;
        account_number?: string;
      }>(
        secretKey,
        `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`
      );

      if (!paystackResponse.ok || !resolved?.status || !resolved?.data?.account_name) {
        return jsonResponse(400, {
          ok: false,
          error: resolved?.message || 'Unable to verify that bank account with Paystack.',
        });
      }

      return jsonResponse(200, {
        ok: true,
        data: {
          accountName: resolved.data.account_name,
          accountNumber: resolved.data.account_number,
          bankCode,
          bankName: payload.bankName || '',
        },
      });
    }

    if (payload.action === 'verify_transaction') {
      const reference = String(payload.reference || '').trim();
      if (!reference) {
        return jsonResponse(400, { ok: false, error: 'Transaction reference is required.' });
      }

      const { response: paystackResponse, body: verified } = await paystackRequest<{
        reference?: string;
        status?: string;
        amount?: number;
        currency?: string;
        paid_at?: string | null;
      }>(secretKey, `/transaction/verify/${encodeURIComponent(reference)}`);

      if (!paystackResponse.ok || !verified?.status || !verified?.data?.reference) {
        return jsonResponse(400, {
          ok: false,
          error: verified?.message || 'Unable to verify that Paystack transaction.',
        });
      }

      return jsonResponse(200, {
        ok: true,
        data: {
          reference: verified.data.reference,
          status: verified.data.status,
          amountKobo: verified.data.amount,
          currency: verified.data.currency,
          paidAt: verified.data.paid_at ?? null,
        },
      });
    }

    if (payload.action === 'list_banks') {
      const country = String(payload.country || 'nigeria').trim().toLowerCase();
      const { response: paystackResponse, body: banks } = await paystackRequest<Array<{
        code?: string;
        name?: string;
        active?: boolean;
        country?: string;
        type?: string;
      }>>(secretKey, `/bank?country=${encodeURIComponent(country)}&perPage=100`);

      if (!paystackResponse.ok || !banks?.status || !Array.isArray(banks.data)) {
        return jsonResponse(400, {
          ok: false,
          error: banks?.message || 'Unable to load banks from Paystack.',
        });
      }

      const mappedBanks = banks.data
        .filter((bank) => bank?.code && bank?.name && bank?.active !== false)
        .map((bank) => ({
          code: String(bank.code),
          name: String(bank.name),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return jsonResponse(200, {
        ok: true,
        data: {
          banks: mappedBanks,
        },
      });
    }

    if (payload.action === 'initiate_transfer') {
      const accountNumber = String(payload.accountNumber || '').trim();
      const bankCode = String(payload.bankCode || '').trim();
      const accountName = String(payload.accountName || '').trim();
      const bankName = String(payload.bankName || '').trim();
      const reference = String(payload.reference || '').trim().toLowerCase();
      const reason = String(payload.reason || 'Wallet withdrawal').trim();
      const amountKobo = Number(payload.amountKobo);
      const currency = String(payload.currency || 'NGN').trim().toUpperCase();

      if (!/^\d{10}$/.test(accountNumber)) {
        return jsonResponse(400, { ok: false, error: 'Account number must be exactly 10 digits.' });
      }

      if (!bankCode) {
        return jsonResponse(400, { ok: false, error: 'Bank code is required.' });
      }

      if (!accountName) {
        return jsonResponse(400, { ok: false, error: 'Account name is required.' });
      }

      if (!Number.isInteger(amountKobo) || amountKobo <= 0) {
        return jsonResponse(400, { ok: false, error: 'Transfer amount must be a positive integer in kobo.' });
      }

      if (currency !== 'NGN') {
        return jsonResponse(400, { ok: false, error: 'This withdrawal flow currently supports NGN transfers only.' });
      }

      if (!/^[a-z0-9_-]{16,50}$/.test(reference)) {
        return jsonResponse(400, {
          ok: false,
          error: 'Transfer reference must be 16-50 characters and contain only lowercase letters, numbers, dashes, or underscores.',
        });
      }

      let recipientCode = String(payload.recipientCode || '').trim();
      let resolvedRecipientName = accountName;

      if (recipientCode) {
        const { response, body } = await paystackRequest<{
          recipient_code?: string;
          name?: string;
          details?: {
            account_number?: string;
            account_name?: string;
            bank_code?: string;
          };
        }>(secretKey, `/transferrecipient/${encodeURIComponent(recipientCode)}`);

        const sameRecipient =
          response.ok &&
          body?.status &&
          body.data?.recipient_code &&
          body.data.details?.account_number === accountNumber &&
          body.data.details?.bank_code === bankCode;

        if (sameRecipient) {
          recipientCode = body.data?.recipient_code || recipientCode;
          resolvedRecipientName = body.data?.details?.account_name || body.data?.name || resolvedRecipientName;
        } else {
          recipientCode = '';
        }
      }

      if (!recipientCode) {
        const { response, body } = await paystackRequest<{
          recipient_code?: string;
          name?: string;
          details?: {
            account_name?: string;
          };
        }>(secretKey, '/transferrecipient', {
          method: 'POST',
          body: JSON.stringify({
            type: 'nuban',
            name: accountName,
            account_number: accountNumber,
            bank_code: bankCode,
            currency: 'NGN',
            description: bankName ? `Wallet withdrawal to ${bankName}` : 'Wallet withdrawal recipient',
          }),
        });

        if (!response.ok || !body?.status || !body?.data?.recipient_code) {
          return jsonResponse(400, {
            ok: false,
            error: body?.message || 'Unable to create or fetch transfer recipient from Paystack.',
          });
        }

        recipientCode = body.data.recipient_code;
        resolvedRecipientName = body.data.details?.account_name || body.data.name || resolvedRecipientName;
      }

      const { response: transferResponse, body: initiated } = await paystackRequest<{
        reference?: string;
        transfer_code?: string;
        status?: string;
        amount?: number;
        currency?: string;
      }>(secretKey, '/transfer', {
        method: 'POST',
        body: JSON.stringify({
          source: 'balance',
          amount: amountKobo,
          recipient: recipientCode,
          reference,
          reason,
          currency: 'NGN',
        }),
      });

      if (!transferResponse.ok || !initiated?.status || !initiated?.data?.reference) {
        return jsonResponse(400, {
          ok: false,
          error: initiated?.message || 'Unable to initiate the Paystack transfer.',
        });
      }

      if (initiated.data.status === 'otp') {
        return jsonResponse(400, {
          ok: false,
          error:
            'Paystack transfer OTP is enabled on this integration. Disable transfer OTP in your Paystack dashboard before using automated wallet withdrawals.',
        });
      }

      return jsonResponse(200, {
        ok: true,
        data: {
          reference: initiated.data.reference,
          transferCode: initiated.data.transfer_code || '',
          status: initiated.data.status || 'pending',
          amountKobo: initiated.data.amount || amountKobo,
          currency: initiated.data.currency || currency,
          recipientCode,
          recipientName: resolvedRecipientName,
        },
      });
    }

    return jsonResponse(400, { ok: false, error: 'Unsupported Paystack action.' });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected Paystack proxy error.',
    });
  }
});
