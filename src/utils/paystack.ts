import { requirePaystackPublicKey } from './paystackConfig';

declare global {
  interface Window {
    Paystack?: {
      new (): {
        newTransaction: (config: Record<string, unknown>) => void;
        checkout?: (config: Record<string, unknown>) => Promise<unknown> | void;
      };
    };
    PaystackPop?: {
      new (): {
        newTransaction: (config: Record<string, unknown>) => void;
        checkout?: (config: Record<string, unknown>) => Promise<unknown> | void;
      };
      setup?: (config: Record<string, unknown>) => {
        openIframe: () => void;
      };
    };
  }
}

export async function ensurePaystackV2Script() {
  if (window.Paystack || window.PaystackPop) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-paystack-inline-v2]');
    if (existing) {
      if (window.Paystack || window.PaystackPop) {
        resolve();
        return;
      }
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

    window.setTimeout(() => {
      if (!window.Paystack && !window.PaystackPop) {
        reject(new Error('Timed out while loading Paystack.'));
      }
    }, 12000);
  });
}

function getPaystackConstructor() {
  if (window.Paystack) {
    return window.Paystack;
  }

  if (window.PaystackPop) {
    return window.PaystackPop;
  }

  return null;
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
    const PaystackConstructor = getPaystackConstructor();
    if (!PaystackConstructor) {
      reject(new Error('Paystack is unavailable.'));
      return;
    }

    const config = {
      key: paystackPublicKey,
      email,
      amount: amountKobo,
      currency: 'NGN',
      metadata,
      reference,
      onSuccess: (transaction: { reference?: string }) => resolve(transaction),
      onCancel: () => reject(new Error('Payment window was closed before completion.')),
      onError: (error: { message?: string }) => reject(new Error(error?.message || 'Unable to launch Paystack.')),
    };

    if (window.PaystackPop?.setup) {
      const popup = window.PaystackPop.setup({
        ...config,
        callback: (transaction: { reference?: string }) => resolve(transaction),
        onClose: () => reject(new Error('Payment window was closed before completion.')),
      });
      popup.openIframe();
      return;
    }

    const popup = new PaystackConstructor();
    if (typeof popup.checkout === 'function') {
      const checkoutResult = popup.checkout(config);
      if (checkoutResult && typeof (checkoutResult as Promise<unknown>).catch === 'function') {
        void (checkoutResult as Promise<unknown>).catch((error: { message?: string }) =>
          reject(new Error(error?.message || 'Unable to launch Paystack.'))
        );
      }
      return;
    }

    popup.newTransaction(config);
  });
}
