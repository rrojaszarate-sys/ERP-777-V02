# ERP-777 V1 - Architecture Summary & Quick Reference

## Quick Overview

```
┌─────────────────────────────────────────────────────────┐
│                   ERP-777 V1 System                      │
│                                                         │
│  Type: Event Management ERP                            │
│  Status: MVP/Early Beta (60% production-ready)         │
│  Team: React + Supabase Stack                          │
│  Lines of Code: 1,732 TS/TSX                          │
└─────────────────────────────────────────────────────────┘
```

## Architecture Overview

### Layered Architecture
```
┌──────────────────────────────────────────┐
│    PRESENTATION LAYER                    │
│  Pages + Components + Hooks               │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│    BUSINESS LOGIC LAYER                  │
│  Custom Hooks + Services + Validations   │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│    DATA ACCESS LAYER                     │
│  Supabase + PostgreSQL + Realtime        │
└──────────────────────────────────────────┘
```

### Module Organization (16+ Modules)
```
modules/
├── eventos           → Event management & planning
├── contabilidad      → Accounting & vouchers
├── crm               → Customer relationship
├── inventario        → Stock management
├── rrhh              → HR & payroll
├── facturacion       → Invoice generation (CFDI)
├── tesoreria         → Treasury & banking
├── proyectos         → Project management
├── reportes          → BI & Analytics
├── integraciones     → API integrations
├── ia                → AI automation
├── admin             → Administration tools
├── compras           → Procurement
├── pos               → Point of sale
└── [14 more...]
```

## Technology Stack Summary

| Layer | Tech | Version | Rating |
|-------|------|---------|--------|
| **Frontend** | React | 18.3 | A |
| **Language** | TypeScript | 5.5 | A |
| **Build** | Vite | 5.4 | A |
| **Styling** | TailwindCSS | 3.4 | B+ |
| **UI Components** | NextUI | 2.6 | B+ |
| **Routing** | React Router | 7.9 | B+ |
| **State (Server)** | React Query | 5.9 | A |
| **State (Client)** | useState | - | C |
| **Database** | PostgreSQL/Supabase | - | B |
| **Testing** | None Setup | - | D |

## Key Statistics

```
Module Count:           16+ (with duplicates)
Component Files:        40+
Hook Files:             30+
Service Files:          20+
Type Definitions:       100+
Total TS/TSX Lines:     1,732
Lazy-loaded Pages:      Yes (45+ routes)
TypeScript Strict:      Enabled
Production Ready:       60% (with fixes: 80-90%)
```

## State Management Patterns

### 1. Authentication (React Context)
```
AuthProvider
├── Development Mode: Mock users, role switching
├── Production Mode: Supabase Auth
└── Role Matrix: Admin, Ejecutivo, Visualizador
```

### 2. Server State (React Query)
```
QueryClient
├── Query Keys: ['events', 'dashboard', 'users']
├── Stale Time: 5 min (configurable)
├── Cache Time: 30 min
├── Retry: false (custom per query)
└── Invalidation: Manual via mutations
```

### 3. UI State (useState)
```
Component State
├── Modals & Dialogs
├── Expansion/Collapse
├── Form Inputs
├── Filters
└── ⚠️ Problem: Too many states, not persistent
```

## Critical Issues at a Glance

| Issue | Severity | Fix Time | Status |
|-------|----------|----------|--------|
| Service role key in dev | 🔴 Critical | 2 days | Not Started |
| Module duplication | 🟠 High | 1 week | Not Started |
| No route protection | 🟠 High | 3-4 days | Not Started |
| No error boundaries | 🟠 High | 2-3 days | Not Started |
| Missing tests | 🟡 Medium | 2-3 weeks | Not Started |
| No i18n | 🟡 Medium | 3 weeks | Not Started |
| Monolithic Layout | 🟡 Medium | 1 week | Not Started |

## Quick Fix Checklist (Priority 1)

- [ ] **Day 1: Security**
  - [ ] Remove service role key from dev environment
  - [ ] Add .env.local to .gitignore
  - [ ] Document proper dev setup

- [ ] **Day 2-3: Route Protection**
  - [ ] Create ProtectedRoute component
  - [ ] Wrap admin routes
  - [ ] Add permission checks

- [ ] **Day 4-5: Error Handling**
  - [ ] Add Error Boundary
  - [ ] Implement user-facing error toast
  - [ ] Add error logging

- [ ] **Week 2: Module Deduplication**
  - [ ] Merge eventos-erp → eventos
  - [ ] Consolidate contabilidad
  - [ ] Update App.tsx routes
  - [ ] Delete old modules

## Performance Metrics

```
Build Size (Current):        ~500KB gzipped
Code Splitting:              ✅ Optimized
Lazy Loading:                ✅ All pages
Bundle Chunks:               8 vendor + feature chunks
Load Time (Dev):             <1s (Vite HMR)
Load Time (Prod):            2-3s (estimated)
Lighthouse Score:            Not measured
```

## API Integrations

