# 📊 ANÁLISIS DE IMPACTO: TABLAS DE GASTOS

## 🔄 FLUJO DE TRABAJO (IMPORTANTE)

### OPCIÓN A: Provisión → Gasto
```
┌─────────────┐     Subir documentos      ┌─────────────┐
│  PROVISIÓN  │  ───────────────────────► │    GASTO    │
│  (estimado) │   + Factura (PDF+XML)     │ (comprobado)│
│             │   + Comprobante pago      │             │
│   sin docs  │   o Ticket + Comprobante  │   con docs  │
└─────────────┘                           └─────────────┘
```

### OPCIÓN B: Gasto Directo (sin provisión)
```
┌─────────────────────────────────────────────────────────┐
│                    GASTO DIRECTO                        │
│  ⚠️ OBLIGATORIO subir:                                  │
│     • Factura (PDF + XML) + Comprobante de pago         │
│     ó                                                   │
│     • Ticket (imagen) + Comprobante de pago             │
└─────────────────────────────────────────────────────────┘
```

**Resumen:**
- **Provisión**: Sin documentos (estimado)
- **Gasto**: Con documentos obligatorios (factura/ticket + comprobante)

---

## 🏗️ ESTRUCTURA ACTUAL

### TABLA 1: `evt_gastos_erp` (Gastos de Eventos)
Usada en: 32 archivos del módulo `eventos-erp`

### TABLA 2: `cont_gastos_externos` (Gastos No Impactados)  
Usada en: 3 archivos del módulo `contabilidad-erp`  
Vista: `v_gastos_no_impactados`

### TABLA 3: `evt_provisiones_erp` (Provisiones)
**PODRÍA UNIFICARSE** con gastos usando campo `estado`

## 📋 COMPARACIÓN DE CAMPOS

### ✅ CAMPOS EN COMÚN (AMBAS TABLAS)

| Campo | Uso en Listados | Uso en Formularios | CONSERVAR |
|-------|-----------------|-------------------|-----------|
| `id` | ✅ Identificador | ✅ | **SÍ** |
| `company_id` | ✅ Filtro | ✅ | **SÍ** |
| `concepto` | ✅ Columna principal | ✅ | **SÍ** |
| `subtotal` | ✅ Finanzas | ✅ | **SÍ** |
| `iva` | ✅ Finanzas | ✅ | **SÍ** |
| `total` | ✅ Resumen | ✅ | **SÍ** |
| `fecha_gasto` | ✅ Columna | ✅ | **SÍ** |
| `pagado` | ✅ Estado | ✅ | **SÍ** |
| `proveedor_id` | ✅ FK | ✅ | **SÍ** |
| `forma_pago_id` | ❌ Raro en lista | ✅ | **OPCIONAL** |
| `documento_url` | ❌ Solo link | ✅ | **SÍ** |
| `notas` | ❌ Detalles | ✅ | **SÍ** |
| `created_at` | ✅ Orden | ✅ | **SÍ** |
| `created_by` | ❌ Auditoría | ✅ | **SÍ** |

---

### 🔴 CAMPOS SOLO EN `evt_gastos_erp` (EVENTOS)

