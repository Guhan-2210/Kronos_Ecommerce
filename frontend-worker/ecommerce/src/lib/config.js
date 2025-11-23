// API Configuration
// Update these URLs based on your deployment

export const API_CONFIG = {
  // Production URLs (your deployed workers)
  AUTH_API: import.meta.env.VITE_AUTH_API || 'https://ecommerce-auth.guhan2210.workers.dev',
  CATALOG_API: import.meta.env.VITE_CATALOG_API || 'https://catalog-worker.guhan2210.workers.dev',
  CART_API: import.meta.env.VITE_CART_API || 'https://cart-worker.guhan2210.workers.dev',
  PRICE_API: import.meta.env.VITE_PRICE_API || 'https://price-worker.guhan2210.workers.dev',
  FULFILMENT_API: import.meta.env.VITE_FULFILMENT_API || 'https://fulfilment-worker.guhan2210.workers.dev',
  // ORDER_API - Not used directly; orders accessed via CART_API proxy to avoid CORS
  
  // For local development, create .env with:
  // VITE_AUTH_API=http://localhost:8788
  // VITE_CATALOG_API=http://localhost:8787
  // VITE_CART_API=http://localhost:8789
  // VITE_PRICE_API=http://localhost:8790
  // VITE_FULFILMENT_API=http://localhost:8791
};

export const APP_CONFIG = {
  APP_NAME: 'Kronos',
  DEFAULT_CURRENCY: 'INR',
  DEFAULT_ZIPCODE: '600002', // Chennai
  ITEMS_PER_PAGE: 12
};

