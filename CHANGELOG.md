# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.0.0] - 2025-10-27

### Versión Inicial - Sistema Completo Funcional

#### ✨ Características Principales

**Módulo de Eventos**
- Gestión completa de eventos/proyectos empresariales
- Workflow de estados (Cotización → Confirmado → En Proceso → Finalizado → Cancelado)
- Asignación de clientes, tipos de evento y fechas
- Generación automática de claves de evento
- Estimaciones financieras (ingresos y gastos esperados vs reales)
- Dashboard de métricas por evento
- Vista detallada con tabs (Datos, Finanzas, Documentos, Facturación)

**Módulo de Finanzas**
- Registro de ingresos con soporte CFDI
- Registro de gastos con procesamiento OCR
- Vinculación de ingresos/gastos a cuentas bancarias
- Estados de pago (pendiente, pagado, cancelado)
- Cálculo automático de totales con IVA
- Categorización de gastos
- Conciliación de saldos bancarios
- Reportes financieros por evento

**Sistema OCR Inteligente**
- Procesamiento dual: Google Cloud Vision + Tesseract
- Clasificación automática de documentos (ticket, factura, recibo)
- Extracción inteligente con Google Gemini AI
- Mapeo automático a campos del sistema
- Preprocesamiento de imágenes para mejor precisión
- Soporte para PDF e imágenes (JPG, PNG)
- Compresión automática de archivos
- Versionado de documentos OCR

**Facturación CFDI**
- Procesamiento de XML de facturas SAT
- Extracción de UUID, RFC, fecha de emisión
- Validación de folios fiscales
- Almacenamiento de XML y generación de PDF
- Dashboard de facturas emitidas y recibidas
- Alertas de facturas próximas a vencer

**Gestión de Clientes**
- CRUD completo de clientes
- Información fiscal (RFC, razón social)
- Contactos y direcciones
- Histórico de eventos por cliente
- Análisis de rentabilidad por cliente

**Dashboard Analítico**
- KPIs principales (ingresos, gastos, utilidad, margen)
- Gráficas 3D de tendencias
- Comparativos mes a mes
- Top 10 eventos más rentables
- Análisis por tipo de evento
- Exportación a Excel y PDF

**Contabilidad Multi-cuenta**
- Gestión de múltiples cuentas bancarias
- Cálculo automático de saldos
- Reportes por cuenta
- Conciliación bancaria
- Administración de plan de cuentas

**Sistema de Permisos**
- Autenticación con Supabase Auth
- Row Level Security (RLS) a nivel de base de datos
- Roles: admin, manager, user, viewer
- Permisos granulares por módulo
- Multi-tenant (una base de datos, múltiples empresas)

**Auditoría Completa**
- Registro de todas las operaciones críticas
- Tracking de cambios con valores anteriores y nuevos
- Identificación de usuario y timestamp
- IP y user agent
- Consulta de histórico de cambios

#### 🗄️ Base de Datos

**Tablas Principales**
- `core_users`, `core_companies`, `core_roles` - Sistema core
- `evt_eventos`, `evt_clientes`, `evt_tipos_evento`, `evt_estados_evento` - Eventos
- `evt_ingresos`, `evt_gastos`, `evt_cuentas_contables`, `evt_categorias_gasto` - Finanzas
- `evt_facturas`, `evt_documentos` - Facturación
- `ocr_documents`, `ocr_extractions` - OCR
- `audit_log` - Auditoría

**Vistas**
- `vw_eventos_completos` - Vista consolidada con totales financieros

**Triggers**
- `calculate_expense_totals_trigger` - Cálculo automático de totales de gastos
- `calculate_income_totals_trigger` - Cálculo automático de totales de ingresos
- `update_event_financials_on_expense` - Actualización de financieros del evento
- `update_event_financials_on_income` - Actualización de financieros del evento
- `update_updated_at_column` - Actualización de timestamps

**Funciones**
- `get_event_financial_summary()` - Resumen financiero de evento
- `update_bank_account_balance()` - Actualización de saldos
- `generate_event_key()` - Generación de claves únicas

#### 🎨 Frontend

**Stack Tecnológico**
- React 18.3 con TypeScript 5.5
- Vite 5.4 como build tool
- TailwindCSS 3.4 + NextUI 2.6
- React Router 7.9 para routing
- React Query (TanStack Query 5.90) para gestión de estado
- Recharts 3.2 para gráficas
- Framer Motion 12 para animaciones

**Componentes Principales**
- Layout responsivo con navegación lateral
- Sistema de temas (light/dark) personalizable
- Formularios con validación en tiempo real
- Tablas con paginación, ordenamiento y filtrado
- Modales y diálogos
- Toasts para notificaciones
- Loading states y skeletons
- Error boundaries

**Custom Hooks**
- `useEvents` - Gestión de eventos
- `useFinances` - Gestión de ingresos y gastos
- `useClients` - Gestión de clientes
- `useIntelligentOCR` - Procesamiento OCR
- `usePermissions` - Control de permisos
- `useDashboardMetrics` - Métricas del dashboard

#### 🔐 Seguridad

- Row Level Security (RLS) habilitado en todas las tablas
- Políticas por empresa (multi-tenant)
- Validación de permisos en frontend y backend
- Sanitización de inputs
- Protección contra SQL injection (Supabase)
- Protección XSS
- HTTPS obligatorio
- Rate limiting en APIs externas

#### 📊 Performance

- Code splitting con lazy loading
- Caché con React Query (5 min stale time)
- Índices en columnas de búsqueda frecuente
- Compresión de imágenes antes de upload
- Optimistic updates en mutaciones
- Debounce en búsquedas
- Memoización de componentes pesados
- Virtualización de listas largas

