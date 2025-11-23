# Catalog Worker API

A Cloudflare Workers-based REST API for managing a watch product catalog with advanced caching and image storage capabilities.

## Features

- ✅ Full CRUD operations for watch products
- ✅ D1 database for persistent storage
- ✅ Two-tier caching (in-memory + KV)
- ✅ R2 image storage with public URLs
- ✅ Pagination and filtering
- ✅ Comprehensive product data model
- ✅ Cache invalidation strategies
- ✅ Health check endpoints

## Quick Start

```bash
npm install
npm run dev
```

Visit `http://localhost:8787/health` to verify the service is running.

## API Documentation

### Health Checks

#### Basic Health Check

```
GET /health
```

#### Detailed Health Check (Tests all services)

```
GET /health/detailed
```

Tests D1 Database, KV Cache, R2 Storage, and Memory Cache.

### Products

#### Create Product

**Method 1: JSON Only (No Image)**

```
POST /api/products
Content-Type: application/json
```

**Required fields**: `name`, `brand`, `model`, `sku`

**Example:**

```json
{
  "name": "Rolex Submariner Date",
  "brand": "Rolex",
  "model": "Submariner",
  "sku": "RLX-SUB-001",
  "gender": "men",
  "case": {
    "material": "Stainless Steel",
    "diameter_mm": 41
  }
}
```

**Method 2: With Image Upload**

```
POST /api/products
Content-Type: multipart/form-data
```

**Form fields:**

- `data` (Text): JSON string of product data
- `image` (File): Image file (optional)

**Postman Instructions:**

1. Select POST method
2. URL: `http://localhost:8787/api/products`
3. Go to Body tab → Select "form-data"
4. Add field 1:
   - Key: `data` (Type: Text)
   - Value: Your product JSON as a string
5. Add field 2 (optional):
   - Key: `image` (Type: File)
   - Value: Select your image file
6. Send

**cURL Example with Image:**

```bash
curl -X POST http://localhost:8787/api/products \
  -F 'data={"name":"Rolex Submariner","brand":"Rolex","model":"Submariner","sku":"RLX-001"}' \
  -F 'image=@/path/to/watch.jpg'
```

See `sample-product.json` for a complete example with all fields.

#### Get All Products

```
GET /api/products?page=1&limit=20&brand=Rolex&gender=men
```

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `brand`: Filter by brand
- `gender`: Filter by gender (men, women, unisex)
- `material`: Filter by case material
- `minPrice`: Minimum price
- `maxPrice`: Maximum price
- `sortBy`: Sort field (created_at, updated_at)
- `sortOrder`: Sort order (ASC, DESC)

#### Get Product by ID

```
GET /api/products/:id
```

Returns cached data when available with cache metadata.

#### Update Product

```
PUT /api/products/:id
Content-Type: application/json
```

**Example:**

```json
{
  "name": "Updated Name",
  "discontinued": true
}
```

Automatically invalidates cache.

#### Delete Product

```
DELETE /api/products/:id
```

Automatically deletes associated images and invalidates cache.

#### Upload/Update Product Image

```
POST /api/products/:id/image
Content-Type: multipart/form-data
```

Use this endpoint to add or update an image for an **existing** product.

**Field name**: `image`  
**Supported formats**: JPEG, PNG, WebP, GIF

**Postman Instructions:**

1. Select POST method
2. Enter URL: `http://localhost:8787/api/products/{id}/image`
3. Go to Body tab
4. Select "form-data"
5. Add key: `image` (Type: File)
6. Select your image file
7. Send

**cURL Example:**

```bash
curl -X POST http://localhost:8787/api/products/{id}/image \
  -F "image=@/path/to/watch.jpg"
```

**Note:** You can also upload images during product creation (see Create Product section).

## Product Data Model

### Required Fields

- `name`: Product name (string)
- `brand`: Watch brand (string)
- `model`: Model name (string)
- `sku`: Stock keeping unit (string)

### Optional Fields (75% coverage)

#### Basic Information

