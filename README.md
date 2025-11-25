# ERP-777 V1 - Sistema de Gestión de Eventos Empresariales

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)

## Descripción del Sistema

**ERP-777 V1** es un sistema integral de gestión empresarial especializado en la administración de eventos, finanzas, facturación y contabilidad. Diseñado para empresas que organizan eventos, el sistema ofrece un control completo del ciclo de vida de cada proyecto, desde la cotización inicial hasta el cierre contable.

### Características Principales

- **Gestión Completa de Eventos**: Creación, seguimiento y control de proyectos/eventos con workflow automatizado
- **Administración Financiera**: Registro y control de ingresos y gastos vinculados a cada evento
- **Procesamiento OCR Inteligente**: Extracción automática de datos de tickets y facturas usando Google Vision API y Gemini
- **Sistema de Facturación**: Integración con CFDI (Comprobantes Fiscales Digitales por Internet) de México
- **Contabilidad Multi-cuenta**: Gestión de múltiples cuentas bancarias con conciliación automática
- **Dashboards Analíticos**: Visualización de KPIs, métricas financieras y análisis comparativo de eventos
- **Sistema de Permisos**: Control granular de acceso basado en roles (RLS - Row Level Security)
- **Auditoría Completa**: Registro de todas las operaciones críticas del sistema

## Tabla de Contenidos

