# PLAN DE DESARROLLO ERP MADE 777 - 2025

## PLAN AMBICIOSO DE IMPLEMENTACION Y PRUEBAS

**Versión:** 1.0
**Fecha:** Diciembre 2024
**Estado:** PENDIENTE AUTORIZACION

---

## RESUMEN EJECUTIVO

### Objetivo
Transformar el ERP MADE 777 en una plataforma empresarial de clase mundial, completando todas las funcionalidades faltantes, eliminando bugs críticos, e implementando pruebas automatizadas comprehensivas.

### Alcance Total
- **18 módulos** a completar/mejorar
- **655+ horas** de desarrollo estimado
- **200+ pruebas** automatizadas
- **5 fases** de implementación
- **32 semanas** de duración total

### Inversión Estimada
| Concepto | Horas | Costo Estimado (USD) |
|----------|-------|---------------------|
| Desarrollo | 655h | $32,750 |
| QA/Testing | 150h | $6,000 |
| DevOps/CI/CD | 40h | $2,000 |
| Documentación | 30h | $1,200 |
| **TOTAL** | **875h** | **$41,950** |

---

## FASE 1: ESTABILIZACION CRITICA
### Semanas 1-4 (80 horas)

> **Objetivo:** Eliminar todos los bugs críticos y estabilizar módulos core

### 1.1 Corrección de Bugs Críticos (32h)

| # | Bug | Módulo | Horas | Prioridad |
|---|-----|--------|-------|-----------|
| 1.1.1 | Conversión DATE strings vacíos | eventos-erp | 4h | CRITICA |
| 1.1.2 | tipo_cambio siempre = 1 | eventos-erp | 4h | CRITICA |
| 1.1.3 | Race condition edición simultánea | eventos-erp | 8h | CRITICA |
| 1.1.4 | Fallback sin manejo de error | eventos-erp | 4h | CRITICA |
| 1.1.5 | OCR detection frágil | ocr | 6h | ALTA |
| 1.1.6 | Precisión aritmética flotante | eventos-erp | 4h | ALTA |
| 1.1.7 | LocalStorage sin encriptar | core | 2h | ALTA |

**Entregables:**
- [ ] Cero bugs críticos en producción
- [ ] Tests unitarios para cada fix
- [ ] Documentación de cambios

### 1.2 Refactorización de Código (28h)

| # | Tarea | Archivo | Horas |
|---|-------|---------|-------|
| 1.2.1 | Dividir DualOCRExpenseForm | 3,281 líneas → 5 componentes | 12h |
| 1.2.2 | Unificar EventoModal/DetailModal | Código duplicado | 8h |
| 1.2.3 | Extraer lógica a hooks | Componentes monolíticos | 8h |

**Regla:** Ningún componente > 500 líneas

### 1.3 Implementar Librería Decimal (8h)

```bash
npm install decimal.js
```

| # | Tarea | Horas |
|---|-------|-------|
| 1.3.1 | Instalar y configurar decimal.js | 1h |
| 1.3.2 | Refactorizar cálculos financieros | 4h |
| 1.3.3 | Tests de precisión | 3h |

### 1.4 Validaciones con Zod (12h)

| # | Tarea | Horas |
|---|-------|-------|
| 1.4.1 | Esquemas Zod para Eventos | 3h |
| 1.4.2 | Esquemas Zod para Finanzas | 3h |
| 1.4.3 | Esquemas Zod para Clientes | 2h |
| 1.4.4 | Integrar en formularios | 4h |

### PRUEBAS FASE 1

```
tests/
├── unit/
│   ├── eventos/
│   │   ├── dateConversion.test.ts
│   │   ├── currencyExchange.test.ts
│   │   └── financialCalculations.test.ts
│   ├── ocr/
│   │   └── ocrDetection.test.ts
│   └── utils/
│       └── decimalPrecision.test.ts
├── integration/
│   └── eventos/
│       └── eventCRUD.test.ts
└── e2e/
    └── eventos/
        └── createEvent.spec.ts
```

**Cobertura objetivo:** 60% código crítico

---

## FASE 2: FUNCIONALIDADES CORE
### Semanas 5-12 (160 horas)

> **Objetivo:** Implementar funcionalidades esenciales faltantes

### 2.1 Calendario de Eventos (25h)

```typescript
// Tecnología: FullCalendar + React
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid
```

