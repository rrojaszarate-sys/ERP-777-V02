# 📊 ANÁLISIS EXHAUSTIVO DEL PROYECTO ERP-777-V02

**Fecha de análisis:** 1 de Diciembre de 2025  
**Versión del proyecto:** 0.0.0 (vite-react-typescript-starter)  
**Total de archivos TypeScript/TSX:** 465 archivos  
**Tamaño del código fuente:** 6.4 MB

---

## 📁 1. ESTRUCTURA GENERAL DEL PROYECTO

### 1.1 Tecnologías Principales
| Categoría | Tecnología | Versión |
|-----------|-----------|---------|
| Frontend | React | 18.3.1 |
| Lenguaje | TypeScript | 5.5 |
| Build Tool | Vite | 5.4.2 |
| Estilos | TailwindCSS | 3.4.1 |
| UI Library | NextUI | 2.6.11 |
| Routing | React Router | 7.9.2 |
| State Management | TanStack Query | 5.90.2 |
| Backend | Supabase | 2.75.0 |
| Gráficos | Recharts | 3.2.1 |
| OCR | Google Vision API, Tesseract.js | - |

### 1.2 Estructura de Directorios Principal
```
src/
├── App.tsx                 # Punto de entrada con rutas
├── main.tsx               # Inicialización de React
├── index.css              # Estilos globales
├── app/api/               # API handlers (cron jobs)
├── components/            # Componentes compartidos básicos
│   ├── auth/              # LoginForm
│   └── ui/                # alert, card, progress, separator
├── core/                  # Infraestructura central
│   ├── auth/              # AuthProvider
│   ├── config/            # supabase, constants, googleCloud
│   ├── permissions/       # usePermissions
│   ├── types/             # database.ts, events.ts
│   └── utils/             # logger
├── modules/               # 26 módulos funcionales
├── services/              # Servicios globales
│   ├── accountingStateService.ts
│   ├── auditService.ts
│   ├── exportService.ts
│   └── fileUploadService.ts
└── shared/                # Utilidades compartidas
    ├── components/        # Layout, UI, Tables, Theme
    └── utils/             # formatters, validators, calculations
```

---

## 📦 2. MÓDULOS DEL SISTEMA

### 2.1 Módulos EN USO (Importados en App.tsx)

| Módulo | Archivos | Ruta Base | Estado |
|--------|----------|-----------|--------|
| **eventos-erp** | 102 | `/eventos`, `/eventos-erp` | ✅ Principal |
| **contabilidad-erp** | 18 | `/contabilidad` | ✅ Activo |
| **cotizaciones-erp** | 12 | `/crm` | ✅ Activo |
| **proveedores-erp** | 7 | `/proveedores` | ✅ Activo |
| **inventario-erp** | 19 | `/inventario` | ✅ Activo |
| **rrhh-erp** | 6 | `/rrhh` | ✅ Activo |
| **facturacion-erp** | 6 | `/facturacion` | ✅ Activo |
| **proyectos-erp** | 15 | `/proyectos` | ✅ Activo |
| **tesoreria-erp** | 6 | `/tesoreria` | ✅ Activo |
| **reportes-erp** | 4 | `/reportes` | ✅ Activo |
| **integraciones-erp** | 4 | `/integraciones` | ✅ Activo |
| **ia-erp** | 4 | `/ia` | ✅ Activo |
| **desarrollo** | 1 | `/desarrollo` | ✅ Activo |
| **admin** | 10 | `/admin` | ✅ Activo |

### 2.2 Módulos OBSOLETOS (NO usados en App.tsx)

| Módulo | Archivos | Reemplazado por | Acción Recomendada |
|--------|----------|-----------------|-------------------|
| **eventos** | 96 | eventos-erp | ⚠️ ELIMINAR (ver dependencias) |
| **contabilidad** | 3 | contabilidad-erp | 🗑️ ELIMINAR |
| **inventario** | 18 | inventario-erp | ⚠️ ELIMINAR (ver dependencias) |
| **crm** | 13 | cotizaciones-erp | 🗑️ ELIMINAR |
| **proyectos** | 13 | proyectos-erp | 🗑️ ELIMINAR |
| **rrhh** | 11 | rrhh-erp | 🗑️ ELIMINAR |
| **pos** | 11 | - | 🗑️ ELIMINAR (no usado) |
| **compras** | 12 | proveedores-erp | ⚠️ ELIMINAR (ver dependencias) |
| **dashboard** | 3 | eventos-erp/dashboard | 🗑️ ELIMINAR |
| **ocr** | 28 | eventos-erp/finances | 🔍 REVISAR |