| Campo | Uso Real | RECOMENDACIÓN |
|-------|----------|---------------|
| `evento_id` | ✅ FK Obligatorio | **MANTENER** (específico de eventos) |
| `categoria_id` | ✅ Filtro/Orden | **MANTENER** |
| `cantidad` | ❌ Casi sin uso | **⚠️ ELIMINAR** (siempre = 1) |
| `precio_unitario` | ❌ Redundante | **⚠️ ELIMINAR** (usar total) |
| `descripcion` | ❌ Sin uso visible | **⚠️ ELIMINAR** (usar concepto) |
| `referencia` | ❌ Sin uso | **⚠️ ELIMINAR** |
| `forma_pago` | ❌ Duplicado de forma_pago_id | **⚠️ ELIMINAR** |
| `proveedor` | ❌ Duplicado de proveedor_id | **⚠️ ELIMINAR** |
| `rfc_proveedor` | ⚠️ Útil para SAT | **OPCIONAL** (mover a proveedor) |
| `moneda` | ❌ Sin uso (siempre MXN) | **⚠️ ELIMINAR** |
| `tipo_cambio` | ❌ Sin uso | **⚠️ ELIMINAR** |
| `detalle_compra` | ⚠️ JSON OCR | **MOVER A notas** |
| `detalle_retorno` | ✅ Materiales | **MANTENER** (especial) |
| `tipo_movimiento` | ✅ gasto/retorno | **MANTENER** |
| `archivo_adjunto` | ✅ Comprobante | **RENOMBRAR** a documento_url |
| `archivo_nombre` | ❌ Redundante | **⚠️ ELIMINAR** |
| `responsable_id` | ❌ Sin uso actual | **🆕 AGREGAR** |
| `activo` | ✅ Soft delete | **MANTENER** |
| `deleted_at` | ✅ Soft delete | **MANTENER** |
| `deleted_by` | ✅ Auditoría | **MANTENER** |
| `delete_reason` | ❌ Casi sin uso | **OPCIONAL** |
| `sat_estado` | ⚠️ Validación SAT | **OPCIONAL** |
| `sat_validado` | ⚠️ Validación SAT | **OPCIONAL** |
| `ocr_confianza` | ❌ Debug OCR | **⚠️ ELIMINAR** |
| `ocr_validado` | ❌ Debug OCR | **⚠️ ELIMINAR** |
| `ocr_datos_originales` | ❌ Debug OCR | **⚠️ ELIMINAR** |
| `documento_ocr_id` | ❌ FK legacy | **⚠️ ELIMINAR** |
| `iva_porcentaje` | ⚠️ Útil | **MANTENER** |
| `folio_fiscal` | ⚠️ UUID CFDI | **MANTENER** |
| `folio_interno` | ❌ Sin uso | **⚠️ ELIMINAR** |

---

### 🔵 CAMPOS SOLO EN `cont_gastos_externos` (GNI)

| Campo | Uso Real | RECOMENDACIÓN |
|-------|----------|---------------|
| `cuenta_contable_id` | ✅ Clasificación | **MANTENER** (reemplaza categoria_id) |
| `ejecutivo_id` | ⚠️ Asignación | **🆕 AGREGAR a eventos** (= responsable) |
| `periodo` | ✅ Filtro YYYY-MM | **MANTENER** |
| `validacion` | ⚠️ Estado contable | **MANTENER** |
| `status_pago` | ✅ pagado/pendiente | **MANTENER** (= pagado) |
| `folio_factura` | ⚠️ Referencia | **MANTENER** |
| `importado_de` | ⚠️ Trazabilidad | **OPCIONAL** |
| `tipo` | ⚠️ Clasificación | **MANTENER** |

---

## 🎯 PROPUESTA DE UNIFICACIÓN

### ESTRUCTURA PROPUESTA: `erp_gastos` (tabla única)

```sql
-- CAMPOS ESENCIALES (todos obligatorios)
id                  UUID PRIMARY KEY
company_id          UUID NOT NULL
concepto            VARCHAR(500) NOT NULL
subtotal            DECIMAL(15,2) NOT NULL DEFAULT 0
iva                 DECIMAL(15,2) NOT NULL DEFAULT 0
iva_porcentaje      DECIMAL(5,2) DEFAULT 16
total               DECIMAL(15,2) NOT NULL
fecha_gasto         DATE NOT NULL
activo              BOOLEAN DEFAULT true

-- 🔄 ESTADO DEL GASTO (FLUJO PROVISIÓN → GASTO)
estado              VARCHAR(20) DEFAULT 'provision'
                    -- 'provision' = Estimado, sin comprobantes
                    -- 'pendiente' = Ya tiene comprobantes, pendiente de pago
                    -- 'pagado'    = Pagado y comprobado

-- RELACIONES
evento_id           INT NULL (NULL = gasto no impactado)
categoria_id        INT NULL (categoría de gasto de eventos)
cuenta_contable_id  INT NULL (cuenta de GNI)
proveedor_id        INT NULL
responsable_id      UUID NULL (👤 quien lo genera/aprueba)

-- 📎 DOCUMENTOS (4 campos)
comprobante_pago_url TEXT NULL -- Comprobante de pago/transferencia
factura_pdf_url      TEXT NULL -- PDF de la factura
factura_xml_url      TEXT NULL -- XML CFDI
ticket_url           TEXT NULL -- Imagen de ticket (alternativa)

-- DATOS FISCALES
folio_fiscal        TEXT NULL (UUID del CFDI)
notas               TEXT NULL

-- MATERIALES (específico eventos)
tipo_movimiento     VARCHAR(20) NULL ('gasto', 'retorno')
detalle_retorno     JSONB NULL (para materiales)

-- AUDITORÍA
created_at          TIMESTAMP DEFAULT NOW()
created_by          UUID NULL
updated_at          TIMESTAMP
updated_by          UUID NULL
deleted_at          TIMESTAMP NULL
deleted_by          UUID NULL

-- VALIDACIÓN CONTABLE
validacion          VARCHAR(20) DEFAULT 'pendiente'
periodo             VARCHAR(7) NULL (YYYY-MM para reportes)
```

