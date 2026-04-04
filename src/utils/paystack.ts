const PAYSTACK_PUBLIC_KEY = 'pk_test_e9672a354a3fbf8d3e696c1265b29355181a3e11';

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
}: {
  email: string;
  amountKobo: number;
  metadata?: Record<string, unknown>;
}) {
  await ensurePaystackV2Script();

  return await new Promise<{ reference?: string }>((resolve, reject) => {
    if (!window.Paystack) {
      reject(new Error('Paystack is unavailable.'));
      return;
    }

    const popup = new window.Paystack();
    popup.newTransaction({
      key: PAYSTACK_PUBLIC_KEY,
      email,
      amount: amountKobo,
      currency: 'NGN',
      metadata,
      onSuccess: (transaction: { reference?: string }) => resolve(transaction),
      onCancel: () => reject(new Error('Payment window was closed before completion.')),
    });
  });
}
