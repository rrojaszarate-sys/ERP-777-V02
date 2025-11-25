# ERP-777 V01 - Database Normalization Fixes Guide

## CRITICAL ISSUE #1: Polymorphic Foreign Keys in Accounting Module

### Problem Overview
The accounting module uses "polymorphic foreign keys" - storing a table name and ID pair instead of proper foreign keys. This violates referential integrity and makes queries complex.

**Current Anti-Pattern:**
```sql
-- WRONG: Polymorphic reference
CREATE TABLE cont_documentos (
  referencia_tabla VARCHAR(50),  -- 'evt_ingresos', 'evt_gastos', etc
  referencia_id INTEGER,         -- The actual ID in that table
  -- Database CAN'T enforce this relationship!
);
```

### Solution: Proper Normalized Foreign Keys

**Step 1: Create Junction Tables**
```sql
BEGIN;

-- For income-related documents
CREATE TABLE IF NOT EXISTS cont_documentos_ingresos (
  documento_id INTEGER REFERENCES cont_documentos(id) ON DELETE CASCADE,
  ingreso_id UUID REFERENCES evt_ingresos(id) ON DELETE CASCADE,
  PRIMARY KEY (documento_id, ingreso_id)
);

-- For expense-related documents
CREATE TABLE IF NOT EXISTS cont_documentos_gastos (
  documento_id INTEGER REFERENCES cont_documentos(id) ON DELETE CASCADE,
  gasto_id UUID REFERENCES evt_gastos(id) ON DELETE CASCADE,
  PRIMARY KEY (documento_id, gasto_id)
);

-- For journal entry supporting documents
CREATE TABLE IF NOT EXISTS cont_documentos_asientos (
  documento_id INTEGER REFERENCES cont_documentos(id) ON DELETE CASCADE,
  asiento_id INTEGER REFERENCES cont_asientos_contables(id) ON DELETE CASCADE,
  PRIMARY KEY (documento_id, asiento_id)
);

-- For external income documents
CREATE TABLE IF NOT EXISTS cont_documentos_ingresos_externos (
  documento_id INTEGER REFERENCES cont_documentos(id) ON DELETE CASCADE,
  ingreso_externo_id INTEGER REFERENCES cont_ingresos_externos(id) ON DELETE CASCADE,
  PRIMARY KEY (documento_id, ingreso_externo_id)
);

-- For external expense documents
CREATE TABLE IF NOT EXISTS cont_documentos_gastos_externos (
  documento_id INTEGER REFERENCES cont_documentos(id) ON DELETE CASCADE,
  gasto_externo_id INTEGER REFERENCES cont_gastos_externos(id) ON DELETE CASCADE,
  PRIMARY KEY (documento_id, gasto_externo_id)
);

COMMIT;
```

**Step 2: Remove problematic columns**
```sql
BEGIN;

-- AFTER migrating data to new junction tables:
ALTER TABLE cont_documentos
  DROP COLUMN IF EXISTS referencia_tabla,
  DROP COLUMN IF EXISTS referencia_id;

ALTER TABLE cont_asientos_contables
  DROP COLUMN IF EXISTS referencia_tabla,
  DROP COLUMN IF EXISTS referencia_id;

ALTER TABLE cont_movimientos_bancarios
  DROP COLUMN IF EXISTS referencia_tabla,
  DROP COLUMN IF EXISTS referencia_id;

COMMIT;
```

**Step 3: Migration Script (with data transfer)**
```sql
-- Data migration from polymorphic to normalized
BEGIN;

INSERT INTO cont_documentos_ingresos (documento_id, ingreso_id)
SELECT d.id, d.referencia_id::UUID
FROM cont_documentos d
WHERE d.referencia_tabla = 'evt_ingresos'
ON CONFLICT DO NOTHING;

INSERT INTO cont_documentos_gastos (documento_id, gasto_id)
SELECT d.id, d.referencia_id::UUID
FROM cont_documentos d
WHERE d.referencia_tabla = 'evt_gastos'
ON CONFLICT DO NOTHING;

INSERT INTO cont_documentos_asientos (documento_id, asiento_id)
SELECT d.id, d.referencia_id::INTEGER
FROM cont_documentos d
WHERE d.referencia_tabla = 'cont_asientos_contables'
ON CONFLICT DO NOTHING;

COMMIT;
```

---

