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

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
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
    const payload = (await request.json()) as ResolveAccountPayload | VerifyTransactionPayload;
    if (payload.action === 'resolve_account') {
      const accountNumber = String(payload.accountNumber || '').trim();
      const bankCode = String(payload.bankCode || '').trim();

      if (!/^\d{10}$/.test(accountNumber)) {
        return jsonResponse(400, { ok: false, error: 'Account number must be exactly 10 digits.' });
      }

      if (!bankCode) {
        return jsonResponse(400, { ok: false, error: 'Bank code is required.' });
      }

      const paystackResponse = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        }
      );
      const resolved = await paystackResponse.json();

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

      const paystackResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        }
      );
      const verified = await paystackResponse.json();

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

    return jsonResponse(400, { ok: false, error: 'Unsupported Paystack action.' });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected Paystack proxy error.',
    });
  }
});
