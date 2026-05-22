import type { CheckoutMode, CheckoutProvider } from './types';
import { proCheckout } from './pro';
import { transparentCheckout } from './transparent';

const mode: CheckoutMode =
  (import.meta.env.VITE_MP_CHECKOUT_MODE as CheckoutMode) || 'transparent';

export const checkoutProvider: CheckoutProvider =
  mode === 'pro' ? proCheckout : transparentCheckout;

export type { CheckoutMode, CheckoutProvider, CheckoutPreference } from './types';