#### 🛠️ DevOps

**Scripts Disponibles**
- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm run preview` - Preview del build
- `npm run typecheck` - Type checking sin compilar
- `npm run lint` - Linting de código

**Scripts de Base de Datos**
- `backup-database.mjs` - Backup completo de BD
- `restore-database.mjs` - Restauración de backup
- `test-data-generator.ts` - Generación de datos de prueba
- `generate-events-with-services.ts` - Generación de eventos completos

#### 📚 Documentación

- `README.md` - Documentación principal del proyecto
- `docs/ARCHITECTURE.md` - Arquitectura del sistema
- `docs/DATABASE.md` - Esquema de base de datos detallado
- `docs/BEST_PRACTICES.md` - Mejores prácticas y convenciones
- `CHANGELOG.md` - Este archivo
- `DEPLOYMENT.md` - Guía de deployment

#### 🐛 Correcciones Importantes

- **Fix**: Corrección de cálculos de IVA en gastos e ingresos
- **Fix**: Corrección de trigger de actualización de totales de eventos
- **Fix**: Corrección de constraints en tabla de ingresos
- **Fix**: Corrección de políticas RLS para multi-tenant
- **Fix**: Corrección de formato de respuesta OCR en Vercel
- **Fix**: Corrección de límite de body request en API (4.5MB)
- **Fix**: Corrección de procesamiento de PDF en OCR

#### 🔄 Migraciones Aplicadas

1. `20250929012201_fierce_island.sql` - Estructura inicial
2. `20250929015118_lucky_lake.sql` - Tablas de eventos
3. `20250929015143_calm_plain.sql` - Tablas financieras
4. `20250929015224_flat_swamp.sql` - Triggers y funciones
5. `20250929015238_ancient_peak.sql` - Vistas
6. `20251004000001_add_cancelado_state.sql` - Estado cancelado
7. `20251004000002_fix_event_states_names.sql` - Corrección de nombres
8. `20251006000001_fix_audit_log_compatibility.sql` - Auditoría
9. `20251006000002_add_development_user.sql` - Usuario de desarrollo
10. `20251011_ocr_documents_versioning.sql` - Versionado OCR
11. `20251012_add_ocr_enhanced_fields.sql` - Campos mejorados OCR
12. `20251012_add_sat_ocr_fields.sql` - Campos SAT
13. `20251014_mejoras_flujo_ingresos.sql` - Mejoras en ingresos
14. `20251016_add_solicitante_to_eventos.sql` - Campo solicitante
15. `20251016_add_sufijo_to_clientes.sql` - Sufijo para clientes
16. `20251023_add_financial_estimates_to_events.sql` - Estimaciones
17. `20251024_ingresos_gastos_improvements.sql` - Mejoras finales

#### 📦 Dependencias Principales

**Producción**
- `@supabase/supabase-js` ^2.75.0
- `react` ^18.3.1
- `react-router-dom` ^7.9.2
- `@tanstack/react-query` ^5.90.2
- `@nextui-org/react` ^2.6.11
- `@google-cloud/vision` ^4.3.2
- `@google/generative-ai` ^0.24.1
- `recharts` ^3.2.1
- `framer-motion` ^12.23.22
- `date-fns` ^4.1.0
- `jspdf` ^3.0.3
- `xlsx` ^0.18.5

**Desarrollo**
- `typescript` ^5.5.3
- `vite` ^5.4.2
- `@vitejs/plugin-react` ^4.3.1
- `tailwindcss` ^3.4.1
- `eslint` ^9.9.1

#### 🎯 Estado del Proyecto

- ✅ **Funcional en Producción**: El sistema está completamente funcional y desplegado
- ✅ **Base de Datos Estable**: Esquema de BD validado y optimizado
- ✅ **OCR Operativo**: Sistema de OCR funcionando con Google Cloud
- ✅ **Autenticación Funcionando**: Auth con Supabase operativo
- ✅ **Documentación Completa**: Toda la documentación técnica generada
- ✅ **Código Limpio**: Código refactorizado y organizado
- ⚠️ **Tests**: Pendiente implementación de tests unitarios e integración
- ⚠️ **CI/CD**: Pendiente configuración de pipeline de CI/CD

#### 📋 Tareas Pendientes para v1.1

- [ ] Implementar tests unitarios (Jest/Vitest)
- [ ] Implementar tests de integración
- [ ] Configurar CI/CD (GitHub Actions)
- [ ] Agregar Storybook para componentes
- [ ] Implementar sistema de notificaciones por email
- [ ] Agregar exportación de reportes en PDF mejorados
- [ ] Implementar búsqueda full-text en eventos
- [ ] Agregar módulo de cotizaciones
- [ ] Implementar dashboard de administración avanzado
- [ ] Agregar soporte para múltiples monedas

---

## Formato del Changelog

### Tipos de Cambios
- **Added** - Nuevas características
- **Changed** - Cambios en funcionalidad existente
- **Deprecated** - Características marcadas como obsoletas
- **Removed** - Características eliminadas
- **Fixed** - Corrección de bugs
- **Security** - Correcciones de seguridad

### Versionado Semántico

Dado un número de versión `MAJOR.MINOR.PATCH`:

- **MAJOR**: Cambios incompatibles con versiones anteriores
- **MINOR**: Nuevas características compatibles con versiones anteriores
- **PATCH**: Correcciones de bugs compatibles

**Ejemplo**: `1.2.3`
- `1` = Versión major
- `2` = Versión minor (nuevas características)
- `3` = Patch (correcciones de bugs)

---

**Mantenido por**: Equipo de Desarrollo ERP-777
**Última actualización**: 2025-10-27