- [Tecnologías](#tecnologías)
- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Módulos Principales](#módulos-principales)
- [Base de Datos](#base-de-datos)
- [API y Servicios](#api-y-servicios)
- [Deployment](#deployment)
- [Scripts Útiles](#scripts-útiles)
- [Documentación Técnica](#documentación-técnica)
- [Buenas Prácticas](#buenas-prácticas)
- [Contribución](#contribución)

## Tecnologías

### Frontend
- **React 18.3** - Biblioteca de UI con hooks y componentes funcionales
- **TypeScript 5.5** - Tipado estático para mayor seguridad
- **Vite 5.4** - Build tool y dev server ultra-rápido
- **TailwindCSS 3.4** - Framework de CSS utility-first
- **NextUI 2.6** - Componentes de UI modernos y accesibles
- **React Router 7.9** - Routing del lado del cliente
- **React Query (TanStack Query 5.90)** - Gestión de estado del servidor
- **Framer Motion 12** - Animaciones fluidas
- **Recharts 3.2** - Gráficas y visualizaciones de datos
- **Lucide React** - Iconos SVG optimizados

### Backend & Base de Datos
- **Supabase** - Backend-as-a-Service (PostgreSQL + Auth + Storage + Realtime)
- **PostgreSQL 15+** - Base de datos relacional con extensiones avanzadas
- **Row Level Security (RLS)** - Seguridad a nivel de filas
- **Triggers & Functions** - Lógica de negocio en la base de datos
- **Edge Functions** - Funciones serverless para procesamiento OCR

### Procesamiento & APIs Externas
- **Google Cloud Vision API** - OCR de documentos y tickets
- **Google Gemini AI** - Clasificación inteligente de gastos
- **Tesseract.js** - OCR alternativo del lado del cliente
- **PDF.js** - Procesamiento de archivos PDF
- **jsPDF** - Generación de reportes en PDF
- **XLSX** - Exportación de datos a Excel

### DevOps & Tools
- **ESLint** - Linter de código
- **Prettier** - Formateador de código
- **Git** - Control de versiones
- **npm** - Gestor de paquetes

## Arquitectura del Sistema

El sistema sigue una arquitectura de **capas limpias** con separación clara de responsabilidades:

```
┌─────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                 │
│  (React Components, Pages, UI, Forms)                   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  CAPA DE LÓGICA DE NEGOCIO              │
│  (Hooks Personalizados, Context, State Management)      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    CAPA DE SERVICIOS                     │
│  (API Calls, Data Transformation, Business Logic)       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   CAPA DE DATOS                          │
│  (Supabase Client, PostgreSQL, Storage, Auth)           │
└─────────────────────────────────────────────────────────┘
```

### Flujo de Datos Principal

1. **Usuario** → Interactúa con componentes React
2. **Componente** → Usa custom hooks para lógica de negocio
3. **Hook** → Llama a servicios especializados
4. **Servicio** → Interactúa con Supabase o APIs externas
5. **Supabase** → Ejecuta queries, triggers y retorna datos
6. **Datos** → Fluyen de vuelta a través de las capas con transformación

## Instalación

### Prerequisitos

- **Node.js 18+** y npm
- **Cuenta de Supabase** (o instancia local)
- **Credenciales de Google Cloud** (para OCR)
- **Git**

### Pasos de Instalación

```bash
# 1. Clonar el repositorio
git clone <repository-url>
cd ERP-777-V01-CLEAN

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 4. Ejecutar en modo desarrollo
npm run dev
```

## Configuración

### Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Supabase
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key

# Google Cloud Vision (OCR)
VITE_GOOGLE_VISION_API_KEY=tu-api-key
VITE_GOOGLE_CLOUD_PROJECT_ID=tu-project-id

# Google Gemini AI
VITE_GEMINI_API_KEY=tu-gemini-api-key

# Entorno
VITE_ENV=development
```

### Configuración de Supabase

1. Crear un proyecto en [Supabase](https://supabase.com)
2. Ejecutar las migraciones de base de datos desde `supabase_old/migrations/`
3. Configurar las políticas RLS (Row Level Security)
4. Configurar Storage Buckets para documentos

Ver [docs/DATABASE.md](docs/DATABASE.md) para detalles completos.

## Estructura del Proyecto

```
ERP-777-V01-CLEAN/
├── src/
│   ├── app/                      # Configuración de la aplicación
│   │   └── api/                  # API routes (cron jobs)
│   ├── components/               # Componentes compartidos generales
│   │   ├── auth/                 # Componentes de autenticación
│   │   └── ui/                   # Componentes UI básicos
│   ├── core/                     # Núcleo de la aplicación
│   │   ├── auth/                 # Contexto y provider de autenticación
│   │   ├── config/               # Configuraciones (Supabase, constantes)
│   │   ├── permissions/          # Sistema de permisos
│   │   ├── types/                # Tipos TypeScript globales
│   │   └── utils/                # Utilidades generales
│   ├── modules/                  # Módulos de negocio (feature-based)
│   │   ├── admin/                # Administración del sistema
│   │   ├── contabilidad/         # Módulo de contabilidad
│   │   ├── dashboard/            # Dashboard principal
│   │   ├── eventos/              # Módulo de eventos (principal)
│   │   │   ├── components/       # Componentes de eventos
│   │   │   │   ├── accounting/   # Componentes contables
│   │   │   │   ├── clients/      # Gestión de clientes
│   │   │   │   ├── dashboard/    # Dashboard de eventos
│   │   │   │   ├── documents/    # Documentos del evento
│   │   │   │   ├── events/       # Formularios y detalles
│   │   │   │   ├── finances/     # Ingresos y gastos
│   │   │   │   ├── financial/    # Análisis financiero
│   │   │   │   ├── invoices/     # Facturación
│   │   │   │   └── workflow/     # Workflow del evento
│   │   │   ├── hooks/            # Custom hooks del módulo
│   │   │   ├── pages/            # Páginas del módulo
│   │   │   ├── services/         # Servicios de negocio
│   │   │   ├── types/            # Tipos específicos
│   │   │   └── utils/            # Utilidades del módulo
│   │   └── ocr/                  # Módulo de OCR
│   │       ├── hooks/            # Hooks para OCR
│   │       ├── pages/            # Páginas de prueba OCR
│   │       ├── services/         # Servicios OCR
│   │       ├── types/            # Tipos OCR
│   │       └── utils/            # Utilidades OCR
│   ├── services/                 # Servicios globales
│   ├── shared/                   # Recursos compartidos
│   │   ├── components/           # Componentes reutilizables
│   │   │   ├── layout/           # Layout principal
│   │   │   ├── tables/           # Tablas de datos
│   │   │   ├── theme/            # Temas y estilos
│   │   │   └── ui/               # Componentes UI avanzados
│   │   └── utils/                # Utilidades compartidas
│   ├── App.tsx                   # Componente raíz
│   └── main.tsx                  # Entry point
├── supabase/                     # Configuración Supabase activa
│   └── functions/                # Edge functions
├── supabase_old/                 # Migraciones históricas
│   ├── functions/                # Funciones antiguas
│   └── migrations/               # Migraciones SQL
├── scripts/                      # Scripts de utilidad
├── docs/                         # Documentación técnica
│   └── ctx/
│       └── db/                   # Esquemas de BD
├── antiguos/                     # Archivos históricos
│   ├── documentacion/            # Documentación obsoleta
│   ├── scripts/                  # Scripts antiguos
│   └── sql/                      # SQL histórico
├── backups/                      # Backups de base de datos
├── package.json                  # Dependencias del proyecto
├── tsconfig.json                 # Configuración TypeScript
├── vite.config.ts                # Configuración Vite
├── tailwind.config.js            # Configuración Tailwind
└── README.md                     # Este archivo
```

## Módulos Principales

### 1. Módulo de Eventos (`src/modules/eventos/`)

**Responsabilidad**: Gestión completa del ciclo de vida de eventos/proyectos empresariales.

**Características**:
- Creación y edición de eventos
- Workflow de estados (Cotización → Confirmado → En Proceso → Finalizado → Cancelado)
- Asignación de clientes, tipos de evento y fechas
- Estimaciones financieras (ingresos y gastos esperados)
- Vista detallada con tabs (Datos, Finanzas, Documentos, Facturación)

**Archivos Clave**:
- [EventForm.tsx](src/modules/eventos/components/events/EventForm.tsx) - Formulario principal
- [useEvents.ts](src/modules/eventos/hooks/useEvents.ts) - Hook de gestión
- [eventsService.ts](src/modules/eventos/services/eventsService.ts) - Servicio de negocio

### 2. Módulo de Finanzas (Dentro de Eventos)

**Responsabilidad**: Registro y control de ingresos y gastos por evento.

**Características**:
- **Gastos**:
  - Captura manual o mediante OCR
  - Categorización automática con AI
  - Soporte para XML de facturas SAT
  - Vinculación a cuenta bancaria
  - Estados de pago (pendiente, pagado)
- **Ingresos**:
  - Registro de entradas de efectivo
  - Vinculación a cliente y evento
  - Procesamiento de facturas CFDI
  - Conciliación bancaria

**Archivos Clave**:
- [ExpenseForm.tsx](src/modules/eventos/components/finances/ExpenseForm.tsx)
- [IncomeForm.tsx](src/modules/eventos/components/finances/IncomeForm.tsx)
- [DualOCRExpenseForm.tsx](src/modules/eventos/components/finances/DualOCRExpenseForm.tsx)

### 3. Módulo de OCR (`src/modules/ocr/`)

**Responsabilidad**: Procesamiento inteligente de documentos mediante OCR.

**Características**:
- Extracción de texto de imágenes y PDFs
- Clasificación automática de tipo de documento (ticket, factura, recibo)
- Mapeo automático a campos del sistema
- Validación y corrección de datos extraídos
- Soporte para múltiples proveedores (Google Vision, Tesseract)

**Archivos Clave**:
- [dualOCRService.ts](src/modules/ocr/services/dualOCRService.ts)
- [intelligentOCRClassifier.ts](src/modules/ocr/services/intelligentOCRClassifier.ts)
- [useIntelligentOCR.ts](src/modules/ocr/hooks/useIntelligentOCR.ts)

### 4. Módulo de Contabilidad (`src/modules/contabilidad/`)

**Responsabilidad**: Gestión contable y reportes bancarios.

**Características**:
- Administración de cuentas contables
- Conciliación de saldos bancarios
- Reportes de movimientos por cuenta
- Análisis de flujo de efectivo

### 5. Módulo de Dashboard (`src/modules/dashboard/`)

**Responsabilidad**: Visualización de métricas y KPIs del negocio.

**Características**:
- KPIs principales (ingresos, gastos, utilidad, margen)
- Gráficas 3D de tendencias
- Comparativos mes a mes
- Eventos más rentables
- Análisis de rentabilidad por tipo de evento

## Base de Datos

### Esquema Principal

La base de datos PostgreSQL contiene las siguientes tablas principales:

#### Tablas Core
- `core_users` - Usuarios del sistema
- `core_companies` - Empresas/organizaciones
- `core_roles` - Roles de usuario
- `core_permissions` - Permisos granulares

#### Tablas de Eventos
- `evt_eventos` - Eventos/proyectos
- `evt_clientes` - Clientes
- `evt_tipos_evento` - Catálogo de tipos de evento
- `evt_estados_evento` - Workflow de estados

#### Tablas Financieras
- `evt_ingresos` - Registro de ingresos
- `evt_gastos` - Registro de gastos
- `evt_cuentas_contables` - Cuentas bancarias
- `evt_categorias_gasto` - Categorías de gastos

#### Tablas de Facturación
- `evt_facturas` - Facturas emitidas/recibidas
- `evt_documentos` - Documentos asociados a eventos

#### Tablas de OCR
- `ocr_documents` - Documentos procesados con OCR
- `ocr_extractions` - Datos extraídos por OCR

#### Tablas de Auditoría
- `audit_log` - Registro de auditoría de operaciones

### Vistas Materializadas

- `vw_eventos_completos` - Vista consolidada de eventos con totales financieros

### Triggers Principales

- `calculate_expense_totals_trigger` - Calcula totales de gastos automáticamente
- `calculate_income_totals_trigger` - Calcula totales de ingresos automáticamente
- `update_event_financials_on_expense` - Actualiza financieros del evento al insertar/modificar gastos
- `update_event_financials_on_income` - Actualiza financieros del evento al insertar/modificar ingresos

Ver documentación completa en [docs/DATABASE.md](docs/DATABASE.md)

## API y Servicios

### Servicios de Backend (src/modules/eventos/services/)

#### eventsService.ts
Gestión de eventos: CRUD, búsqueda, filtrado, estados.

```typescript
- fetchEvents()
- fetchEventById()
- createEvent()
- updateEvent()
- deleteEvent()
- updateEventState()
```

#### financesService.ts
Gestión financiera: ingresos, gastos, cálculos.

```typescript
- fetchIncomes()
- createIncome()
- updateIncome()
- deleteIncome()
- fetchExpenses()
- createExpense()
- updateExpense()
- deleteExpense()
- calculateEventTotals()
```

#### invoiceService.ts
Gestión de facturas y procesamiento CFDI.

```typescript
- fetchInvoices()
- processInvoicePDF()
- parseCFDIXML()
- createInvoiceFromCFDI()
```

#### workflowService.ts
Gestión del workflow de eventos.

```typescript
- canAdvanceToState()
- advanceEventState()
- validateStateTransition()
```

### Servicios OCR (src/modules/ocr/services/)

#### dualOCRService.ts
Procesamiento dual con Google Vision y clasificación AI.

```typescript
- processDocument()
- extractTextFromImage()
- classifyDocument()
- mapToExpenseFields()
```

#### intelligentOCRClassifier.ts
Clasificación inteligente usando Gemini.

```typescript
- classifyAndExtractExpenseData()
- enhanceOCRData()
```

## Deployment

### Deployment a Producción (Vercel/Netlify)

```bash
# 1. Build de producción
npm run build

# 2. Preview del build
npm run preview

# 3. Deploy (ejemplo con Vercel)
vercel --prod
```

### Variables de Entorno en Producción

Asegúrate de configurar todas las variables de entorno en tu plataforma de deployment:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_GOOGLE_VISION_API_KEY
VITE_GOOGLE_CLOUD_PROJECT_ID
VITE_GEMINI_API_KEY
VITE_ENV=production
```

### Migraciones de Base de Datos

Ejecutar migraciones en producción:

```bash
# Conectar a base de datos de producción
psql <connection-string>

# Ejecutar migraciones en orden
\i supabase_old/migrations/20250929012201_fierce_island.sql
\i supabase_old/migrations/20251024_ingresos_gastos_improvements.sql
# ... continuar con todas las migraciones
```

Ver [DEPLOYMENT.md](DEPLOYMENT.md) para guía detallada.

## Scripts Útiles

### Scripts de Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# Type checking (sin compilar)
npm run typecheck

# Linting
npm run lint

# Build de producción
npm run build
```

### Scripts de Base de Datos

Ubicados en `scripts/`:

- `backup-database.mjs` - Backup de base de datos
- `restore-database.mjs` - Restauración de backup
- `test-data-generator.ts` - Generación de datos de prueba
- `generate-events-with-services.ts` - Generación de eventos completos
- `integration-tests.ts` - Tests de integración

Ver [docs/SCRIPTS.md](docs/SCRIPTS.md) para detalles.

## Documentación Técnica

La documentación técnica completa se encuentra en la carpeta `docs/`:

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Arquitectura del sistema
- [DATABASE.md](docs/DATABASE.md) - Esquema de base de datos
- [API.md](docs/API.md) - Documentación de APIs
- [WORKFLOWS.md](docs/WORKFLOWS.md) - Flujos de trabajo del sistema
- [OCR_SYSTEM.md](docs/OCR_SYSTEM.md) - Sistema de OCR
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Guía de deployment
- [BEST_PRACTICES.md](docs/BEST_PRACTICES.md) - Mejores prácticas
- [SCRIPTS.md](docs/SCRIPTS.md) - Documentación de scripts

## Buenas Prácticas

### Código

1. **TypeScript Strict**: Siempre usar tipos explícitos, evitar `any`
2. **Componentes Funcionales**: Usar hooks en lugar de class components
3. **Custom Hooks**: Extraer lógica reutilizable a hooks personalizados
4. **Separación de Responsabilidades**:
   - Componentes = UI
   - Hooks = Lógica de negocio
   - Services = Llamadas API
5. **Naming Conventions**:
   - Componentes: PascalCase (`EventForm.tsx`)
   - Hooks: camelCase con prefijo `use` (`useEvents.ts`)
   - Services: camelCase con sufijo `Service` (`eventsService.ts`)
   - Constantes: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)

### Base de Datos

1. **Siempre usar transacciones** para operaciones múltiples
2. **Índices en columnas frecuentes** (foreign keys, campos de búsqueda)
3. **RLS habilitado** en todas las tablas de producción
4. **Triggers para cálculos automáticos** en lugar de lógica en frontend
5. **Auditoría en operaciones críticas** (crear, modificar, eliminar)

### Git

1. **Commits semánticos**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
2. **Branch strategy**:
   - `main` - producción
   - `develop` - desarrollo
   - `feature/*` - nuevas características
   - `hotfix/*` - correcciones urgentes
3. **Pull Requests** obligatorios para merge a main

Ver [docs/BEST_PRACTICES.md](docs/BEST_PRACTICES.md) para guía completa.

## Contribución

### Cómo Contribuir

1. Fork del repositorio
2. Crear branch de feature: `git checkout -b feature/nueva-caracteristica`
3. Commit de cambios: `git commit -m 'feat: agregar nueva característica'`
4. Push al branch: `git push origin feature/nueva-caracteristica`
5. Crear Pull Request

### Código de Conducta

- Respetar las convenciones de código establecidas
- Documentar funciones y componentes complejos
- Escribir tests para funcionalidad crítica
- Revisar y aprobar PRs antes de merge

## Licencia

Este proyecto está bajo la licencia MIT. Ver archivo [LICENSE](LICENSE) para más detalles.

## Soporte

Para reportar bugs o solicitar características:
- Crear issue en GitHub
- Contactar al equipo de desarrollo

## Changelog

Ver [CHANGELOG.md](CHANGELOG.md) para historial de versiones y cambios.

---

**Desarrollado con** ❤️ **por el equipo de ERP-777**

**Última actualización**: Octubre 2025
**Versión**: 1.0.0
