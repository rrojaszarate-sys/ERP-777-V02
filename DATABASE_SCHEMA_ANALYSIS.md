# ERP-777 V01 - Database Schema & Types Analysis

## Executive Summary
This analysis covers the database schema and TypeScript type definitions for a comprehensive ERP system with multiple modules. The analysis includes 21 modules with 42+ type definition files and 10 migration files defining the data model.

---

## MODULE ANALYSIS

### 1. EVENTOS (Events Module)
**Tables/Entities:**
- `evt_eventos` - Main event/project records
- `evt_clientes` - Customers (clients)
- `evt_ingresos` - Event income/invoices
- `evt_gastos` - Event expenses
- `evt_cuentas` - Chart of accounts (shared)
- `evt_documentos` - Attached documents

**Relationships:**
- evt_eventos → evt_clientes (cliente_id) ✅
- evt_eventos → evt_usuarios (responsable_id, solicitante_id) ✅
- evt_ingresos → evt_eventos (evento_id) ✅
- evt_gastos → evt_eventos (evento_id) ✅
- evt_ingresos → evt_cuentas (cuenta_id, cuenta_contable_ingreso_id) ✅
- evt_gastos → evt_cuentas (cuenta_id, cuenta_contable_gasto_id) ✅

**Naming Conventions:** snake_case (consistent)

**Issues Found:**
- ⚠️ Missing relationship: evt_ingresos lacks direct FK to evt_clientes (has cliente_id but not enforced)
- ⚠️ Missing relationship: evt_gastos lacks proveedor_id FK to a proveedores table
- ⚠️ Type file Event.ts defines `Cliente` interface but database may not enforce referential integrity
- ⚠️ Estimated vs. Actual fields: `ganancia_estimada` vs `utilidad` could be denormalized

---

### 2. INVENTARIO (Inventory Module)
**Tables/Entities:**
- `inv_productos` - Products
- `inv_categorias_productos` - Product categories
- `inv_unidades_medida` - Units of measurement
- `inv_almacenes` - Warehouses
- `inv_ubicaciones` - Storage locations
- `inv_movimientos` - Inventory movements
- `inv_movimientos_detalle` - Movement line items
- `inv_existencias` - Stock levels
- `inv_lotes` - Batch/lot tracking
- `inv_series` - Serial number tracking
- `inv_conteos` - Physical counts
- `inv_conteos_detalle` - Count detail lines

**Relationships:**
- inv_productos → inv_categorias_productos (categoria_id) ✅
- inv_productos → inv_unidades_medida (unidad_medida_id) ✅
- inv_movimientos → inv_almacenes (almacen_origen_id, almacen_destino_id) ✅
- inv_movimientos_detalle → inv_movimientos (movimiento_id) ✅
- inv_movimientos_detalle → inv_productos (producto_id) ✅
- inv_existencias → inv_productos (producto_id) ✅
- inv_existencias → inv_almacenes (almacen_id) ✅
- inv_lotes → inv_productos (producto_id) ✅
- inv_lotes → inv_almacenes (almacen_id) ✅
- inv_series → inv_productos (producto_id) ✅
- inv_conteos → inv_almacenes (almacen_id) ✅
- inv_conteos_detalle → inv_conteos (conteo_id) ✅

**Naming Conventions:** snake_case (consistent)

**3NF Issues:**
- ⚠️ inv_existencias stores `costo_total` which is derived (cantidad × costo_promedio)
- ⚠️ inv_existencias stores `costo_promedio` which should be calculated from movements
- ⚠️ inv_productos stores `margen_utilidad` which is derived from `precio_venta` and `costo_actual`
- ⚠️ Missing relationships: inv_movimientos lacks direct FK to source documents (compras, ventas, ajustes)

**Missing Relationships:**
- inv_movimientos should link to `ord_compras` (purchase orders)
- inv_movimientos should link to `pos_ventas` or `evt_eventos` (sales origin)
- inv_ubicaciones lacks composite index on (almacen_id, codigo) for uniqueness

---

### 3. COMPRAS (Purchasing Module)
**Tables/Entities:**
- `com_proveedores` - Suppliers
- `com_contactos_proveedor` - Supplier contacts
- `com_productos_proveedor` - Product-supplier mappings
- `com_ordenes_compra` - Purchase orders
- `com_ordenes_compra_detalle` - PO line items

