# ARQUITECTURA HOMOLOGADA: GASTOS, PROVISIONES Y GNI

## 1. RESUMEN EJECUTIVO

Este documento define la arquitectura unificada para el manejo de:
- **evt_gastos** (Gastos de Eventos) - Gastos reales pagados
- **evt_provisiones** (Provisiones de Eventos) - Gastos estimados/pendientes
- **cont_gastos_externos** (GNI) - Gastos No Impactados operativos

### Principios de Diseño
1. **Single Source of Truth (SSOT)**: Catálogos compartidos entre módulos
2. **Reutilización de Componentes**: Formularios, OCR y XML compartidos
3. **Solo 4 Categorías**: SP, Combustible/Peaje, RH, Materiales (para todo el sistema)
4. **Validación Fiscal Estricta**: `Total = Subtotal + IVA - Retenciones` SIEMPRE (provisiones Y gastos)
5. **Proveedores Progresivos**: Inician con nombre, se completan con RFC al primer pago
6. **Conversión Automatizada**: Provisión → Gasto al agregar comprobante de pago
7. **Verificación XML/PDF**: Bloquear si documentos no corresponden al mismo CFDI

---

## 2. CATÁLOGOS COMPARTIDOS (SSOT)

### 2.1 cat_proveedores (Existente en migración 012)
```sql
-- Ya existe, usar para TODOS los módulos
CREATE TABLE cat_proveedores (
  id SERIAL PRIMARY KEY,
  rfc VARCHAR(13),
  razon_social TEXT NOT NULL,
  nombre_comercial TEXT,
  direccion TEXT,
  telefono VARCHAR(20),
  email VARCHAR(100),
  contacto_nombre VARCHAR(100),
  modulo_origen VARCHAR(50),  -- NULL = global
  activo BOOLEAN DEFAULT true,
  company_id UUID REFERENCES core_companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.2 cat_formas_pago (Existente en migración 012)
```sql
-- Ya existe, HOMOLOGAR con PAYMENT_METHODS de eventos
CREATE TABLE cat_formas_pago (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,       -- KUSPIT, AMEX, EFECTIVO, etc.
  codigo_sat VARCHAR(2),             -- NUEVO: 01, 02, 03, etc.
  tipo VARCHAR(30),                  -- transferencia, tarjeta, efectivo, cheque
  banco VARCHAR(50),
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  company_id UUID REFERENCES core_companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(nombre, company_id)
);
```

### 2.3 cat_categorias_gasto (FIJAS - Solo 4 categorías)
```sql
-- ⚠️ IMPORTANTE: SOLO 4 CATEGORÍAS FIJAS para TODO el sistema
-- Estas categorías son las mismas para: Eventos, Provisiones y GNI
CREATE TABLE cat_categorias_gasto_unificado (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(20) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  color VARCHAR(7) DEFAULT '#6B7280',
  orden_display INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  company_id UUID REFERENCES core_companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clave, company_id)
);

-- ⚠️ SOLO ESTAS 4 CATEGORÍAS - NO AGREGAR MÁS
INSERT INTO cat_categorias_gasto_unificado (clave, nombre, descripcion, color, orden_display) VALUES
  ('SP', 'Solicitudes de Pago', 'Servicios profesionales y pagos a terceros', '#8B5CF6', 1),
  ('COMB', 'Combustible/Peaje', 'Gasolina, casetas y viáticos de transporte', '#F59E0B', 2),
  ('RH', 'Recursos Humanos', 'Nómina, honorarios y pagos a personal', '#10B981', 3),
  ('MAT', 'Materiales', 'Insumos, materiales y consumibles', '#3B82F6', 4);

-- Constraint para evitar nuevas categorías (solo admin puede agregar)
COMMENT ON TABLE cat_categorias_gasto_unificado IS
'SOLO 4 CATEGORÍAS PERMITIDAS: SP, COMB, RH, MAT. Usar las mismas en Eventos, Provisiones y GNI.';
```

### 2.4 cat_proveedores (Con actualización progresiva)
```sql
-- Proveedores pueden iniciar SOLO con nombre
-- Al primer pago, se DEBE actualizar con datos fiscales
ALTER TABLE cat_proveedores
  ADD COLUMN IF NOT EXISTS datos_fiscales_completos BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_actualizacion_fiscal TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS requiere_actualizacion BOOLEAN DEFAULT true;