## CRITICAL ISSUE #2: BCNF Violation in Journal Entry Lines (cont_partidas)

### Problem Overview
The `cont_partidas` table stores both DEBE and HABER amounts in the same row, which violates Boyce-Codd Normal Form (BCNF).

**Current Problem:**
```sql
-- WRONG: Mixing two different types of data
CREATE TABLE cont_partidas (
  id SERIAL,
  asiento_id INTEGER,
  cuenta_id INTEGER,
  debe NUMERIC DEFAULT 0,      -- Debit (left side)
  haber NUMERIC DEFAULT 0,     -- Credit (right side)
  -- Only one should be non-zero per row
);
```

This creates:
- Data integrity issues (hard to enforce "only one non-zero")
- Query complexity (must use CASE statements)
- Reporting confusion

### Solution Option A: Signed Amount (Recommended)
```sql
-- Drop old table and create normalized version
BEGIN;

-- Create new table with single amount field
CREATE TABLE IF NOT EXISTS cont_partidas_new (
  id SERIAL PRIMARY KEY,
  asiento_id INTEGER NOT NULL REFERENCES cont_asientos_contables(id) ON DELETE CASCADE,
  cuenta_id INTEGER NOT NULL REFERENCES evt_cuentas(id),
  tipo_linea CHAR(6) NOT NULL CHECK (tipo_linea IN ('DEBE', 'HABER')),
  monto NUMERIC NOT NULL CHECK (monto > 0),
  concepto TEXT,
  documento_id INTEGER REFERENCES cont_documentos(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure balance with trigger (still needed)
  CONSTRAINT asiento_balanceado CHECK (monto > 0)
);

-- Create index for performance
CREATE INDEX idx_cont_partidas_new_asiento ON cont_partidas_new(asiento_id);
CREATE INDEX idx_cont_partidas_new_cuenta ON cont_partidas_new(cuenta_id);

-- Copy data from old table
INSERT INTO cont_partidas_new (asiento_id, cuenta_id, tipo_linea, monto, concepto, documento_id)
SELECT 
  asiento_id,
  cuenta_id,
  CASE WHEN debe > 0 THEN 'DEBE' ELSE 'HABER' END,
  COALESCE(NULLIF(debe, 0), NULLIF(haber, 0)),
  concepto,
  documento_id
FROM cont_partidas
WHERE debe > 0 OR haber > 0;

-- Rename tables
ALTER TABLE cont_partidas RENAME TO cont_partidas_old;
ALTER TABLE cont_partidas_new RENAME TO cont_partidas;

COMMIT;
```

### Solution Option B: Pure Normalization (Purest 3NF)
```sql
-- Separate tables by transaction type
BEGIN;

-- Debit entries only
CREATE TABLE IF NOT EXISTS cont_partidas_debe (
  id SERIAL PRIMARY KEY,
  asiento_id INTEGER NOT NULL REFERENCES cont_asientos_contables(id) ON DELETE CASCADE,
  cuenta_id INTEGER NOT NULL REFERENCES evt_cuentas(id),
  monto NUMERIC NOT NULL CHECK (monto > 0),
  concepto TEXT,
  documento_id INTEGER REFERENCES cont_documentos(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(asiento_id, cuenta_id)  -- Prevent duplicate entries
);

-- Credit entries only
CREATE TABLE IF NOT EXISTS cont_partidas_haber (
  id SERIAL PRIMARY KEY,
  asiento_id INTEGER NOT NULL REFERENCES cont_asientos_contables(id) ON DELETE CASCADE,
  cuenta_id INTEGER NOT NULL REFERENCES evt_cuentas(id),
  monto NUMERIC NOT NULL CHECK (monto > 0),
  concepto TEXT,
  documento_id INTEGER REFERENCES cont_documentos(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(asiento_id, cuenta_id)  -- Prevent duplicate entries
);

-- Indexes for performance
CREATE INDEX idx_partidas_debe_asiento ON cont_partidas_debe(asiento_id);
CREATE INDEX idx_partidas_debe_cuenta ON cont_partidas_debe(cuenta_id);
CREATE INDEX idx_partidas_haber_asiento ON cont_partidas_haber(asiento_id);
CREATE INDEX idx_partidas_haber_cuenta ON cont_partidas_haber(cuenta_id);

-- View to maintain backward compatibility
CREATE VIEW cont_partidas AS
SELECT 
  id, asiento_id, cuenta_id,
  monto AS debe, 0 AS haber,
  concepto, documento_id, created_at
FROM cont_partidas_debe
UNION ALL
SELECT 
  id, asiento_id, cuenta_id,
  0 AS debe, monto AS haber,
  concepto, documento_id, created_at
FROM cont_partidas_haber;

COMMIT;
```

