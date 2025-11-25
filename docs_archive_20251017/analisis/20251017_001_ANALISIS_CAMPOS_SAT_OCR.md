# Análisis de Campos SAT para Tickets y Facturas - OCR Mejorado

**Fecha:** 12 de Octubre 2025
**Objetivo:** Adecuar campos OCR a estándares del SAT mexicano (CFDI 4.0)

---

## 📋 ESTRUCTURA ACTUAL DE `evt_gastos`

### Campos Existentes (Estándar SAT Compatible)

```sql
CREATE TABLE evt_gastos (
  -- Identificadores
  id serial PRIMARY KEY,
  evento_id integer,
  categoria_id integer,

  -- Datos básicos del comprobante
  concepto text NOT NULL,              -- ✅ SAT: Descripción
  descripcion text,                    -- ✅ SAT: Observaciones

  -- Cantidades y montos (CFDI 4.0)
  cantidad numeric DEFAULT 1,          -- ✅ SAT: Cantidad
  precio_unitario numeric DEFAULT 0,   -- ✅ SAT: ValorUnitario
  subtotal numeric DEFAULT 0,          -- ✅ SAT: SubTotal (sin impuestos)
  iva_porcentaje numeric DEFAULT 16,   -- ✅ SAT: TasaOCuota (0.160000)
  iva numeric DEFAULT 0,               -- ✅ SAT: Importe del IVA
  total numeric DEFAULT 0,             -- ✅ SAT: Total (con impuestos)

  -- Datos del proveedor
  proveedor text,                      -- ✅ SAT: Nombre receptor
  rfc_proveedor varchar(13),           -- ✅ SAT: RFC (XAXX010101000 o formato completo)

  -- Datos de la operación
  fecha_gasto date DEFAULT CURRENT_DATE, -- ✅ SAT: Fecha
  forma_pago varchar(20),              -- ⚠️ SAT: FormaPago (códigos c_FormaPago)
  referencia text,                     -- ✅ SAT: Folio/UUID
  documento_url text,                  -- ✅ Almacenamiento del PDF/XML

  -- Control interno
  status_aprobacion varchar(20),
  archivo_adjunto text,
  notas text,
  activo boolean,
  created_at timestamptz,
  updated_at timestamptz
);
```

---

## 🔍 ANÁLISIS: Campos que Faltan según SAT

### CFDI 4.0 - Campos Obligatorios para Facturas

| Campo SAT | Actual en BD | Falta Agregar | Prioridad |
|-----------|--------------|---------------|-----------|
| **Folio** | referencia | ✅ folio_fiscal | 🔴 Alta |
| **Serie** | - | ✅ serie | 🟡 Media |
| **UUID** | - | ✅ uuid_cfdi | 🔴 Alta (facturas) |
| **Fecha y Hora** | fecha_gasto | ✅ hora_emision | 🟢 Baja (ya tenemos fecha) |
| **FormaPago (código)** | forma_pago | ⚠️ Actualizar a catálogo | 🔴 Alta |
| **MetodoPago** | - | ✅ metodo_pago_sat | 🟡 Media |
| **TipoComprobante** | - | ✅ tipo_comprobante | 🔴 Alta |
| **LugarExpedicion** | - | ✅ lugar_expedicion | 🟡 Media |
| **Moneda** | - | ✅ moneda | 🟢 Baja (default MXN) |
| **TipoCambio** | - | ✅ tipo_cambio | 🟢 Baja (solo USD) |

### Campos Adicionales para Tickets (No CFDI)

| Campo | Utilidad OCR | Prioridad |
|-------|--------------|-----------|
| **Establecimiento** | proveedor | ✅ Ya existe |
| **Teléfono** | Contacto | 🟢 Baja |
| **Dirección** | descripcion | ✅ Ya existe |
| **Productos detallados** | - | 🔴 Alta |
| **Descuentos** | - | 🟡 Media |
| **Propinas** | - | 🟢 Baja |

---

## ✅ CAMPOS A AGREGAR (Versión Corregida)

### Prioridad ALTA (Obligatorios SAT)