| # | Tarea | Horas |
|---|-------|-------|
| 2.1.1 | Componente CalendarioEventos | 8h |
| 2.1.2 | Vista mensual/semanal/diaria | 6h |
| 2.1.3 | Drag & drop para cambiar fechas | 4h |
| 2.1.4 | Filtros por cliente/estado | 3h |
| 2.1.5 | Modal de creación rápida | 4h |

**Wireframe:**
```
┌─────────────────────────────────────────────────────┐
│ < Diciembre 2024 >     [Mes] [Semana] [Día] [Lista] │
├─────┬─────┬─────┬─────┬─────┬─────┬─────────────────┤
│ Lun │ Mar │ Mie │ Jue │ Vie │ Sab │ Dom             │
├─────┼─────┼─────┼─────┼─────┼─────┼─────────────────┤
│     │     │     │     │  1  │  2  │  3              │
│     │     │     │     │     │     │                 │
├─────┼─────┼─────┼─────┼─────┼─────┼─────────────────┤
│  4  │  5  │  6  │  7  │  8  │  9  │ 10              │
│     │ ███ │     │     │ ███ │     │                 │
│     │Boda │     │     │Corp │     │                 │
└─────┴─────┴─────┴─────┴─────┴─────┴─────────────────┘
```

### 2.2 Sistema de Notificaciones (30h)

| # | Tarea | Horas |
|---|-------|-------|
| 2.2.1 | Tabla notificaciones en BD | 2h |
| 2.2.2 | Servicio de notificaciones | 6h |
| 2.2.3 | Bell icon con badge | 4h |
| 2.2.4 | Centro de notificaciones (dropdown) | 6h |
| 2.2.5 | Triggers automáticos | 8h |
| 2.2.6 | Preferencias de usuario | 4h |

**Tipos de notificaciones:**
- Evento próximo (7, 3, 1 días)
- Pago vencido
- Gasto pendiente de aprobación
- Stock bajo
- Tarea asignada
- Cambio de estado

**Schema BD:**
```sql
CREATE TABLE core_notificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT,
  link VARCHAR(500),
  leida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 Reportes Avanzados (35h)

| # | Tarea | Horas |
|---|-------|-------|
| 2.3.1 | Exportación Excel con estilos (xlsx) | 10h |
| 2.3.2 | Exportación PDF profesional (jsPDF) | 10h |
| 2.3.3 | Reporte de eventos por período | 5h |
| 2.3.4 | Reporte financiero consolidado | 5h |
| 2.3.5 | Reporte de rentabilidad por cliente | 5h |

**Librerías:**
```bash
npm install xlsx jspdf jspdf-autotable
```

### 2.4 Contabilidad Completa (40h)

| # | Tarea | Módulo | Horas |
|---|-------|--------|-------|
| 2.4.1 | Balanza de comprobación (UI) | contabilidad | 10h |
| 2.4.2 | Estado de resultados | contabilidad | 12h |
| 2.4.3 | Balance general | contabilidad | 12h |
| 2.4.4 | Mayor general | contabilidad | 6h |

**Fórmulas clave:**
```
Balanza: Saldo Inicial + Cargos - Abonos = Saldo Final
Estado Resultados: Ingresos - Gastos = Utilidad
Balance: Activos = Pasivos + Capital
```

### 2.5 Dashboard Ejecutivo (20h)

| # | Tarea | Horas |
|---|-------|-------|
| 2.5.1 | KPIs principales (4 tarjetas) | 4h |
| 2.5.2 | Gráfico de ventas (línea) | 4h |
| 2.5.3 | Gráfico de gastos (barras) | 4h |
| 2.5.4 | Top 5 clientes | 3h |
| 2.5.5 | Eventos próximos | 3h |
| 2.5.6 | Alertas pendientes | 2h |

### 2.6 Permisos Granulares (10h)

| # | Tarea | Horas |
|---|-------|-------|
| 2.6.1 | Sistema de roles expandido | 4h |
| 2.6.2 | Permisos por módulo | 3h |
| 2.6.3 | UI de configuración | 3h |

**Roles propuestos:**
- Super Admin (todo)
- Admin (sin config sistema)
- Gerente (su departamento)
- Operador (crear/editar)
- Visor (solo lectura)

### PRUEBAS FASE 2

```
tests/
├── unit/
│   ├── calendario/
│   │   └── eventDragDrop.test.ts
│   ├── notificaciones/
│   │   └── notificationTriggers.test.ts
│   └── reportes/
│       ├── excelExport.test.ts
│       └── pdfExport.test.ts
├── integration/
│   ├── contabilidad/
│   │   ├── balanza.test.ts
│   │   ├── estadoResultados.test.ts
│   │   └── balance.test.ts
│   └── permisos/
│       └── roleAccess.test.ts
└── e2e/
    ├── calendario.spec.ts
    ├── notificaciones.spec.ts
    └── reportes.spec.ts
