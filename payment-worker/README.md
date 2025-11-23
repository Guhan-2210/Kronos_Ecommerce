# Payment Worker

Private microservice for handling payment processing via PayPal Sandbox. This worker is **NOT** accessible directly from the frontend - it can only be called through the order-worker via service bindings.

## Features

- PayPal Sandbox integration
- Payment initiation and capture
- Encrypted storage of sensitive payment data (AES-256-GCM)
- Hashed payer information (SHA-256)
- Payment status verification
- Transaction metadata tracking
- Automatic error handling and logging

## Security Features

### Data Protection

1. **Encrypted Data** (AES-256-GCM):
   - Full PayPal response (contains sensitive transaction details)
   - Stored encrypted at rest

2. **Hashed Data** (SHA-256):
   - Payer email address
   - PayPal payer ID
   - One-way hashing for privacy

3. **Plain Text Metadata**:
   - Transaction amounts
   - Currency codes
   - Timestamps
   - Status information

## Database Schema

### Payments Table

- `id`: Payment ID (primary key)
- `order_id`: Reference to order
- `user_id`: User who made payment
- `paypal_order_id`: PayPal's order ID
- `paypal_capture_id`: PayPal's capture ID (after successful payment)
- `amount`: Payment amount
- `currency`: Currency code
- `status`: Payment status (initiated, approved, captured, failed, refunded)
- `encrypted_response`: Encrypted PayPal response (AES-256-GCM)
- `payer_email_hash`: SHA-256 hash of payer email
- `payer_id_hash`: SHA-256 hash of PayPal payer ID
- `transaction_metadata`: JSON with non-sensitive metadata
- `error_code`: Error code (if failed)
- `error_message`: Error message (if failed)
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `completed_at`: Payment completion timestamp

## Setup

### 1. Create PayPal Sandbox Account

1. Go to [PayPal Developer](https://developer.paypal.com/)
2. Create a sandbox business account
3. Get your **Client ID** and **Client Secret**

### 2. Create D1 Database

```bash
cd payment-worker
wrangler d1 create payment_db
```

Update `wrangler.toml` with the database ID.

### 3. Run Migrations

```bash
wrangler d1 execute payment_db --local --file=./src/migrations/001_payments.sql
```

For production:

```bash
wrangler d1 execute payment_db --remote --file=./src/migrations/001_payments.sql
```

### 4. Generate Encryption Key

```bash
openssl rand -base64 32
```

### 5. Configure Environment Variables

Update `wrangler.toml`:

```toml
[vars]
PAYPAL_MODE = "sandbox"
PAYPAL_CLIENT_ID = "your_paypal_client_id"
PAYPAL_CLIENT_SECRET = "your_paypal_client_secret"
PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com"
ENCRYPTION_KEY_B64 = "your_base64_encryption_key"
```

### 6. Install Dependencies

```bash
npm install
```

### 7. Run Locally

```bash
npm run dev
```

The worker will run on `http://localhost:8792`.

## API Endpoints

**Note**: These endpoints should only be called by order-worker via service bindings.

### POST /api/payments/initiate

Initiate a PayPal payment.

**Request Body**:

```json
{
  "order_id": "order-123",
  "user_id": "user-456",
  "amount": 99.99,
  "currency": "USD"
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "payment_id": "pay-789",
    "paypal_order_id": "PAYPAL-ORDER-123",
    "approval_url": "https://www.sandbox.paypal.com/checkoutnow?token=...",
    "status": "initiated"
  }
}
```

### POST /api/payments/complete

Complete payment after user approval.

**Request Body**:

```json
{
  "paypal_order_id": "PAYPAL-ORDER-123"
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "payment_id": "pay-789",
    "order_id": "order-123",
    "status": "captured",
    "amount": "99.99",
    "currency": "USD"
  }
}
```

### GET /api/payments/:paymentId/verify

Verify payment status.

### GET /api/payments/:paymentId

Get payment details (non-sensitive data only).

## Payment Flow

1. **Initiation**: Order-worker calls `/api/payments/initiate`
   - Payment record created in database
   - PayPal order created
   - Approval URL returned

2. **User Approval**: User redirected to PayPal to approve payment

3. **Completion**: Order-worker calls `/api/payments/complete`
   - Payment captured on PayPal
   - Full PayPal response encrypted and stored
   - Payer information hashed
   - Payment marked as "captured"

## Encryption Details

### AES-256-GCM Encryption

- **Algorithm**: AES-GCM (Galois/Counter Mode)
- **Key Size**: 256 bits
- **IV**: Random 12-byte initialization vector
- **Purpose**: Encrypts sensitive PayPal transaction data

The encrypted data includes:

- Complete PayPal capture response
- Payer details
- Transaction metadata

### SHA-256 Hashing

- **Algorithm**: SHA-256
- **Purpose**: One-way hashing for privacy
- **Data Hashed**:
  - Payer email address
  - PayPal payer ID

## Error Handling

Payment failures are automatically logged with:

- Error code
- Error message
- Timestamp
- Payment status set to "failed"

## Testing with PayPal Sandbox

Use PayPal sandbox test accounts:

- **Buyer Account**: Create in PayPal Developer Dashboard
- **Test Cards**: Use PayPal-provided test credit cards

Test credentials:

- Email: `buyer@example.com`
- Password: Provided by PayPal sandbox

## Security Best Practices

1. **Never log decrypted data**
2. **Rotate encryption keys periodically**
3. **Use secrets management** (Cloudflare Secrets for production)
4. **Monitor failed payment attempts**
5. **Implement rate limiting** (if needed)

## Deployment

```bash
npm run deploy
```

For production, use Cloudflare Secrets:

```bash
wrangler secret put PAYPAL_CLIENT_SECRET
wrangler secret put ENCRYPTION_KEY_B64
```

## Monitoring

Check health:

```bash
curl http://localhost:8792/health/detailed
```

View logs:

```bash
npm run tail
```

## Troubleshooting

### Payment Initiation Fails

- Verify PayPal credentials
- Check PayPal API status
- Ensure correct API base URL

### Payment Capture Fails

- Verify PayPal order ID is valid
- Check payment wasn't already captured
- Review PayPal error message

### Encryption Errors

- Verify encryption key is valid base64
- Check key length (must be 32 bytes when decoded)
- Ensure Web Crypto API is available
