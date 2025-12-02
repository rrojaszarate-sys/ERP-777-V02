# Documentación Técnica v1.0.0

## Arquitectura del Sistema

### Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 18 + TypeScript |
| **Estilos** | Tailwind CSS + shadcn/ui |
| **Estado** | React Context + Hooks |
| **Backend** | Supabase (PostgreSQL + Edge Functions) |
| **Auth** | Supabase Auth + Google OAuth |
| **Storage** | Supabase Storage |
| **Hosting** | Vercel |

### Estructura de Carpetas

```
src/
├── core/                    # Núcleo del sistema
│   ├── auth/               # Autenticación
│   ├── config/             # Configuración (Supabase)
│   └── layout/             # Layout principal
├── modules/                 # Módulos funcionales
│   ├── eventos-erp/        # Módulo de eventos
│   ├── inventario-erp/     # Almacén e inventarios
│   ├── compras-erp/        # Compras y proveedores
│   ├── portal/             # Portal de solicitudes
│   └── ...
└── shared/                  # Componentes compartidos
    ├── components/         # UI components
    ├── hooks/              # Custom hooks
    └── utils/              # Utilidades
```

### Base de Datos

**Tablas Principales:**
- `companies` - Empresas/tenants
- `profiles` - Perfiles de usuario
- `eventos_erp` - Eventos del sistema
- `productos_erp` - Catálogo de productos
- `proveedores_erp` - Proveedores
- `documentos_inventario_erp` - Documentos de almacén

**Row Level Security (RLS):**
Todas las tablas implementan RLS basado en `company_id` para multi-tenancy.

### Convenciones de Código

- **Componentes:** PascalCase (ej. `ProductosPage.tsx`)
- **Hooks:** camelCase con prefijo `use` (ej. `useProductos.ts`)
- **Servicios:** camelCase con sufijo `Service` (ej. `inventarioService.ts`)
- **Types:** PascalCase en `types/index.ts`

### Variables de Entorno

```bash
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Google OAuth
VITE_GOOGLE_CLIENT_ID=

# Opcional
VITE_APP_ENV=production
```

---

## Guías de Desarrollo

### Agregar Nuevo Módulo

1. Crear carpeta en `src/modules/nuevo-modulo/`
2. Estructura mínima:
   ```
   nuevo-modulo/
   ├── pages/
   ├── components/
   ├── hooks/
   ├── services/
   └── types/
   ```
3. Agregar rutas en `App.tsx`
4. Agregar entrada en menú lateral

### Agregar Nueva Tabla

1. Crear migración SQL en `database/migrations/`
2. Aplicar RLS policies
3. Actualizar types en módulo correspondiente
4. Crear service con operaciones CRUD

### Testing

```bash
# Unit tests
npm run test

# E2E con Playwright
npm run test:e2e

# E2E con Cypress
npm run cypress:open
```

---

## Referencia de APIs

Ver documentación completa en `/docs/api-endpoints.md`

### Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/rest/v1/productos_erp` | Lista productos |
| POST | `/rest/v1/productos_erp` | Crear producto |
| PATCH | `/rest/v1/productos_erp?id=eq.{id}` | Actualizar producto |
| DELETE | `/rest/v1/productos_erp?id=eq.{id}` | Eliminar producto |

---

## Despliegue

### Producción (Vercel)

```bash
# Build
npm run build

# Deploy
vercel --prod
```

### Variables en Vercel

Configurar en Project Settings > Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_CLIENT_ID`

---

*Última actualización: Diciembre 2025*
