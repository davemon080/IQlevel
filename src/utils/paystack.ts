import { requirePaystackPublicKey } from './paystackConfig';

declare global {
  interface Window {
    Paystack?: {
      new (): {
        newTransaction: (config: Record<string, unknown>) => void;
      };
    };
  }
}

export async function ensurePaystackV2Script() {
  if (window.Paystack) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-paystack-inline-v2]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Paystack.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v2/inline.js';
    script.async = true;
    script.dataset.paystackInlineV2 = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Paystack.'));
    document.body.appendChild(script);
  });
}

export async function startPaystackTransaction({
  email,
  amountKobo,
  metadata,
  reference,
}: {
  email: string;
  amountKobo: number;
  metadata?: Record<string, unknown>;
  reference?: string;
}) {
  const paystackPublicKey = requirePaystackPublicKey();

  await ensurePaystackV2Script();

  return await new Promise<{ reference?: string }>((resolve, reject) => {
    if (!window.Paystack) {
      reject(new Error('Paystack is unavailable.'));
      return;
    }

    const popup = new window.Paystack();
    popup.newTransaction({
      key: paystackPublicKey,
      email,
      amount: amountKobo,
      currency: 'NGN',
      metadata,
      reference,
      onSuccess: (transaction: { reference?: string }) => resolve(transaction),
      onCancel: () => reject(new Error('Payment window was closed before completion.')),
    });
  });
}