```

**Cobertura objetivo:** 70%

---

## FASE 3: INTEGRACION DE MODULOS
### Semanas 13-18 (120 horas)

> **Objetivo:** Conectar todos los módulos entre sí

### 3.1 Eventos ↔ Inventario (25h)

| # | Tarea | Horas |
|---|-------|-------|
| 3.1.1 | Reserva automática de materiales | 8h |
| 3.1.2 | Checklist desde kit de evento | 6h |
| 3.1.3 | Devolución al cerrar evento | 6h |
| 3.1.4 | Alertas de stock insuficiente | 5h |

**Flujo:**
```
Evento Creado → Seleccionar Kit → Reservar Stock →
Checklist Pre-evento → Evento → Checklist Post-evento →
Devolver Stock → Registrar Daños
```

### 3.2 Eventos ↔ Proyectos (20h)

| # | Tarea | Horas |
|---|-------|-------|
| 3.2.1 | Crear proyecto desde evento | 6h |
| 3.2.2 | Sincronizar fechas | 4h |
| 3.2.3 | Tareas automáticas por tipo evento | 6h |
| 3.2.4 | Timesheet vinculado a evento | 4h |

### 3.3 Eventos ↔ Contabilidad (15h)

| # | Tarea | Horas |
|---|-------|-------|
| 3.3.1 | Póliza automática al cobrar | 5h |
| 3.3.2 | Póliza automática al pagar | 5h |
| 3.3.3 | Reporte contable por evento | 5h |

### 3.4 Cotizaciones → Eventos (15h)

| # | Tarea | Horas |
|---|-------|-------|
| 3.4.1 | Botón "Convertir a Evento" | 4h |
| 3.4.2 | Mapeo de datos cotización→evento | 6h |
| 3.4.3 | Ingresos desde partidas | 5h |

### 3.5 Compras ↔ Inventario (20h)

| # | Tarea | Horas |
|---|-------|-------|
| 3.5.1 | OC desde alerta de stock | 6h |
| 3.5.2 | Recepción actualiza inventario | 8h |
| 3.5.3 | Lotes desde recepción | 6h |

### 3.6 Búsqueda Global (15h)

| # | Tarea | Horas |
|---|-------|-------|
| 3.6.1 | Componente SearchGlobal | 5h |
| 3.6.2 | Indexación de entidades | 6h |
| 3.6.3 | Resultados agrupados | 4h |

**Shortcut:** Ctrl+K / Cmd+K

### 3.7 Importación Masiva (10h)

| # | Tarea | Horas |
|---|-------|-------|
| 3.7.1 | Template Excel descargable | 2h |
| 3.7.2 | Validación de datos | 4h |
| 3.7.3 | Proceso de importación | 4h |

### PRUEBAS FASE 3

```
tests/
├── integration/
│   ├── eventos-inventario/
│   │   ├── reservaStock.test.ts
│   │   ├── checklistKit.test.ts
│   │   └── devolucionStock.test.ts
│   ├── eventos-proyectos/
│   │   └── crearProyectoDesdeEvento.test.ts
│   ├── eventos-contabilidad/
│   │   └── polizaAutomatica.test.ts
│   ├── cotizaciones-eventos/
│   │   └── convertirCotizacion.test.ts
│   └── compras-inventario/
│       └── recepcionActualizaStock.test.ts
└── e2e/
    ├── flujoEventoCompleto.spec.ts
    ├── flujoCompraRecepcion.spec.ts
    └── busquedaGlobal.spec.ts