-- Constraint: Si hay RFC, debe ser válido
ALTER TABLE cat_proveedores
  ADD CONSTRAINT chk_rfc_format
  CHECK (rfc IS NULL OR rfc ~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$');

COMMENT ON TABLE cat_proveedores IS
'Proveedores inician solo con nombre. Al primer pago se actualizan datos fiscales (RFC, razón social).';
```

---

## 3. ESTRUCTURA DE TABLAS HOMOLOGADAS

### 3.1 evt_gastos (MODIFICAR)
```sql
-- Agregar FKs a catálogos compartidos
ALTER TABLE evt_gastos
  ADD COLUMN IF NOT EXISTS proveedor_id INTEGER REFERENCES cat_proveedores(id),
  ADD COLUMN IF NOT EXISTS forma_pago_id INTEGER REFERENCES cat_formas_pago(id),
  ADD COLUMN IF NOT EXISTS ejecutivo_id INTEGER REFERENCES cat_ejecutivos(id),
  ADD COLUMN IF NOT EXISTS categoria_unificada_id INTEGER REFERENCES cat_categorias_gasto_unificado(id),

  -- Campos CFDI (mantener existentes)
  -- uuid_cfdi, folio_fiscal, serie, tipo_comprobante ya existen

  -- Nuevos campos de control
  ADD COLUMN IF NOT EXISTS retenciones NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provision_origen_id UUID,  -- Si vino de provisión
  ADD COLUMN IF NOT EXISTS validacion_fiscal VARCHAR(20) DEFAULT 'pendiente';

-- ⚠️ Constraint de cuadre fiscal ESTRICTO
ALTER TABLE evt_gastos
  ADD CONSTRAINT chk_gasto_fiscal_balance
  CHECK (ABS(total - (subtotal + iva - COALESCE(retenciones, 0))) <= 0.01);

-- Índices
CREATE INDEX IF NOT EXISTS idx_evt_gastos_proveedor ON evt_gastos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_evt_gastos_forma_pago ON evt_gastos(forma_pago_id);
CREATE INDEX IF NOT EXISTS idx_evt_gastos_provision ON evt_gastos(provision_origen_id);
CREATE INDEX IF NOT EXISTS idx_evt_gastos_categoria_unif ON evt_gastos(categoria_unificada_id);
```

### 3.2 evt_provisiones (NUEVA)
```sql
CREATE TABLE evt_provisiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES evt_eventos(id),
  company_id UUID REFERENCES core_companies(id),

  -- Proveedor (OBLIGATORIO desde catálogo)
  proveedor_id INTEGER NOT NULL REFERENCES cat_proveedores(id),

  -- Concepto y categoría (SOLO 4 CATEGORÍAS)
  concepto TEXT NOT NULL,
  descripcion TEXT,
  categoria_id INTEGER NOT NULL REFERENCES cat_categorias_gasto_unificado(id),
  -- ⚠️ Solo puede ser: SP, COMB, RH, MAT

  -- Montos (⚠️ VALIDACIÓN ESTRICTA: Total = Subtotal + IVA - Retenciones)
  cantidad NUMERIC DEFAULT 1,
  precio_unitario NUMERIC,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  iva_porcentaje NUMERIC DEFAULT 16,
  iva NUMERIC DEFAULT 0,
  retenciones NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,

  -- Constraint de cuadre fiscal
  CONSTRAINT chk_provision_fiscal_balance
    CHECK (ABS(total - (subtotal + iva - retenciones)) <= 0.01),

  -- Forma de pago (desde catálogo)
  forma_pago_id INTEGER REFERENCES cat_formas_pago(id),

  -- Estado de la provisión
  estado VARCHAR(30) DEFAULT 'pendiente',
  -- 'pendiente', 'aprobado', 'pagado', 'convertido_a_gasto', 'cancelado'

  -- Ejecutivo responsable
  ejecutivo_id INTEGER REFERENCES cat_ejecutivos(id),
  responsable_id UUID REFERENCES core_users(id),

  -- Fechas
  fecha_estimada DATE,
  fecha_pago DATE,

  -- Documento de pago (al subir, se convierte a gasto)
  comprobante_pago_url TEXT,
  comprobante_pago_nombre VARCHAR(255),

  -- XML/OCR (opcional)
  xml_file_url TEXT,
  uuid_cfdi VARCHAR(36),
  folio_fiscal VARCHAR(50),

  -- Metadata OCR
  ocr_confianza NUMERIC,
  ocr_validado BOOLEAN DEFAULT false,
  ocr_datos_originales JSONB,

  -- Referencia al gasto generado
  gasto_generado_id UUID REFERENCES evt_gastos(id),
  fecha_conversion TIMESTAMPTZ,

  -- Notas
  notas TEXT,

  -- Soft delete y auditoría
  activo BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  delete_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES core_users(id)
);

-- Índices
CREATE INDEX idx_evt_provisiones_evento ON evt_provisiones(evento_id);
CREATE INDEX idx_evt_provisiones_proveedor ON evt_provisiones(proveedor_id);
CREATE INDEX idx_evt_provisiones_tipo ON evt_provisiones(tipo_provision);
CREATE INDEX idx_evt_provisiones_estado ON evt_provisiones(estado);
CREATE INDEX idx_evt_provisiones_fecha ON evt_provisiones(fecha_estimada);

-- RLS
ALTER TABLE evt_provisiones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evt_provisiones_select" ON evt_provisiones FOR SELECT USING (true);
CREATE POLICY "evt_provisiones_insert" ON evt_provisiones FOR INSERT WITH CHECK (true);
CREATE POLICY "evt_provisiones_update" ON evt_provisiones FOR UPDATE USING (true);
CREATE POLICY "evt_provisiones_delete" ON evt_provisiones FOR DELETE USING (true);