### 🔄 FLUJO DE ESTADOS:

```
┌────────────┐    Subir docs    ┌────────────┐    Confirmar     ┌────────────┐
│ PROVISION  │ ──────────────► │ PENDIENTE  │ ───────────────► │   PAGADO   │
│ (estimado) │  PDF+XML/Ticket │ (con docs) │    pago          │(comprobado)│
└────────────┘                  └────────────┘                  └────────────┘
```

---

## 📊 CAMPOS A ELIMINAR (22 CAMPOS)

| # | Campo | Razón |
|---|-------|-------|
| 1 | `cantidad` | Siempre = 1, redundante |
| 2 | `precio_unitario` | = total cuando cantidad = 1 |
| 3 | `descripcion` | Duplicado de concepto |
| 4 | `referencia` | Sin uso |
| 5 | `forma_pago` (texto) | Usar forma_pago_id |
| 6 | `proveedor` (texto) | Usar proveedor_id |
| 7 | `rfc_proveedor` | Mover a tabla proveedores |
| 8 | `moneda` | Siempre MXN |
| 9 | `tipo_cambio` | No aplica |
| 10 | `archivo_nombre` | Se extrae de URL |
| 11 | `ocr_confianza` | Debug |
| 12 | `ocr_validado` | Debug |
| 13 | `ocr_datos_originales` | Debug |
| 14 | `documento_ocr_id` | Legacy |
| 15 | `folio_interno` | Sin uso |
| 16 | `delete_reason` | Opcional |
| 17 | `sat_estado` | Mover a campo validacion |
| 18 | `sat_validado` | Mover a campo validacion |
| 19 | `detalle_compra` | Mover a notas |
| 20 | `archivo_adjunto` | Renombrar a documento_url |
| 21 | `status_pago` | = campo pagado |
| 22 | `importado_de` | Opcional |

---

## ✅ CAMPOS A AGREGAR

| Campo | Descripción |
|-------|-------------|
| `responsable_id` | Usuario que genera o aprueba el gasto |
| `comprobante_pago_url` | 📄 Comprobante de pago (PDF/imagen) |
| `factura_pdf_url` | 📑 Factura en PDF |
| `factura_xml_url` | 📋 XML CFDI |
| `ticket_url` | 🎫 Imagen de ticket (alternativa a factura) |

### 📎 Lógica de Documentos:

**OPCIÓN A: Factura formal**
- `factura_pdf_url` → PDF de la factura
- `factura_xml_url` → XML CFDI (para validación SAT)
- `comprobante_pago_url` → Comprobante de pago/transferencia (opcional)

**OPCIÓN B: Ticket**
- `ticket_url` → Imagen del ticket (JPG/PNG)
- `comprobante_pago_url` → Comprobante de pago (opcional)

---

## 🚀 BENEFICIOS DE UNIFICAR

1. **Formulario único**: Un solo componente para gastos
2. **Menos código**: Eliminar duplicación GNI vs Eventos
3. **Reportes cruzados**: Comparar gastos de eventos vs operativos
4. **Mantenimiento**: Una sola tabla que mantener
5. **Consistencia**: Mismos campos en toda la app

---

## ⚠️ RIESGOS

1. **Migración de datos**: Requiere script para unificar
2. **Vistas existentes**: Actualizar `v_gastos_no_impactados`
3. **Modelos de datos**: Actualizar tipos TypeScript
4. **Formularios**: Unificar ExpenseForm + GastoFormModal

---

## 📝 DECISIÓN REQUERIDA

Por favor indica:

1. ¿Apruebas la lista de campos a **ELIMINAR**?
2. ¿Quieres agregar el campo **responsable_id**?
3. ¿Prefieres **unificar las tablas** o **mantenerlas separadas pero homogéneas**?
4. ¿Algún campo adicional que desees agregar o conservar?
