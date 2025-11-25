# ERP-777 V1 - Actionable Improvement Guide

## Overview

This guide provides step-by-step instructions to fix the top architectural issues. Start with **Priority 1** items this week.

---

## Priority 1: Critical Fixes (This Week)

### 1. Fix Security: Remove Service Role Key from Development

**Problem**: Service role key in dev allows full database access

**Status**: 🔴 Critical | ⏱️ 2 days

**Steps**:

1. **Update `src/core/config/supabase.ts`**:
   ```typescript
   // ❌ BEFORE
   const isDevelopment = securityMode === 'development';
   const supabaseKey = isDevelopment && supabaseServiceRoleKey 
     ? supabaseServiceRoleKey  // DANGEROUS
     : (supabaseAnonKey || 'dummy-key');

   // ✅ AFTER
   const isDevelopment = securityMode === 'development';
   // NEVER use service role key in frontend, even in dev!
   const supabaseKey = supabaseAnonKey || 'dummy-key';
   ```

2. **Add to `.gitignore`**:
   ```
   # Environment
   .env
   .env.local
   .env.*.local
   ```

3. **Create `.env.example`**:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-public-key
   VITE_SECURITY_MODE=development
   # NEVER commit: VITE_SUPABASE_SERVICE_ROLE_KEY
   ```

4. **Update README.md** with dev setup:
   ```markdown
   ## Local Development Setup

   1. Copy `.env.example` to `.env.local`
   2. Add your Supabase anon key (never the service role key)
   3. Run `npm run dev`
   ```

**Verification**: 
- [ ] Service role key not in any `src/` files
- [ ] `.env.local` is in `.gitignore`
- [ ] Dev mode still works with anon key
- [ ] No console warnings about missing keys

---

### 2. Add Route Protection (ProtectedRoute Component)

**Problem**: Admin pages accessible without authentication/authorization

**Status**: 🟠 High | ⏱️ 3-4 days

**Steps**:

1. **Create `src/components/ProtectedRoute.tsx`**:
   ```typescript
   import React from 'react';
   import { Navigate } from 'react-router-dom';
   import { useAuth } from '../core/auth/AuthProvider';
   import { usePermissions } from '../core/permissions/usePermissions';

   interface ProtectedRouteProps {
     children: React.ReactNode;
     requiredRoles?: string[];
     requiredPermission?: {
       module: string;
       action: string;
     };
   }

   export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
     children,
     requiredRoles,
     requiredPermission
   }) => {
     const { user, isAuthenticated } = useAuth();
     const { hasPermission } = usePermissions();

     // Check authentication
     if (!isAuthenticated || !user) {
       return <Navigate to="/login" replace />;
     }

     // Check role
     if (requiredRoles && !requiredRoles.includes(user.role)) {
       return <Navigate to="/" replace />;
     }

     // Check permission
     if (requiredPermission) {
       const hasPerms = hasPermission(
         requiredPermission.module,
         requiredPermission.action
       );
       if (!hasPerms) {
         return <Navigate to="/" replace />;
       }
     }

     return <>{children}</>;
   };
   ```

2. **Update `src/App.tsx`**:
   ```typescript
   import { ProtectedRoute } from './components/ProtectedRoute';

   // Replace admin routes:
   <Route path="admin/data-seeder" element={
     <ProtectedRoute requiredRoles={['Administrador']}>
       <DataSeederPage />
     </ProtectedRoute>
   } />

   <Route path="admin/catalogos" element={
     <ProtectedRoute requiredRoles={['Administrador']}>
       <CatalogosAdminPage />
     </ProtectedRoute>
   } />
   ```

3. **Create permission-based routes** as needed:
   ```typescript
   // Example: restricted financial access
   <Route path="reportes" element={
     <ProtectedRoute requiredPermission={{
       module: 'reportes',
       action: 'read'
     }}>
       <ReportesBIDashboard />
     </ProtectedRoute>
   } />
   ```

**Testing**:
- [ ] Navigate to `/admin/data-seeder` without auth → redirect to login
- [ ] Login as "Ejecutivo" → access denied → redirect to home
- [ ] Login as "Administrador" → access granted
- [ ] Breadcrumb visible in Layout (not in redirect)

---

### 3. Add Error Boundary Component

**Problem**: Single component error crashes entire app

**Status**: 🟠 High | ⏱️ 2-3 days

**Steps**:

1. **Create `src/components/ErrorBoundary.tsx`**:
   ```typescript
   import React, { ReactNode } from 'react';
   import { AlertCircle, RotateCcw } from 'lucide-react';

   interface Props {
     children: ReactNode;
   }

   interface State {
     hasError: boolean;
     error: Error | null;
   }

   export class ErrorBoundary extends React.Component<Props, State> {
     constructor(props: Props) {
       super(props);
       this.state = { hasError: false, error: null };
     }

     static getDerivedStateFromError(error: Error): State {
       return { hasError: true, error };
     }

     componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
       // Log to error tracking service (Sentry, DataDog, etc.)
       console.error('Error caught by boundary:', error, errorInfo);
     }

     reset = () => {
       this.setState({ hasError: false, error: null });
     };

     render() {
       if (this.state.hasError) {
         return (
           <div className="flex items-center justify-center min-h-screen bg-gray-50">
             <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
               <div className="flex items-center space-x-4 mb-4">
                 <AlertCircle className="w-8 h-8 text-red-600" />
                 <h1 className="text-2xl font-bold text-red-600">Error</h1>
               </div>

               <p className="text-gray-700 mb-4">
                 {this.state.error?.message || 'Something went wrong'}
               </p>

               <details className="mb-4 text-sm text-gray-600">
                 <summary className="cursor-pointer font-mono">Stack Trace</summary>
                 <pre className="mt-2 bg-gray-100 p-2 rounded overflow-auto">
                   {this.state.error?.stack}
                 </pre>
               </details>

               <button
                 onClick={this.reset}
                 className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full justify-center"
               >
                 <RotateCcw className="w-4 h-4" />
                 <span>Try Again</span>
               </button>
             </div>
           </div>
         );
       }

       return this.props.children;
     }
   }
   ```

2. **Update `src/App.tsx`**:
   ```typescript
   import { ErrorBoundary } from './components/ErrorBoundary';

   function App() {
     return (
       <ErrorBoundary>
         <QueryClientProvider client={queryClient}>
           <AuthProvider>
             <Router>
               {/* Routes... */}
             </Router>
           </AuthProvider>
         </QueryClientProvider>
       </ErrorBoundary>
     );
   }
   ```

3. **Test error handling in components**:
   ```typescript
   // Test component
   const TestError = () => {
     const [showError, setShowError] = React.useState(false);
     if (showError) throw new Error('Test error');
     
     return (
       <button onClick={() => setShowError(true)}>
         Trigger Error
       </button>
     );
   };
   ```

**Testing**:
- [ ] No error page visible on normal use
- [ ] Trigger error → Error boundary catches it
- [ ] Error message displayed
- [ ] "Try Again" button resets state
- [ ] Stack trace visible in dev mode only

---

### 4. Start Module Deduplication

**Problem**: eventos/eventos-erp duplicates cause confusion and maintenance burden

**Status**: 🟠 High | ⏱️ 1 week

**Steps**:

1. **Analyze duplication** (quick audit):
   ```bash
   # Compare file counts
   find src/modules/eventos -type f | wc -l
   find src/modules/eventos-erp -type f | wc -l
   
   # Check for identical hooks
   diff -r src/modules/eventos/hooks src/modules/eventos-erp/hooks
   ```

2. **Decision**: Keep `eventos-erp` (newer, has financial analysis)

3. **Merge plan**:
   - [ ] Move `eventos-erp` features → `eventos`
   - [ ] Consolidate hooks and services
   - [ ] Update routes in `App.tsx`
   - [ ] Delete `eventos-erp` directory
   - [ ] Test all features still work

4. **Update `src/App.tsx`**:
   ```typescript
   // ❌ REMOVE
   const EventosERPDashboard = lazy(() => import('./modules/eventos-erp/...'));
   <Route path="eventos-erp" element={<EventosERPDashboard />} />

   // ✅ KEEP
   const EventsDashboard = lazy(() => import('./modules/eventos/pages/EventsDashboard'));
   <Route path="eventos" element={<EventosListPage />} />
   ```

5. **Update Layout.tsx** sidebar:
   ```typescript
   // ❌ REMOVE
   {
     id: 'eventos-erp',
     name: 'Eventos-ERP',
     icon: CalendarCheck,
     active: true,
     submenu: [...]
   }

   // Keep only:
   {
     id: 'eventos',
     name: 'Eventos',
     icon: Calendar,
     active: true,
     submenu: [
       { name: 'Lista de Eventos', path: '/eventos', icon: List },
       { name: 'Análisis Financiero', path: '/eventos/analisis-financiero', icon: BarChart3 },
       // ... all features from both modules
     ]
   }
   ```

**Repeat for**: contabilidad/contabilidad-erp, inventario/inventario-erp, etc.

**Testing**:
- [ ] All eventos features accessible
- [ ] No broken links or 404s
- [ ] Sidebar shows correct module list
- [ ] Build succeeds
- [ ] No console errors

---

## Priority 2: Code Quality (Next Sprint)

### 1. Create Route Configuration (Single Source of Truth)

**File**: `src/config/routes.ts`

```typescript
import React from 'react';
import {
  Home, Calendar, Package, ShoppingCart, Calculator, Users,
  // ... all icons
} from 'lucide-react';