```sql
-- 1. Campos de factura CFDI
uuid_cfdi VARCHAR(36),              -- UUID del comprobante fiscal (facturas)
folio_fiscal VARCHAR(50),           -- Folio fiscal del SAT
serie VARCHAR(25),                  -- Serie de la factura
tipo_comprobante VARCHAR(1),        -- I=Ingreso, E=Egreso, T=Traslado, N=Nómina, P=Pago

-- 2. Formas de pago SAT (catálogo c_FormaPago)
forma_pago_sat VARCHAR(2),          -- Código SAT: 01=Efectivo, 03=Transferencia, etc.
metodo_pago_sat VARCHAR(3),         -- PUE=Pago en una exhibición, PPD=Pago en parcialidades

-- 3. Detalle de productos (JSON para tickets complejos)
detalle_productos JSONB,            -- Array de productos con código, descripción, cantidad, precio
```

### Prioridad MEDIA (Útiles para gestión)

```sql
-- 4. Datos complementarios
lugar_expedicion VARCHAR(5),        -- Código postal de expedición
moneda VARCHAR(3) DEFAULT 'MXN',    -- MXN, USD, EUR (catálogo c_Moneda)
tipo_cambio NUMERIC(10,6),          -- Tipo de cambio (si moneda != MXN)

-- 5. Descuentos y recargos
descuento NUMERIC DEFAULT 0,        -- Descuento aplicado
motivo_descuento TEXT,              -- Razón del descuento
```

### Prioridad BAJA (Información adicional)

```sql
-- 6. Datos del ticket (no fiscales)
folio_interno VARCHAR(50),          -- Folio del ticket/nota (no UUID)
hora_emision TIME,                  -- Hora de emisión
telefono_proveedor VARCHAR(20),     -- Teléfono del establecimiento
```

---

## 🚫 CAMPOS QUE NO SE AGREGAN

### Razones para NO agregar:

1. **❌ num_productos** - Se calcula desde detalle_productos (JSON)
2. **❌ propina** - Va incluida en el total o como concepto separado
3. **❌ metodo_pago_detalle** - Los últimos 4 dígitos de tarjeta NO deben guardarse (PCI DSS)
4. **❌ direccion_completa** - Ya existe el campo `descripcion`

---

## 📊 MIGRACIÓN SQL CORREGIDA