**Relationships:**
- com_ordenes_compra → com_proveedores (proveedor_id) ✅
- com_ordenes_compra_detalle → com_ordenes_compra (orden_compra_id) ✅
- com_ordenes_compra_detalle → inv_productos (producto_id) ✅
- com_contactos_proveedor → com_proveedores (proveedor_id) ✅
- com_productos_proveedor → com_proveedores (proveedor_id) ✅
- com_productos_proveedor → inv_productos (producto_id) ✅

**Naming Conventions:** snake_case (consistent)

**Missing Relationships:**
- ⚠️ com_ordenes_compra lacks FK to inv_almacenes (almacen_destino_id should be enforced)
- ⚠️ com_ordenes_compra should link to evt_eventos (if purchase is event-related)
- ⚠️ Missing table: `com_recepcion_ordenes` - should track PO receipt status

**3NF Issues:**
- ⚠️ Proveedor type stores full address fields (calle, numero_exterior, etc.) - should normalize to addresses table
- ⚠️ No separation of address types (shipping vs. billing)

---

### 4. RRHH (Human Resources Module)
**Tables/Entities:**
- `rh_empleados` - Employees
- `rh_departamentos` - Departments
- `rh_puestos` - Job positions
- `rh_conceptos_nomina` - Payroll concepts
- `rh_nominas` - Payroll batches
- `rh_nominas_detalle` - Employee payroll details
- `rh_nominas_conceptos` - Payroll concept lines

**Relationships:**
- rh_empleados → rh_departamentos (departamento_id) ✅
- rh_empleados → rh_puestos (puesto_id) ✅
- rh_puestos → rh_departamentos (departamento_id) ✅
- rh_nominas_detalle → rh_nominas (nomina_id) ✅
- rh_nominas_detalle → rh_empleados (empleado_id) ✅
- rh_nominas_conceptos → rh_nominas_detalle (nomina_detalle_id) ✅
- rh_nominas_conceptos → rh_conceptos_nomina (concepto_id) ✅

**Naming Conventions:** snake_case (consistent)

**Missing Relationships:**
- ⚠️ rh_empleados should have FK to usuarios (user_id) for authentication
- ⚠️ rh_nominas lacks FK to core_usuarios (creado_por, confirmado_por)
- ⚠️ Missing table: `rh_incapacidades` - sick leave tracking
- ⚠️ Missing table: `rh_vacaciones` - vacation tracking
- ⚠️ Missing table: `rh_capacitacion` - training records

**3NF Issues:**
- ⚠️ Empleado type stores full address fields - should normalize to addresses table
- ⚠️ Empleado stores multiple phone types (telefono, celular) but no normalized contact table
- ⚠️ ContactoEmergencia data embedded - should be separate table with relationship types

---

### 5. CRM (Customer Relationship Management)
**Tables/Entities:**
- `crm_leads` - Sales leads
- `crm_oportunidades` - Sales opportunities
- `crm_etapas_pipeline` - Pipeline stages
- `crm_actividades` - Activities/tasks
- `crm_campanias` - Marketing campaigns

**Relationships:**
- crm_oportunidades → crm_leads (lead_id) ✅
- crm_oportunidades → evt_clientes (cliente_id) ✅
- crm_oportunidades → crm_etapas_pipeline (etapa_id) ✅
- crm_actividades → crm_leads (lead_id) ✅
- crm_actividades → crm_oportunidades (oportunidad_id) ✅
- crm_leads → crm_campanias (campania_id) ✅

**Naming Conventions:** snake_case (consistent)

**Missing Relationships:**
- ⚠️ crm_actividades should link to core_usuarios (asignado_a should be FK)
- ⚠️ crm_leads should link to evt_clientes (when converted, should have FK)
- ⚠️ Missing relationship: crm_oportunidades → evt_eventos (after conversion to event)

**3NF Issues:**
- ⚠️ Lead type stores addresses inline - should normalize
- ⚠️ Oportunidad stores competitor name as string, not FK to competitors table (missing entity)
- ⚠️ Campaign metrics (num_leads_generados, num_conversiones) are denormalized - should be calculated from joins

---

### 6. POS (Point of Sale Module)
**Tables/Entities:**
- `pos_cajas` - Cash registers
- `pos_turnos_caja` - Cash drawer shifts
- `pos_ventas` - Sales transactions
- `pos_ventas_detalle` - Sale line items
- `pos_devoluciones` - Returns
- `pos_devoluciones_detalle` - Return line items