```

**Cobertura objetivo:** 75%

---

## FASE 4: MODULOS SECUNDARIOS
### Semanas 19-26 (200 horas)

> **Objetivo:** Completar módulos parciales

### 4.1 Tesorería Completa (35h)

| # | Tarea | Horas |
|---|-------|-------|
| 4.1.1 | Importación estados bancarios (OFX/CSV) | 12h |
| 4.1.2 | Reconciliación automática | 10h |
| 4.1.3 | Flujo de caja proyectado | 8h |
| 4.1.4 | Alertas de saldo bajo | 5h |

### 4.2 RRHH - Nómina Automática (45h)

| # | Tarea | Horas |
|---|-------|-------|
| 4.2.1 | Motor de cálculo de nómina | 15h |
| 4.2.2 | Tablas ISR 2025 | 5h |
| 4.2.3 | Cálculo IMSS | 8h |
| 4.2.4 | Generación de recibos | 8h |
| 4.2.5 | Preparación timbrado CFDI | 9h |

### 4.3 Facturación - Mejoras (25h)

| # | Tarea | Horas |
|---|-------|-------|
| 4.3.1 | Validación XML contra SAT | 8h |
| 4.3.2 | Envío automático por email | 8h |
| 4.3.3 | Reportes de facturación | 5h |
| 4.3.4 | Backup automático XMLs | 4h |

### 4.4 POS - Mejoras (30h)

| # | Tarea | Horas |
|---|-------|-------|
| 4.4.1 | Cierre de turno con arqueo | 10h |
| 4.4.2 | Reportes por turno | 8h |
| 4.4.3 | Integración con inventario | 8h |
| 4.4.4 | Modo offline básico | 4h |

### 4.5 CRM - Pipeline Avanzado (25h)

| # | Tarea | Horas |
|---|-------|-------|
| 4.5.1 | Scoring automático de leads | 8h |
| 4.5.2 | Automatización de seguimiento | 8h |
| 4.5.3 | Reportes de conversión | 5h |
| 4.5.4 | Timeline de actividades | 4h |

### 4.6 Reportes - Constructor Visual (40h)

| # | Tarea | Horas |
|---|-------|-------|
| 4.6.1 | Query builder visual | 15h |
| 4.6.2 | Selector de campos | 8h |
| 4.6.3 | Filtros dinámicos | 8h |
| 4.6.4 | Guardar reportes favoritos | 5h |
| 4.6.5 | Programar envío de reportes | 4h |

### PRUEBAS FASE 4

```
tests/
├── unit/
│   ├── tesoreria/
│   │   ├── importOFX.test.ts
│   │   └── reconciliacion.test.ts
│   ├── rrhh/
│   │   ├── calculoNomina.test.ts
│   │   ├── calculoISR.test.ts
│   │   └── calculoIMSS.test.ts
│   └── pos/
│       └── cierreTurno.test.ts
├── integration/
│   ├── facturacion/
│   │   └── envioEmail.test.ts
│   └── crm/
│       └── scoringLeads.test.ts
└── e2e/
    ├── nomina.spec.ts
    ├── cierrePOS.spec.ts
    └── reportesPersonalizados.spec.ts
```

**Cobertura objetivo:** 80%

---

## FASE 5: VALOR AGREGADO E INNOVACION
### Semanas 27-32 (95 horas)

> **Objetivo:** Diferenciadores competitivos

### 5.1 PWA / App Móvil (30h)

| # | Tarea | Horas |
|---|-------|-------|
| 5.1.1 | Configuración PWA (manifest, SW) | 6h |
| 5.1.2 | Vistas responsivas críticas | 10h |
| 5.1.3 | Offline básico | 8h |
| 5.1.4 | Push notifications | 6h |

### 5.2 IA y Predicciones (25h)

| # | Tarea | Horas |
|---|-------|-------|
| 5.2.1 | Predicción de demanda (inventario) | 10h |
| 5.2.2 | Scoring de cobranza | 8h |
| 5.2.3 | Sugerencias de precios | 7h |

**Tecnología:** TensorFlow.js o llamadas a API OpenAI

### 5.3 Integraciones Externas (25h)

| # | Tarea | Horas |
|---|-------|-------|
| 5.3.1 | Google Calendar sync | 8h |
| 5.3.2 | WhatsApp Business (plantillas) | 10h |
| 5.3.3 | Slack/Teams webhooks | 7h |

### 5.4 Chatbot Asistente (15h)

| # | Tarea | Horas |
|---|-------|-------|
| 5.4.1 | Widget de chat | 5h |
| 5.4.2 | Integración GPT API | 6h |
| 5.4.3 | Contexto del ERP | 4h |

**Casos de uso:**
- "¿Cuánto vendimos este mes?"
- "¿Qué eventos tengo mañana?"
- "Crea una cotización para..."

### PRUEBAS FASE 5

```
tests/
├── unit/
│   ├── pwa/
│   │   └── serviceWorker.test.ts
│   └── ia/
│       ├── prediccionDemanda.test.ts
│       └── scoringCobranza.test.ts
├── integration/
│   ├── integraciones/
│   │   ├── googleCalendar.test.ts
│   │   └── whatsapp.test.ts
│   └── chatbot/
│       └── contextERP.test.ts
└── e2e/
    ├── pwaOffline.spec.ts
    └── chatbot.spec.ts
