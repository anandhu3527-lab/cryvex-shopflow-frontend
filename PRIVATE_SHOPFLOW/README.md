# CRYVEX SHOPFLOW — INTERNAL ARCHITECTURE DOCUMENTATION

Welcome to the internal engineering and architectural reference for **Cryvex ShopFlow**. This document defines the folder conventions, data flow layers, service architecture, and operational guidelines for current and future development.

---

## 1. Project Overview

**Cryvex ShopFlow** is a modern retail and point-of-sale management application tailored for local retail stores, merchants, and small-to-medium businesses. It delivers rapid counter billing, inventory and stock monitoring, customer khata/credit (Kadan) ledger tracking, daily pricing updates, and sales analytics.

### Current Codebase State
- **UI & Presentation**: Completed and fully operational.
- **Navigation & Routing**: Fully centralized under `src/routes/`.
- **API & Data Services**: Standardized tiered architecture under `src/services/`.
- **Form & Validation Logic**: Reserved for upcoming development sprint (**Pending**).

---

## 2. Complete Folder Structure

Below is the verified, exact file tree of the restructured application:

```text
cryvex-shopflow/
│
├── src/
│   ├── assets/
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.jsx                 # Top bar with search, notifications, & merchant profile
│   │   │   ├── Sidebar.jsx                # Collapsible sidebar with navigation links
│   │   │   ├── MerchantLayout.jsx         # Universal merchant dashboard shell
│   │   │   ├── navigationItems.jsx        # Sidebar navigation route configurations & icons
│   │   │   └── index.js                   # Layout barrel exports
│   │   └── index.js                       # Components root barrel export
│   │
│   ├── config/
│   │   └── appConfig.js                   # Application settings, metadata, & environment config
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── Login.jsx                  # Merchant login & authentication screen
│   │   │   └── Setup.jsx                  # Store profile & business onboarding setup
│   │   ├── billing/
│   │   │   ├── QuickBill.jsx              # Fast POS checkout, barcode scanning, and invoice generation
│   │   │   └── BillHistory.jsx            # Historical bill invoice logs, filters, and records
│   │   ├── customers/
│   │   │   └── Customers.jsx              # Customer directory, contact details, & purchase totals
│   │   ├── dashboard/
│   │   │   └── Dashboard.jsx              # Main merchant overview, KPIs, recent bills, & staff
│   │   ├── kadan/
│   │   │   ├── Kadan.jsx                  # Khata credit ledger & outstanding balances
│   │   │   └── KadanCustomerDetail.jsx    # Individual customer ledger transactions & payments
│   │   ├── landing/
│   │   │   └── LandingPage.jsx            # Public marketing landing page & product suite showcase
│   │   ├── products/
│   │   │   ├── Products.jsx               # Product inventory catalogue, stock status, & categories
│   │   │   ├── ProductDetail.jsx          # Comprehensive product analytics, sales, & stock history
│   │   │   └── DailyPriceUpdate.jsx       # Daily commodity pricing update matrix & reviews
│   │   └── reports/
│   │       └── Reports.jsx                # Sales reports, daily volume graphs, & timeframe filters
│   │
│   ├── routes/
│   │   ├── AppRoutes.jsx                  # Central route switch and page wrappers
│   │   └── index.js                       # Route exports
│   │
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.js                  # Centralized HTTP/fetch client with timeout & error handling
│   │   │   ├── endpoints.js               # API endpoint path registry
│   │   │   ├── authApi.js                 # Authentication & onboarding API communications
│   │   │   ├── billingApi.js              # Invoicing & billing API communications
│   │   │   ├── customerApi.js             # Customer management API communications
│   │   │   ├── kadanApi.js                # Kadan debt & ledger API communications
│   │   │   ├── productApi.js              # Catalogue & pricing API communications
│   │   │   └── reportsApi.js              # Sales metrics & analytics API communications
│   │   ├── data/
│   │   │   ├── authDataService.js         # Merchant session & credentials data supply
│   │   │   ├── billingDataService.js      # Invoice datasets, payment methods, & recent bills
│   │   │   ├── customerDataService.js     # Customer records & profiles data supply
│   │   │   ├── kadanDataService.js        # Credit transactions, ledgers, & balance calculations
│   │   │   ├── productDataService.js      # Catalogue state, categories, & stock management
│   │   │   └── reportsDataService.js      # Timeframe KPI records & daily sales volumes
│   │   ├── error/
│   │   │   └── errorHandler.js            # Standardized error classes & logging helpers
│   │   └── index.js                       # Services root barrel export
│   │
│   ├── utils/
│   │   ├── calculations/
│   │   │   └── billCalculations.js        # Subtotal, GST taxes, discounts, & line totals
│   │   ├── formatting/
│   │   │   ├── currency.js                # Currency formatter (formatINR: ₹X,XX,XXX)
│   │   │   └── date.js                    # Standard date & time string formatters
│   │   ├── helpers/
│   │   │   └── avatarHelper.js            # User initials extraction & avatar background styling
│   │   ├── dailyPriceData.js              # Seed categories, SVG icons, & initial daily commodities
│   │   └── index.js                       # Utilities root barrel export
│   │
│   ├── validations/                       # [PENDING / FUTURE DEVELOPMENT - UNTOUCHED]
│   ├── hooks/                             # [Custom hooks directory for future shared hooks]
│   ├── App.jsx                            # Main application root mounting Router & AppRoutes
│   ├── main.jsx                           # Application DOM entry point
│   └── index.css                          # Global typography and Tailwind CSS utilities
│
├── public/                                # Public static assets served at root
├── PRIVATE_SHOPFLOW/
│   └── README.md                          # This architecture reference document
├── package.json                           # Dependencies & scripts
└── vite.config.js                         # Vite build configuration
```

