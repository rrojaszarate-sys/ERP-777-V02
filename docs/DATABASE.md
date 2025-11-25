# Documentación de Base de Datos - ERP-777 V1

## Índice

1. [Visión General](#visión-general)
2. [Esquema de Base de Datos](#esquema-de-base-de-datos)
3. [Tablas del Sistema](#tablas-del-sistema)
4. [Relaciones](#relaciones)
5. [Vistas](#vistas)
6. [Triggers](#triggers)
7. [Funciones](#funciones)
8. [Índices](#índices)
9. [Políticas RLS](#políticas-rls)
10. [Migraciones](#migraciones)

## Visión General

La base de datos del sistema ERP-777 V1 está construida sobre **PostgreSQL 15+** utilizando Supabase como plataforma. El diseño sigue principios de **normalización** hasta la tercera forma normal (3NF) y utiliza **Row Level Security (RLS)** para control de acceso granular.

### Características de la Base de Datos

- **Motor**: PostgreSQL 15+
- **Hosting**: Supabase
- **Codificación**: UTF-8
- **Timezone**: UTC
- **Collation**: es_ES.UTF-8 (español)
- **Total de Tablas**: ~25 tablas principales
- **Total de Vistas**: ~5 vistas materializadas
- **Total de Triggers**: ~15 triggers activos
- **Total de Funciones**: ~10 funciones

## Esquema de Base de Datos

### Diagrama Entidad-Relación (Simplificado)

```
┌──────────────────┐        ┌──────────────────┐
│  core_users      │────┐   │  core_companies  │
│  =============== │    │   │  =============== │
│  id (PK)         │    │   │  id (PK)         │
│  email           │    └──▶│  nombre          │
│  role_id (FK)    │        │  rfc             │
│  company_id (FK) │◀───────│  activo          │
│  created_at      │        └──────────────────┘
└──────────────────┘
         │
         │
         ▼
┌────────────────────────────────────────────────┐
│              MÓDULO DE EVENTOS                 │
├──────────────────┬─────────────────────────────┤
│  evt_eventos     │  evt_clientes               │
│  =============== │  ===============            │
│  id (PK)         │  id (PK)                    │
│  clave_evento    │  nombre                     │
│  cliente_id (FK) │◀─razón_social               │
│  tipo_evento(FK) │  rfc                        │
│  estado_id (FK)  │  email                      │
│  fecha_evento    │  telefono                   │
│  total_ingresos  │  activo                     │
│  total_gastos    │                             │
│  utilidad        │                             │
└──────────────────┴─────────────────────────────┘
         │
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────────────┐         ┌──────────────────┐
│  evt_ingresos   │         │  evt_gastos      │
│  ============== │         │  =============== │
│  id (PK)        │         │  id (PK)         │
│  evento_id (FK) │         │  evento_id (FK)  │
│  concepto       │         │  proveedor       │
│  subtotal       │         │  concepto        │
│  iva            │         │  subtotal        │
│  total          │         │  iva             │
│  status_pago    │         │  total           │
│  cuenta_banc(FK)│         │  categoria_id(FK)│
│  fecha_pago     │         │  cuenta_banc(FK) │
│  cfdi_uuid      │         │  status_pago     │
│  xml_data       │         │  fecha_pago      │
└─────────────────┘         │  xml_data        │
         │                  │  ocr_document(FK)│
         │                  └──────────────────┘
         │                           │
         │                           │
         │                           ▼
         │                  ┌──────────────────┐
         │                  │  ocr_documents   │
         │                  │  =============== │
         │                  │  id (PK)         │
         │                  │  file_url        │
         │                  │  extracted_text  │
         │                  │  confidence      │
         │                  │  processed_at    │
         │                  └──────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│  evt_cuentas_contables                       │
│  ===============                             │
│  id (PK)                                     │
│  nombre_cuenta                               │
│  banco                                       │
│  numero_cuenta                               │
│  saldo_actual                                │
│  activo                                      │
└──────────────────────────────────────────────┘
```

## Tablas del Sistema

### 1. Tablas Core (Sistema)

#### `core_users`

**Descripción**: Usuarios del sistema con autenticación.

| Campo | Tipo | Descripción | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | ID único (sincronizado con auth.users) | PK, FK → auth.users |
| `email` | VARCHAR(255) | Email del usuario | NOT NULL, UNIQUE |
| `nombre` | VARCHAR(100) | Nombre completo | NOT NULL |
| `role_id` | UUID | Rol del usuario | FK → core_roles |
| `company_id` | UUID | Empresa a la que pertenece | FK → core_companies |
| `activo` | BOOLEAN | Estado del usuario | DEFAULT true |
| `created_at` | TIMESTAMP | Fecha de creación | DEFAULT now() |
| `updated_at` | TIMESTAMP | Fecha de última actualización | DEFAULT now() |

**Índices**:
- `idx_core_users_email` ON (email)
- `idx_core_users_company` ON (company_id)

**RLS**: Habilitado
- Los usuarios solo pueden ver usuarios de su misma empresa

---

#### `core_companies`

**Descripción**: Empresas/organizaciones del sistema (multi-tenant).

| Campo | Tipo | Descripción | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | ID único | PK, DEFAULT uuid_generate_v4() |
| `nombre` | VARCHAR(200) | Nombre de la empresa | NOT NULL |
| `razon_social` | VARCHAR(200) | Razón social fiscal | |
| `rfc` | VARCHAR(13) | RFC de la empresa | UNIQUE |
| `direccion` | TEXT | Dirección fiscal | |
| `telefono` | VARCHAR(20) | Teléfono de contacto | |
| `email` | VARCHAR(255) | Email de contacto | |
| `activo` | BOOLEAN | Estado de la empresa | DEFAULT true |
| `created_at` | TIMESTAMP | Fecha de creación | DEFAULT now() |
| `updated_at` | TIMESTAMP | Fecha de última actualización | DEFAULT now() |

**Índices**:
- `idx_core_companies_rfc` ON (rfc)

---

#### `core_roles`

**Descripción**: Roles de usuario con permisos.

| Campo | Tipo | Descripción | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | ID único | PK |
| `nombre` | VARCHAR(50) | Nombre del rol | NOT NULL, UNIQUE |
| `descripcion` | TEXT | Descripción del rol | |
| `permisos` | JSONB | Permisos del rol | DEFAULT '{}' |
| `created_at` | TIMESTAMP | Fecha de creación | DEFAULT now() |

**Roles Predefinidos**:
- `admin` - Administrador total
- `manager` - Gerente con acceso a reportes
- `user` - Usuario básico
- `viewer` - Solo lectura

---

### 2. Tablas de Eventos

#### `evt_eventos`

**Descripción**: Proyectos/eventos empresariales.

| Campo | Tipo | Descripción | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | ID único | PK |
| `clave_evento` | VARCHAR(50) | Clave única del evento | UNIQUE, NOT NULL |
| `nombre_proyecto` | VARCHAR(200) | Nombre del proyecto | NOT NULL |
| `descripcion` | TEXT | Descripción detallada | |
| `cliente_id` | UUID | Cliente asociado | FK → evt_clientes |
| `tipo_evento_id` | UUID | Tipo de evento | FK → evt_tipos_evento |
| `estado_id` | UUID | Estado actual del evento | FK → evt_estados_evento |
| `solicitante` | VARCHAR(200) | Persona que solicita | |
| `fecha_evento` | DATE | Fecha del evento | NOT NULL |
| `fecha_inicio` | DATE | Fecha de inicio del proyecto | |
| `fecha_fin` | DATE | Fecha de fin del proyecto | |
| `total_ingresos` | DECIMAL(15,2) | Total de ingresos | DEFAULT 0 |
| `total_gastos` | DECIMAL(15,2) | Total de gastos | DEFAULT 0 |
| `utilidad` | DECIMAL(15,2) | Utilidad (ingresos - gastos) | DEFAULT 0 |
| `margen_utilidad` | DECIMAL(5,2) | Margen en porcentaje | DEFAULT 0 |
| `ingreso_estimado` | DECIMAL(15,2) | Ingreso estimado | DEFAULT 0 |
| `gasto_estimado` | DECIMAL(15,2) | Gasto estimado | DEFAULT 0 |
| `company_id` | UUID | Empresa propietaria | FK → core_companies |
| `created_by` | UUID | Usuario que creó | FK → core_users |
| `activo` | BOOLEAN | Estado del registro | DEFAULT true |
| `created_at` | TIMESTAMP | Fecha de creación | DEFAULT now() |
| `updated_at` | TIMESTAMP | Fecha de actualización | DEFAULT now() |

**Índices**:
- `idx_evt_eventos_clave` ON (clave_evento)
- `idx_evt_eventos_cliente` ON (cliente_id)
- `idx_evt_eventos_fecha` ON (fecha_evento DESC)
- `idx_evt_eventos_estado` ON (estado_id)
- `idx_evt_eventos_company` ON (company_id)

**Triggers**:
- `update_evt_eventos_updated_at` - Actualiza updated_at automáticamente

**RLS**: Habilitado
- Los usuarios solo pueden ver eventos de su empresa

---

#### `evt_clientes`

**Descripción**: Clientes de la empresa.

| Campo | Tipo | Descripción | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | ID único | PK |
| `nombre` | VARCHAR(200) | Nombre del cliente | NOT NULL |
| `razon_social` | VARCHAR(200) | Razón social | |
| `rfc` | VARCHAR(13) | RFC del cliente | |
| `email` | VARCHAR(255) | Email de contacto | |
| `telefono` | VARCHAR(20) | Teléfono | |
| `direccion` | TEXT | Dirección | |
| `contacto_principal` | VARCHAR(200) | Nombre del contacto | |
| `sufijo` | VARCHAR(10) | Sufijo para clave de evento | UNIQUE |
| `company_id` | UUID | Empresa propietaria | FK → core_companies |
| `activo` | BOOLEAN | Estado | DEFAULT true |
| `created_at` | TIMESTAMP | Fecha de creación | DEFAULT now() |
| `updated_at` | TIMESTAMP | Fecha de actualización | DEFAULT now() |

**Índices**:
- `idx_evt_clientes_rfc` ON (rfc)
- `idx_evt_clientes_company` ON (company_id)

---

#### `evt_tipos_evento`

**Descripción**: Catálogo de tipos de eventos.

| Campo | Tipo | Descripción | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | ID único | PK |
| `nombre` | VARCHAR(100) | Nombre del tipo | NOT NULL |
| `descripcion` | TEXT | Descripción | |
| `color` | VARCHAR(7) | Color en hex | DEFAULT '#3B82F6' |
| `activo` | BOOLEAN | Estado | DEFAULT true |
| `created_at` | TIMESTAMP | Fecha de creación | DEFAULT now() |

**Tipos Comunes**:
- Boda
- Evento Corporativo
- XV Años
- Conferencia
- Graduación

---

#### `evt_estados_evento`

**Descripción**: Estados del workflow de eventos.

| Campo | Tipo | Descripción | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | ID único | PK |
| `nombre` | VARCHAR(50) | Nombre del estado | NOT NULL |
| `descripcion` | TEXT | Descripción | |
| `orden` | INTEGER | Orden en el workflow | NOT NULL |
| `color` | VARCHAR(7) | Color en hex | |
| `activo` | BOOLEAN | Estado | DEFAULT true |

**Estados del Workflow**:
1. `cotizacion` - Cotización inicial (orden: 1)
2. `confirmado` - Evento confirmado (orden: 2)
3. `en_proceso` - En ejecución (orden: 3)
4. `finalizado` - Completado (orden: 4)
5. `cancelado` - Cancelado (orden: 99)

---

### 3. Tablas Financieras

#### `evt_ingresos`

**Descripción**: Registro de ingresos por evento.

| Campo | Tipo | Descripción | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | ID único | PK |
| `evento_id` | UUID | Evento asociado | FK → evt_eventos, NOT NULL |
| `concepto` | VARCHAR(200) | Concepto del ingreso | NOT NULL |
| `descripcion` | TEXT | Descripción detallada | |
| `subtotal` | DECIMAL(15,2) | Subtotal sin IVA | NOT NULL, >= 0 |
| `iva` | DECIMAL(15,2) | IVA calculado | DEFAULT 0, >= 0 |
| `total` | DECIMAL(15,2) | Total con IVA | NOT NULL, >= 0 |
| `status_pago` | VARCHAR(20) | Estado de pago | DEFAULT 'pendiente' |
| `fecha_pago` | DATE | Fecha de pago | |
| `metodo_pago` | VARCHAR(50) | Método de pago | |
| `cuenta_bancaria_id` | UUID | Cuenta donde se recibió | FK → evt_cuentas_contables |
| `referencia_pago` | VARCHAR(100) | Referencia bancaria | |
| `cfdi_uuid` | UUID | UUID de CFDI | |
| `xml_data` | TEXT | XML de factura CFDI | |
| `factura_url` | TEXT | URL del PDF de factura | |
| `notas` | TEXT | Notas adicionales | |
| `created_by` | UUID | Usuario que registró | FK → core_users |
| `activo` | BOOLEAN | Estado | DEFAULT true |
| `created_at` | TIMESTAMP | Fecha de creación | DEFAULT now() |
| `updated_at` | TIMESTAMP | Fecha de actualización | DEFAULT now() |

**Índices**:
- `idx_evt_ingresos_evento` ON (evento_id)
- `idx_evt_ingresos_status` ON (status_pago)
- `idx_evt_ingresos_fecha` ON (fecha_pago DESC)
- `idx_evt_ingresos_cuenta` ON (cuenta_bancaria_id)

**Triggers**:
- `calculate_income_totals_trigger` - Calcula total = subtotal + iva
- `update_event_financials_on_income` - Actualiza totales del evento
- `update_evt_ingresos_updated_at` - Actualiza updated_at

**Constraints**:
- CHECK: `subtotal >= 0`
- CHECK: `iva >= 0`
- CHECK: `total >= 0`
- CHECK: `status_pago IN ('pendiente', 'pagado', 'cancelado')`

---

#### `evt_gastos`

**Descripción**: Registro de gastos/egresos por evento.

| Campo | Tipo | Descripción | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | ID único | PK |
| `evento_id` | UUID | Evento asociado | FK → evt_eventos, NOT NULL |
| `proveedor` | VARCHAR(200) | Nombre del proveedor | NOT NULL |
| `concepto` | VARCHAR(200) | Concepto del gasto | NOT NULL |
| `descripcion` | TEXT | Descripción detallada | |
| `categoria_id` | UUID | Categoría del gasto | FK → evt_categorias_gasto |
| `subtotal` | DECIMAL(15,2) | Subtotal sin IVA | NOT NULL, >= 0 |
| `iva` | DECIMAL(15,2) | IVA | DEFAULT 0, >= 0 |
| `total` | DECIMAL(15,2) | Total con IVA | NOT NULL, >= 0 |
| `status_pago` | VARCHAR(20) | Estado de pago | DEFAULT 'pendiente' |
| `fecha_pago` | DATE | Fecha de pago | |
| `metodo_pago` | VARCHAR(50) | Método de pago | |
| `cuenta_bancaria_id` | UUID | Cuenta de donde se pagó | FK → evt_cuentas_contables |
| `referencia_pago` | VARCHAR(100) | Referencia bancaria | |
| `cfdi_uuid` | UUID | UUID de CFDI | |
| `xml_data` | TEXT | XML de factura | |
| `factura_url` | TEXT | URL del documento | |
| `ocr_document_id` | UUID | Documento OCR procesado | FK → ocr_documents |
| `sat_folio_fiscal` | VARCHAR(50) | Folio fiscal SAT | |
| `sat_rfc_emisor` | VARCHAR(13) | RFC del emisor | |
| `sat_fecha_emision` | DATE | Fecha de emisión SAT | |
| `notas` | TEXT | Notas adicionales | |
| `created_by` | UUID | Usuario que registró | FK → core_users |
| `activo` | BOOLEAN | Estado | DEFAULT true |
| `created_at` | TIMESTAMP | Fecha de creación | DEFAULT now() |
| `updated_at` | TIMESTAMP | Fecha de actualización | DEFAULT now() |

**Índices**:
- `idx_evt_gastos_evento` ON (evento_id)
- `idx_evt_gastos_proveedor` ON (proveedor)
- `idx_evt_gastos_categoria` ON (categoria_id)
- `idx_evt_gastos_status` ON (status_pago)
- `idx_evt_gastos_fecha` ON (fecha_pago DESC)
- `idx_evt_gastos_cuenta` ON (cuenta_bancaria_id)

**Triggers**:
- `calculate_expense_totals_trigger` - Calcula total = subtotal + iva
- `update_event_financials_on_expense` - Actualiza totales del evento
- `update_evt_gastos_updated_at` - Actualiza updated_at

**Constraints**:
- CHECK: `subtotal >= 0`
- CHECK: `iva >= 0`
- CHECK: `total >= 0`
- CHECK: `status_pago IN ('pendiente', 'pagado', 'cancelado')`

---

#### `evt_cuentas_contables`

**Descripción**: Cuentas bancarias/contables de la empresa.

| Campo | Tipo | Descripción | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | ID único | PK |
| `nombre_cuenta` | VARCHAR(200) | Nombre descriptivo | NOT NULL |
| `banco` | VARCHAR(100) | Nombre del banco | |
| `numero_cuenta` | VARCHAR(50) | Número de cuenta | |
| `clabe` | VARCHAR(18) | CLABE interbancaria | |
| `tipo_cuenta` | VARCHAR(50) | Tipo (efectivo, banco) | DEFAULT 'banco' |
| `saldo_actual` | DECIMAL(15,2) | Saldo actual | DEFAULT 0 |
| `moneda` | VARCHAR(3) | Moneda (MXN, USD) | DEFAULT 'MXN' |
| `company_id` | UUID | Empresa propietaria | FK → core_companies |
| `activo` | BOOLEAN | Estado | DEFAULT true |
| `created_at` | TIMESTAMP | Fecha de creación | DEFAULT now() |
| `updated_at` | TIMESTAMP | Fecha de actualización | DEFAULT now() |

**Índices**:
- `idx_evt_cuentas_company` ON (company_id)

---

#### `evt_categorias_gasto`

**Descripción**: Catálogo de categorías de gastos.

| Campo | Tipo | Descripción | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | ID único | PK |
| `nombre` | VARCHAR(100) | Nombre de la categoría | NOT NULL |
| `descripcion` | TEXT | Descripción | |
| `color` | VARCHAR(7) | Color en hex | |
| `activo` | BOOLEAN | Estado | DEFAULT true |

**Categorías Comunes**:
- Alimentos y Bebidas
- Decoración
- Audio y Video
- Mobiliario
- Personal
- Transporte
- Papelería
- Varios

---

### 4. Tablas de OCR

#### `ocr_documents`

**Descripción**: Documentos procesados con OCR.

| Campo | Tipo | Descripción | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | ID único | PK |
| `file_name` | VARCHAR(255) | Nombre del archivo | NOT NULL |
| `file_url` | TEXT | URL del archivo en storage | |
| `file_type` | VARCHAR(50) | Tipo MIME | |
| `file_size` | INTEGER | Tamaño en bytes | |
| `extracted_text` | TEXT | Texto extraído | |
| `ocr_provider` | VARCHAR(50) | Proveedor (google, tesseract) | |
| `confidence` | DECIMAL(5,2) | Nivel de confianza | |
| `document_type` | VARCHAR(50) | Tipo (ticket, factura, recibo) | |
| `processed_at` | TIMESTAMP | Fecha de procesamiento | |
| `processing_time` | INTEGER | Tiempo en ms | |
| `metadata` | JSONB | Metadatos adicionales | |
| `created_by` | UUID | Usuario que subió | FK → core_users |
| `created_at` | TIMESTAMP | Fecha de creación | DEFAULT now() |

**Índices**:
- `idx_ocr_documents_type` ON (document_type)
- `idx_ocr_documents_processed` ON (processed_at DESC)

---

### 5. Tablas de Facturación

#### `evt_facturas`

**Descripción**: Facturas emitidas y recibidas.

| Campo | Tipo | Descripción | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | ID único | PK |
| `folio` | VARCHAR(50) | Folio de la factura | |
| `uuid` | UUID | UUID del CFDI | UNIQUE |
| `tipo` | VARCHAR(20) | Tipo (emitida, recibida) | NOT NULL |
| `cliente_id` | UUID | Cliente (si es emitida) | FK → evt_clientes |
| `proveedor` | VARCHAR(200) | Proveedor (si es recibida) | |
| `evento_id` | UUID | Evento relacionado | FK → evt_eventos |
| `fecha_emision` | DATE | Fecha de emisión | NOT NULL |
| `fecha_timbrado` | TIMESTAMP | Fecha de timbrado SAT | |
| `subtotal` | DECIMAL(15,2) | Subtotal | NOT NULL |
| `iva` | DECIMAL(15,2) | IVA | DEFAULT 0 |
| `total` | DECIMAL(15,2) | Total | NOT NULL |
| `moneda` | VARCHAR(3) | Moneda | DEFAULT 'MXN' |
| `status` | VARCHAR(20) | Estado de la factura | DEFAULT 'vigente' |
| `xml_url` | TEXT | URL del XML | |
| `pdf_url` | TEXT | URL del PDF | |
| `xml_data` | TEXT | Contenido del XML | |
| `company_id` | UUID | Empresa propietaria | FK → core_companies |
| `activo` | BOOLEAN | Estado | DEFAULT true |
| `created_at` | TIMESTAMP | Fecha de creación | DEFAULT now() |
| `updated_at` | TIMESTAMP | Fecha de actualización | DEFAULT now() |

**Índices**:
- `idx_evt_facturas_uuid` ON (uuid)
- `idx_evt_facturas_evento` ON (evento_id)
- `idx_evt_facturas_fecha` ON (fecha_emision DESC)

**Constraints**:
- CHECK: `tipo IN ('emitida', 'recibida')`
- CHECK: `status IN ('vigente', 'cancelada', 'pendiente')`

---

### 6. Tablas de Auditoría

#### `audit_log`

**Descripción**: Registro de auditoría de operaciones críticas.

| Campo | Tipo | Descripción | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | ID único | PK |
| `table_name` | VARCHAR(100) | Tabla afectada | NOT NULL |
| `record_id` | UUID | ID del registro | |
| `action` | VARCHAR(20) | Acción (INSERT, UPDATE, DELETE) | NOT NULL |
| `old_values` | JSONB | Valores anteriores | |
| `new_values` | JSONB | Valores nuevos | |
| `user_id` | UUID | Usuario que ejecutó | FK → core_users |
| `ip_address` | VARCHAR(50) | Dirección IP | |
| `user_agent` | TEXT | User agent | |
| `created_at` | TIMESTAMP | Fecha de la acción | DEFAULT now() |

**Índices**:
- `idx_audit_log_table` ON (table_name)
- `idx_audit_log_record` ON (record_id)
- `idx_audit_log_user` ON (user_id)
- `idx_audit_log_created` ON (created_at DESC)

---

## Vistas

### `vw_eventos_completos`

**Descripción**: Vista consolidada de eventos con totales financieros calculados.

```sql
CREATE OR REPLACE VIEW vw_eventos_completos AS
SELECT
  e.id,
  e.clave_evento,
  e.nombre_proyecto,
  e.descripcion,
  e.fecha_evento,
  e.fecha_inicio,
  e.fecha_fin,
  -- Cliente
  c.nombre as cliente_nombre,
  c.razon_social as cliente_razon_social,
  c.email as cliente_email,
  -- Tipo de evento
  te.nombre as tipo_evento,
  te.color as tipo_color,
  -- Estado
  es.nombre as estado,
  es.color as estado_color,
  es.orden as estado_orden,
  -- Financieros
  COALESCE(SUM(i.total) FILTER (WHERE i.activo = true), 0) as total,
  COALESCE(SUM(g.total) FILTER (WHERE g.activo = true), 0) as total_gastos,
  COALESCE(SUM(i.total) FILTER (WHERE i.activo = true), 0) -
    COALESCE(SUM(g.total) FILTER (WHERE g.activo = true), 0) as utilidad,
  CASE
    WHEN COALESCE(SUM(i.total) FILTER (WHERE i.activo = true), 0) > 0 THEN
      (COALESCE(SUM(i.total) FILTER (WHERE i.activo = true), 0) -
       COALESCE(SUM(g.total) FILTER (WHERE g.activo = true), 0)) * 100.0 /
      COALESCE(SUM(i.total) FILTER (WHERE i.activo = true), 0)
    ELSE 0
  END as margen_utilidad,
  -- Conteos
  COUNT(DISTINCT i.id) FILTER (WHERE i.activo = true) as num_ingresos,
  COUNT(DISTINCT g.id) FILTER (WHERE g.activo = true) as num_gastos,
  -- Metadata
  e.company_id,
  e.created_by,
  e.activo,
  e.created_at,
  e.updated_at
FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_tipos_evento te ON e.tipo_evento_id = te.id
LEFT JOIN evt_estados_evento es ON e.estado_id = es.id
LEFT JOIN evt_ingresos i ON e.id = i.evento_id
LEFT JOIN evt_gastos g ON e.id = g.evento_id
GROUP BY
  e.id, c.id, te.id, es.id;
```

**Uso**:
```sql
-- Obtener eventos con totales
SELECT * FROM vw_eventos_completos
WHERE activo = true
ORDER BY fecha_evento DESC;
```

---

## Triggers

### `calculate_expense_totals_trigger`

**Descripción**: Calcula automáticamente el total de un gasto (subtotal + iva).

```sql
CREATE OR REPLACE FUNCTION calculate_expense_totals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total = NEW.subtotal + COALESCE(NEW.iva, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_expense_totals_trigger
BEFORE INSERT OR UPDATE ON evt_gastos
FOR EACH ROW EXECUTE FUNCTION calculate_expense_totals();
```

---

### `calculate_income_totals_trigger`

**Descripción**: Calcula automáticamente el total de un ingreso.

```sql
CREATE OR REPLACE FUNCTION calculate_income_totals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total = NEW.subtotal + COALESCE(NEW.iva, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_income_totals_trigger
BEFORE INSERT OR UPDATE ON evt_ingresos
FOR EACH ROW EXECUTE FUNCTION calculate_income_totals();
```

---

### `update_event_financials_on_expense`

**Descripción**: Actualiza los totales financieros del evento al insertar/modificar/eliminar un gasto.

```sql
CREATE OR REPLACE FUNCTION update_event_financials()
RETURNS TRIGGER AS $$
DECLARE
  evento_id_to_update UUID;
BEGIN
  -- Determinar el evento afectado
  IF TG_OP = 'DELETE' THEN
    evento_id_to_update = OLD.evento_id;
  ELSE
    evento_id_to_update = NEW.evento_id;
  END IF;

  -- Recalcular totales del evento
  UPDATE evt_eventos
  SET
    total_ingresos = (
      SELECT COALESCE(SUM(total), 0)
      FROM evt_ingresos
      WHERE evento_id = evento_id_to_update
        AND activo = true
    ),
    total_gastos = (
      SELECT COALESCE(SUM(total), 0)
      FROM evt_gastos
      WHERE evento_id = evento_id_to_update
        AND activo = true
    )
  WHERE id = evento_id_to_update;

  -- Calcular utilidad
  UPDATE evt_eventos
  SET
    utilidad = total_ingresos - total_gastos,
    margen_utilidad = CASE
      WHEN total_ingresos > 0 THEN
        ((total_ingresos - total_gastos) * 100.0 / total_ingresos)
      ELSE 0
    END
  WHERE id = evento_id_to_update;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_financials_on_expense
AFTER INSERT OR UPDATE OR DELETE ON evt_gastos
FOR EACH ROW EXECUTE FUNCTION update_event_financials();

CREATE TRIGGER update_event_financials_on_income
AFTER INSERT OR UPDATE OR DELETE ON evt_ingresos
FOR EACH ROW EXECUTE FUNCTION update_event_financials();
```

---

### `update_updated_at_column`

**Descripción**: Actualiza automáticamente el campo updated_at.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Se aplica a múltiples tablas
CREATE TRIGGER update_evt_eventos_updated_at
BEFORE UPDATE ON evt_eventos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evt_gastos_updated_at
BEFORE UPDATE ON evt_gastos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ... etc
```

---

## Funciones

### `get_event_financial_summary(evento_id UUID)`

**Descripción**: Obtiene resumen financiero completo de un evento.

```sql
CREATE OR REPLACE FUNCTION get_event_financial_summary(p_evento_id UUID)
RETURNS TABLE (
  total_ingresos DECIMAL(15,2),
  total_gastos DECIMAL(15,2),
  utilidad DECIMAL(15,2),
  margen_utilidad DECIMAL(5,2),
  num_ingresos INTEGER,
  num_gastos INTEGER,
  ingresos_pagados DECIMAL(15,2),
  gastos_pagados DECIMAL(15,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(i.total), 0)::DECIMAL(15,2) as total_ingresos,
    COALESCE(SUM(g.total), 0)::DECIMAL(15,2) as total_gastos,
    (COALESCE(SUM(i.total), 0) - COALESCE(SUM(g.total), 0))::DECIMAL(15,2) as utilidad,
    CASE
      WHEN COALESCE(SUM(i.total), 0) > 0 THEN
        ((COALESCE(SUM(i.total), 0) - COALESCE(SUM(g.total), 0)) * 100.0 /
         COALESCE(SUM(i.total), 0))::DECIMAL(5,2)
      ELSE 0::DECIMAL(5,2)
    END as margen_utilidad,
    COUNT(DISTINCT i.id)::INTEGER as num_ingresos,
    COUNT(DISTINCT g.id)::INTEGER as num_gastos,
    COALESCE(SUM(i.total) FILTER (WHERE i.status_pago = 'pagado'), 0)::DECIMAL(15,2) as ingresos_pagados,
    COALESCE(SUM(g.total) FILTER (WHERE g.status_pago = 'pagado'), 0)::DECIMAL(15,2) as gastos_pagados
  FROM evt_eventos e
  LEFT JOIN evt_ingresos i ON e.id = i.evento_id AND i.activo = true
  LEFT JOIN evt_gastos g ON e.id = g.evento_id AND g.activo = true
  WHERE e.id = p_evento_id;
END;
$$ LANGUAGE plpgsql;
```

**Uso**:
```sql
SELECT * FROM get_event_financial_summary('evento-uuid-here');
```

---

## Índices

### Índices para Rendimiento

```sql
-- Eventos
CREATE INDEX idx_evt_eventos_clave ON evt_eventos(clave_evento);
CREATE INDEX idx_evt_eventos_fecha ON evt_eventos(fecha_evento DESC);
CREATE INDEX idx_evt_eventos_company ON evt_eventos(company_id) WHERE activo = true;

-- Ingresos
CREATE INDEX idx_evt_ingresos_evento ON evt_ingresos(evento_id) WHERE activo = true;
CREATE INDEX idx_evt_ingresos_fecha ON evt_ingresos(fecha_pago DESC) WHERE fecha_pago IS NOT NULL;

-- Gastos
CREATE INDEX idx_evt_gastos_evento ON evt_gastos(evento_id) WHERE activo = true;
CREATE INDEX idx_evt_gastos_proveedor ON evt_gastos(proveedor);
CREATE INDEX idx_evt_gastos_fecha ON evt_gastos(fecha_pago DESC) WHERE fecha_pago IS NOT NULL;

-- Full-text search
CREATE INDEX idx_evt_eventos_nombre_fts ON evt_eventos USING gin(to_tsvector('spanish', nombre_proyecto));
CREATE INDEX idx_evt_clientes_nombre_fts ON evt_clientes USING gin(to_tsvector('spanish', nombre));
```

---

## Políticas RLS

### Ejemplo de RLS para `evt_eventos`

```sql
-- Habilitar RLS
ALTER TABLE evt_eventos ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo ven eventos de su empresa
CREATE POLICY "Users can view their company events"
ON evt_eventos
FOR SELECT
USING (
  company_id IN (
    SELECT company_id
    FROM core_users
    WHERE id = auth.uid()
  )
);

-- Política: Los usuarios pueden insertar eventos en su empresa
CREATE POLICY "Users can insert events in their company"
ON evt_eventos
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id
    FROM core_users
    WHERE id = auth.uid()
  )
);

-- Política: Los usuarios pueden actualizar eventos de su empresa
CREATE POLICY "Users can update their company events"
ON evt_eventos
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id
    FROM core_users
    WHERE id = auth.uid()
  )
);

-- Política: Solo admins pueden eliminar
CREATE POLICY "Only admins can delete events"
ON evt_eventos
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM core_users u
    JOIN core_roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
      AND r.nombre = 'admin'
  )
);
```

---

## Migraciones

### Orden de Ejecución

Las migraciones deben ejecutarse en el siguiente orden:

1. `20250929012201_fierce_island.sql` - Estructura inicial
2. `20250929015118_lucky_lake.sql` - Tablas de eventos
3. `20251004000001_add_cancelado_state.sql` - Estado cancelado
4. `20251006000001_fix_audit_log_compatibility.sql` - Auditoría
5. `20251012_add_sat_ocr_fields.sql` - Campos SAT en gastos
6. `20251014_mejoras_flujo_ingresos.sql` - Mejoras en ingresos
7. `20251016_add_solicitante_to_eventos.sql` - Campo solicitante
8. `20251023_add_financial_estimates_to_events.sql` - Estimaciones
9. `20251024_ingresos_gastos_improvements.sql` - Mejoras finales

### Script de Migración

```bash
#!/bin/bash
# ejecutar-migraciones.sh

MIGRATIONS_DIR="supabase_old/migrations"
DB_CONNECTION="postgresql://user:pass@host:port/database"

for migration in $(ls $MIGRATIONS_DIR/*.sql | sort); do
  echo "Ejecutando: $migration"
  psql $DB_CONNECTION -f $migration
  if [ $? -eq 0 ]; then
    echo "✓ Migración exitosa: $migration"
  else
    echo "✗ Error en migración: $migration"
    exit 1
  fi
done

echo "Todas las migraciones completadas"
```

---

**Fecha**: Octubre 2025
**Versión**: 1.0.0
