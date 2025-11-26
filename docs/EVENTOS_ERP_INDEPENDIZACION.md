# Plan de Independización: EVENTOS-ERP

## Estado Actual

### Problema Principal
El módulo `eventos-erp` **NO es independiente** de `eventos`. Actualmente:
- **78 referencias** a tablas `evt_*` (producción) dentro de `eventos-erp`
- **25 archivos** afectados
- Los responsables usan `users_erp` en lugar de `cont_ejecutivos`

### Archivos con Referencias Incorrectas

| Archivo | Referencias a evt_* |
|---------|---------------------|
| hooks/useClients.ts | evt_clientes, evt_eventos |
| hooks/useEventStates.ts | evt_estados |
| hooks/useEventTypes.ts | evt_tipos_evento |
| hooks/useEventDocuments.ts | evt_documentos |
| hooks/useCuentasContables.ts | evt_cuentas_contables |
| GastoModal.tsx | evt_categorias_gastos, evt_gastos |
| EventFormPage.tsx | evt_eventos |
| CatalogosPage.tsx | evt_clientes, evt_tipos_evento, evt_categorias_gastos |
| ClientesListPage.tsx | evt_eventos |
| EventoModal.tsx | evt_clientes, evt_eventos |
| components/documents/* | evt_documentos |
| components/workflow/* | evt_estados |

---

## Mapeo de Tablas: evt_* → *_erp

| Tabla Producción (evt_*) | Tabla ERP (*_erp) | Estado |
|--------------------------|-------------------|--------|
| evt_eventos | eventos_erp | Vacía (0) |
| evt_clientes | clientes_erp | Vacía (0) |
| evt_gastos | gastos_erp | Vacía (0) |
| evt_ingresos | ingresos_erp | Vacía (0) |
| evt_estados | estados_erp | ✅ 18 registros |
| evt_tipos_evento | tipos_eventos_erp | ✅ 16 registros |
| evt_categorias_gastos | categorias_gastos_erp | Vacía (0) |
| evt_cuentas_contables | cuentas_contables_erp | Vacía (0) |
| evt_documentos | documentos_erp | Vacía (0) |
| core_users / users_erp | cont_ejecutivos | ✅ 26 registros |

---

## Cambio de Responsables: users_erp → cont_ejecutivos

### Situación Actual
```typescript
// eventsService.ts - ACTUAL
.select('*, responsable:users_erp(*), ...')

// invoiceService.ts - ACTUAL
responsable:users_erp(id, nombre, email)
```

### Cambio Requerido
```typescript
// eventsService.ts - NUEVO
.select('*, responsable:cont_ejecutivos(*), ...')

// Las columnas responsable_id deben apuntar a cont_ejecutivos
```

### Beneficios
- **Ejecutivos** = Empleados que pueden ser responsables de eventos, gastos, ingresos
- Los 26 ejecutivos ya están cargados en `cont_ejecutivos`
- Permite usar los mismos responsables en GNI y Eventos-ERP
- No depende de que el empleado tenga usuario del sistema

---

## Plan de Acción

### Fase 1: Preparar Catálogos ERP
```sql
-- 1. Copiar categorías de gastos
INSERT INTO categorias_gastos_erp (nombre, color, descripcion, activo, company_id)
SELECT nombre, color, descripcion, activo, '00000000-0000-0000-0000-000000000001'
FROM evt_categorias_gastos;

-- 2. Copiar cuentas contables
INSERT INTO cuentas_contables_erp (codigo, nombre, tipo, nivel, padre_id, activo, company_id)
SELECT codigo, nombre, tipo, nivel, padre_id, activo, '00000000-0000-0000-0000-000000000001'
FROM evt_cuentas_contables;
```

### Fase 2: Migrar Servicios (buscar/reemplazar)

| Buscar | Reemplazar |
|--------|------------|
| `evt_eventos` | `eventos_erp` |
| `evt_clientes` | `clientes_erp` |
| `evt_gastos` | `gastos_erp` |
| `evt_ingresos` | `ingresos_erp` |
| `evt_estados` | `estados_erp` |
| `evt_tipos_evento` | `tipos_eventos_erp` |
| `evt_categorias_gastos` | `categorias_gastos_erp` |
| `evt_cuentas_contables` | `cuentas_contables_erp` |
| `evt_documentos` | `documentos_erp` |
| `users_erp` (responsable) | `cont_ejecutivos` |
| `vw_eventos_completos` | `vw_eventos_completos_erp` |
| `vw_dashboard_metricas` | `vw_dashboard_metricas_erp` |

### Fase 3: Actualizar Vistas ERP
Las vistas `*_erp` deben apuntar a las tablas `*_erp`, no a `evt_*`.

### Fase 4: Agregar columna ejecutivo_id
```sql
-- En eventos_erp, gastos_erp, ingresos_erp
ALTER TABLE eventos_erp ADD COLUMN ejecutivo_id INTEGER REFERENCES cont_ejecutivos(id);
ALTER TABLE gastos_erp ADD COLUMN ejecutivo_id INTEGER REFERENCES cont_ejecutivos(id);
ALTER TABLE ingresos_erp ADD COLUMN ejecutivo_id INTEGER REFERENCES cont_ejecutivos(id);
```

---

## Estructura Final Esperada

### Módulo EVENTOS (Producción - SIN TOCAR)
```
Tablas: evt_*
- evt_eventos (144 registros)
- evt_clientes (6)
- evt_gastos (1,152)
- evt_ingresos (1,152)
- evt_estados (12)
Responsables: usuarios del sistema (users)
```

### Módulo EVENTOS-ERP (Desarrollo → Producción)
```
Tablas: *_erp
- eventos_erp
- clientes_erp
- gastos_erp
- ingresos_erp
- estados_erp (18)
- tipos_eventos_erp (16)
Responsables: cont_ejecutivos (26)
```

### Módulo CONTABILIDAD-ERP (GNI)
```
Tablas: cont_*
- cont_gastos_externos (1,989)
- cont_claves_gasto (58)
- cont_formas_pago (25)
- cont_proveedores (240+)
- cont_ejecutivos (26) ← Compartido con eventos-erp
```

---

## Orden de Ejecución

1. **Cargar catálogos** en tablas `*_erp` vacías
2. **Actualizar código** (78 referencias en 25 archivos)
3. **Actualizar vistas** para usar tablas `*_erp`
4. **Agregar ejecutivo_id** a eventos/gastos/ingresos_erp
5. **Probar** módulo eventos-erp
6. **Ocultar** módulo eventos antiguo del menú

---

## Archivos a Modificar (Lista Completa)

### Hooks (5 archivos)
- [ ] `src/modules/eventos-erp/hooks/useClients.ts`
- [ ] `src/modules/eventos-erp/hooks/useEventStates.ts`
- [ ] `src/modules/eventos-erp/hooks/useEventTypes.ts`
- [ ] `src/modules/eventos-erp/hooks/useEventDocuments.ts`
- [ ] `src/modules/eventos-erp/hooks/useCuentasContables.ts`

### Services (7 archivos)
- [ ] `src/modules/eventos-erp/services/eventsService.ts`
- [ ] `src/modules/eventos-erp/services/financesService.ts`
- [ ] `src/modules/eventos-erp/services/clientsService.ts`
- [ ] `src/modules/eventos-erp/services/invoiceService.ts`
- [ ] `src/modules/eventos-erp/services/workflowService.ts`
- [ ] `src/modules/eventos-erp/services/proyectosEventosService.ts`
- [ ] `src/modules/eventos-erp/services/financialExportService.ts`

### Pages (4 archivos)
- [ ] `src/modules/eventos-erp/EventFormPage.tsx`
- [ ] `src/modules/eventos-erp/ClientesListPage.tsx`
- [ ] `src/modules/eventos-erp/CatalogosPage.tsx`
- [ ] `src/modules/eventos-erp/GastoModal.tsx`
- [ ] `src/modules/eventos-erp/pages/EventFormPage.tsx`
- [ ] `src/modules/eventos-erp/pages/EventsListPage.tsx`

### Components (8 archivos)
- [ ] `src/modules/eventos-erp/components/EventoModal.tsx`
- [ ] `src/modules/eventos-erp/components/EventoDetailModal.tsx`
- [ ] `src/modules/eventos-erp/components/WorkflowStatusManager.tsx`
- [ ] `src/modules/eventos-erp/components/documents/DocumentosEvento.tsx`
- [ ] `src/modules/eventos-erp/components/documents/EventDocumentUpload.tsx`
- [ ] `src/modules/eventos-erp/components/finances/DualOCRExpenseForm.tsx`
- [ ] `src/modules/eventos-erp/components/workflow/EventStateManager.tsx`
- [ ] `src/modules/eventos-erp/components/workflow/WorkflowVisualizationPage.tsx`
- [ ] `src/modules/eventos-erp/components/accounting/*.tsx`

### Types (2 archivos)
- [ ] `src/modules/eventos-erp/types/Finance.ts`
- [ ] `src/modules/eventos-erp/types/database.types.ts`

---

## Estimación

- **Cambios de código**: ~78 referencias en ~25 archivos
- **Migraciones SQL**: 4-5 scripts
- **Vistas a actualizar**: 5 vistas
- **Riesgo**: Bajo (tablas ERP vacías, no hay datos que perder)