---

## 3. Folder-by-Folder Detailed Breakdown

### `src/pages/`
- **Contains**: Route-level screen components organized by domain feature (`dashboard`, `billing`, `products`, `customers`, `kadan`, `reports`, `auth`, `landing`).
- **Purpose**: Assemble UI views, handle user screen interactions, and coordinate feature states.
- **Belongs Here**: Top-level page views rendered by routes.
- **Does NOT Belong Here**: Raw API fetch calls, HTTP headers, calculation math, or generic shared layouts.

### `src/components/layout/`
- **Contains**: Structural shell components (`Header.jsx`, `Sidebar.jsx`, `MerchantLayout.jsx`, `navigationItems.jsx`).
- **Purpose**: Provide consistent navigation, layout headers, responsive mobile drawer, and merchant wrapper across all authenticated screens.
- **Belongs Here**: Layout wrappers, global header, sidebar navigation.
- **Does NOT Belong Here**: Feature-specific business forms or isolated page views.

### `src/services/api/`
- **Contains**: Base HTTP client (`client.js`), URL endpoint registry (`endpoints.js`), and feature API modules (`billingApi.js`, `productApi.js`, etc.).
- **Purpose**: Direct communication with backend REST/GraphQL endpoints. Handles HTTP verbs, authentication headers, request timeouts, and network error classification.
- **Belongs Here**: Direct API fetch requests, endpoint constants, HTTP payload serialization.
- **Does NOT Belong Here**: UI rendering logic, JSX, direct React state updates.

### `src/services/data/`
- **Contains**: Domain-specific data services (`billingDataService.js`, `productDataService.js`, etc.).
- **Purpose**: Supplies clean, structured data to the application. Bridges backend API responses with local fallbacks, initial seed data, and data transformations.
- **Belongs Here**: Data caching, response normalization, mock-to-API fallback logic, data queries.
- **Does NOT Belong Here**: JSX, UI DOM manipulation, CSS styles.