- `reference_number`: Manufacturer reference
- `collection`: Collection name
- `gender`: "men" | "women" | "unisex"
- `release_year`: Year (number)
- `discontinued`: boolean

#### Case Specifications

- `case.material`: Material type
- `case.diameter_mm`: Diameter in mm (number)
- `case.thickness_mm`: Thickness in mm (number)
- `case.lug_to_lug_mm`: Lug-to-lug measurement (number)
- `case.shape`: Case shape
- `case.crystal`: Crystal type
- `case.back`: Case back type
- `case.water_resistance_m`: Water resistance in meters (number)
- `case.bezel.type`: Bezel type
- `case.bezel.material`: Bezel material
- `case.bezel.color`: Bezel color
- `case.crown.type`: Crown type
- `case.crown.position`: Crown position

#### Movement

- `movement.type`: "automatic" | "manual" | "quartz" | "spring drive" | "hybrid"
- `movement.caliber`: Caliber name
- `movement.power_reserve_hours`: Power reserve (number)
- `movement.frequency_vph`: Frequency in VPH (number)
- `movement.jewels`: Number of jewels (number)
- `movement.complications`: Array of strings

#### Dial

- `dial.color`: Dial color
- `dial.finish`: Dial finish
- `dial.index_type`: Index type
- `dial.hands_type`: Hands type
- `dial.lume`: Lume type
- `dial.subdials`: Number of subdials (number)
- `dial.date_window_position`: Date position

#### Strap/Bracelet

- `strap.material`: Material
- `strap.color`: Color
- `strap.width_mm`: Width in mm (number)
- `strap.clasp_type`: Clasp type
- `strap.length_mm`: Length in mm (number)
- `strap.interchangeable`: boolean

#### Colors (Quick Reference)

- `colors.case_color`: Case color
- `colors.dial_color`: Dial color
- `colors.strap_color`: Strap color
- `colors.bezel_color`: Bezel color

#### Dimensions

- `dimensions.weight_grams`: Weight (number)
- `dimensions.case_diameter_mm`: Diameter (number)
- `dimensions.case_thickness_mm`: Thickness (number)

#### Features

- `features.shock_resistant`: boolean
- `features.anti_magnetic`: boolean
- `features.chronometer_certified`: Certification type
- `features.smartwatch`: boolean
- `features.connected_features`: Array

#### Authenticity

- `authenticity.box_included`: boolean
- `authenticity.papers_included`: boolean
- `authenticity.warranty_card`: boolean
- `authenticity.original_purchase_receipt`: boolean
- `authenticity.service_history`: Array

#### Media

- `media.image`: Public R2 URL (set via upload endpoint)

## Caching Strategy

### Two-Tier Architecture

**L1 - In-Memory Cache:**

- LRU cache, 100 items
- Sub-millisecond access
- Cleared on restart

**L2 - KV Cache:**

- Distributed edge cache
- 3600s TTL (configurable)
- Persists across restarts

### Cache Flow

**Read:**

1. Check memory → return if hit
2. Check KV → store in memory + return if hit
3. Query D1 → cache in both + return

**Write:**

- Automatic invalidation on update/delete
- Next read repopulates cache

## Architecture

```
Client → Workers (Hono API)
          ├─ In-Memory Cache (LRU)
          ├─ D1 Database
          ├─ KV Cache
          └─ R2 Storage
```

## Setup

See `SETUP_GUIDE.md` for detailed setup instructions including:

- Creating D1 database
- Setting up KV namespace
- Configuring R2 bucket
- Running migrations

## Environment Variables

Configured in `wrangler.toml`:

- `CACHE_TTL_SECONDS`: KV cache TTL (default: 3600)
- `MEMORY_CACHE_SIZE`: Memory cache size (default: 100)
- `R2_PUBLIC_URL`: R2 public domain

## Deployment

```bash
npm run deploy
```

## Monitoring

```bash
# View logs
npm run tail

# Check health
curl https://your-worker.workers.dev/health/detailed
```

## License

MIT