export interface RouteItem {
  id: string;
  name: string;
  path?: string;
  icon: React.ComponentType<{ className?: string }>;
  component?: React.LazyExoticComponent<() => JSX.Element>;
  roles?: string[];
  active: boolean;
  submenu?: RouteItem[];
  status?: 'active' | 'coming-soon';
}

export const ROUTE_CONFIG: RouteItem[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    path: '/',
    icon: Home,
    component: lazy(() => import('../modules/eventos/pages/EventsDashboard')),
    active: true,
  },
  {
    id: 'eventos',
    name: 'Eventos',
    icon: Calendar,
    active: true,
    roles: ['Administrador', 'Ejecutivo'],
    submenu: [
      {
        id: 'eventos-list',
        name: 'Lista de Eventos',
        path: '/eventos',
        icon: List,
        component: lazy(() => import('../modules/eventos/EventosListPageNew')),
      },
      // ... more submenu items
    ]
  },
  // ... more modules
];
```

**Update Layout.tsx**:
```typescript
import { ROUTE_CONFIG } from '../config/routes';

export const Layout = () => {
  const modules = ROUTE_CONFIG.filter(r => r.active);
  // Use ROUTE_CONFIG instead of hard-coded modules array
};
```

**Update App.tsx**:
```typescript
function App() {
  const renderRoutes = (items: RouteItem[]): React.ReactNode => {
    return items
      .filter(item => item.component)
      .map(item => (
        <Route
          key={item.id}
          path={item.path}
          element={
            item.roles ? (
              <ProtectedRoute requiredRoles={item.roles}>
                <Suspense fallback={<LoadingSpinner />}>
                  {item.component && <item.component />}
                </Suspense>
              </ProtectedRoute>
            ) : (
              <Suspense fallback={<LoadingSpinner />}>
                {item.component && <item.component />}
              </Suspense>
            )
          }
        />
      ));
  };

  return (
    // ... wrapper providers
    <Routes>
      <Route path="/" element={<Layout />}>
        {renderRoutes(ROUTE_CONFIG)}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    // ... wrapper providers
  );
}
```

**Benefits**:
- Single source of truth for routing and navigation
- Easier to add/remove modules
- Cleaner App.tsx
- Support for role-based route visibility

---

### 2. Implement URL-Based Filters

**Problem**: Filters reset on page reload, not shareable

**File**: `src/modules/eventos/hooks/useEventFilters.ts`

```typescript
import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