```

**Cobertura objetivo:** 85%

---

## ESTRATEGIA DE PRUEBAS

### Pirámide de Testing

```
                    ▲
                   /E\        E2E (Playwright)
                  /2E \       10% - Flujos críticos
                 /─────\
                /       \
               / Integr. \    Integration (Vitest)
              /───────────\   30% - APIs, BD
             /             \
            /    Unitarias  \  Unit (Vitest)
           /─────────────────\ 60% - Funciones, hooks
```

### Configuración de Testing

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'tests/'],
      thresholds: {
        global: {
          branches: 70,
          functions: 75,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
```

### Playwright E2E

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  retries: 2,
  workers: 4,
  reporter: [['html'], ['json', { outputFile: 'test-results.json' }]],
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } }
  ]
});
```

### Flujos E2E Críticos (20 specs)

| # | Flujo | Módulo | Prioridad |
|---|-------|--------|-----------|
| 1 | Login → Dashboard | auth | CRITICA |
| 2 | Crear evento completo | eventos | CRITICA |
| 3 | Agregar ingreso con OCR | eventos | CRITICA |
| 4 | Agregar gasto con OCR | eventos | CRITICA |
| 5 | Workflow de evento | eventos | ALTA |
| 6 | Crear cotización → evento | cotizaciones | ALTA |
| 7 | Reservar stock para evento | inventario | ALTA |
| 8 | Checklist pre/post evento | inventario | ALTA |
| 9 | Crear OC → recepción | compras | ALTA |
| 10 | Generar factura CFDI | facturacion | ALTA |
| 11 | Crear póliza contable | contabilidad | MEDIA |
| 12 | Proceso de nómina | rrhh | MEDIA |
| 13 | Venta POS completa | pos | MEDIA |
| 14 | Pipeline CRM | crm | MEDIA |
| 15 | Solicitud de compra | portal | MEDIA |
| 16 | Proyecto con Gantt | proyectos | MEDIA |
| 17 | Transferencia entre almacenes | inventario | MEDIA |
| 18 | Reconciliación bancaria | tesoreria | BAJA |
| 19 | Reporte personalizado | reportes | BAJA |
| 20 | Búsqueda global | core | BAJA |

---

## CI/CD PIPELINE

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test-unit:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit
      - uses: codecov/codecov-action@v3

  test-integration:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: supabase/postgres:15
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:integration

  test-e2e:
    runs-on: ubuntu-latest
    needs: [test-unit, test-integration]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  deploy-staging:
    runs-on: ubuntu-latest
    needs: test-e2e
    if: github.ref == 'refs/heads/develop'
    steps:
      - run: echo "Deploy to staging..."

  deploy-production:
    runs-on: ubuntu-latest
    needs: test-e2e
    if: github.ref == 'refs/heads/main'
    steps:
      - run: echo "Deploy to production..."
```

---

## CRONOGRAMA VISUAL

```
2025
         ENE       FEB       MAR       ABR       MAY       JUN       JUL       AGO
Week:  1 2 3 4 | 5 6 7 8 | 9 10 11 12| 13 14 15 16| 17 18 19 20| 21 22 23 24| 25 26 27 28| 29 30 31 32
       ─────────────────────────────────────────────────────────────────────────────────────────────────
FASE 1 ████████
       Bugs, Refactor, Validaciones

FASE 2         ████████████████████████
               Calendario, Notificaciones, Reportes, Contabilidad

FASE 3                                 ████████████████████
                                       Integraciones entre módulos

FASE 4                                                     ████████████████████████████
                                                           Tesorería, RRHH, POS, CRM, Reportes

FASE 5                                                                                 ████████████
                                                                                       PWA, IA, Chatbot

HITOS:  ▼           ▼               ▼                  ▼                       ▼              ▼
       v1.1        v1.2            v1.3              v1.4                     v1.5           v2.0
       Estable     Core            Integrado         Completo                 Mobile         IA
```

---

## METRICAS DE EXITO

### KPIs del Proyecto

| Métrica | Objetivo | Medición |
|---------|----------|----------|
| Cobertura de código | > 80% | Codecov |
| Bugs críticos | 0 | Jira/GitHub Issues |
| Tiempo de build | < 3 min | GitHub Actions |
| Lighthouse score | > 90 | Lighthouse CI |
| Uptime | > 99.5% | Monitoring |
| Tiempo respuesta API | < 200ms | APM |

