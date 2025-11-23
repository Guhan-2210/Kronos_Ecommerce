# Cart Worker

Shopping cart microservice with price and stock validation.

## Features

- ✅ Add products to cart with real-time price/stock validation
- ✅ Handle price changes over time
- ✅ Handle stock availability changes
- ✅ Shipping and billing address management
- ✅ Order summary with delivery options
- ✅ Abandoned cart handling
- ✅ Integration with Price and Fulfilment services

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create D1 Database

```bash
wrangler d1 create cart_db
```

Update `database_id` in `wrangler.toml`.

### 3. Run Migrations

```bash
wrangler d1 execute cart_db --local --file=./src/migrations/001_carts.sql
wrangler d1 execute cart_db --remote --file=./src/migrations/001_carts.sql
```

### 4. Start Service

```bash
npm run dev
```

Service runs on `http://localhost:8789`

## Dependencies

This service requires:

- **Price Worker** running on port 8790
- **Fulfilment Worker** running on port 8791

## API Endpoints

### Add to Cart

```bash
POST /api/cart/add
{
  "user_id": "user-123",
  "user_data": {
    "email": "user@example.com",
    "name": "John Doe"
  },
  "product_id": "prod-456",
  "sku": "RLX-001",
  "name": "Rolex Submariner",
  "brand": "Rolex",
  "image": "https://...",
  "quantity": 1,
  "zipcode": "10001"
}
```

### Get Cart (with validation)

```bash
GET /api/cart/{cartId}
```

Returns cart with:

- Current prices (even if changed)
- Stock availability
- Price change warnings
- Stock warnings

### Update Quantity

```bash
PUT /api/cart/{cartId}/quantity
{
  "product_id": "prod-456",
  "quantity": 2
}
```

### Remove Product

```bash
DELETE /api/cart/{cartId}/product/{productId}
```

### Add Shipping Address

```bash
POST /api/cart/{cartId}/shipping-address
{
  "street": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipcode": "10001",
  "country": "USA"
}
```

Returns cart with delivery options.

### Add Billing Address

```bash
POST /api/cart/{cartId}/billing-address
{
  "same_as_shipping": true
}
```

Or provide custom address:

```bash
{
  "address": {
    "street": "456 Business Ave",
    "city": "New York",
    "state": "NY",
    "zipcode": "10002",
    "country": "USA"
  }
}
```

### Get Order Summary

```bash
GET /api/cart/{cartId}/summary
```

Returns complete order summary:

- All items with current prices
- Subtotal
- Delivery options
- Addresses

## Real-World Scenarios

### Scenario 1: Price Change

1. User adds Rolex for $12,000
2. User abandons cart for 3 days
3. Price increases to $12,500
4. User returns to cart
5. **Cart shows**: "Price changed from $12,000 to $12,500"
6. Checkout uses current price ($12,500)

### Scenario 2: Out of Stock

1. User adds watch to cart
2. Product goes out of stock
3. User views cart
4. **Cart shows**: "Product currently out of stock"
5. Checkout blocked until resolved

### Scenario 3: Normal Flow

1. User adds product → Stock & price validated ✓
2. User adds shipping address → Delivery options calculated ✓
3. User adds billing address ✓
4. User views summary → Final validation ✓
5. Ready for payment

## Database Schema

```sql
CREATE TABLE carts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_data TEXT NOT NULL,         -- JSONB: {email, name, phone}
    product_data TEXT NOT NULL,      -- JSONB: [{product_id, name, price, quantity, ...}]
    shipping_address TEXT,           -- JSONB
    billing_address TEXT,            -- JSONB
    status TEXT DEFAULT 'active',
    created_at INTEGER,
    updated_at INTEGER
);
```

## Configuration

Update `wrangler.toml`:

```toml
[vars]
AUTH_WORKER_URL = "http://localhost:8788"
CATALOG_WORKER_URL = "http://localhost:8787"
```

## License

MIT