export interface EventFilters {
  año?: number;
  mes?: number;
  cliente_id?: string;
  search?: string;
}

export const useEventFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<EventFilters>(() => ({
    año: searchParams.get('año')
      ? parseInt(searchParams.get('año')!)
      : new Date().getFullYear(),
    mes: searchParams.get('mes')
      ? parseInt(searchParams.get('mes')!)
      : undefined,
    cliente_id: searchParams.get('cliente_id') || undefined,
    search: searchParams.get('search') || undefined,
  }), [searchParams]);

  const setFilters = useCallback((newFilters: EventFilters) => {
    const params = new URLSearchParams();
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    });
    
    setSearchParams(params);
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  return { filters, setFilters, clearFilters };
};
```

**Usage in component**:
```typescript
export const EventosListPage: React.FC = () => {
  const { filters, setFilters, clearFilters } = useEventFilters();
  const { data: eventos } = useEventosFinancialList(filters);

  return (
    <>
      <FilterControls
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
      />
      <EventsList eventos={eventos} />
    </>
  );
};
```

**Benefits**:
- Filters persist in URL
- Shareable links: `/eventos?año=2024&mes=11&cliente_id=5`
- Browser back/forward works
- Can bookmark filtered views

---

### 3. Add Form Validation Framework

**Install**:
```bash
npm install zod react-hook-form
```

**Create schema** `src/modules/eventos/schemas/eventSchema.ts`:
```typescript
import { z } from 'zod';