**Total código obsoleto:** ~208 archivos (~45% del código en modules/)

---

## 🔗 3. DEPENDENCIAS CRÍTICAS A RESOLVER

### 3.1 Referencias a Módulos Obsoletos

| Archivo que referencia | Módulo obsoleto | Acción requerida |
|----------------------|-----------------|------------------|
| `src/app/api/cron/check-invoices/route.ts` | `@/modules/eventos/services/alertService` | Cambiar a `eventos-erp` |
| `src/app/api/cron/check-invoices/route.ts` | `@/modules/eventos/services/invoiceService` | Cambiar a `eventos-erp` |
| `src/modules/compras/types/OrdenCompra.ts` | `@/modules/inventario/types` | Cambiar a `inventario-erp` |

### 3.2 Carpetas de Respaldo a Eliminar

```
src/modules/eventos/_RESPALDO_ARCHIVOS_VIEJOS/
├── EventosListPage.tsx
└── README.md

src/modules/eventos-erp/_RESPALDO_ARCHIVOS_VIEJOS/
├── EventosListPage.tsx
└── README.md
```

---

## 🛠️ 4. SERVICIOS Y SUS FLUJOS

### 4.1 Servicios Globales (src/services/)

| Servicio | Descripción | Usos | Estado |
|----------|-------------|------|--------|
| `accountingStateService.ts` | Gestión de estados contables | 23 | ✅ Activo |
| `fileUploadService.ts` | Subida de archivos a Supabase Storage | 29 | ✅ Activo |
| `auditService.ts` | Registro de auditoría de operaciones | 13 | ✅ Activo |
| `exportService.ts` | Exportación a PDF/Excel | 6 | ✅ Activo |

### 4.2 Servicios del Módulo eventos-erp

| Servicio | Líneas | Función Principal |
|----------|--------|-------------------|
| `eventsService.ts` | 474 | CRUD de eventos, dashboard metrics |
| `financesService.ts` | 863 | Ingresos, gastos, OCR, resumen financiero |
| `clientsService.ts` | 320 | CRUD de clientes |
| `invoiceService.ts` | - | Gestión de facturas CFDI |
| `workflowService.ts` | - | Estados y flujo de trabajo |
| `alertService.ts` | - | Notificaciones y alertas |
| `storageService.ts` | - | Gestión de archivos |
| `accountsService.ts` | - | Cuentas contables |
| `financialExportService.ts` | - | Exportación de reportes |
| `proyectosEventosService.ts` | - | Proyectos vinculados a eventos |
| `eventStateValidationService.ts` | - | Validación de estados |

### 4.3 Flujo de Datos Principal

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌───────────┐
│   Pages/    │────▶│    Hooks     │────▶│    Services     │────▶│  Supabase │
│  Components │     │  (useQuery)  │     │  (API calls)    │     │    DB     │
└─────────────┘     └──────────────┘     └─────────────────┘     └───────────┘
       │                   │                      │
       │                   │                      │
       ▼                   ▼                      ▼
   React UI           React Query            PostgreSQL
   TailwindCSS        Cache/State            RLS/Triggers
   NextUI             Mutations              Edge Functions
