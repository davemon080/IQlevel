export type AppToastTone = 'success' | 'error' | 'info';

export type AppToast = {
  id: string;
  title: string;
  message?: string;
  tone?: AppToastTone;
  durationMs?: number;
};

const listeners = new Set<(toast: AppToast) => void>();

export function showAppToast(toast: Omit<AppToast, 'id'>) {
  const payload: AppToast = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    tone: toast.tone || 'info',
    durationMs: toast.durationMs ?? 2600,
    ...toast,
  };
  listeners.forEach((listener) => listener(payload));
  return payload.id;
}

export function subscribeToAppToasts(listener: (toast: AppToast) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
