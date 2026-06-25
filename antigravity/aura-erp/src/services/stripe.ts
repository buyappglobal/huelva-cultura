export const STRIPE_CONFIG = {
  // En desarrollo, usaremos variables de entorno de Vite
  publishableKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY || '',
  
  // OJO: La Secret Key NUNCA debe estar en el frontend (aura-erp). 
  // Esta constante es solo indicativa. Todas las llamadas que requieran la Secret Key 
  // deben hacerse contra la API de Cloudflare Worker (aura-V-2.0/functions/api/stripe/...)
  // y será el backend quien hable con Stripe.
  apiEndpoint: 'https://aurabusiness.es/api/admin/stripe',
};

/**
 * Inicia el proceso de vinculación de un cliente a Stripe (Crea el Customer)
 */
export async function createStripeCustomer(clienteId: string, email: string, nombre: string) {
  const token = localStorage.getItem('aura_erp_token');
  const res = await fetch(`${STRIPE_CONFIG.apiEndpoint}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ clienteId, email, nombre })
  });
  
  if (!res.ok) throw new Error('Error al conectar con la API de Stripe');
  return res.json();
}