```sql
-- ============================================
-- Migración: Campos OCR Compatible con SAT
-- Fecha: 2025-10-12
-- Descripción: Agrega solo campos necesarios
--              compatibles con CFDI 4.0
-- ============================================

-- 1. Campos de factura CFDI (prioridad ALTA)
ALTER TABLE evt_gastos
  ADD COLUMN IF NOT EXISTS uuid_cfdi VARCHAR(36),
  ADD COLUMN IF NOT EXISTS folio_fiscal VARCHAR(50),
  ADD COLUMN IF NOT EXISTS serie VARCHAR(25),
  ADD COLUMN IF NOT EXISTS tipo_comprobante VARCHAR(1) DEFAULT 'I',
  ADD COLUMN IF NOT EXISTS forma_pago_sat VARCHAR(2),
  ADD COLUMN IF NOT EXISTS metodo_pago_sat VARCHAR(3) DEFAULT 'PUE';

-- 2. Detalle de productos (JSON estructurado)
ALTER TABLE evt_gastos
  ADD COLUMN IF NOT EXISTS detalle_productos JSONB;

-- 3. Datos complementarios (prioridad MEDIA)
ALTER TABLE evt_gastos
  ADD COLUMN IF NOT EXISTS lugar_expedicion VARCHAR(5),
  ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS tipo_cambio NUMERIC(10,6);

-- 4. Descuentos
ALTER TABLE evt_gastos
  ADD COLUMN IF NOT EXISTS descuento NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motivo_descuento TEXT;

-- 5. Datos adicionales de ticket (prioridad BAJA)
ALTER TABLE evt_gastos
  ADD COLUMN IF NOT EXISTS folio_interno VARCHAR(50),
  ADD COLUMN IF NOT EXISTS hora_emision TIME,
  ADD COLUMN IF NOT EXISTS telefono_proveedor VARCHAR(20);

-- 6. Agregar constraints
ALTER TABLE evt_gastos
  DROP CONSTRAINT IF EXISTS check_tipo_comprobante;

ALTER TABLE evt_gastos
  ADD CONSTRAINT check_tipo_comprobante
  CHECK (tipo_comprobante IN ('I', 'E', 'T', 'N', 'P'));

-- 7. Índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_evt_gastos_uuid_cfdi
  ON evt_gastos(uuid_cfdi);

CREATE INDEX IF NOT EXISTS idx_evt_gastos_folio_fiscal
  ON evt_gastos(folio_fiscal);

CREATE INDEX IF NOT EXISTS idx_evt_gastos_tipo_comprobante
  ON evt_gastos(tipo_comprobante);

CREATE INDEX IF NOT EXISTS idx_evt_gastos_forma_pago_sat
  ON evt_gastos(forma_pago_sat);

-- 8. Índice GIN para búsquedas en JSON
CREATE INDEX IF NOT EXISTS idx_evt_gastos_detalle_productos
  ON evt_gastos USING gin(detalle_productos);

-- 9. Comentarios descriptivos
COMMENT ON COLUMN evt_gastos.uuid_cfdi IS
  'UUID del comprobante fiscal digital (CFDI 4.0)';

COMMENT ON COLUMN evt_gastos.folio_fiscal IS
  'Folio fiscal asignado por el SAT al CFDI';

COMMENT ON COLUMN evt_gastos.tipo_comprobante IS
  'I=Ingreso, E=Egreso, T=Traslado, N=Nómina, P=Pago';

COMMENT ON COLUMN evt_gastos.forma_pago_sat IS
  'Código SAT c_FormaPago: 01=Efectivo, 03=Transferencia, 04=Tarjeta, etc';

COMMENT ON COLUMN evt_gastos.metodo_pago_sat IS
  'PUE=Pago en una exhibición, PPD=Pago en parcialidades';

COMMENT ON COLUMN evt_gastos.detalle_productos IS
  'JSON con array de productos: [{codigo, descripcion, cantidad, precio_unitario, importe}]';

COMMENT ON COLUMN evt_gastos.lugar_expedicion IS
  'Código postal donde se expide el comprobante';

-- 10. Función para calcular número de productos
CREATE OR REPLACE FUNCTION get_num_productos(detalle JSONB)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(jsonb_array_length(detalle), 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 11. Vista actualizada con campos SAT
CREATE OR REPLACE VIEW vw_gastos_ocr_completo AS
SELECT
  g.id,
  g.evento_id,
  g.concepto,
  g.proveedor,
  g.rfc_proveedor,
  g.total,
  g.uuid_cfdi,
  g.folio_fiscal,
  g.tipo_comprobante,
  g.forma_pago_sat,
  g.metodo_pago_sat,
  get_num_productos(g.detalle_productos) AS num_productos,
  g.ocr_confianza,
  g.ocr_validado,
  g.created_at,
  CASE
    WHEN g.uuid_cfdi IS NOT NULL THEN 'factura'
    WHEN g.folio_fiscal IS NOT NULL THEN 'ticket_fiscal'
    ELSE 'ticket'
  END AS tipo_documento,
  e.clave_evento,
  e.nombre_proyecto,
  c.nombre AS categoria_nombre
FROM evt_gastos g
LEFT JOIN evt_eventos e ON g.evento_id = e.id
LEFT JOIN evt_categorias_gastos c ON g.categoria_id = c.id
WHERE g.activo = TRUE;

COMMENT ON VIEW vw_gastos_ocr_completo IS
  'Vista completa de gastos con campos SAT y clasificación de tipo de documento';
```

---

## 📝 ESTRUCTURA JSON PARA `detalle_productos`

### Formato Estándar:

```json
{
  "productos": [
    {
      "numero": 1,
      "codigo": "COD001",
      "clave_prod_serv": "50202306",
      "descripcion": "COCA COLA 600ML",
      "cantidad": 2,
      "unidad": "PZA",
      "precio_unitario": 15.00,
      "importe": 30.00,
      "descuento": 0
    },
    {
      "numero": 2,
      "codigo": "COD002",
      "clave_prod_serv": "10111501",
      "descripcion": "PAN BLANCO BIMBO",
      "cantidad": 1,
      "unidad": "PZA",
      "precio_unitario": 35.00,
      "importe": 35.00,
      "descuento": 0
    }
  ],
  "total_productos": 2,
  "subtotal_productos": 65.00
}
```

### Consultas útiles:

```sql
-- Obtener número de productos
SELECT get_num_productos(detalle_productos) FROM evt_gastos WHERE id = 1;

-- Buscar gastos con producto específico
SELECT * FROM evt_gastos
WHERE detalle_productos @> '{"productos": [{"descripcion": "COCA COLA"}]}';

-- Extraer lista de productos
SELECT
  id,
  concepto,
  jsonb_array_elements(detalle_productos->'productos') AS producto
FROM evt_gastos
WHERE detalle_productos IS NOT NULL;
```

---

## 🎯 CATÁLOGOS DEL SAT (Referencia)

### c_FormaPago (forma_pago_sat)

```
01 - Efectivo
02 - Cheque nominativo
03 - Transferencia electrónica de fondos
04 - Tarjeta de crédito
05 - Monedero electrónico
28 - Tarjeta de débito
99 - Por definir
```

### c_MetodoPago (metodo_pago_sat)

```
PUE - Pago en una sola exhibición
PPD - Pago en parcialidades o diferido
```

### c_TipoComprobante (tipo_comprobante)

```
I - Ingreso
E - Egreso
T - Traslado
N - Nómina
P - Pago
```

### c_Moneda (moneda)

```
MXN - Peso Mexicano
USD - Dólar americano
EUR - Euro
```

---

## 🔄 MAPEO: Campo Viejo → Campo SAT

| Campo Actual | Campo SAT Nuevo | Observaciones |
|--------------|-----------------|---------------|
| `forma_pago` (texto) | `forma_pago_sat` (código) | Convertir: "efectivo" → "01" |
| `referencia` | `folio_fiscal` o `folio_interno` | Depende si es factura o ticket |
| - | `uuid_cfdi` | Solo para facturas |
| - | `metodo_pago_sat` | Default: "PUE" |
| `descripcion` | `detalle_productos` (JSON) | Estructurar productos |

---

## ✅ RESUMEN DE CAMBIOS

### Campos Agregados: **13 campos**

**Prioritarios (7):**
1. `uuid_cfdi` - UUID del CFDI
2. `folio_fiscal` - Folio fiscal SAT
3. `serie` - Serie de la factura
4. `tipo_comprobante` - Tipo de comprobante SAT
5. `forma_pago_sat` - Código de forma de pago SAT
6. `metodo_pago_sat` - Método de pago SAT
7. `detalle_productos` - JSON con productos

**Complementarios (6):**
8. `lugar_expedicion` - Código postal
9. `moneda` - Código de moneda
10. `tipo_cambio` - Tipo de cambio
11. `descuento` - Descuento aplicado
12. `motivo_descuento` - Razón del descuento
13. `folio_interno` - Folio del ticket
14. `hora_emision` - Hora de emisión
15. `telefono_proveedor` - Teléfono

### Campos NO Agregados (con razón):
- ❌ `num_productos` - Se calcula desde JSON
- ❌ `propina` - Va en el total
- ❌ `metodo_pago_detalle` - Seguridad PCI DSS
- ❌ `detalle_compra` (texto plano) - Reemplazado por JSON

---

## 📊 EJEMPLO DE GASTO COMPLETO

```json
{
  "id": 123,
  "evento_id": 1,
  "concepto": "Alimentos para evento corporativo",
  "descripcion": "Compra en OXXO Insurgentes",
  "proveedor": "OXXO",
  "rfc_proveedor": "OXX010101ABC",
  "total": 895.00,
  "subtotal": 771.55,
  "iva": 123.45,
  "iva_porcentaje": 16,
  "fecha_gasto": "2025-10-12",
  "hora_emision": "14:30:00",

  // Campos SAT
  "tipo_comprobante": "I",
  "forma_pago_sat": "01",
  "metodo_pago_sat": "PUE",
  "moneda": "MXN",
  "folio_interno": "TICKET-123456",

  // Productos estructurados
  "detalle_productos": {
    "productos": [
      {
        "numero": 1,
        "codigo": "7501234567890",
        "descripcion": "COCA COLA 600ML",
        "cantidad": 2,
        "unidad": "PZA",
        "precio_unitario": 15.00,
        "importe": 30.00
      }
    ],
    "total_productos": 2,
    "subtotal_productos": 65.00
  },

  // Metadata OCR
  "ocr_confianza": 95,
  "ocr_validado": true
}
```

---

**FIN DEL ANÁLISIS SAT**

Siguiente paso: Generar la migración SQL corregida compatible con SAT.
