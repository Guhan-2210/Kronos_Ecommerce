# Order Worker

Private microservice for managing orders in the ecommerce platform. This worker is **NOT** accessible directly from the frontend - it can only be called through the cart-worker via service bindings.

## Features

- Order creation and management
- Payment integration orchestration
- Stock reduction coordination with fulfilment-worker
- Transaction rollback on failure
- Order status tracking
- Soft delete support for completed orders

## Architecture

The order-worker acts as an orchestrator between:

- **Cart Worker**: Receives order placement requests
- **Payment Worker**: Handles PayPal payment processing
- **Fulfilment Worker**: Manages inventory reduction

## Database Schema

### Orders Table

- `id`: Order ID (primary key)
- `user_id`: User who placed the order
- `cart_id`: Reference to the cart
- `order_data`: JSON containing:
  - Products (with minimum details)
  - Shipping address
  - Billing address
  - Delivery mode
  - Costs breakdown
- `user_data`: JSON with user details
- `payment_id`: Reference to payment record
- `status`: Order status (pending, payment_initiated, paid, confirmed, processing, shipped, delivered, cancelled, failed)
- `total_amount`: Total order amount
- `currency`: Currency code
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `deleted_at`: Soft delete timestamp

## Setup

### 1. Create D1 Database

```bash
cd order-worker
wrangler d1 create order_db
```

Update `wrangler.toml` with the database ID.

### 2. Run Migrations

```bash
wrangler d1 execute order_db --local --file=./src/migrations/001_orders.sql
```

For production:

```bash
wrangler d1 execute order_db --remote --file=./src/migrations/001_orders.sql
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Service Bindings

The order-worker requires bindings to:

- `PAYMENT_SERVICE` → payment-worker
- `FULFILMENT_SERVICE` → fulfilment-worker

These are already configured in `wrangler.toml`.

### 5. Run Locally

```bash
npm run dev
```

The worker will run on `http://localhost:8791`.

## API Endpoints

**Note**: These endpoints should only be called by cart-worker via service bindings.

### POST /api/orders/create

Create a new order from cart data.

**Request Body**:

```json
{
  "user_id": "user-123",
  "cart_id": "cart-456",
  "cart_data": {
    "products": [...],
    "shipping_address": {...},
    "billing_address": {...},
    "delivery_mode": "standard",
    "costs": {...}
  },
  "user_data": {
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### POST /api/orders/:orderId/initiate-payment

Initiate payment for an order.

### POST /api/orders/:orderId/confirm

Confirm order after successful payment (reduces stock).

**Request Body**:

```json
{
  "paypal_order_id": "PAYPAL-ORDER-123"
}
```

### GET /api/orders/:orderId

Get order details.

### POST /api/orders/:orderId/cancel

Cancel an order (before payment completion).

## Order Flow

1. **Order Creation**: Cart-worker calls `/api/orders/create`
2. **Payment Initiation**: Order-worker calls payment-worker to create PayPal order
3. **User Pays**: User completes payment on PayPal
4. **Order Confirmation**: Cart-worker calls `/api/orders/:orderId/confirm`
   - Order-worker captures payment via payment-worker
   - Stock is reduced via fulfilment-worker
   - Order status updated to "confirmed"
5. **Cart Cleanup**: Cart is soft-deleted

## Error Handling & Rollback

If order confirmation fails after payment:

- Stock reductions are rolled back
- Order status is set to "failed"
- Payment remains captured (for manual review)

If stock reduction fails:

- Previous stock reductions are restored
- Order status is set to "failed"
- Error is propagated to cart-worker

## Security

- **Private Access**: Only accessible via service bindings
- **No Direct Frontend Access**: Prevents unauthorized order creation
- **User Authorization**: Order operations verify user ownership

## Deployment

```bash
npm run deploy
```

## Monitoring

Check health:

```bash
curl http://localhost:8791/health/detailed
```

View logs:

```bash
npm run tail
```
