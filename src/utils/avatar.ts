export function getCartoonAvatar(seed: string): string {
  const safeSeed = encodeURIComponent(seed || 'connect-user');
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${safeSeed}&backgroundType=gradientLinear`;
}

export function resolveAvatar(photoURL: string | undefined | null, seed: string): string {
  return photoURL && photoURL.trim().length > 0 ? photoURL : getCartoonAvatar(seed);
}