---

## CRITICAL ISSUE #3: Missing Hierarchical Account Validation

### Problem Overview
The `evt_cuentas` table allows circular references and unlimited nesting depth, which breaks accounting logic.

```sql
-- CURRENT: No validation
evt_cuentas (cuenta_padre_id REFERENCES evt_cuentas(id))
-- Can create circular: A→B→C→A
-- Can create deep nesting: 1→2→3→4→5→6→... infinite
```

### Solution: Add Validation Constraints

```sql
BEGIN;

-- Ensure maximum 5 levels (standard accounting practice)
ALTER TABLE evt_cuentas
  ADD CONSTRAINT account_nivel_limit CHECK (nivel BETWEEN 1 AND 5),
  ADD CONSTRAINT account_has_codigo CHECK (codigo IS NOT NULL),
  ADD CONSTRAINT account_has_nombre CHECK (nombre IS NOT NULL);

-- Create validation function for circular references
CREATE OR REPLACE FUNCTION fn_validate_account_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_id INTEGER;
  v_level INTEGER := 0;
  v_max_level CONSTANT INTEGER := 5;
BEGIN
  -- Check for circular reference
  v_parent_id := NEW.cuenta_padre_id;
  
  WHILE v_parent_id IS NOT NULL AND v_level < v_max_level LOOP
    SELECT cuenta_padre_id INTO v_parent_id
    FROM evt_cuentas
    WHERE id = v_parent_id;
    
    -- If we encounter the same ID again, it's circular
    IF v_parent_id = NEW.id THEN
      RAISE EXCEPTION 'Circular account hierarchy detected for account %', NEW.id;
    END IF;
    
    v_level := v_level + 1;
  END LOOP;
  
  -- Update nivel based on parent
  IF NEW.cuenta_padre_id IS NOT NULL THEN
    SELECT nivel + 1 INTO NEW.nivel
    FROM evt_cuentas
    WHERE id = NEW.cuenta_padre_id;
    
    IF NEW.nivel > v_max_level THEN
      RAISE EXCEPTION 'Account hierarchy exceeds maximum % levels', v_max_level;
    END IF;
  ELSE
    NEW.nivel := 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trg_validate_account_hierarchy
  BEFORE INSERT OR UPDATE ON evt_cuentas
  FOR EACH ROW
  EXECUTE FUNCTION fn_validate_account_hierarchy();

COMMIT;
```

---

## HIGH PRIORITY ISSUE #1: Customer/Supplier/Party Consolidation

### Problem Overview
The same party (person/company) could be a customer, supplier, and employee with duplicated contact/address data.

### Solution: Create Party Base Table

```sql
BEGIN;

-- Create base party table
CREATE TABLE IF NOT EXISTS entidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('CLIENTE','PROVEEDOR','EMPLEADO','INTERNO')),
  razon_social VARCHAR(255) NOT NULL,
  nombre_comercial VARCHAR(255),
  rfc VARCHAR(13) UNIQUE,
  email VARCHAR(255),
  sitio_web VARCHAR(255),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES core_users(id),
  UNIQUE(rfc) -- RFC should be globally unique
);

-- Create address table (normalized)
CREATE TABLE IF NOT EXISTS entidades_direcciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('FISCAL','ENTREGA','OFICINA','OTRA')),
  calle VARCHAR(255),
  numero_exterior VARCHAR(20),
  numero_interior VARCHAR(20),
  colonia VARCHAR(100),
  ciudad VARCHAR(100),
  estado VARCHAR(100),
  codigo_postal VARCHAR(10),
  pais VARCHAR(100) DEFAULT 'MÉXICO',
  es_principal BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entidad_id, tipo, es_principal)  -- Only one principal per type
);

-- Create contact table (normalized)
CREATE TABLE IF NOT EXISTS entidades_contactos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
  nombre VARCHAR(255),
  cargo VARCHAR(100),
  tipo_contacto VARCHAR(20) NOT NULL CHECK (tipo_contacto IN ('EMAIL','TELEFONO','CELULAR','FAX','OTRO')),
  valor VARCHAR(255) NOT NULL,
  es_principal BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entidad_id, tipo_contacto, es_principal)
);

-- Link to existing cliente table
ALTER TABLE evt_clientes
  ADD COLUMN entidad_id UUID REFERENCES entidades(id);

-- Link to existing proveedor table
ALTER TABLE com_proveedores
  ADD COLUMN entidad_id UUID REFERENCES entidades(id);

-- Link to existing empleado table
ALTER TABLE rh_empleados
  ADD COLUMN entidad_id UUID REFERENCES entidades(id);

-- Create indexes
CREATE INDEX idx_entidades_rfc ON entidades(rfc);
CREATE INDEX idx_entidades_tipo ON entidades(tipo);
CREATE INDEX idx_entidades_direcciones_entidad ON entidades_direcciones(entidad_id);
CREATE INDEX idx_entidades_contactos_entidad ON entidades_contactos(entidad_id);

COMMIT;
```

