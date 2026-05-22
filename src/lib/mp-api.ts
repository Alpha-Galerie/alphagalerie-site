// src/lib/mp-api.ts
const MP_API = 'https://api.mercadopago.com/v1';

export async function getPaymentMethodByBin(
  bin: string,
  accessToken: string
): Promise<string | null> {
  try {
    const resp = await fetch(
      `${MP_API}/payment_methods/installments?bin=${bin}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!resp.ok) return null;

    const data = await resp.json();
    if (Array.isArray(data) && data.length > 0 && data[0].payment_method_id) {
      return data[0].payment_method_id;
    }

    return null;
  } catch {
    return null;
  }
}