COMMENT ON TABLE evt_provisiones IS 'Provisiones de gastos estimados para eventos - Se convierten a gastos al agregar comprobante de pago';
```

### 3.3 cont_gastos_externos (Ya existe - Verificar compatibilidad)
```sql
-- Ya tiene los FKs necesarios desde migración 012
-- Verificar que tenga estos campos:
-- proveedor_id, forma_pago_id, ejecutivo_id, clave_gasto_id
-- subtotal, iva, total, validacion, status_pago, documento_url
```

---

## 4. REGLAS DE VALIDACIÓN

### 4.1 VALIDACIÓN FISCAL ESTRICTA (Para TODOS)

> ⚠️ **IMPORTANTE**: La validación fiscal es ESTRICTA tanto para PROVISIONES como para GASTOS.
> La fórmula `Total = Subtotal + IVA - Retenciones` SIEMPRE debe cuadrar.

```typescript
// Validación compartida para TODOS los tipos
interface FiscalValidation {
  // OBLIGATORIO siempre: Total = Subtotal + IVA - Retenciones
  fiscalFormula: 'total === subtotal + iva - retenciones';
  fiscalTolerance: 0.01; // Tolerancia de $0.01

  // Función de validación
  validate: (data: { subtotal: number; iva: number; retenciones: number; total: number }) => {
    const calculated = Math.round((data.subtotal + data.iva - data.retenciones) * 100) / 100;
    const difference = Math.abs(calculated - data.total);
    return difference <= 0.01;
  };
}
```

### 4.2 PROVISIONES (Estricto en cifras)
```typescript
interface ProvisionValidation {
  // Campos requeridos
  required: [
    'proveedor_id',      // Obligatorio desde catálogo
    'concepto',          // Descripción del gasto
    'categoria_id',      // Solo las 4 categorías: SP, COMB, RH, MAT
    'subtotal',          // Monto sin IVA
    'iva',               // IVA (puede ser 0)
    'total'              // Monto total
  ];

  // ⚠️ VALIDACIÓN FISCAL ESTRICTA - SIEMPRE
  fiscalValidation: true;
  fiscalFormula: 'total === subtotal + iva - retenciones';

  // Sin CFDI requerido (es estimado)
  cfdiRequired: false;

  // Categoría OBLIGATORIA de las 4
  categoriaValidation: (categoria_id) => {
    const categoriasPermitidas = ['SP', 'COMB', 'RH', 'MAT'];
    return categoriasPermitidas.includes(getCategoriaCode(categoria_id));
  };
}
```

### 4.3 GASTOS (Estricto en cifras + CFDI)
```typescript
interface ExpenseValidation {
  // Campos requeridos
  required: [
    'proveedor_id',      // Obligatorio desde catálogo
    'concepto',
    'categoria_id',      // Solo las 4 categorías
    'subtotal',
    'iva',
    'total',
    'fecha_gasto'
  ];

  // ⚠️ VALIDACIÓN FISCAL ESTRICTA - SIEMPRE
  fiscalValidation: true;
  fiscalFormula: 'total === subtotal + iva - retenciones';

  // Si tiene CFDI, validar UUID
  cfdiValidation: (data) => {
    if (data.uuid_cfdi) {
      return isValidUUID(data.uuid_cfdi);
    }
    return true;
  };

  // RFC obligatorio si hay CFDI
  rfcValidation: (data) => {
    if (data.uuid_cfdi && !data.rfc_proveedor) {
      return false;
    }
    return true;
  };
}
```

### 4.4 PROVEEDORES (Actualización progresiva)
```typescript
interface ProviderValidation {
  // Al CREAR proveedor (mínimo)
  createMinimum: ['nombre'];  // Solo nombre requerido

  // Al PRIMER PAGO (actualización obligatoria)
  onFirstPayment: {
    required: ['rfc', 'razon_social'],
    action: 'BLOQUEAR pago si no se actualizan datos fiscales',
    ui: 'Mostrar modal de actualización de proveedor'
  };

  // Flujo de actualización
  updateFlow: async (proveedorId: number, gastoData: any) => {
    const proveedor = await getProveedor(proveedorId);

    // Si no tiene datos fiscales completos
    if (!proveedor.datos_fiscales_completos) {
      // Intentar extraer del XML/PDF
      if (gastoData.rfc_proveedor) {
        await updateProveedor(proveedorId, {
          rfc: gastoData.rfc_proveedor,
          razon_social: gastoData.proveedor_nombre || proveedor.razon_social,
          datos_fiscales_completos: true,
          fecha_actualizacion_fiscal: new Date(),
          requiere_actualizacion: false
        });
      } else {
        // Forzar actualización manual
        throw new Error('ACTUALIZAR_PROVEEDOR_REQUERIDO');
      }
    }
  };
}
```

---

## 5. FLUJO DE CONVERSIÓN: PROVISIÓN → GASTO

```
┌──────────────────┐
│   PROVISIÓN      │
│   (Estimado)     │
│                  │
│ • Sin validación │
│ • Sin CFDI       │
│ • Estado: pending│
└────────┬─────────┘
         │
         │ [Usuario sube comprobante de pago]
         │
         ▼