export const createEventSchema = z.object({
  nombre_proyecto: z
    .string()
    .min(3, 'Nombre debe tener al menos 3 caracteres')
    .max(100, 'Nombre no debe exceder 100 caracteres'),
  fecha_evento: z.date({
    required_error: 'Fecha del evento es requerida'
  }),
  cliente_id: z.number().positive('Cliente es requerido'),
  ingreso_estimado: z
    .number()
    .positive('Ingreso estimado debe ser positivo'),
  responsable_id: z.string().uuid('Responsable inválido'),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
```

**Use in component**:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEventSchema, CreateEventInput } from './schemas/eventSchema';

export const EventForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register('nombre_proyecto')}
        placeholder="Nombre del proyecto"
      />
      {errors.nombre_proyecto && (
        <span className="text-red-500">
          {errors.nombre_proyecto.message}
        </span>
      )}
      {/* More fields... */}
    </form>
  );
};
```

---

## Priority 3: Testing & Documentation

### Set Up Testing

**Install**:
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

**Create `vitest.config.ts`**:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Create test example** `src/modules/eventos/hooks/__tests__/useEvents.test.ts`:
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';
import { useEvents } from '../useEvents';

describe('useEvents', () => {
  it('should fetch events', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useEvents(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toBeDefined();
  });
});
```

---

## Quick Command Reference

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run type checking
npm run typecheck

# Lint code
npm run lint

# Run tests (after setup)
npm run test

# Build & preview production
npm run build && npm run preview
```

---

## Success Metrics

After implementing Priority 1 fixes, you should see:

- ✅ No service role key in development environment
- ✅ Admin pages require authentication
- ✅ Error boundary catches component errors
- ✅ No duplicate module routes
- ✅ Cleaner codebase

After Priority 2:
- ✅ Single source of truth for routing
- ✅ Filters persist in URL
- ✅ Form validation with Zod
- ✅ Fewer console errors

After Priority 3:
- ✅ Unit tests for key functions
- ✅ Component tests for critical UI
- ✅ Component documentation (Storybook)
- ✅ Better developer experience

---

## Resources

- [React Query Docs](https://tanstack.com/query/latest)
- [React Router Migration Guide](https://reactrouter.com/en/6.27.0)
- [Zod Validation](https://zod.dev/)
- [React Hook Form](https://react-hook-form.com/)
- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)

---

**Last Updated**: 2024-11-21
**Next Review**: 2024-12-05