```

---

## 🔄 5. HOOKS PERSONALIZADOS

### 5.1 Hooks del Módulo eventos-erp

| Hook | Propósito | Dependencias |
|------|-----------|--------------|
| `useEvents` | CRUD eventos, filtros | eventsService |
| `useFinances` | Ingresos y gastos | financesService |
| `useClients` | Gestión de clientes | clientsService |
| `useDashboardMetrics` | Métricas del dashboard | eventsService |
| `useEventStates` | Estados de eventos | - |
| `useEventTypes` | Tipos de eventos | - |
| `useAccountingStates` | Estados contables | accountingStateService |
| `useCuentasContables` | Cuentas contables | accountsService |
| `useEventDocuments` | Documentos adjuntos | storageService |
| `useEventFinancialAnalysis` | Análisis financiero | - |
| `useEventStateValidation` | Validación de estados | eventStateValidationService |
| `useProyectosEventos` | Proyectos de eventos | proyectosEventosService |
| `useCalculosFinancieros` | Cálculos financieros | - |
| `useConfiguracionERP` | Configuración del sistema | - |
| `useFileUpload` | Subida de archivos | fileUploadService |
| `useUsers` | Usuarios del sistema | - |

---

## 📊 6. TIPOS Y MODELOS DE DATOS

### 6.1 Tipos Principales (eventos-erp/types/)

| Archivo | Tipos Exportados |
|---------|------------------|
| `Event.ts` | Event, EventoCompleto, Cliente, DashboardMetrics, AnalisisTemporal |
| `Finance.ts` | Income, Expense, ExpenseCategory, FinancialSummary |
| `Cliente.ts` | Cliente, ClienteFormData |
| `Invoice.ts` | Invoice, InvoiceStatus |
| `FormData.ts` | EventFormData |
| `Proyecto.ts` | Proyecto, Tarea, Milestone |
| `database.types.ts` | Tipos generados de Supabase |
| `index.ts` | Re-exportaciones |

### 6.2 Tipos Core (core/types/)

| Archivo | Tipos |
|---------|-------|
| `database.ts` | Database (tipos de Supabase) |
| `events.ts` | Tipos adicionales de eventos |

---

## 📂 7. SCRIPTS Y HERRAMIENTAS

### 7.1 Scripts de NPM Principales

| Script | Comando | Propósito |
|--------|---------|-----------|
| `dev` | `vite` | Desarrollo local |
| `build` | `vite build` | Build de producción |
| `cypress:open` | `cypress open` | Pruebas E2E interactivas |
| `cypress:run` | `cypress run` | Pruebas E2E headless |
| `cargar:datos` | `node scripts/cargar_datos_v2.mjs` | Poblar datos de prueba |
| `backup` | `bash scripts/backup-db.sh` | Respaldo de BD |
| `git:commit` | `bash commit-y-publicar.sh` | Commit y push |

### 7.2 Scripts de Migración (56 scripts en scripts/)

**Scripts Activos:**
- `cargar_datos_v2.mjs` - Carga de datos
- `backup-database.mjs` - Respaldo
- `validar_consistencia_gni.mjs` - Validación GNI
- `ejecutar_migracion_*.mjs` - Migraciones

**Scripts Potencialmente Obsoletos:**
- `limpiar_crear_eventos_prueba.mjs` - Datos de prueba
- `identificar-obsoletos.js/mjs` - Duplicados
- `migrate.js` / `migrate.mjs` - Duplicados

---

## ⚠️ 8. CÓDIGO NO UTILIZADO

### 8.1 Módulos Completos a Eliminar

```bash
# Módulos obsoletos (reemplazados por versiones -erp)
src/modules/eventos/        # 96 archivos - Reemplazado por eventos-erp
src/modules/contabilidad/   # 3 archivos - Reemplazado por contabilidad-erp  
src/modules/inventario/     # 18 archivos - Reemplazado por inventario-erp
src/modules/crm/            # 13 archivos - Reemplazado por cotizaciones-erp
src/modules/proyectos/      # 13 archivos - Reemplazado por proyectos-erp
src/modules/rrhh/           # 11 archivos - Reemplazado por rrhh-erp
src/modules/pos/            # 11 archivos - No tiene reemplazo, no usado
src/modules/compras/        # 12 archivos - Reemplazado por proveedores-erp
src/modules/dashboard/      # 3 archivos - Integrado en eventos-erp
```

### 8.2 Carpetas de Respaldo

```bash
src/modules/eventos/_RESPALDO_ARCHIVOS_VIEJOS/
src/modules/eventos-erp/_RESPALDO_ARCHIVOS_VIEJOS/
```

### 8.3 Archivos Zone.Identifier (Windows)

```bash
# Archivos basura de Windows en la raíz
.env:Zone.Identifier
GNI 2025 A PROYECTOS.xlsx:Zone.Identifier
ITIANA_CATALOGO_MAESTRO_COMPLETO.xlsx:Zone.Identifier
prueba cierre.xlsx:Zone.Identifier
DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx:Zone.Identifier
```

---

## 🔧 9. RECOMENDACIONES DE LIMPIEZA

### 9.1 Acciones Inmediatas (Bajo Riesgo)

1. **Eliminar archivos Zone.Identifier:**
   ```bash
   find . -name "*:Zone.Identifier" -delete
   ```

2. **Eliminar carpetas de respaldo:**
   ```bash
   rm -rf src/modules/eventos/_RESPALDO_ARCHIVOS_VIEJOS
   rm -rf src/modules/eventos-erp/_RESPALDO_ARCHIVOS_VIEJOS
   ```

3. **Eliminar módulos sin dependencias:**
   ```bash
   rm -rf src/modules/pos
   rm -rf src/modules/dashboard
   rm -rf src/modules/contabilidad  # (solo 3 archivos, no usados)
   ```

### 9.2 Acciones con Precaución (Riesgo Medio)

1. **Corregir dependencias antes de eliminar:**
   ```typescript
   // En src/app/api/cron/check-invoices/route.ts
   // CAMBIAR:
   import { alertService } from '@/modules/eventos/services/alertService';
   import { invoiceService } from '@/modules/eventos/services/invoiceService';
   // POR:
   import { alertService } from '@/modules/eventos-erp/services/alertService';
   import { invoiceService } from '@/modules/eventos-erp/services/invoiceService';
   ```

2. **Después de corregir, eliminar módulos:**
   ```bash
   rm -rf src/modules/eventos
   rm -rf src/modules/inventario
   rm -rf src/modules/crm
   rm -rf src/modules/proyectos
   rm -rf src/modules/rrhh
   rm -rf src/modules/compras
   ```

### 9.3 Revisión del Módulo OCR

El módulo `src/modules/ocr/` (28 archivos) requiere análisis adicional:
- Verificar si la funcionalidad OCR está duplicada en `eventos-erp/components/finances/`
- Los archivos `bestOCR.ts`, `googleVisionService.ts`, `realGoogleVision.ts` existen en ambos lugares

---

## 📈 10. IMPACTO DE LA LIMPIEZA

### Antes de Limpieza
- **Archivos en modules/:** ~465
- **Módulos activos:** 14
- **Módulos obsoletos:** 10

### Después de Limpieza Propuesta
- **Archivos a eliminar:** ~208 archivos
- **Reducción:** ~45% del código en modules/
- **Beneficios:**
  - Menor confusión en desarrollo
  - Builds más rápidos
  - Mantenimiento simplificado
  - Menor tamaño del repositorio

---

## 📝 11. DOCUMENTACIÓN EXISTENTE

### 11.1 Documentación Principal (Raíz)
- `README.md` - Descripción del proyecto
- `CHANGELOG.md` - Registro de cambios
- `DEPLOYMENT.md` - Guía de despliegue
- `ARCHITECTURE_ANALYSIS.md` - Análisis de arquitectura
- `INDICE_DOCUMENTACION_ACTIVA.md` - Índice de docs activas

### 11.2 Documentación Técnica (docs/)
- `DATABASE.md` - Esquema de base de datos
- `ARCHITECTURE.md` - Arquitectura del sistema
- `GNI_MODULO.md` - Módulo de Gastos No Impactados
- `OCR_GUIA_USO.md` - Guía de uso de OCR
- Y 20+ documentos más...

### 11.3 Documentación Archivada
- `archive_20251105/` - 95 archivos archivados el 5 de Nov 2025
- `docs_archive_20251017/` - Documentación antigua
- `docs_archive_20251028/` - Documentación antigua

---

## ✅ 12. RESUMEN EJECUTIVO

### Estado Actual
El proyecto ERP-777-V02 es un sistema de gestión de eventos empresariales funcional pero con significativa deuda técnica debido a:
1. **Duplicación de módulos** (~45% del código potencialmente obsoleto)
2. **Migración incompleta** de módulos legacy a versiones `-erp`
3. **Dependencias rotas** que apuntan a módulos obsoletos

### Prioridades de Acción
1. 🔴 **Crítico:** Corregir las 3 dependencias rotas identificadas
2. 🟠 **Alto:** Eliminar los 10 módulos obsoletos
3. 🟡 **Medio:** Limpiar archivos de respaldo y Zone.Identifier
4. 🟢 **Bajo:** Consolidar documentación y scripts duplicados

### Módulos Core Funcionales
El sistema funciona correctamente con estos 14 módulos:
- `eventos-erp` (principal)
- `contabilidad-erp`
- `cotizaciones-erp`
- `proveedores-erp`
- `inventario-erp`
- `rrhh-erp`
- `facturacion-erp`
- `proyectos-erp`
- `tesoreria-erp`
- `reportes-erp`
- `integraciones-erp`
- `ia-erp`
- `desarrollo`
- `admin`

---

*Documento generado automáticamente el 1 de Diciembre de 2025*
