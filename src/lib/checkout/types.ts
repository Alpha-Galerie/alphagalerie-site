export type CheckoutMode = 'pro' | 'transparent';

export interface CheckoutPreference {
  pedido_id: string;
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
  }>;
  total: number;
  email?: string;
}

export interface CheckoutProvider {
  mode: CheckoutMode;
  startCheckout(pedido: CheckoutPreference): Promise<{ redirectUrl?: string; error?: string }>;
}