**Relationships:**
- pos_turnos_caja → pos_cajas (caja_id) ✅
- pos_turnos_caja → core_usuarios (cajero_id) ✅
- pos_ventas → pos_turnos_caja (turno_caja_id) ✅
- pos_ventas → evt_clientes (cliente_id) ✅
- pos_ventas_detalle → pos_ventas (venta_id) ✅
- pos_ventas_detalle → inv_productos (producto_id) ✅
- pos_devoluciones → pos_ventas (venta_id) ✅

**Naming Conventions:** snake_case (consistent)

**Missing Relationships:**
- ⚠️ pos_ventas_detalle lacks FK to inv_almacenes (almacen_id should be enforced)
- ⚠️ pos_ventas_detalle stores lote_id but no FK to inv_lotes
- ⚠️ pos_cajas should have FK to locaciones (sucursal)
- ⚠️ Missing relationship: pos_ventas → evt_eventos (if sale is event-related)

**3NF Issues:**
- ⚠️ VentaPOSDetalle stores calculated fields: subtotal, iva, total (derived from precio × cantidad + taxes)
- ⚠️ pos_cajas stores derived field: diferencia (monto_final - monto_esperado)
- ⚠️ TurnoCaja stores aggregated totals: total_efectivo, total_tarjeta (should be calculated from sales)

---

### 7. CONTABILIDAD (Accounting Module) - CRITICAL FOR NORMALIZATION
**Tables/Entities:**
- `evt_cuentas` - Chart of accounts (hierarchical)
- `cont_movimientos_bancarios` - Bank movements
- `cont_asientos_contables` - Journal entries (headers)
- `cont_partidas` - Journal entry lines
- `cont_ingresos_externos` - External income (non-event)
- `cont_gastos_externos` - External expenses (non-event)
- `cont_documentos` - Supporting documents
- `cont_auditoria_modificaciones` - Change audit trail

**Relationships:**
- cont_asientos_contables → cont_partidas (asiento_id) ✅
- cont_partidas → evt_cuentas (cuenta_id) ✅
- cont_movimientos_bancarios → evt_cuentas (cuenta_origen_id, cuenta_destino_id) ✅
- cont_ingresos_externos → evt_cuentas (cuenta_id, cuenta_contable_ingreso_id) ✅
- cont_gastos_externos → evt_cuentas (cuenta_id, cuenta_contable_gasto_id) ✅
- cont_documentos → multiple tables (polymorphic reference via referencia_tabla/referencia_id) ⚠️

**Naming Conventions:** Mixed - some snake_case, some PostgreSQL conventions

**Major 3NF Issues:**
1. **Polymorphic Foreign Keys (PROBLEMATIC):**
   - cont_documentos uses (referencia_tabla, referencia_id) instead of proper FK
   - cont_asientos_contables uses (referencia_tabla, referencia_id) instead of proper FK
   - cont_movimientos_bancarios uses (referencia_tabla, referencia_id) instead of proper FK
   - This violates referential integrity and makes queries difficult

2. **Denormalization in cont_partidas:**
   - Should NOT store both (debe, haber) - violates BCNF
   - Should have one table with signed_amount field or separate MUST/CREDIT tables

3. **Hierarchical Account Structure:**
   - evt_cuentas.cuenta_padre_id creates hierarchy but can cause circular references
   - Missing constraint to prevent cycles
   - Self-referential design is anti-pattern for accounting systems

4. **Missing Normalization:**
   - evt_cuentas mixes different types of information (estructura, cálculos, control)
   - Should separate: CatalogoCuentas, ConfiguracionCuenta, SaldoCuenta

---

## CROSS-MODULE RELATIONSHIPS

### Critical Missing Links:
1. **evt_clientes ↔ com_proveedores:**
   - Should have FK `supplier_id` if they also supply
   - Missing normalized party/entity table

2. **evt_ingresos ↔ evt_gastos:**
   - No relationship tracking expenses to income they offset
   - Missing cost allocation table

3. **pos_ventas ↔ evt_eventos:**
   - POS sales should link to events (currently optional evento_id)
   - Should determine business logic

4. **rh_nominas ↔ evt_gastos:**
   - Payroll should create automatic expense records
   - Currently no direct relationship

5. **com_ordenes_compra ↔ inv_movimientos:**
   - PO receipt should trigger inventory movement
   - Missing materialized receipt table

---

## NAMING INCONSISTENCIES

### Database Level Issues:

| Issue | Example | Problem |
|-------|---------|---------|
| Prefix inconsistency | `evt_*`, `cont_*`, `inv_*`, etc. | Each module uses different prefix |
| ID field naming | Mixed `id` types (INT, UUID) | Should standardize on UUID |
| Boolean naming | `cobrado`, `facturado`, `pagado` | Inconsistent past tense |
| Date field naming | `fecha_*`, `created_at`, `updated_at` | Mixed naming conventions |
| FK naming | `evento_id`, `proveedor_id`, `cuenta_id` | Inconsistent suffixes |

### TypeScript Level Issues:

| Issue | Example | Problem |
|-------|---------|---------|
| Type duplication | `Event` and `EventoCompleto` | Inheritance not used |
| Interface vs Type | Mix of both in same files | Should standardize |
| Enum definition | Some use `const`, some use `enum` | Inconsistent patterns |
| DTO naming | `ProductoInsert`, `EventoCompleto` | No consistent pattern |
| Optional fields | Excessive use of `?` | Missing "required" validation |

---

## RECOMMENDATIONS FOR 3NF NORMALIZATION

### PRIORITY 1: CRITICAL - Accounting Module

**Issue: Polymorphic Foreign Keys**
```sql
-- CURRENT (WRONG):
cont_documentos.referencia_tabla VARCHAR(50)
cont_documentos.referencia_id INTEGER

-- RECOMMENDED (3NF COMPLIANT):
-- Option A: Create proper foreign key tables
cont_documentos_ingresos (documento_id, ingreso_id) FK both
cont_documentos_gastos (documento_id, gasto_id) FK both
cont_documentos_asientos (documento_id, asiento_id) FK both

-- Option B: Create base document with inheritance
documentos (id, tipo, ...)
cont_documentos_ingresos (documento_id FK, ingreso_id FK)
cont_documentos_gastos (documento_id FK, gasto_id FK)
```

**Issue: Partida Table Design**
```sql
-- CURRENT (VIOLATES BCNF):
cont_partidas (debe NUMERIC, haber NUMERIC)
-- Problem: One row stores two different types of data

-- RECOMMENDED (BCNF COMPLIANT):
-- Option A: Signed amount
cont_partidas (
  id, asiento_id FK, cuenta_id FK,
  monto NUMERIC, -- positive for debe, negative for haber
  tipo VARCHAR(6) CHECK (tipo IN ('DEBE','HABER'))
)

-- Option B: Separate tables (purest 3NF)
cont_debe (id, asiento_id FK, cuenta_id FK, monto NUMERIC)
cont_haber (id, asiento_id FK, cuenta_id FK, monto NUMERIC)
```

**Issue: Hierarchical Accounts**
```sql
-- RECOMMENDED: Use proper hierarchical structure with validation
evt_cuentas (
  id, codigo, nombre, tipo, subtipo, naturaleza, moneda,
  cuenta_padre_id FK (with constraint preventing cycles),
  nivel INT CHECK (nivel BETWEEN 1 AND 5),
  CONSTRAINT no_circular_hierarchy CHECK (...)
)

-- Add validation trigger:
CREATE FUNCTION validate_account_hierarchy() ...
-- Prevent more than 5 levels
-- Prevent circular references
-- Prevent parent-child conflicts
```

---

### PRIORITY 2: HIGH - Customer & Supplier Management

**Create Normalized Party/Entity Table:**
```sql
-- Consolidate party information
entidades (
  id UUID PRIMARY KEY,
  tipo ENUM('CLIENTE','PROVEEDOR','EMPLEADO','INTERNO'),
  razon_social VARCHAR,
  rfc VARCHAR UNIQUE,
  -- Common fields only
  created_at TIMESTAMPTZ
)

-- Link specific details
entidades_clientes (entidad_id FK, ...)
entidades_proveedores (entidad_id FK, ...)

-- Normalize addresses
entidades_direcciones (
  id, entidad_id FK,
  tipo ENUM('FISCAL','ENTREGA','OFICINA'),
  calle, numero, etc
)

-- Normalize contacts
entidades_contactos (
  id, entidad_id FK,
  tipo ENUM('EMAIL','TELEFONO','CELULAR'),
  valor VARCHAR
)
```

---

### PRIORITY 3: HIGH - Inventory Module

**Remove Denormalized Fields:**
```sql
-- REMOVE these calculated fields:
inv_existencias.costo_total -- Calculate: cantidad × costo_promedio
inv_productos.margen_utilidad -- Calculate: (precio_venta - costo_actual) / costo_actual
inv_existencias.costo_promedio -- KEEP but recalculate from movements

-- REMOVE aggregations:
pos_turnos_caja.total_efectivo -- Calculate from pos_ventas
pos_turnos_caja.total_tarjeta -- Calculate from pos_ventas

-- Create normalized costing table:
inv_costo_producto (
  id, producto_id FK, almacen_id FK,
  metodo_valuacion ENUM('PEPS','UEPS','PROMEDIO'),
  costo_promedio NUMERIC,
  fecha_actualizacion TIMESTAMPTZ
)
```