### `src/services/error/`
- **Contains**: `errorHandler.js` (`AppError` class, error types, central logging).
- **Purpose**: Standardizes error handling and reporting across network, data, and presentation layers.
- **Belongs Here**: Error classes, error parsers, error boundary utilities.
- **Does NOT Belong Here**: Page styling or component markup.

### `src/utils/`
- **Contains**: Pure, stateless helper functions categorized into `formatting/`, `calculations/`, and `helpers/`, plus `dailyPriceData.js`.
- **Purpose**: Reusable math, date manipulation, string parsing, and currency formatting across the entire app.
- **Belongs Here**: Pure functions without side effects (`formatINR`, `calculateBillSummary`, `getInitials`).
- **Does NOT Belong Here**: Component state, API calls, or layout markup.

### `src/routes/`
- **Contains**: `AppRoutes.jsx` and route definitions.
- **Purpose**: Declarative routing system mapping URLs to page components and wrapping pages with `MerchantLayout`.
- **Belongs Here**: Route tables, navigation guards, route wrappers, redirections.
- **Does NOT Belong Here**: Business logic, API calls, data mutations.

### `src/config/`
- **Contains**: `appConfig.js`.
- **Purpose**: Centralized application constants, environment variable mappings, safe base URLs, and metadata.
- **Belongs Here**: Environment configurations, default pagination sizes, app title.
- **Does NOT Belong Here**: Hardcoded secrets, passwords, private tokens, or customer data.

### `src/validations/`
- **Contains**: Reserved for form validation schemas, input validation functions, and field-level rules.
- **Status**: **PENDING / FUTURE DEVELOPMENT**. Kept intact without modification.

---

## 4. API Architecture

The application adopts a clean, decoupled 5-tier architecture:

```text
       ┌────────────────────────┐
       │   External API / DB    │
       └───────────┬────────────┘
                   │  HTTP (JSON)
                   ▼
       ┌────────────────────────┐
       │      API Services      │  (src/services/api/)
       │ client.js, *Api.js     │
       └───────────┬────────────┘
                   │  Normalized Data
                   ▼
       ┌────────────────────────┐
       │     Data Services      │  (src/services/data/)
       │ *DataService.js        │
       └───────────┬────────────┘
                   │  Business Entities & State
                   ▼
       ┌────────────────────────┐
       │   Application Routes   │  (src/routes/)
       │   & Page Wrappers      │
       └───────────┬────────────┘
                   │  Props & Context
                   ▼
       ┌────────────────────────┐
       │    UI Components       │  (src/pages/ & src/components/)
       │ Pages & Layout         │
       └────────────────────────┘
```

### Developer Workflow for API Tasks

| Task | Where to Go | Files to Modify |
| :--- | :--- | :--- |
| **Add a new API Endpoint** | `src/services/api/` | Add path in `endpoints.js`, add method in appropriate `*Api.js` |
| **Change an API Request / Payload** | `src/services/api/` | Update parameters/body in the corresponding `*Api.js` |
| **Test / Mock an API Endpoint** | `src/services/api/` & `src/services/data/` | Test via `client.js` or inspect fallback data in `*DataService.js` |
| **Change API Response Handling** | `src/services/data/` | Update transformation logic in `*DataService.js` |
| **Handle API Errors** | `src/services/error/` | Update `errorHandler.js` or catch with `AppError` |
| **Add an External Integration** | `src/services/integrations/` | Create integration module (e.g. WhatsApp, Payment Gateway, SMS) |

---

## 5. Data Flow

Data flows strictly in a unidirectional manner through the application layers:

```text
Backend / Server Response
          ↓
  api/client.js (HTTP Request & Headers)
          ↓
  api/*Api.js (Resource-specific Endpoint Call)
          ↓
  data/*DataService.js (Validation, Transformation, Fallback)
          ↓
  React Page / Container (Component State via useState/useEffect)
          ↓
  UI Presentation Component (Rendered HTML / Tailwind CSS)
```

---

## 6. Error Handling Guide

When troubleshooting or handling unexpected behavior, reference this triage guide:

| Problem | Layer | Where to Check | Action |
| :--- | :--- | :--- | :--- |
| **API Failure / 4xx / 5xx / Network Timeout** | Network | `src/services/api/` | Check `client.js`, `endpoints.js`, and the specific `*Api.js` |
| **Data Processing / Undefined Properties** | Data | `src/services/data/` | Check the corresponding `*DataService.js` |
| **External Integration Issues** | External | `src/services/integrations/` | Check integration client (WhatsApp, SMS, Payment) |
| **UI Crash / Layout Glitch / Visual Bug** | Presentation | `src/pages/` or `src/components/` | Check the respective page or layout component |
| **404 / Broken URL / Navigation Failure** | Routing | `src/routes/` | Check `AppRoutes.jsx` route paths and wrappers |
| **Calculation / Formatting Discrepancy** | Utilities | `src/utils/` | Check `calculations/billCalculations.js` or `formatting/` |
| **Form Validation Error** | Validation | `src/validations/` | Reserved for future validation development phase |

---

## 7. Form Development Status

```text
=====================================================
FORM DEVELOPMENT:            PENDING
FORM VALIDATION DEVELOPMENT: PENDING
=====================================================
```

> [!NOTE]
> All form validation logic, input schema definitions, and validation rules will be developed in the dedicated next phase.
> The `src/validations/` folder is intentionally reserved for this purpose.

---

## 8. Core Engineering Rules

1. **Never Call APIs Directly in Pages**: Always route external requests through `src/services/api/` and `src/services/data/`.
2. **Never Hardcode Secrets or Credentials**: Use environment variables via `import.meta.env.VITE_*` and configure defaults in `src/config/appConfig.js`.
3. **Keep Utilities Pure**: Functions in `src/utils/` must be pure and stateless.
4. **Maintain the Layout System**: Keep pages wrapped with `MerchantLayout` via `src/routes/AppRoutes.jsx` to preserve consistent header search, title, and sidebar state.
5. **No Visual or Layout Redesigns**: Existing UX design tokens, Tailwind utility styling, and color schemes must remain consistent.
6. **Keep Routes Centralized**: All route registrations belong in `src/routes/AppRoutes.jsx`.

---

## 9. Quick Reference for Future Changes

```text
Need to change UI layout or visual elements?
→ src/pages/ or src/components/layout/

Need to add or modify an API endpoint?
→ src/services/api/

Need to process or transform server data?
→ src/services/data/

Need an external integration (WhatsApp, SMS, Payments)?
→ src/services/integrations/

Need a math calculation or string/date formatter?
→ src/utils/

Need to register or update a route?
→ src/routes/AppRoutes.jsx

Need form validation rules (Upcoming Sprint)?
→ src/validations/

Need global configuration or environment settings?
→ src/config/appConfig.js
```

---

## 10. Current Development Status

| Module / Area | Status | Notes |
| :--- | :--- | :--- |
| **UI Pages (13 Screens)** | **Completed** | Dashboard, Products, Product Detail, Daily Price, Quick Bill, Bill History, Customers, Kadan, Kadan Detail, Reports, Setup, Login, Landing |
| **Layout & Navigation** | **Completed** | Header, Sidebar, MerchantLayout centralized in `src/components/layout/` |
| **Routing System** | **Completed** | Centralized in `src/routes/AppRoutes.jsx` with wrappers & fallback |
| **API Architecture** | **Structured** | Client, endpoints, and domain APIs in `src/services/api/` |
| **Data Architecture** | **Structured** | Domain data services in `src/services/data/` |
| **Utilities & Helpers** | **Structured** | Currency, date, calculations, and avatar helpers in `src/utils/` |
| **Internal Documentation** | **Completed** | Full architecture documented in `PRIVATE_SHOPFLOW/README.md` |
| **Form Development** | **Pending** | Scheduled for next sprint |
| **Form Validation** | **Pending** | Scheduled for next sprint |