---

## HIGH PRIORITY ISSUE #2: Denormalized Inventory Cost Fields

### Problem Overview
Multiple tables store derived calculations that should be computed:
- `inv_existencias.costo_total` = `cantidad × costo_promedio`
- `inv_productos.margen_utilidad` = `(precio_venta - costo_actual) / costo_actual`
- `pos_turnos_caja.total_efectivo` = SUM of sales by payment type

### Solution: Remove Denormalized Fields

```sql
BEGIN;

-- Create proper costing table
CREATE TABLE IF NOT EXISTS inv_costo_producto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES inv_productos(id),
  almacen_id UUID NOT NULL REFERENCES inv_almacenes(id),
  metodo_valuacion VARCHAR(10) DEFAULT 'PROMEDIO' CHECK (metodo_valuacion IN ('PEPS','UEPS','PROMEDIO')),
  costo_promedio NUMERIC NOT NULL DEFAULT 0,
  fecha_ultima_actualizacion TIMESTAMPTZ DEFAULT now(),
  actualizado_por UUID REFERENCES core_users(id),
  UNIQUE(producto_id, almacen_id),
  CONSTRAINT costo_no_negativo CHECK (costo_promedio >= 0)
);

-- Create views for backward compatibility
CREATE OR REPLACE VIEW v_inv_existencias_con_costo AS
SELECT 
  ie.*,
  (ie.cantidad * icp.costo_promedio) AS costo_total
FROM inv_existencias ie
LEFT JOIN inv_costo_producto icp 
  ON ie.producto_id = icp.producto_id 
  AND ie.almacen_id = icp.almacen_id;

CREATE OR REPLACE VIEW v_inv_productos_con_margen AS
SELECT 
  ip.*,
  CASE 
    WHEN ip.costo_actual > 0 THEN ((ip.precio_venta - ip.costo_actual) / ip.costo_actual) * 100
    ELSE 0
  END AS margen_utilidad_porcentaje
FROM inv_productos ip;

-- Remove denormalized columns from tables (after verifying data integrity)
-- ALTER TABLE inv_existencias DROP COLUMN costo_total;
-- ALTER TABLE inv_productos DROP COLUMN margen_utilidad;
-- ALTER TABLE pos_turnos_caja DROP COLUMN total_efectivo, DROP COLUMN total_tarjeta;

-- Create views for POS totals
CREATE OR REPLACE VIEW v_pos_turno_totales AS
SELECT 
  ptc.id,
  ptc.caja_id,
  COUNT(pv.id) AS num_ventas,
  SUM(CASE WHEN pv.tipo_pago = 'EFECTIVO' THEN pv.total ELSE 0 END) AS total_efectivo,
  SUM(CASE WHEN pv.tipo_pago LIKE '%TARJETA%' THEN pv.total ELSE 0 END) AS total_tarjeta,
  SUM(CASE WHEN pv.tipo_pago = 'TRANSFERENCIA' THEN pv.total ELSE 0 END) AS total_transferencia,
  SUM(pv.total) AS total_ventas
FROM pos_turnos_caja ptc
LEFT JOIN pos_ventas pv ON ptc.id = pv.turno_caja_id AND pv.estatus != 'CANCELADA'
GROUP BY ptc.id, ptc.caja_id;

COMMIT;
```

---

## MEDIUM PRIORITY ISSUE: Create Receipt Workflow