### KPIs de Negocio

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Módulos funcionales | 8/18 | 18/18 |
| Usuarios concurrentes | 10 | 50+ |
| Tiempo de capacitación | 2 semanas | 3 días |
| Errores reportados/mes | 15 | < 3 |
| Satisfacción usuario | 70% | > 90% |

---

## RIESGOS Y MITIGACION

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Scope creep | Alta | Alto | Sprints fijos, backlog priorizado |
| Deuda técnica | Media | Alto | Code reviews, refactor continuo |
| Integración PAC | Media | Alto | Sandbox testing, fallbacks |
| Performance BD | Baja | Alto | Índices, queries optimizadas |
| Rotación personal | Baja | Medio | Documentación, pair programming |

---

## EQUIPO SUGERIDO

| Rol | Cantidad | Responsabilidades |
|-----|----------|-------------------|
| **Tech Lead** | 1 | Arquitectura, code review, decisiones técnicas |
| **Full Stack Sr** | 2 | Desarrollo core, integraciones |
| **Full Stack Jr** | 1 | Features secundarias, fixes |
| **QA Engineer** | 1 | Testing, automatización |
| **DevOps** | 0.5 | CI/CD, infraestructura |

**Total:** 4.5 FTE

---

## ENTREGABLES POR FASE

### Fase 1 - Estabilización
- [ ] Cero bugs críticos
- [ ] Componentes refactorizados (< 500 líneas)
- [ ] 60% cobertura de pruebas
- [ ] Documentación de arquitectura

### Fase 2 - Core
- [ ] Calendario de eventos funcional
- [ ] Sistema de notificaciones
- [ ] Exportación PDF/Excel
- [ ] Reportes contables completos
- [ ] 70% cobertura de pruebas

### Fase 3 - Integración
- [ ] Módulos interconectados
- [ ] Búsqueda global
- [ ] Importación masiva
- [ ] 75% cobertura de pruebas

### Fase 4 - Secundarios
- [ ] Tesorería completa
- [ ] Nómina automática
- [ ] POS mejorado
- [ ] Constructor de reportes
- [ ] 80% cobertura de pruebas

### Fase 5 - Innovación
- [ ] PWA funcionando
- [ ] IA básica implementada
- [ ] Integraciones externas
- [ ] Chatbot operativo
- [ ] 85% cobertura de pruebas

---

## PRESUPUESTO DETALLADO

### Por Fase

| Fase | Horas | Costo Dev ($50/h) | Costo QA ($40/h) | Total |
|------|-------|-------------------|------------------|-------|
| F1 | 80h | $4,000 | $800 | $4,800 |
| F2 | 160h | $8,000 | $1,600 | $9,600 |
| F3 | 120h | $6,000 | $1,200 | $7,200 |
| F4 | 200h | $10,000 | $2,000 | $12,000 |
| F5 | 95h | $4,750 | $950 | $5,700 |
| **Total** | **655h** | **$32,750** | **$6,550** | **$39,300** |

### Costos Adicionales

| Concepto | Costo Mensual | Total 8 meses |
|----------|---------------|---------------|
| Supabase Pro | $25 | $200 |
| PAC (Finkok) | $50 | $400 |
| Google Vision API | $30 | $240 |
| OpenAI API | $50 | $400 |
| Monitoring (Sentry) | $26 | $208 |
| CI/CD (GitHub) | $0 | $0 |
| **Subtotal** | | **$1,448** |

### Total Proyecto

| Concepto | Monto |
|----------|-------|
| Desarrollo | $32,750 |
| QA | $6,550 |
| Servicios | $1,448 |
| Contingencia (10%) | $4,075 |
| **TOTAL** | **$44,823 USD** |

---

## APROBACIONES

### Firmas Requeridas

| Rol | Nombre | Fecha | Firma |
|-----|--------|-------|-------|
| **Sponsor del Proyecto** | _________________ | _______ | _______ |
| **Product Owner** | _________________ | _______ | _______ |
| **Tech Lead** | _________________ | _______ | _______ |
| **QA Lead** | _________________ | _______ | _______ |

---

## SIGUIENTE PASO

1. **Revisar** este plan y hacer ajustes necesarios
2. **Aprobar** el alcance y presupuesto
3. **Iniciar** Fase 1 - Sprint 1

---

*Documento generado: Diciembre 2024*
*Próxima revisión: Al inicio de cada fase*