┌──────────────────────────────────────────┐
│         VALIDACIÓN AUTOMÁTICA            │
│                                          │
│ 1. Procesar XML/PDF con OCR              │
│ 2. Extraer: UUID, RFC, totales           │
│ 3. Validar cuadre fiscal                 │
│ 4. Si OK → Crear gasto automático        │
│ 5. Si ERROR → Mostrar formulario edición │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│     GASTO        │
│     (Real)       │
│                  │
│ • Validado       │
│ • CFDI/UUID      │
│ • Estado: pagado │
│ • FK: provisión  │
└──────────────────┘
```

### 5.1 Función de Conversión
```typescript
async function convertirProvisionAGasto(
  provisionId: string,
  comprobanteFile: File
): Promise<{ success: boolean; gastoId?: string; errors?: string[] }> {

  // 1. Obtener provisión
  const provision = await getProvision(provisionId);
  if (!provision) throw new Error('Provisión no encontrada');

  // 2. Procesar documento (OCR/XML)
  const docResult = await processDocument(comprobanteFile);

  // 3. Preparar datos del gasto
  const gastoData: Partial<Expense> = {
    evento_id: provision.evento_id,
    proveedor_id: provision.proveedor_id,
    concepto: provision.concepto,
    descripcion: provision.descripcion,
    categoria_id: provision.categoria_id,
    forma_pago_id: provision.forma_pago_id,
    ejecutivo_id: provision.ejecutivo_id,

    // Usar datos del documento si están disponibles
    subtotal: docResult.subtotal || provision.subtotal,
    iva: docResult.iva || provision.iva,
    retenciones: docResult.retenciones || provision.retenciones,
    total: docResult.total || provision.total,

    // Datos CFDI
    uuid_cfdi: docResult.uuid,
    rfc_proveedor: docResult.rfcEmisor,
    folio_fiscal: docResult.folio,

    // Comprobante
    documento_url: await uploadFile(comprobanteFile),
    xml_file_url: docResult.xmlUrl,

    // Referencias
    provision_origen_id: provisionId,

    // Estado
    pagado: true,
    comprobado: true,
    status_aprobacion: 'aprobado',
    fecha_gasto: new Date().toISOString(),
    fecha_pago: new Date().toISOString()
  };

  // 4. Validar cuadre fiscal
  const validacion = validarCuadreFiscal(gastoData);
  if (!validacion.valid) {
    return {
      success: false,
      errors: validacion.errors,
      gastoData // Retornar para edición manual
    };
  }

  // 5. Crear gasto
  const gasto = await createExpense(gastoData);

  // 6. Actualizar provisión
  await updateProvision(provisionId, {
    estado: 'convertido_a_gasto',
    gasto_generado_id: gasto.id,
    fecha_conversion: new Date().toISOString(),
    comprobante_pago_url: gastoData.documento_url
  });

  return { success: true, gastoId: gasto.id };
}
```

---

## 6. VERIFICACIÓN DE CONSISTENCIA XML/PDF

### 6.1 Propósito
Cuando el usuario sube un archivo XML (CFDI) y un PDF/imagen del mismo gasto, el sistema debe verificar que ambos documentos correspondan al mismo comprobante fiscal. Si no coinciden, **NO se permite continuar**.

### 6.2 Campos a Verificar

| Campo | Prioridad | Tolerancia |
|-------|-----------|------------|
| **UUID CFDI** | CRÍTICA | Exacto |
| **Total** | ALTA | ±$0.01 |
| **RFC Emisor** | ALTA | Exacto (ignorando case) |
| **Fecha** | MEDIA | ±1 día |
| **Subtotal** | MEDIA | ±$0.01 |
| **IVA** | MEDIA | ±$0.01 |

### 6.3 Algoritmo de Verificación

```typescript
interface DocumentMatchResult {
  match: boolean;
  confidence: number;          // 0-100%
  matchedFields: string[];     // Campos que coinciden
  mismatchedFields: string[];  // Campos que NO coinciden
  criticalMismatch: boolean;   // Si hay mismatch en campo crítico
  warnings: string[];
  errors: string[];
}

interface ExtractedDocumentData {
  uuid_cfdi?: string;
  rfc_emisor?: string;
  rfc_receptor?: string;
  fecha?: string;
  subtotal?: number;
  iva?: number;
  total?: number;
  folio?: string;
  serie?: string;
  razon_social?: string;
  source: 'xml' | 'pdf' | 'ocr';
}

