# Price Worker

Dynamic pricing microservice for e-commerce products.

## Features

- ✅ Get current product prices
- ✅ Update product prices
- ✅ Price change detection
- ✅ Multi-currency support
- ✅ Health check endpoints
- ✅ KV caching for fast lookups

## Database Schema

### Prices Table

- `id`: Unique price record ID
- `product_id`: Reference to product (unique)
- `price`: Current price (REAL)
- `currency`: Currency code (default: USD)
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

## Setup

### 1. Install Dependencies

```bash
cd price-worker
npm install
```

### 2. Create D1 Database

```bash
wrangler d1 create price_db
```

Copy the `database_id` and update it in `wrangler.toml`.

### 3. Run Migrations

```bash
wrangler d1 execute price_db --local --file=./src/migrations/001_prices.sql
wrangler d1 execute price_db --remote --file=./src/migrations/001_prices.sql
```

### 4. Start Service

```bash
npm run dev
```

Service runs on `http://localhost:8790`

## API Endpoints

### Health Checks

#### Basic Health

```bash
GET /health
```

#### Detailed Health

```bash
GET /health/detailed
```

Returns database status and price record count.

### Get Price by Product ID

```bash
GET /api/prices/product/{productId}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "price-123",
    "product_id": "prod-456",
    "price": 49999,
    "currency": "INR",
    "created_at": 1731668400,
    "updated_at": 1731668400
  }
}
```

### Get Multiple Prices (Batch)

```bash
POST /api/prices/batch
{
  "product_ids": ["prod-1", "prod-2", "prod-3"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "prod-1": {
      "price": 49999,
      "currency": "INR"
    },
    "prod-2": {
      "price": 89999,
      "currency": "INR"
    },
    "prod-3": null
  }
}
```

### Set/Update Price

```bash
POST /api/prices/set
{
  "product_id": "prod-456",
  "price": 54999,
  "currency": "INR"
}
```

Creates new price record or updates existing one.

**Response:**

```json
{
  "success": true,
  "message": "Price updated successfully",
  "data": {
    "productId": "prod-456",
    "price": 54999,
    "currency": "INR",
    "updated": true
  }
}
```

## Integration with Other Services

### Cart Worker Integration

Cart Worker calls Price Worker when:

1. Adding product to cart (get current price)
2. Retrieving cart (validate prices haven't changed)
3. Displaying order summary

### Example Integration

```javascript
// Get current price
const response = await fetch('http://localhost:8790/api/prices/product/prod-456');
const { data } = await response.json();
console.log(`Current price: ₹${data.price} ${data.currency}`);
// Output: Current price: ₹49999 INR
```

## Configuration

Edit `wrangler.toml`:

```toml
name = "price-worker"
main = "src/index.js"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "price_db"
database_id = "your-database-id"

[[kv_namespaces]]
binding = "PRICE_CACHE"
id = "your-kv-id"

[vars]
CACHE_TTL_SECONDS = "3600"
```

## Deployment

```bash
npm run deploy
```

## Monitoring

```bash
# View logs
wrangler tail

# Check health
curl http://localhost:8790/health/detailed
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "message": "Product price not found",
    "statusCode": 404,
    "details": null
  }
}
```

## Best Practices

1. **Always use batch endpoint** for multiple products (more efficient)
2. **Leverage KV caching** - prices are cached automatically with configurable TTL
3. **Set currency explicitly** for international products
4. **Monitor price changes** via updated_at timestamp

## License

MIT
