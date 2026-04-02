# Shopify Plugin for Mission:Control — Full Development Plan

## Context

**Mission:Control** is a platform for video game publishers providing real-time visibility and control over sales and digital assets across gaming platforms. Their [Partner API SDK](https://www.npmjs.com/package/@missioncontrolio/client) (`@missioncontrolio/client`) provides:

- **Product Management** — List products, check stock by region
- **Reservation System** — Create/cancel reservations for products
- **Order Workflow** — Claim reservations into orders with full consumer/pricing data
- **Authentication** — Azure AD client credentials with partner ID
- **Environments** — Sandbox and Production

**Goal:** Build a Shopify app that allows merchants to sell Mission:Control digital products (game keys, digital content) through their Shopify storefront, with automatic fulfillment via the Mission:Control reservation/order API.

**Existing Codebase:** Next.js 14 app (Azure DevOps Control Tower). The Shopify plugin will be built as a **new, standalone module** within the same monorepo under `src/shopify/`.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Shopify Store                      │
│  (Product listings synced from Mission:Control)      │
└──────────┬──────────────────────────┬────────────────┘
           │ Webhooks                 │ App Bridge UI
           ▼                         ▼
┌─────────────────────────────────────────────────────┐
│              Shopify Plugin (Next.js)                 │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  API Routes  │  │  Admin UI    │  │  Webhooks   │ │
│  │  /api/shop/* │  │  (Polaris)   │  │  Handler    │ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                │                  │         │
│  ┌──────▼────────────────▼──────────────────▼──────┐ │
│  │           Core Services Layer                    │ │
│  │  ┌────────────┐ ┌────────────┐ ┌──────────────┐ │ │
│  │  │  Product    │ │ Order      │ │ Fulfillment  │ │ │
│  │  │  Sync Svc   │ │ Svc        │ │ Svc          │ │ │
│  │  └─────┬──────┘ └─────┬──────┘ └──────┬───────┘ │ │
│  └────────┼───────────────┼───────────────┼────────┘ │
│           │               │               │           │
│  ┌────────▼───────────────▼───────────────▼────────┐ │
│  │       Mission:Control SDK Client Wrapper         │ │
│  │       (@missioncontrolio/client)                  │ │
│  └──────────────────────┬──────────────────────────┘ │
│                         │                             │
│  ┌──────────────────────▼──────────────────────────┐ │
│  │              Database (Prisma)                    │ │
│  │  ProductMapping | OrderMapping | SyncLog | Config│ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────┐
│  Mission:Control API     │
│  (Products, Reservations,│
│   Orders)                │
└─────────────────────────┘
```

---

## Phase 1: Foundation & Infrastructure

### 1.1 Project Setup & Dependencies
**Files:** `package.json`, `src/shopify/`

- Install dependencies:
  - `@missioncontrolio/client` — Mission:Control SDK
  - `@shopify/shopify-api` — Shopify API library
  - `@shopify/polaris` + `@shopify/app-bridge-react` — Admin UI
- Create directory structure:
  ```
  src/shopify/
  ├── lib/
  │   ├── mission-control/       # MC SDK wrapper
  │   │   ├── client.ts          # Client initialization & auth
  │   │   ├── products.ts        # Product operations
  │   │   ├── reservations.ts    # Reservation management
  │   │   └── orders.ts          # Order operations
  │   ├── shopify/               # Shopify API wrapper
  │   │   ├── client.ts          # Shopify API client
  │   │   ├── products.ts        # Shopify product CRUD
  │   │   ├── webhooks.ts        # Webhook registration & verification
  │   │   └── fulfillment.ts     # Fulfillment API
  │   └── services/              # Business logic
  │       ├── product-sync.ts    # MC ↔ Shopify product sync
  │       ├── order-flow.ts      # Order lifecycle management
  │       └── inventory.ts       # Stock level management
  ├── components/                # Polaris admin UI components
  │   ├── ProductSyncDashboard.tsx
  │   ├── OrdersView.tsx
  │   ├── SettingsForm.tsx
  │   └── InventoryStatus.tsx
  ├── types/
  │   └── index.ts               # Shared TypeScript types
  └── config/
      └── index.ts               # Plugin configuration
  ```

### 1.2 Mission:Control Client Wrapper
**File:** `src/shopify/lib/mission-control/client.ts`

- Initialize `ClientBuilder` with Azure AD credentials from env vars
- Environment switching (Sandbox/Production) based on `NODE_ENV`
- Singleton pattern with lazy initialization
- Error handling wrapper translating `ProblemDetails` to app errors
- Env vars: `MC_CLIENT_ID`, `MC_CLIENT_SECRET`, `MC_PARTNER_ID`, `MC_TENANT_ID`

### 1.3 Database Schema Extensions
**File:** `prisma/schema.prisma` (extend existing)

New models:
```prisma
model ShopifyStore {
  id            String   @id @default(cuid())
  shopDomain    String   @unique
  accessToken   String
  scopes        String
  installedAt   DateTime @default(now())
  isActive      Boolean  @default(true)
  config        ShopifyPluginConfig?
  productMaps   ShopifyProductMap[]
  orderMaps     ShopifyOrderMap[]
}

model ShopifyPluginConfig {
  id                String   @id @default(cuid())
  storeId           String   @unique
  store             ShopifyStore @relation(fields: [storeId], references: [id])
  mcPartnerId       String
  mcEnvironment     String   @default("sandbox")
  autoSync          Boolean  @default(false)
  syncIntervalMins  Int      @default(60)
  defaultMarkup     Float    @default(0)
  regionId          String?
  updatedAt         DateTime @updatedAt
}

model ShopifyProductMap {
  id                String   @id @default(cuid())
  storeId           String
  store             ShopifyStore @relation(fields: [storeId], references: [id])
  mcProductId       String
  shopifyProductId  String
  shopifyVariantId  String?
  lastSyncedAt      DateTime
  isActive          Boolean  @default(true)
  @@unique([storeId, mcProductId])
}

model ShopifyOrderMap {
  id                String   @id @default(cuid())
  storeId           String
  store             ShopifyStore @relation(fields: [storeId], references: [id])
  shopifyOrderId    String
  mcReservationId   String?
  mcOrderId         String?
  status            String   @default("pending")
  partnerReference  String   @unique
  errorMessage      String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model ShopifySyncLog {
  id          String   @id @default(cuid())
  storeId     String
  type        String       // "product_sync" | "stock_update" | "order_fulfill"
  status      String       // "success" | "error" | "partial"
  details     String?      // JSON string with details
  itemCount   Int          @default(0)
  createdAt   DateTime     @default(now())
}
```

---

## Phase 2: Core Integrations

### 2.1 Mission:Control Product Operations
**File:** `src/shopify/lib/mission-control/products.ts`

- `listProducts(publisherId?: string[])` — Paginated product listing
- `checkStock(productId: string, regionId: string)` — Stock availability
- `getProductDetails(productId: string)` — Single product fetch
- Caching layer (in-memory TTL cache, 5-min for product lists, 1-min for stock)

### 2.2 Mission:Control Reservation & Order Operations
**Files:** `src/shopify/lib/mission-control/reservations.ts`, `orders.ts`

- `createReservation(productId, regionId)` — Reserve stock
- `cancelReservation(reservationId)` — Release reservation
- `claimReservation(reservationId, orderData)` — Convert to order
- Build `orderData` from Shopify order: map customer IP, language, location, sales price with VAT
- Reservation timeout handling (auto-cancel stale reservations)

### 2.3 Shopify API Integration
**File:** `src/shopify/lib/shopify/client.ts`

- OAuth installation flow (install URL → callback → access token)
- Session management persisted to database
- Shopify API client with rate-limit awareness
- Scopes: `read_products, write_products, read_orders, write_orders, read_inventory, write_inventory, write_fulfillments`

### 2.4 Shopify Webhook Handling
**File:** `src/shopify/lib/shopify/webhooks.ts`

Register and handle:
| Webhook | Purpose |
|---------|---------|
| `ORDERS_CREATE` | Trigger MC reservation → order flow |
| `ORDERS_PAID` | Confirm payment, claim reservation |
| `ORDERS_CANCELLED` | Cancel MC reservation |
| `APP_UNINSTALLED` | Cleanup store data |
| `PRODUCTS_DELETE` | Remove product mapping |

---

## Phase 3: Business Logic Services

### 3.1 Product Sync Service
**File:** `src/shopify/lib/services/product-sync.ts`

**Flow:**
1. Fetch all products from Mission:Control (`client.product.get()`)
2. For each MC product, check if mapping exists in `ShopifyProductMap`
3. **New products:** Create Shopify product with title, description, type="Digital Product", inventory managed
4. **Existing products:** Update price, availability, metadata
5. **Removed products:** Mark as inactive, optionally unpublish from Shopify
6. Update stock levels via `hasStock` check → Shopify Inventory API
7. Log sync results to `ShopifySyncLog`

**Scheduling:** Configurable cron interval (default: hourly) via `node-cron`

### 3.2 Order Flow Service
**File:** `src/shopify/lib/services/order-flow.ts`

**Order Lifecycle:**
```
Shopify Order Created (webhook)
  → Validate order contains MC-mapped products
  → Create MC Reservation (reserve stock)
  → Store reservation ID in ShopifyOrderMap
  → Wait for payment confirmation

Shopify Order Paid (webhook)
  → Retrieve reservation from ShopifyOrderMap
  → Build order data (consumer info, pricing, VAT)
  → Claim Reservation → MC Order
  → Store MC order ID
  → Trigger Shopify Fulfillment (digital delivery)

Shopify Order Cancelled (webhook)
  → If reservation exists and not yet claimed → Cancel Reservation
  → Update ShopifyOrderMap status
```

**Error Handling:**
- Reservation failures: retry with backoff, then mark order for manual review
- Claim failures: hold reservation, alert merchant via admin notification
- Stale reservations: background job to cancel unclaimed reservations > 30 min

### 3.3 Inventory Management Service
**File:** `src/shopify/lib/services/inventory.ts`

- Periodic stock checks against MC API
- Update Shopify inventory levels per variant
- Handle out-of-stock: auto-unpublish or mark as "sold out"
- Region-aware stock (use configured `regionId`)

---

## Phase 4: API Routes

### 4.1 Shopify OAuth Routes
**Files:** `src/app/api/shopify/auth/route.ts`, `src/app/api/shopify/auth/callback/route.ts`

- `GET /api/shopify/auth` — Redirect to Shopify OAuth
- `GET /api/shopify/auth/callback` — Handle OAuth callback, store token, register webhooks

### 4.2 Webhook Endpoint
**File:** `src/app/api/shopify/webhooks/route.ts`

- `POST /api/shopify/webhooks` — Receive all Shopify webhooks
- HMAC signature verification
- Route to appropriate handler based on topic header

### 4.3 Admin API Routes
**Files:** `src/app/api/shopify/` directory

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/shopify/products` | GET | List synced products with status |
| `/api/shopify/products/sync` | POST | Trigger manual product sync |
| `/api/shopify/orders` | GET | List orders with MC status |
| `/api/shopify/orders/[id]/retry` | POST | Retry failed order |
| `/api/shopify/inventory` | GET | Current inventory status |
| `/api/shopify/inventory/refresh` | POST | Force stock refresh |
| `/api/shopify/config` | GET/PUT | Plugin configuration |
| `/api/shopify/sync-logs` | GET | View sync history |
| `/api/shopify/health` | GET | MC API connectivity check |

---

## Phase 5: Admin UI (Shopify Embedded App)

### 5.1 Dashboard Page
**File:** `src/shopify/components/ProductSyncDashboard.tsx`

- Overview cards: total synced products, active orders, last sync time, MC API health
- Product sync status table with filters (synced/pending/error)
- Manual sync trigger button
- Recent sync log timeline

### 5.2 Products View
**File:** `src/shopify/components/ProductsView.tsx`

- Table of MC products mapped to Shopify products
- Stock status indicators (in-stock/low/out)
- Toggle product active/inactive
- Bulk sync actions

### 5.3 Orders View
**File:** `src/shopify/components/OrdersView.tsx`

- Order list with MC fulfillment status
- Status badges: pending → reserved → fulfilled / failed
- Retry button for failed orders
- Order detail modal with MC reservation/order IDs

### 5.4 Settings Page
**File:** `src/shopify/components/SettingsForm.tsx`

- MC credentials configuration (client ID, secret, partner ID)
- Environment toggle (Sandbox/Production)
- Sync settings: auto-sync toggle, interval, default markup percentage
- Region selection for stock checks
- Connection test button (verify MC API access)
- Webhook status display

### 5.5 App Pages (Next.js Routes)
**Files:** `src/app/(dashboard)/shopify/` directory

| Route | Component |
|-------|-----------|
| `/shopify` | Dashboard overview |
| `/shopify/products` | Product sync management |
| `/shopify/orders` | Order tracking |
| `/shopify/settings` | Plugin configuration |

---

## Phase 6: Resilience & Production Readiness

### 6.1 Error Handling & Retries
- Wrap all MC SDK calls with try/catch translating `ProblemDetails`
- Exponential backoff for transient errors (429, 503, 504 — SDK handles, but add app-level retries for business operations)
- Dead letter queue pattern: failed orders stored with error details for manual retry

### 6.2 Background Jobs
**File:** `src/shopify/lib/services/scheduler.ts`

| Job | Interval | Purpose |
|-----|----------|---------|
| Product Sync | Configurable (default 60 min) | Sync MC catalog → Shopify |
| Stock Refresh | Every 15 min | Update inventory levels |
| Stale Reservation Cleanup | Every 10 min | Cancel unclaimed reservations |
| Health Check | Every 5 min | Verify MC API connectivity |

### 6.3 Logging & Monitoring
- Structured logging for all MC API calls and webhook events
- Sync history persisted in `ShopifySyncLog`
- Health endpoint for uptime monitoring
- Error alerting via the existing dashboard notification system

### 6.4 Security
- Shopify HMAC webhook verification on all incoming webhooks
- MC credentials encrypted at rest in database
- OAuth token secure storage
- Input validation with Zod on all API routes
- Rate limiting on admin API endpoints

---

## Phase 7: Testing

### 7.1 Unit Tests
- MC client wrapper: mock SDK responses, test error mapping
- Product sync service: test create/update/deactivate flows
- Order flow service: test full lifecycle with mocked APIs
- Webhook handler: test HMAC verification, routing

### 7.2 Integration Tests
- MC Sandbox environment end-to-end: list products → reserve → order
- Shopify test store: OAuth flow, product creation, webhook delivery
- Database operations: product mapping CRUD, order state transitions

### 7.3 Test Files
```
src/shopify/__tests__/
├── lib/
│   ├── mission-control/
│   │   ├── client.test.ts
│   │   ├── products.test.ts
│   │   └── orders.test.ts
│   ├── shopify/
│   │   ├── webhooks.test.ts
│   │   └── fulfillment.test.ts
│   └── services/
│       ├── product-sync.test.ts
│       ├── order-flow.test.ts
│       └── inventory.test.ts
└── api/
    ├── webhooks.test.ts
    └── products.test.ts
```

---

## Implementation Order (Suggested)

| Step | Phase | Estimated Files | Priority |
|------|-------|-----------------|----------|
| 1 | 1.1 — Dependencies & structure | 5 | P0 |
| 2 | 1.2 — MC client wrapper | 4 | P0 |
| 3 | 1.3 — Database schema | 1 | P0 |
| 4 | 2.1 — MC product operations | 1 | P0 |
| 5 | 2.2 — MC reservation/order ops | 2 | P0 |
| 6 | 2.3 — Shopify API client | 1 | P0 |
| 7 | 4.1 — OAuth routes | 2 | P0 |
| 8 | 3.1 — Product sync service | 1 | P1 |
| 9 | 2.4 — Webhook handling | 1 | P1 |
| 10 | 4.2 — Webhook endpoint | 1 | P1 |
| 11 | 3.2 — Order flow service | 1 | P1 |
| 12 | 3.3 — Inventory service | 1 | P1 |
| 13 | 4.3 — Admin API routes | 8 | P1 |
| 14 | 5.1–5.5 — Admin UI | 6+ | P2 |
| 15 | 6.1–6.4 — Production hardening | 3 | P2 |
| 16 | 7.1–7.3 — Tests | 10+ | P2 |

**Total estimated new files: ~45–50**

---

## Environment Variables (New)

```env
# Mission:Control
MC_CLIENT_ID=
MC_CLIENT_SECRET=
MC_PARTNER_ID=
MC_TENANT_ID=
MC_ENVIRONMENT=sandbox    # sandbox | production

# Shopify
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_SCOPES=read_products,write_products,read_orders,write_orders,read_inventory,write_inventory,write_fulfillments
SHOPIFY_APP_URL=
```