### Problem Overview
Purchase orders jump directly to inventory without tracking receipt/inspection step.

```
Missing intermediate step:
PO → [RECEIPT STEP MISSING] → Inventory Movement
```

### Solution: Create Receipt Tables

```sql
BEGIN;

-- Receipt header
CREATE TABLE IF NOT EXISTS com_recepciones_ordenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_compra_id UUID NOT NULL REFERENCES com_ordenes_compra(id),
  fecha_recepcion DATE NOT NULL DEFAULT CURRENT_DATE,
  almacen_destino_id UUID NOT NULL REFERENCES inv_almacenes(id),
  estado VARCHAR(20) NOT NULL DEFAULT 'EN_PROCESO' CHECK (estado IN ('EN_PROCESO','PARCIAL','COMPLETA','RECHAZADA')),
  recibido_por UUID REFERENCES core_users(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Receipt detail lines
CREATE TABLE IF NOT EXISTS com_recepciones_ordenes_detalle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recepcion_id UUID NOT NULL REFERENCES com_recepciones_ordenes(id) ON DELETE CASCADE,
  orden_detalle_id UUID NOT NULL REFERENCES com_ordenes_compra_detalle(id),
  cantidad_pedida NUMERIC NOT NULL,
  cantidad_recibida NUMERIC NOT NULL,
  cantidad_conforme NUMERIC NOT NULL,
  cantidad_defectuosa NUMERIC DEFAULT 0,
  observaciones TEXT,
  inspeccionado_por UUID REFERENCES core_users(id),
  fecha_inspeccion TIMESTAMPTZ,
  CONSTRAINT recibida_conforme_check CHECK (cantidad_conforme + cantidad_defectuosa <= cantidad_recibida)
);

-- Link inventory movements to receipt
ALTER TABLE inv_movimientos
  ADD COLUMN recepcion_id UUID REFERENCES com_recepciones_ordenes(id);

-- Create indexes
CREATE INDEX idx_com_recepciones_orden ON com_recepciones_ordenes(orden_compra_id);
CREATE INDEX idx_com_recepciones_almacen ON com_recepciones_ordenes(almacen_destino_id);
CREATE INDEX idx_com_recepciones_detalle_recepcion ON com_recepciones_ordenes_detalle(recepcion_id);

COMMIT;
```

---

## Migration Validation Queries

### Verify Polymorphic FK Fix
```sql
-- Should return 0 if properly migrated
SELECT COUNT(*) AS orphaned_documents
FROM cont_documentos d
WHERE d.id NOT IN (
  SELECT documento_id FROM cont_documentos_ingresos
  UNION ALL
  SELECT documento_id FROM cont_documentos_gastos
  UNION ALL
  SELECT documento_id FROM cont_documentos_asientos
  UNION ALL
  SELECT documento_id FROM cont_documentos_ingresos_externos
  UNION ALL
  SELECT documento_id FROM cont_documentos_gastos_externos
);
```

### Verify BCNF Fix
```sql
-- Should return 0 if properly migrated
SELECT COUNT(*) AS multiple_entries
FROM cont_partidas
WHERE (debe > 0 AND haber > 0) OR (debe < 0 OR haber < 0);
```

### Verify Account Hierarchy
```sql
-- Should return 0 if properly validated
SELECT COUNT(*) AS circular_references
FROM evt_cuentas c1
WHERE EXISTS (
  SELECT 1 FROM evt_cuentas c2
  WHERE c1.id = c2.cuenta_padre_id
  AND c1.cuenta_padre_id = c2.id
);
```

---

## Rollback Procedures

All changes include rollback capability:

```sql
-- Rollback polymorphic FK fix
BEGIN;
ALTER TABLE cont_documentos
  ADD COLUMN referencia_tabla VARCHAR(50),
  ADD COLUMN referencia_id INTEGER;

-- Restore data
UPDATE cont_documentos d
SET referencia_tabla = 'evt_ingresos',
    referencia_id = (SELECT ingreso_id::INTEGER FROM cont_documentos_ingresos WHERE documento_id = d.id)
WHERE EXISTS (SELECT 1 FROM cont_documentos_ingresos WHERE documento_id = d.id);

DROP TABLE IF EXISTS cont_documentos_ingresos;
DROP TABLE IF EXISTS cont_documentos_gastos;
DROP TABLE IF EXISTS cont_documentos_asientos;

COMMIT;
```