async function verifyDocumentConsistency(
  xmlData: ExtractedDocumentData,
  pdfData: ExtractedDocumentData
): Promise<DocumentMatchResult> {

  const result: DocumentMatchResult = {
    match: true,
    confidence: 0,
    matchedFields: [],
    mismatchedFields: [],
    criticalMismatch: false,
    warnings: [],
    errors: []
  };

  let totalWeight = 0;
  let matchedWeight = 0;

  // ========== UUID CFDI (CRÍTICO - 40%) ==========
  if (xmlData.uuid_cfdi && pdfData.uuid_cfdi) {
    totalWeight += 40;
    const xmlUUID = xmlData.uuid_cfdi.toLowerCase().trim();
    const pdfUUID = pdfData.uuid_cfdi.toLowerCase().trim();

    if (xmlUUID === pdfUUID) {
      matchedWeight += 40;
      result.matchedFields.push('uuid_cfdi');
    } else {
      result.mismatchedFields.push('uuid_cfdi');
      result.criticalMismatch = true;
      result.errors.push(
        `UUID no coincide: XML=${xmlUUID} vs PDF=${pdfUUID}`
      );
    }
  } else if (xmlData.uuid_cfdi && !pdfData.uuid_cfdi) {
    result.warnings.push('No se pudo extraer UUID del PDF (verificar manualmente)');
  }

  // ========== TOTAL (ALTO - 25%) ==========
  if (xmlData.total !== undefined && pdfData.total !== undefined) {
    totalWeight += 25;
    const diff = Math.abs(xmlData.total - pdfData.total);

    if (diff <= 0.01) {
      matchedWeight += 25;
      result.matchedFields.push('total');
    } else {
      result.mismatchedFields.push('total');
      result.errors.push(
        `Total no coincide: XML=$${xmlData.total.toFixed(2)} vs PDF=$${pdfData.total.toFixed(2)} (dif: $${diff.toFixed(2)})`
      );
    }
  }

  // ========== RFC EMISOR (ALTO - 20%) ==========
  if (xmlData.rfc_emisor && pdfData.rfc_emisor) {
    totalWeight += 20;
    const xmlRFC = xmlData.rfc_emisor.toUpperCase().trim();
    const pdfRFC = pdfData.rfc_emisor.toUpperCase().trim();

    if (xmlRFC === pdfRFC) {
      matchedWeight += 20;
      result.matchedFields.push('rfc_emisor');
    } else {
      result.mismatchedFields.push('rfc_emisor');
      result.errors.push(
        `RFC Emisor no coincide: XML=${xmlRFC} vs PDF=${pdfRFC}`
      );
    }
  }

  // ========== FECHA (MEDIO - 10%) ==========
  if (xmlData.fecha && pdfData.fecha) {
    totalWeight += 10;
    const xmlDate = new Date(xmlData.fecha);
    const pdfDate = new Date(pdfData.fecha);
    const diffDays = Math.abs(
      (xmlDate.getTime() - pdfDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays <= 1) {
      matchedWeight += 10;
      result.matchedFields.push('fecha');
    } else {
      result.mismatchedFields.push('fecha');
      result.warnings.push(
        `Fecha difiere en ${Math.round(diffDays)} días`
      );
    }
  }

  // ========== SUBTOTAL (MEDIO - 5%) ==========
  if (xmlData.subtotal !== undefined && pdfData.subtotal !== undefined) {
    totalWeight += 5;
    const diff = Math.abs(xmlData.subtotal - pdfData.subtotal);

    if (diff <= 0.01) {
      matchedWeight += 5;
      result.matchedFields.push('subtotal');
    } else {
      result.warnings.push(
        `Subtotal difiere: $${diff.toFixed(2)}`
      );
    }
  }

  // ========== CALCULAR CONFIANZA FINAL ==========
  result.confidence = totalWeight > 0
    ? Math.round((matchedWeight / totalWeight) * 100)
    : 0;

  // ========== DETERMINAR SI COINCIDE ==========
  // NO coincide si:
  // 1. Hay mismatch crítico (UUID)
  // 2. La confianza es menor a 70%
  // 3. El total no coincide
  result.match = !result.criticalMismatch
    && result.confidence >= 70
    && !result.mismatchedFields.includes('total');

  return result;
}
```

### 6.4 Flujo de Verificación en UI

```
┌─────────────────────────────────────────┐
│         SUBIR COMPROBANTES              │
│                                         │
│  ┌─────────────┐   ┌─────────────┐     │
│  │   XML       │   │   PDF       │     │
│  │  (CFDI)     │   │  (Imagen)   │     │
│  └──────┬──────┘   └──────┬──────┘     │
│         │                 │            │
└─────────┼─────────────────┼────────────┘
          │                 │
          ▼                 ▼
┌─────────────────────────────────────────┐
│      PROCESAMIENTO PARALELO             │
│                                         │
│  XML Parser     │     OCR/PDF Parser    │
│       ↓         │          ↓            │
│  xmlData        │      pdfData          │
└─────────┬───────────────────┬───────────┘
          │                   │
          ▼                   ▼
┌─────────────────────────────────────────┐
│     VERIFICACIÓN DE CONSISTENCIA        │
│                                         │
│     verifyDocumentConsistency()         │
└───────────────────┬─────────────────────┘
                    │
          ┌─────────┴──────────┐
          │                    │
          ▼                    ▼
┌─────────────────┐    ┌──────────────────┐
│   COINCIDEN     │    │   NO COINCIDEN   │
│   ✅ match=true │    │   ❌ match=false │
│                 │    │                  │
│ → Continuar     │    │ → BLOQUEAR       │
│ → Prellenar     │    │ → Mostrar errores│
│   formulario    │    │ → Pedir corrección│
└─────────────────┘    └──────────────────┘
```

### 6.5 Componente de Verificación

```typescript
// components/DocumentVerificationAlert.tsx

interface DocumentVerificationAlertProps {
  result: DocumentMatchResult;
  onAccept?: () => void;      // Solo si match=true
  onReject: () => void;       // Cancelar y volver a subir
  onOverride?: () => void;    // Para admins (forzar aceptar)
}

const DocumentVerificationAlert: React.FC<DocumentVerificationAlertProps> = ({
  result,
  onAccept,
  onReject,
  onOverride
}) => {
  if (result.match) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">
            Documentos verificados ({result.confidence}% coincidencia)
          </span>
        </div>
        <div className="mt-2 text-sm text-green-600">
          Campos verificados: {result.matchedFields.join(', ')}
        </div>
        {result.warnings.length > 0 && (
          <div className="mt-2 text-sm text-yellow-600">
            ⚠️ {result.warnings.join(' | ')}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button onClick={onAccept} className="bg-green-600">
            Continuar con el registro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center gap-2 text-red-700">
        <XCircle className="w-5 h-5" />
        <span className="font-medium">
          ❌ Los documentos NO corresponden al mismo comprobante
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {result.errors.map((error, i) => (
          <div key={i} className="text-sm text-red-600 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ))}
      </div>

      {result.warnings.length > 0 && (
        <div className="mt-2 text-sm text-yellow-600">
          Advertencias: {result.warnings.join(' | ')}
        </div>
      )}

      <div className="mt-4 flex justify-between">
        <Button onClick={onReject} variant="outline">
          Subir documentos correctos
        </Button>

        {/* Solo para administradores */}
        {onOverride && (
          <Button
            onClick={onOverride}
            variant="ghost"
            className="text-red-500"
            title="Solo administradores"
          >
            Forzar aceptar (admin)
          </Button>
        )}
      </div>
    </div>
  );
};
```

### 6.6 Casos de Uso

| Escenario | Acción |
|-----------|--------|
| XML y PDF con mismo UUID | ✅ Permitir, prellenar datos del XML |
| XML y PDF con UUID diferente | ❌ Bloquear, "Los documentos no coinciden" |
| Solo XML (sin PDF) | ✅ Permitir, usar datos del XML |
| Solo PDF (sin XML) | ⚠️ Permitir con advertencia "Sin validación fiscal" |
| UUID coincide pero total difiere | ❌ Bloquear, "El total no coincide" |
| UUID del PDF no legible | ⚠️ Advertencia, verificar total y RFC |
| PDF es ticket (sin UUID) | ✅ Permitir sin XML, marcar como "ticket" |

---

## 7. COMPONENTES REUTILIZABLES

### 7.1 Estructura de Carpetas
```
src/
├── shared/
│   ├── components/
│   │   └── finance/
│   │       ├── UnifiedExpenseForm.tsx      # Formulario unificado
│   │       ├── ProviderSelector.tsx        # Selector de proveedores
│   │       ├── PaymentMethodSelector.tsx   # Selector formas de pago
│   │       ├── FiscalAmountsInput.tsx      # Entrada montos fiscales
│   │       ├── FiscalValidationAlert.tsx   # Alerta de cuadre
│   │       └── DocumentUploader.tsx        # Subida con OCR/XML
│   │
│   ├── hooks/
│   │   ├── useProviders.ts                 # Hook catálogo proveedores
│   │   ├── usePaymentMethods.ts            # Hook formas de pago
│   │   ├── useFiscalValidation.ts          # Hook validación fiscal
│   │   └── useDocumentProcessor.ts         # Hook procesamiento docs
│   │
│   └── services/
│       ├── providerService.ts              # CRUD proveedores
│       ├── paymentMethodService.ts         # CRUD formas pago
│       └── documentService.ts              # Procesamiento docs
│
├── modules/
│   ├── eventos-erp/
│   │   ├── components/
│   │   │   └── finances/
│   │   │       ├── ExpenseTab.tsx          # Usa UnifiedExpenseForm
│   │   │       ├── ProvisionTab.tsx        # Nueva: Lista provisiones
│   │   │       └── ProvisionForm.tsx       # Usa UnifiedExpenseForm(mode='provision')
│   │   └── services/
│   │       ├── expenseService.ts
│   │       └── provisionService.ts         # Nuevo
│   │
│   ├── contabilidad-erp/
│   │   └── components/
│   │       └── GastoFormModal.tsx          # Usa UnifiedExpenseForm
│   │
│   └── ocr/                                # YA EXISTE - REUTILIZAR
│       ├── hooks/
│       │   └── useOCRIntegration.ts
│       ├── services/
│       │   ├── expenseOCRIntegration.ts
│       │   └── ocrService.ts
│       └── utils/
│           ├── cfdiXmlParser.ts
│           └── documentProcessor.ts
```

### 7.2 UnifiedExpenseForm (Componente Principal)
```typescript
interface UnifiedExpenseFormProps {
  // Modo de operación
  mode: 'expense' | 'provision' | 'gni';

  // Contexto
  eventId?: string;           // Para eventos
  companyId?: string;         // Para GNI

  // Datos iniciales
  initialData?: Partial<Expense | Provision | GNI>;

  // Configuración de validación
  validationConfig?: {
    fiscalValidation: boolean;  // true para gastos, false para provisiones
    requireProvider: boolean;   // true para todos
    requireCFDI: boolean;       // true solo para gastos con factura
  };

  // Callbacks
  onSave: (data: any) => void;
  onCancel: () => void;

  // Conversión (solo para provisiones)
  onConvertToExpense?: (provisionId: string, file: File) => void;
}

// Uso en diferentes módulos:

// Eventos - Gasto
<UnifiedExpenseForm
  mode="expense"
  eventId={eventId}
  validationConfig={{ fiscalValidation: true, requireProvider: true }}
  onSave={handleSaveExpense}
/>

// Eventos - Provisión
<UnifiedExpenseForm
  mode="provision"
  eventId={eventId}
  validationConfig={{ fiscalValidation: false, requireProvider: true }}
  onSave={handleSaveProvision}
  onConvertToExpense={handleConvertToExpense}
/>

// GNI
<UnifiedExpenseForm
  mode="gni"
  companyId={companyId}
  validationConfig={{ fiscalValidation: true, requireProvider: true }}
  onSave={handleSaveGNI}
/>
```

### 7.3 Reutilización de OCR/XML
```typescript
// El hook existente useOCRIntegration se usa sin cambios
// Solo se pasa el contexto correcto

// Para Eventos
const { processOCRFile, isProcessing } = useOCRIntegration(eventId);

// Para GNI (nuevo parámetro opcional)
const { processOCRFile, isProcessing } = useOCRIntegration(null, {
  context: 'gni',
  companyId
});

// El parser XML existente funciona igual
import { parseCFDIXml, cfdiToExpenseData } from '../utils/cfdiXmlParser';

const cfdiData = parseCFDIXml(xmlContent);
const expenseData = cfdiToExpenseData(cfdiData, eventId);
```

---

## 7. MAPEO DE CAMPOS

### 7.1 Tabla Comparativa

| Campo | evt_gastos | evt_provisiones | cont_gastos_externos |
|-------|-----------|-----------------|---------------------|
| **Identificador** | id (UUID) | id (UUID) | id (SERIAL) |
| **Evento** | evento_id (FK) | evento_id (FK) | - |
| **Empresa** | - | company_id | company_id |
| **Proveedor** | proveedor (text) → proveedor_id | proveedor_id (FK) | proveedor_id (FK) |
| **RFC** | rfc_proveedor | (desde catálogo) | (desde catálogo) |
| **Concepto** | concepto | concepto | concepto |
| **Categoría** | categoria_id | categoria_id | clave_gasto_id |
| **Subtotal** | subtotal | subtotal | subtotal |
| **IVA** | iva | iva | iva |
| **Retenciones** | retenciones (nuevo) | retenciones | - (agregar) |
| **Total** | total | total | total |
| **Forma Pago** | forma_pago (enum) → forma_pago_id | forma_pago_id (FK) | forma_pago_id (FK) |
| **Ejecutivo** | - (agregar) | ejecutivo_id | ejecutivo_id |
| **Fecha** | fecha_gasto | fecha_estimada | fecha_gasto |
| **UUID CFDI** | uuid_cfdi | uuid_cfdi | folio_factura |
| **Documento** | archivo_adjunto | comprobante_pago_url | documento_url |
| **XML** | xml_file_url | xml_file_url | - (agregar) |
| **Estado** | status_aprobacion | estado | validacion |
| **Pagado** | pagado | (al convertir) | status_pago |
| **OCR** | ocr_confianza, ocr_validado | ocr_confianza | - (agregar) |

### 7.2 Campos a Agregar

**evt_gastos:**
- proveedor_id (FK) - reemplaza proveedor texto
- forma_pago_id (FK) - reemplaza forma_pago enum
- ejecutivo_id (FK)
- retenciones (NUMERIC)
- provision_origen_id (UUID)

**cont_gastos_externos:**
- retenciones (NUMERIC)
- xml_file_url (TEXT)
- ocr_confianza (NUMERIC)
- ocr_validado (BOOLEAN)

---

## 8. PLAN DE MIGRACIÓN

### Fase 1: Preparación de Catálogos (Migración 016)
1. Agregar campo `codigo_sat` a cat_formas_pago
2. Crear cat_categorias_gasto_unificado
3. Migrar datos de evt_categorias_gasto y cat_claves_gasto

### Fase 2: Modificar evt_gastos (Migración 017)
1. Agregar columnas FK (proveedor_id, forma_pago_id, ejecutivo_id)
2. Migrar datos de proveedor texto a cat_proveedores
3. Migrar forma_pago enum a cat_formas_pago
4. Agregar retenciones, provision_origen_id

### Fase 3: Crear evt_provisiones (Migración 018)
1. Crear tabla evt_provisiones
2. Migrar datos de campos numéricos (provision_*)
3. Crear trigger de conversión

### Fase 4: Actualizar cont_gastos_externos (Migración 019)
1. Agregar retenciones, xml_file_url, ocr_*

### Fase 5: Componentes Frontend
1. Crear UnifiedExpenseForm
2. Crear ProvisionTab y ProvisionForm
3. Refactorizar ExpenseForm existente
4. Integrar OCR/XML en GNI

---

## 9. TIPOS TYPESCRIPT HOMOLOGADOS

```typescript
// types/shared/finance.ts

export interface BaseFinanceRecord {
  id: string;

  // Proveedor (desde catálogo)
  proveedor_id: number;
  proveedor?: Proveedor;  // Populated

  // Concepto
  concepto: string;
  descripcion?: string;

  // Montos
  cantidad: number;
  precio_unitario?: number;
  subtotal: number;
  iva_porcentaje: number;
  iva: number;
  retenciones: number;
  total: number;

  // Forma de pago
  forma_pago_id?: number;
  forma_pago?: FormaPago;  // Populated

  // Ejecutivo
  ejecutivo_id?: number;
  ejecutivo?: Ejecutivo;  // Populated

  // Fechas
  fecha: string;

  // Documentos
  documento_url?: string;
  documento_nombre?: string;
  xml_file_url?: string;

  // CFDI
  uuid_cfdi?: string;
  folio_fiscal?: string;
  serie?: string;

  // OCR
  ocr_confianza?: number;
  ocr_validado?: boolean;

  // Auditoría
  notas?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Expense extends BaseFinanceRecord {
  evento_id: string;
  categoria_id?: string;

  rfc_proveedor?: string;  // Compatibilidad legacy
  proveedor_legacy?: string;  // Compatibilidad legacy

  fecha_gasto: string;  // Alias de fecha

  status_aprobacion: 'pendiente' | 'aprobado' | 'rechazado';
  pagado: boolean;
  comprobado: boolean;

  provision_origen_id?: string;
}

export interface Provision extends BaseFinanceRecord {
  evento_id: string;

  tipo_provision: 'solicitud_pago' | 'combustible_peaje' | 'recursos_humanos' | 'materiales';
  fecha_estimada: string;  // Alias de fecha

  estado: 'pendiente' | 'aprobado' | 'pagado' | 'convertido_a_gasto' | 'cancelado';

  gasto_generado_id?: string;
  fecha_conversion?: string;
}

export interface GastoNoImpactado extends BaseFinanceRecord {
  company_id: string;

  clave_gasto_id?: number;
  clave_gasto?: ClaveGasto;  // Populated

  periodo: string;
  fecha_gasto: string;  // Alias de fecha

  validacion: 'pendiente' | 'validado' | 'rechazado';
  status_pago: 'pendiente' | 'pagado' | 'parcial';

  importado_de?: 'excel' | 'manual' | 'ocr';
}

// Validación fiscal
export interface FiscalValidationResult {
  valid: boolean;
  calculated: number;
  actual: number;
  difference: number;
  tolerance: number;
  message?: string;
}

export function validateFiscalAmounts(
  subtotal: number,
  iva: number,
  retenciones: number,
  total: number,
  tolerance: number = 0.01
): FiscalValidationResult {
  const calculated = Math.round((subtotal + iva - retenciones) * 100) / 100;
  const difference = Math.abs(calculated - total);
  const valid = difference <= tolerance;

  return {
    valid,
    calculated,
    actual: total,
    difference,
    tolerance,
    message: valid
      ? undefined
      : `No cuadra: ${calculated.toFixed(2)} ≠ ${total.toFixed(2)} (dif: ${difference.toFixed(2)})`
  };
}
```

---

## 10. PRÓXIMOS PASOS

1. **Revisar y aprobar** este documento de arquitectura
2. **Crear migración 016** - Preparación de catálogos
3. **Crear migración 017** - Modificar evt_gastos
4. **Crear migración 018** - Crear evt_provisiones
5. **Crear migración 019** - Actualizar cont_gastos_externos
6. **Desarrollar UnifiedExpenseForm**
7. **Desarrollar ProvisionTab**
8. **Integrar OCR/XML en GNI**
9. **Testing integral**

---

*Documento generado: 2025-11-28*
*Última actualización: 2025-11-28*