---

### PRIORITY 4: MEDIUM - POS Module

**Create Proper Receipt Tracking:**
```sql
-- Create receipt header-detail structure
com_recepciones (
  id, orden_compra_id FK,
  fecha_recepcion DATE,
  almacen_destino_id FK,
  estado ENUM('PARCIAL','COMPLETA','RECHAZADA'),
  notas TEXT
)

com_recepciones_detalle (
  id, recepcion_id FK,
  orden_detalle_id FK,
  cantidad_recibida NUMERIC,
  cantidad_conforme NUMERIC
)

-- Link to inventory movements:
inv_movimientos.recepcion_id FK com_recepciones
```

---

### PRIORITY 5: MEDIUM - Payroll Module

**Create Proper Concept Structure:**
```sql
-- Current issue: Nested concepts in JSON or multiple rows
-- Better structure:
rh_nominas_lineas (
  id, nomina_detalle_id FK,
  concepto_id FK,
  monto NUMERIC,
  gravado NUMERIC,
  exento NUMERIC,
  porcentaje NUMERIC
)

-- Add proper validation:
CONSTRAINT concepto_aplicable_check
-- Validate concepto type (PERCEPCION/DEDUCCION)
-- Validate applicability by employee type
-- Validate tax implications
```

---

### PRIORITY 6: MEDIUM - Event-Related Expense Allocation

**Create Cost Allocation Table:**
```sql
-- Link expenses to events properly
evt_gastos_asignacion (
  id,
  gasto_id FK evt_gastos,
  evento_id FK evt_eventos,
  porcentaje NUMERIC,
  monto NUMERIC GENERATED AS (gasto.total × porcentaje),
  CONSTRAINT valid_percentage CHECK (porcentaje BETWEEN 0 AND 100)
)

-- Allows partial allocation of shared expenses
-- Ensures EVT_GASTOS.total = SUM(asignaciones.monto)
```

---

## SUMMARY TABLE: Data Model Quality

| Module | Entities | FKs | 3NF Compliance | Missing Links | Priority |
|--------|----------|-----|---|---|---|
| Eventos | 6 | 80% | GOOD | proveedor link | LOW |
| Inventario | 11 | 85% | GOOD | PO→Movement | MED |
| Compras | 5 | 90% | GOOD | Recepción table | MED |
| RRHH | 7 | 80% | FAIR | User link | MED |
| CRM | 5 | 75% | FAIR | User FK | MED |
| POS | 6 | 80% | GOOD | Almacén FK | MED |
| Contabilidad | 8 | 50% | POOR | Polymorphic FKs | CRITICAL |

---

## KEY FINDINGS

### Strengths:
✅ Good overall entity separation per module  
✅ Consistent use of timestamps (created_at, updated_at)  
✅ Good index coverage for performance  
✅ Trigger-based audit trail implemented  
✅ TypeScript types well-documented  

### Critical Issues:
❌ Polymorphic foreign keys in accounting (cont_documentos, cont_asientos)  
❌ BCNF violation in cont_partidas (both debe and haber in one row)  
❌ Missing normalized addresses and contacts tables  
❌ Excessive denormalization in inventory and POS modules  
❌ No proper cost allocation table for expense distribution  

### High-Risk Areas:
⚠️ Accounting module referential integrity  
⚠️ Customer/Supplier/Party consolidation  
⚠️ Order receipt workflow gap  
⚠️ Payroll concept validation  
⚠️ Circular account hierarchy possibility  

---

## IMPLEMENTATION ROADMAP

### Phase 1 (Week 1): Foundation
1. Create entidades + relationships tables
2. Create proper hierarchical account structure
3. Fix polymorphic FK issues in accounting

### Phase 2 (Week 2): Normalization
4. Remove denormalized fields from inventory
5. Create proper receipt workflow
6. Add cost allocation table

### Phase 3 (Week 3): Validation & Migration
7. Add CHECK constraints for hierarchies
8. Add validation triggers
9. Migrate data with zero-downtime strategy

### Phase 4 (Week 4): Testing & Documentation
10. Write migration rollback procedures
11. Update type definitions
12. Test with production-like data volumes

---

