export function getPaystackPublicKey() {
  const key = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  return typeof key === 'string' ? key.trim() : '';
}

export function requirePaystackPublicKey() {
  const key = getPaystackPublicKey();
  if (!key) {
    throw new Error(
      'Missing Paystack public key. Set VITE_PAYSTACK_PUBLIC_KEY and restart the Vite server so the new env value is loaded.'
    );
  }

  return key;
}