```
Google Vision API
├── Purpose: OCR for receipts
├── Cost: Pay-per-use
└── Status: Implemented

Google Gemini AI
├── Purpose: Smart categorization
├── Cost: Pay-per-use
└── Status: Implemented

Tesseract.js
├── Purpose: Client-side OCR fallback
├── Cost: Free
└── Status: Implemented

⚠️ Over-engineered for current use case
```

## Database Schema (Key Tables)

```
evt_eventos              Event records
├── id, nombre_proyecto
├── fecha_evento, estado_id
├── cliente_id
└── ingreso, gastos

evt_ingresos            Income entries
├── evento_id
├── concepto
├── total, facturado
└── es_pagado

evt_gastos              Expense entries
├── evento_id
├── concepto
├── monto, pagado
└── fecha_pago

core_audit_log          Audit trail
├── evento_id, usuario_id
├── action, timestamp
└── datos_anteriores, datos_nuevos
```

## Component Hierarchy

```
App.tsx (root)
│
├─ QueryClientProvider
├─ AuthProvider
├─ Router
│  │
│  └─ Layout (Shared)
│     ├─ Sidebar (Hard-coded 16 modules)
│     ├─ Header
│     │  ├─ Breadcrumbs
│     │  ├─ GlobalSearch (stub)
│     │  ├─ Notifications (stub)
│     │  ├─ ThemePicker
│     │  └─ UserMenu
│     │
│     └─ Outlet
│        └─ [Page Components]
│           ├─ EventosListPage
│           ├─ ContabilidadDashboard
│           └─ [45+ more pages...]
│
└─ Toaster (Toast notifications)
```

## Module Pattern (Standard)

```
modules/[name]/
├── pages/
│  ├─ [Name]Dashboard.tsx
│  └─ [Name]ListPage.tsx
│
├── components/
│  ├─ [Name]Form.tsx
│  ├─ [Name]Modal.tsx
│  └─ [Name]Card.tsx
│
├── hooks/
│  ├─ use[Name]s.ts          (React Query hooks)
│  └─ use[Name]Validation.ts
│
├── services/
│  ├─ [name]Service.ts       (API calls, singleton)
│  └─ [name]Adapter.ts       (Data transformation)
│
├── types/
│  └─ [Name].ts              (TypeScript interfaces)
│
└─ utils/
   └─ [name]Helpers.ts       (Module helpers)
```

## Code Quality Scorecard

```
Architecture        A-    (Modular, but duplicated)
Type Safety         A     (TypeScript strict)
Testing            D      (No tests found)
Error Handling     C      (Silent failures)
Documentation      C-     (README exists, missing technical)
Security           C-     (Dev mode risks)
Performance        B      (Code-split, but no optimization)
Maintainability    B-     (Large components, magic numbers)
Code Style         B      (Mostly consistent)
Overall            B-     (Good foundation, needs polish)
```

## File Structure Optimization Needed

```
Current Issues:
├── ⚠️ No index.ts barrel exports (verbose imports)
├── ⚠️ Backup directories (_RESPALDO_*)
├── ⚠️ Hard-coded strings scattered
├── ⚠️ Magic numbers in calculations
├── ⚠️ Inconsistent naming (camelCase vs PascalCase)
└── ⚠️ No constants file for business rules

Recommendations:
├── ✅ Create config/routes.ts (single source of truth)
├── ✅ Create constants/ folder for magic values
├── ✅ Add barrel exports (index.ts) in core/
├── ✅ Remove backup directories
├── ✅ Extract Layout subcomponents
└── ✅ Split large page files (>300 lines)
```

## Next Immediate Actions

### Week 1 (Critical Fixes)
1. **Security**: Remove service role key usage
2. **Protection**: Add ProtectedRoute component
3. **Errors**: Add Error Boundary
4. **Dedup**: Start merging eventos-erp → eventos

### Week 2 (Code Quality)
1. **Config**: Create route configuration
2. **Refactor**: Split Layout component
3. **Tests**: Set up Jest + React Testing Library
4. **Docs**: Create CONTRIBUTING.md

### Week 3+ (Enhancement)
1. **Forms**: Add Zod validation
2. **State**: Implement URL filters with useSearchParams
3. **Testing**: Write unit & component tests
4. **Storybook**: Create component documentation

## Resources & Documentation

**Key Files to Review:**
- `/ARCHITECTURE_ANALYSIS.md` - Full detailed analysis (1,173 lines)
- `src/App.tsx` - Main routing (199 lines)
- `src/core/auth/AuthProvider.tsx` - Authentication
- `src/shared/components/layout/Layout.tsx` - Layout component
- `vite.config.ts` - Build configuration
- `tsconfig.app.json` - TypeScript configuration

**External References:**
- React Query: https://tanstack.com/query/latest
- React Router v7: https://reactrouter.com/
- Supabase: https://supabase.com/docs
- TypeScript: https://www.typescriptlang.org/docs/
- TailwindCSS: https://tailwindcss.com/docs

## Contact & Support

For questions about this architecture analysis:
1. Review `/ARCHITECTURE_ANALYSIS.md` for detailed sections
2. Check specific module `README.md` files
3. Review code comments in `src/core/config/supabase.ts`

---

**Document Generated:** 2024-11-21
**Status:** Active (Review & Update Every Quarter)
