# 🏗️ ARQUITECTURA MÓDULO CONTABLE - ERP 777 V1

**Fecha:** 27 de Octubre, 2025  
**Versión:** 1.0  
**Estado:** Diseño Completo

---

## 📋 TABLA DE CONTENIDOS

1. [Principios de Diseño](#principios-de-diseño)
2. [Flujos Operativos](#flujos-operativos)
3. [Modelo de Datos](#modelo-de-datos)
4. [Sistema de Documentos](#sistema-de-documentos)
5. [Trazabilidad y Auditoría](#trazabilidad-y-auditoría)
6. [Roles y Permisos](#roles-y-permisos)
7. [Migraciones y Rollout](#migraciones-y-rollout)

---

## 🎯 PRINCIPIOS DE DISEÑO

### 1. **PRESERVACIÓN DEL MÓDULO DE EVENTOS**
- ✅ `evt_eventos`, `evt_ingresos`, `evt_gastos` **NO SE MODIFICAN** en estructura core
- ✅ Solo se AGREGA columna `cuenta_id` (referencia a `evt_cuentas`)
- ✅ El flujo de eventos (crear evento → agregar ingresos → agregar gastos) **permanece igual**
- ✅ Los ingresos y gastos de eventos **SIEMPRE** tienen `evento_id` (no NULL)

### 2. **SEPARACIÓN INGRESOS/GASTOS EXTERNOS**
- ✅ Nuevas tablas: `cont_ingresos_externos`, `cont_gastos_externos`
- ✅ Estos registros **NO** tienen `evento_id` (es NULL)
- ✅ Se manejan desde el módulo de **Administración Contable**
- ✅ Pueden ser facturas, transferencias, pagos diversos

### 3. **TRAZABILIDAD TOTAL**
- ✅ Toda modificación se registra en `cont_auditoria_modificaciones`
- ✅ Solo usuarios con rol `admin` o `contador` pueden modificar registros existentes
- ✅ Cada modificación requiere justificación obligatoria
- ✅ Se mantiene historial completo: valor anterior, valor nuevo, usuario, fecha, razón

### 4. **DOCUMENTACIÓN OBLIGATORIA**
- ✅ Todo ingreso/gasto (evento o externo) **debe** tener documento adjunto
- ✅ Almacenamiento organizado por mes: `documentos/YYYY-MM/`
- ✅ Nomenclatura: `YYYY-MM-DD-NOMBRE_CUENTA-ID_MOVIMIENTO.ext`
- ✅ Tipos permitidos: PDF, XML, JPG, PNG, JPEG
- ✅ Metadata completa: hash, tamaño, tipo, fecha subida, usuario

---

## 🔄 FLUJOS OPERATIVOS

### FLUJO 1: Ingreso de Evento (NO CAMBIA)

```
Usuario → Eventos → Selecciona Evento → "Agregar Ingreso"
  ↓
Formulario Ingreso (campos actuales + cuenta_id + documento)
  ↓
Al guardar:
  1. INSERT INTO evt_ingresos (evento_id, concepto, ..., cuenta_id)
  2. UPLOAD documento → storage/documentos/2025-10/2025-10-27-Banco_BBVA-ING001.pdf
  3. INSERT INTO cont_documentos (referencia_tabla='evt_ingresos', ...)
  4. Si cobrado=true → Trigger crea asiento contable
```

### FLUJO 2: Ingreso Externo (NUEVO)

```
Usuario → Administración Contable → "Nuevo Ingreso"
  ↓
Formulario:
  - Tipo: Factura / Transferencia / Otro
  - Cuenta afectada (evt_cuentas)
  - Monto
  - Fecha
  - Descripción
  - **Documento obligatorio**
  ↓
Al guardar:
  1. INSERT INTO cont_ingresos_externos (cuenta_id, tipo, ..., cobrado=true)
  2. UPLOAD documento → storage/documentos/2025-10/2025-10-27-Banco_Santander-EXTINGXXX.pdf
  3. INSERT INTO cont_documentos
  4. Trigger automático crea asiento contable
  5. Trigger automático registra movimiento bancario
```

### FLUJO 3: Modificación con Trazabilidad

```
Usuario (ADMIN) → Modificar Ingreso/Gasto
  ↓
Sistema valida: ¿Es admin o contador?
  - NO → ERROR "Permiso denegado"
  - SÍ → Continúa
  ↓
Formulario de corrección:
  - Campo a modificar
  - Nuevo valor
  - **Justificación obligatoria**
  ↓
Al guardar:
  1. Trigger BEFORE UPDATE captura valores anteriores
  2. INSERT INTO cont_auditoria_modificaciones (
       tabla, registro_id, campo_modificado, 
       valor_anterior, valor_nuevo, 
       usuario_id, razon, fecha
     )
  3. UPDATE evt_ingresos SET ... WHERE id = X
  4. Si afecta monto → Trigger crea asiento de corrección
```

### FLUJO 4: Consulta de Movimientos por Cuenta

```
Usuario → Reportes → "Movimientos por Cuenta"
  ↓
Selecciona cuenta (evt_cuentas) + rango de fechas
  ↓
Sistema ejecuta: SELECT * FROM vw_movimientos_cuenta
  WHERE cuenta_id = X AND fecha BETWEEN ...
  ↓
Muestra listado:
  [Fecha] [Tipo] [Concepto] [Debe] [Haber] [Saldo] [📄 Documento]
  ↓
Usuario hace clic en 📄 → Descarga/visualiza documento
```

---

## 🗄️ MODELO DE DATOS

### MODIFICACIONES A TABLAS EXISTENTES

#### evt_ingresos (AGREGAR)
```sql
ALTER TABLE evt_ingresos 
  ADD COLUMN cuenta_id INTEGER REFERENCES evt_cuentas(id),
  ADD COLUMN cuenta_contable_ingreso_id INTEGER REFERENCES evt_cuentas(id);

COMMENT ON COLUMN evt_ingresos.cuenta_id IS 
  'Cuenta bancaria donde se depositó (ej: Banco BBVA)';
COMMENT ON COLUMN evt_ingresos.cuenta_contable_ingreso_id IS 
  'Cuenta contable de ingreso (ej: 4010 - Ingresos por eventos)';
```

#### evt_gastos (AGREGAR)
```sql
ALTER TABLE evt_gastos
  ADD COLUMN cuenta_id INTEGER REFERENCES evt_cuentas(id),
  ADD COLUMN cuenta_contable_gasto_id INTEGER REFERENCES evt_cuentas(id),
  ADD COLUMN pagado BOOLEAN DEFAULT false,
  ADD COLUMN fecha_pago DATE;

COMMENT ON COLUMN evt_gastos.cuenta_id IS 
  'Cuenta bancaria desde donde se pagó';
COMMENT ON COLUMN evt_gastos.cuenta_contable_gasto_id IS 
  'Cuenta contable de gasto (ej: 5010 - Gastos operativos)';
```

#### evt_cuentas (AGREGAR - NORMALIZACIÓN)
```sql
ALTER TABLE evt_cuentas
  ADD COLUMN codigo VARCHAR(20) UNIQUE,
  ADD COLUMN tipo VARCHAR(30), -- 'activo','pasivo','capital','ingreso','gasto'
  ADD COLUMN subtipo VARCHAR(50), -- 'banco','caja','cliente','proveedor', etc
  ADD COLUMN naturaleza VARCHAR(10), -- 'deudora' | 'acreedora'
  ADD COLUMN nivel INTEGER, -- 1=Mayor, 2=Submáyor, 3=Detalle
  ADD COLUMN cuenta_padre_id INTEGER REFERENCES evt_cuentas(id),
  ADD COLUMN acepta_movimientos BOOLEAN DEFAULT true,
  ADD COLUMN moneda CHAR(3) DEFAULT 'MXN',
  ADD COLUMN requiere_comprobante BOOLEAN DEFAULT false;

CREATE INDEX idx_evt_cuentas_codigo ON evt_cuentas(codigo);
CREATE INDEX idx_evt_cuentas_tipo ON evt_cuentas(tipo);
```

### NUEVAS TABLAS

#### cont_ingresos_externos
```sql
CREATE TABLE cont_ingresos_externos (
  id SERIAL PRIMARY KEY,
  company_id UUID REFERENCES core_companies(id),
  
  -- Clasificación
  tipo VARCHAR(30) NOT NULL, -- 'factura','transferencia','nota_credito','otro'
  concepto TEXT NOT NULL,
  descripcion TEXT,
  
  -- Montos
  cantidad NUMERIC DEFAULT 1,
  precio_unitario NUMERIC DEFAULT 0,
  subtotal NUMERIC DEFAULT 0,
  iva_porcentaje NUMERIC DEFAULT 16,
  iva NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  
  -- Cuentas contables
  cuenta_id INTEGER REFERENCES evt_cuentas(id) NOT NULL, -- Cuenta bancaria/caja
  cuenta_contable_ingreso_id INTEGER REFERENCES evt_cuentas(id), -- Cuenta de ingreso
  
  -- Información fiscal
  rfc_emisor VARCHAR(13),
  folio_fiscal UUID,
  serie VARCHAR(10),
  folio VARCHAR(10),
  
  -- Fechas
  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_facturacion DATE,
  fecha_cobro DATE,
  
  -- Estado
  cobrado BOOLEAN DEFAULT true, -- Ingresos externos se asume que ya están cobrados
  facturado BOOLEAN DEFAULT false,
  
  -- Método
  metodo_cobro VARCHAR(30), -- 'transferencia','efectivo','cheque','tarjeta'
  referencia TEXT,
  
  -- Auditoría
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES core_users(id),
  updated_by UUID REFERENCES core_users(id)
);

CREATE INDEX idx_cont_ingresos_externos_cuenta_id ON cont_ingresos_externos(cuenta_id);
CREATE INDEX idx_cont_ingresos_externos_fecha ON cont_ingresos_externos(fecha_ingreso);
CREATE INDEX idx_cont_ingresos_externos_tipo ON cont_ingresos_externos(tipo);
```

#### cont_gastos_externos
```sql
CREATE TABLE cont_gastos_externos (
  id SERIAL PRIMARY KEY,
  company_id UUID REFERENCES core_companies(id),
  
  -- Clasificación
  tipo VARCHAR(30) NOT NULL, -- 'factura','transferencia','nomina','impuesto','otro'
  categoria VARCHAR(50), -- 'servicios','suministros','renta','nomina', etc
  concepto TEXT NOT NULL,
  descripcion TEXT,
  
  -- Montos
  cantidad NUMERIC DEFAULT 1,
  precio_unitario NUMERIC DEFAULT 0,
  subtotal NUMERIC DEFAULT 0,
  iva_porcentaje NUMERIC DEFAULT 16,
  iva NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  
  -- Cuentas contables
  cuenta_id INTEGER REFERENCES evt_cuentas(id) NOT NULL, -- Cuenta bancaria/caja
  cuenta_contable_gasto_id INTEGER REFERENCES evt_cuentas(id), -- Cuenta de gasto
  
  -- Proveedor
  proveedor TEXT,
  rfc_proveedor VARCHAR(13),
  
  -- Información fiscal
  folio_fiscal UUID,
  serie VARCHAR(10),
  folio VARCHAR(10),
  
  -- Fechas
  fecha_gasto DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_facturacion DATE,
  fecha_pago DATE,
  
  -- Estado
  pagado BOOLEAN DEFAULT true, -- Gastos externos se asume que ya están pagados
  comprobado BOOLEAN DEFAULT false,
  
  -- Método
  forma_pago VARCHAR(30), -- 'transferencia','efectivo','cheque','tarjeta'
  referencia TEXT,
  
  -- Auditoría
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES core_users(id),
  updated_by UUID REFERENCES core_users(id)
);

CREATE INDEX idx_cont_gastos_externos_cuenta_id ON cont_gastos_externos(cuenta_id);
CREATE INDEX idx_cont_gastos_externos_fecha ON cont_gastos_externos(fecha_gasto);
CREATE INDEX idx_cont_gastos_externos_tipo ON cont_gastos_externos(tipo);
```

#### cont_documentos
```sql
CREATE TABLE cont_documentos (
  id SERIAL PRIMARY KEY,
  
  -- Referencia a la transacción
  referencia_tabla VARCHAR(50) NOT NULL, -- 'evt_ingresos','evt_gastos','cont_ingresos_externos','cont_gastos_externos'
  referencia_id INTEGER NOT NULL,
  
  -- Información del archivo
  nombre_original TEXT NOT NULL,
  nombre_storage TEXT NOT NULL, -- YYYY-MM-DD-NOMBRE_CUENTA-ID.ext
  ruta_storage TEXT NOT NULL, -- documentos/2025-10/...
  url_storage TEXT,
  
  -- Metadata
  tipo_documento VARCHAR(30), -- 'factura','recibo','comprobante','xml','contrato'
  mime_type VARCHAR(100),
  tamaño_bytes BIGINT,
  hash_sha256 TEXT,
  
  -- Fechas
  fecha_documento DATE,
  fecha_subida TIMESTAMPTZ DEFAULT now(),
  
  -- Auditoría
  subido_por UUID REFERENCES core_users(id),
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cont_documentos_referencia ON cont_documentos(referencia_tabla, referencia_id);
CREATE INDEX idx_cont_documentos_fecha ON cont_documentos(fecha_documento);
CREATE INDEX idx_cont_documentos_hash ON cont_documentos(hash_sha256);
```

#### cont_auditoria_modificaciones
```sql
CREATE TABLE cont_auditoria_modificaciones (
  id SERIAL PRIMARY KEY,
  
  -- Registro modificado
  tabla VARCHAR(50) NOT NULL,
  registro_id INTEGER NOT NULL,
  
  -- Cambio realizado
  campo_modificado VARCHAR(100) NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  
  -- Tipo de operación
  operacion VARCHAR(20) NOT NULL, -- 'UPDATE','DELETE','CORRECCION'
  
  -- Justificación
  razon TEXT NOT NULL,
  categoria_cambio VARCHAR(50), -- 'error_captura','ajuste_contable','correccion_fiscal'
  
  -- Usuario y fecha
  usuario_id UUID REFERENCES core_users(id),
  usuario_nombre TEXT,
  usuario_rol TEXT,
  fecha_modificacion TIMESTAMPTZ DEFAULT now(),
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_auditoria_tabla_registro ON cont_auditoria_modificaciones(tabla, registro_id);
CREATE INDEX idx_auditoria_usuario ON cont_auditoria_modificaciones(usuario_id);
CREATE INDEX idx_auditoria_fecha ON cont_auditoria_modificaciones(fecha_modificacion);
```

#### cont_movimientos_bancarios
```sql
CREATE TABLE cont_movimientos_bancarios (
  id SERIAL PRIMARY KEY,
  
  -- Tipo de movimiento
  tipo VARCHAR(30) NOT NULL, -- 'deposito','retiro','transferencia','ajuste','fee'
  
  -- Cuentas
  cuenta_origen_id INTEGER REFERENCES evt_cuentas(id),
  cuenta_destino_id INTEGER REFERENCES evt_cuentas(id),
  
  -- Montos
  monto NUMERIC NOT NULL,
  moneda CHAR(3) DEFAULT 'MXN',
  tipo_cambio NUMERIC DEFAULT 1,
  
  -- Referencia a transacción origen
  referencia_tabla VARCHAR(50), -- 'evt_ingresos','cont_gastos_externos', etc
  referencia_id INTEGER,
  
  -- Información adicional
  concepto TEXT NOT NULL,
  referencia_bancaria TEXT,
  fecha_movimiento DATE NOT NULL,
  
  -- Estado
  estado VARCHAR(20) DEFAULT 'confirmado', -- 'pendiente','confirmado','rechazado','cancelado'
  conciliado BOOLEAN DEFAULT false,
  fecha_conciliacion DATE,
  
  -- Auditoría
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES core_users(id)
);

CREATE INDEX idx_movimientos_cuenta_origen ON cont_movimientos_bancarios(cuenta_origen_id);
CREATE INDEX idx_movimientos_cuenta_destino ON cont_movimientos_bancarios(cuenta_destino_id);
CREATE INDEX idx_movimientos_fecha ON cont_movimientos_bancarios(fecha_movimiento);
CREATE INDEX idx_movimientos_referencia ON cont_movimientos_bancarios(referencia_tabla, referencia_id);
```

#### cont_asientos_contables
```sql
CREATE TABLE cont_asientos_contables (
  id SERIAL PRIMARY KEY,
  
  -- Información del asiento
  numero_asiento VARCHAR(20) UNIQUE,
  fecha_asiento DATE NOT NULL,
  periodo VARCHAR(7) NOT NULL, -- YYYY-MM
  descripcion TEXT NOT NULL,
  
  -- Referencia origen
  referencia_tabla VARCHAR(50),
  referencia_id INTEGER,
  
  -- Tipo
  tipo_asiento VARCHAR(30), -- 'ingreso','egreso','traspaso','ajuste','cierre'
  
  -- Estado
  estado VARCHAR(20) DEFAULT 'borrador', -- 'borrador','confirmado','cerrado','cancelado'
  balanceado BOOLEAN GENERATED ALWAYS AS (
    (SELECT COALESCE(SUM(debe),0) - COALESCE(SUM(haber),0) FROM cont_partidas WHERE asiento_id = id) = 0
  ) STORED,
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES core_users(id),
  confirmado_at TIMESTAMPTZ,
  confirmado_por UUID REFERENCES core_users(id)
);

CREATE INDEX idx_asientos_fecha ON cont_asientos_contables(fecha_asiento);
CREATE INDEX idx_asientos_periodo ON cont_asientos_contables(periodo);
CREATE INDEX idx_asientos_referencia ON cont_asientos_contables(referencia_tabla, referencia_id);
```

#### cont_partidas
```sql
CREATE TABLE cont_partidas (
  id SERIAL PRIMARY KEY,
  
  -- Asiento al que pertenece
  asiento_id INTEGER REFERENCES cont_asientos_contables(id) ON DELETE CASCADE,
  
  -- Cuenta afectada
  cuenta_id INTEGER REFERENCES evt_cuentas(id) NOT NULL,
  
  -- Montos
  debe NUMERIC DEFAULT 0 CHECK (debe >= 0),
  haber NUMERIC DEFAULT 0 CHECK (haber >= 0),
  CHECK (debe = 0 OR haber = 0), -- Una partida solo puede tener debe O haber
  
  -- Descripción
  concepto TEXT,
  
  -- Referencia
  documento_id INTEGER REFERENCES cont_documentos(id),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_partidas_asiento ON cont_partidas(asiento_id);
CREATE INDEX idx_partidas_cuenta ON cont_partidas(cuenta_id);
CREATE INDEX idx_partidas_documento ON cont_partidas(documento_id);
```

---

## 📁 SISTEMA DE DOCUMENTOS

### ESTRUCTURA DE CARPETAS

```
storage/
└── documentos/
    ├── 2023-01/
    │   ├── 2023-01-15-Banco_BBVA-ING001.pdf
    │   ├── 2023-01-15-Banco_BBVA-ING001.xml
    │   ├── 2023-01-20-Caja_General-GAS042.pdf
    │   └── ...
    ├── 2023-02/
    ├── ...
    ├── 2025-10/
    │   ├── 2025-10-27-Banco_Santander-EXTING123.pdf
    │   ├── 2025-10-27-Banco_Santander-EXTING123.xml
    │   └── ...
    └── 2025-11/
```

### NOMENCLATURA DE ARCHIVOS

**Formato:** `YYYY-MM-DD-NOMBRE_CUENTA-TIPO_ID.extensión`

Componentes:
- `YYYY-MM-DD`: Fecha del movimiento
- `NOMBRE_CUENTA`: Nombre de la cuenta (sin espacios, con guión bajo)
- `TIPO`: 'ING' (evento), 'GAS' (evento), 'EXTING' (externo), 'EXTGAS' (externo)
- `ID`: ID del registro en la tabla correspondiente
- `extensión`: pdf, xml, jpg, png, jpeg

**Ejemplos:**
```
2025-10-27-Banco_BBVA-ING001.pdf         → Ingreso de evento #1
2025-10-27-Banco_BBVA-ING001.xml         → XML factura del ingreso #1
2025-10-27-Caja_General-GAS042.pdf       → Gasto de evento #42
2025-10-27-Banco_Santander-EXTING015.pdf → Ingreso externo #15
2025-10-27-Banco_HSBC-EXTGAS008.pdf      → Gasto externo #8
```

### FUNCIÓN DE ALMACENAMIENTO

```sql
CREATE OR REPLACE FUNCTION guardar_documento(
  p_referencia_tabla TEXT,
  p_referencia_id INTEGER,
  p_archivo_nombre TEXT,
  p_archivo_contenido BYTEA,
  p_tipo_documento TEXT,
  p_fecha_documento DATE,
  p_usuario_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_cuenta_nombre TEXT;
  v_tipo_prefix TEXT;
  v_mes TEXT;
  v_nombre_storage TEXT;
  v_ruta_storage TEXT;
  v_hash TEXT;
BEGIN
  -- Obtener nombre de cuenta
  SELECT nombre INTO v_cuenta_nombre
  FROM evt_cuentas
  WHERE id = (
    CASE 
      WHEN p_referencia_tabla = 'evt_ingresos' THEN
        (SELECT cuenta_id FROM evt_ingresos WHERE id = p_referencia_id)
      WHEN p_referencia_tabla = 'evt_gastos' THEN
        (SELECT cuenta_id FROM evt_gastos WHERE id = p_referencia_id)
      WHEN p_referencia_tabla = 'cont_ingresos_externos' THEN
        (SELECT cuenta_id FROM cont_ingresos_externos WHERE id = p_referencia_id)
      WHEN p_referencia_tabla = 'cont_gastos_externos' THEN
        (SELECT cuenta_id FROM cont_gastos_externos WHERE id = p_referencia_id)
    END
  );
  
  -- Determinar prefijo
  v_tipo_prefix := CASE p_referencia_tabla
    WHEN 'evt_ingresos' THEN 'ING'
    WHEN 'evt_gastos' THEN 'GAS'
    WHEN 'cont_ingresos_externos' THEN 'EXTING'
    WHEN 'cont_gastos_externos' THEN 'EXTGAS'
  END;
  
  -- Construir nombre
  v_mes := TO_CHAR(p_fecha_documento, 'YYYY-MM');
  v_nombre_storage := TO_CHAR(p_fecha_documento, 'YYYY-MM-DD') || '-' ||
                      REPLACE(v_cuenta_nombre, ' ', '_') || '-' ||
                      v_tipo_prefix || LPAD(p_referencia_id::TEXT, 3, '0') ||
                      '.' || SPLIT_PART(p_archivo_nombre, '.', -1);
  
  v_ruta_storage := 'documentos/' || v_mes || '/' || v_nombre_storage;
  
  -- Calcular hash
  v_hash := ENCODE(SHA256(p_archivo_contenido), 'hex');
  
  -- Insertar registro
  INSERT INTO cont_documentos (
    referencia_tabla, referencia_id, nombre_original, nombre_storage,
    ruta_storage, tipo_documento, tamaño_bytes, hash_sha256,
    fecha_documento, subido_por
  ) VALUES (
    p_referencia_tabla, p_referencia_id, p_archivo_nombre, v_nombre_storage,
    v_ruta_storage, p_tipo_documento, LENGTH(p_archivo_contenido), v_hash,
    p_fecha_documento, p_usuario_id
  );
  
  RETURN v_ruta_storage;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔍 TRAZABILIDAD Y AUDITORÍA

### TRIGGER: Auditoría de Modificaciones

```sql
CREATE OR REPLACE FUNCTION fn_auditoria_modificacion()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_nombre TEXT;
  v_usuario_rol TEXT;
  v_campo TEXT;
  v_old_value TEXT;
  v_new_value TEXT;
BEGIN
  -- Obtener información del usuario desde contexto
  SELECT current_setting('request.jwt.claims', true)::json->>'email',
         current_setting('request.jwt.claims', true)::json->>'role'
  INTO v_usuario_nombre, v_usuario_rol;
  
  -- Validar que solo admin/contador puede modificar
  IF v_usuario_rol NOT IN ('admin', 'contador') THEN
    RAISE EXCEPTION 'Solo usuarios con rol admin o contador pueden modificar registros financieros';
  END IF;
  
  -- Validar que se proporcione justificación
  IF NEW.notas IS NULL OR TRIM(NEW.notas) = '' THEN
    RAISE EXCEPTION 'Debe proporcionar una justificación para la modificación';
  END IF;
  
  -- Registrar cambios en campos críticos
  IF OLD.total != NEW.total THEN
    INSERT INTO cont_auditoria_modificaciones (
      tabla, registro_id, campo_modificado, valor_anterior, valor_nuevo,
      razon, usuario_id, usuario_nombre, usuario_rol, operacion
    ) VALUES (
      TG_TABLE_NAME, OLD.id, 'total', 
      OLD.total::TEXT, NEW.total::TEXT,
      NEW.notas, NEW.updated_by, v_usuario_nombre, v_usuario_rol, 'UPDATE'
    );
  END IF;
  
  IF OLD.fecha_ingreso != NEW.fecha_ingreso OR OLD.fecha_gasto != NEW.fecha_gasto THEN
    INSERT INTO cont_auditoria_modificaciones (
      tabla, registro_id, campo_modificado, valor_anterior, valor_nuevo,
      razon, usuario_id, usuario_nombre, usuario_rol, operacion
    ) VALUES (
      TG_TABLE_NAME, OLD.id, 'fecha',
      COALESCE(OLD.fecha_ingreso, OLD.fecha_gasto)::TEXT,
      COALESCE(NEW.fecha_ingreso, NEW.fecha_gasto)::TEXT,
      NEW.notas, NEW.updated_by, v_usuario_nombre, v_usuario_rol, 'UPDATE'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas financieras
CREATE TRIGGER trg_auditoria_evt_ingresos
  BEFORE UPDATE ON evt_ingresos
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria_modificacion();

CREATE TRIGGER trg_auditoria_evt_gastos
  BEFORE UPDATE ON evt_gastos
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria_modificacion();

CREATE TRIGGER trg_auditoria_cont_ingresos_externos
  BEFORE UPDATE ON cont_ingresos_externos
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria_modificacion();

CREATE TRIGGER trg_auditoria_cont_gastos_externos
  BEFORE UPDATE ON cont_gastos_externos
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria_modificacion();
```

### TRIGGER: Creación Automática de Asientos

```sql
CREATE OR REPLACE FUNCTION fn_crear_asiento_automatico()
RETURNS TRIGGER AS $$
DECLARE
  v_asiento_id INTEGER;
  v_numero_asiento TEXT;
  v_cuenta_banco_id INTEGER;
  v_cuenta_contable_id INTEGER;
  v_descripcion TEXT;
BEGIN
  -- Solo crear asiento si está marcado como cobrado/pagado
  IF (TG_TABLE_NAME LIKE '%ingreso%' AND NEW.cobrado = true AND OLD.cobrado = false) OR
     (TG_TABLE_NAME LIKE '%gasto%' AND NEW.pagado = true AND OLD.pagado = false) THEN
    
    -- Generar número de asiento
    v_numero_asiento := 'A-' || TO_CHAR(NEW.fecha_ingreso, 'YYYYMM') || '-' || 
                        LPAD(NEXTVAL('seq_numero_asiento')::TEXT, 4, '0');
    
    -- Obtener cuentas
    v_cuenta_banco_id := NEW.cuenta_id;
    v_cuenta_contable_id := COALESCE(NEW.cuenta_contable_ingreso_id, NEW.cuenta_contable_gasto_id);
    
    -- Crear asiento
    v_descripcion := CASE 
      WHEN TG_TABLE_NAME LIKE '%ingreso%' THEN 'Cobro: ' || NEW.concepto
      ELSE 'Pago: ' || NEW.concepto
    END;
    
    INSERT INTO cont_asientos_contables (
      numero_asiento, fecha_asiento, periodo, descripcion,
      referencia_tabla, referencia_id, tipo_asiento, estado, created_by
    ) VALUES (
      v_numero_asiento, 
      COALESCE(NEW.fecha_ingreso, NEW.fecha_gasto),
      TO_CHAR(COALESCE(NEW.fecha_ingreso, NEW.fecha_gasto), 'YYYY-MM'),
      v_descripcion,
      TG_TABLE_NAME, NEW.id,
      CASE WHEN TG_TABLE_NAME LIKE '%ingreso%' THEN 'ingreso' ELSE 'egreso' END,
      'confirmado',
      NEW.created_by
    ) RETURNING id INTO v_asiento_id;
    
    -- Crear partidas
    IF TG_TABLE_NAME LIKE '%ingreso%' THEN
      -- DEBE: Banco
      INSERT INTO cont_partidas (asiento_id, cuenta_id, debe, concepto)
      VALUES (v_asiento_id, v_cuenta_banco_id, NEW.total, 'Depósito bancario');
      
      -- HABER: Ingreso
      INSERT INTO cont_partidas (asiento_id, cuenta_id, haber, concepto)
      VALUES (v_asiento_id, v_cuenta_contable_id, NEW.total, v_descripcion);
    ELSE
      -- DEBE: Gasto
      INSERT INTO cont_partidas (asiento_id, cuenta_id, debe, concepto)
      VALUES (v_asiento_id, v_cuenta_contable_id, NEW.total, v_descripcion);
      
      -- HABER: Banco
      INSERT INTO cont_partidas (asiento_id, cuenta_id, haber, concepto)
      VALUES (v_asiento_id, v_cuenta_banco_id, NEW.total, 'Retiro bancario');
    END IF;
    
    -- Crear movimiento bancario
    INSERT INTO cont_movimientos_bancarios (
      tipo, cuenta_origen_id, cuenta_destino_id, monto, concepto,
      referencia_tabla, referencia_id, fecha_movimiento, created_by
    ) VALUES (
      CASE WHEN TG_TABLE_NAME LIKE '%ingreso%' THEN 'deposito' ELSE 'retiro' END,
      CASE WHEN TG_TABLE_NAME LIKE '%ingreso%' THEN NULL ELSE v_cuenta_banco_id END,
      CASE WHEN TG_TABLE_NAME LIKE '%ingreso%' THEN v_cuenta_banco_id ELSE NULL END,
      NEW.total, v_descripcion,
      TG_TABLE_NAME, NEW.id,
      COALESCE(NEW.fecha_cobro, NEW.fecha_pago, CURRENT_DATE),
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Secuencia para números de asiento
CREATE SEQUENCE seq_numero_asiento START 1;

-- Aplicar triggers
CREATE TRIGGER trg_asiento_evt_ingresos
  AFTER INSERT OR UPDATE ON evt_ingresos
  FOR EACH ROW EXECUTE FUNCTION fn_crear_asiento_automatico();

CREATE TRIGGER trg_asiento_evt_gastos
  AFTER INSERT OR UPDATE ON evt_gastos
  FOR EACH ROW EXECUTE FUNCTION fn_crear_asiento_automatico();

CREATE TRIGGER trg_asiento_cont_ingresos_externos
  AFTER INSERT ON cont_ingresos_externos
  FOR EACH ROW EXECUTE FUNCTION fn_crear_asiento_automatico();

CREATE TRIGGER trg_asiento_cont_gastos_externos
  AFTER INSERT ON cont_gastos_externos
  FOR EACH ROW EXECUTE FUNCTION fn_crear_asiento_automatico();
```

---

## 👥 ROLES Y PERMISOS

### DEFINICIÓN DE ROLES

```sql
-- Rol: Operador (solo eventos)
GRANT SELECT, INSERT ON evt_eventos, evt_ingresos, evt_gastos TO operador;
GRANT SELECT ON evt_cuentas, evt_clientes, evt_tipos_evento TO operador;

-- Rol: Contador (eventos + administración contable)
GRANT ALL ON evt_eventos, evt_ingresos, evt_gastos TO contador;
GRANT ALL ON cont_ingresos_externos, cont_gastos_externos TO contador;
GRANT SELECT ON cont_asientos_contables, cont_partidas, cont_movimientos_bancarios TO contador;
GRANT SELECT, INSERT ON cont_documentos TO contador;

-- Rol: Admin (acceso total)
GRANT ALL ON ALL TABLES IN SCHEMA public TO admin;

-- RLS Policies
ALTER TABLE evt_ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE evt_gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cont_ingresos_externos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cont_gastos_externos ENABLE ROW LEVEL SECURITY;

-- Policy: Solo admin puede modificar después de 7 días
CREATE POLICY modificacion_admin ON evt_ingresos
  FOR UPDATE USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'admin'
    OR created_at > NOW() - INTERVAL '7 days'
  );
```

---

## 🚀 MIGRACIONES Y ROLLOUT

### FASE 1: Preparación (Sprint 1 - Semana 1)
- ✅ Crear migraciones SQL para nuevas tablas
- ✅ Agregar columnas a tablas existentes
- ✅ Crear funciones y triggers
- ✅ Configurar storage buckets
- ✅ Definir políticas RLS

### FASE 2: Datos de Prueba (Sprint 1 - Semana 2)
- ✅ Actualizar generador de datos
- ✅ Crear catálogo de cuentas contables
- ✅ Generar 3 años de datos históricos
- ✅ Validar integridad con pruebas

### FASE 3: UI y UX (Sprint 2 - Semana 3-4)
- ⏳ Componentes React para ingresos/gastos externos
- ⏳ Interfaz de modificación con justificación
- ⏳ Visor de documentos y timeline de auditoría
- ⏳ Reportes contables y conciliación

### FASE 4: Testing y Ajustes (Sprint 3 - Semana 5)
- ⏳ Pruebas de integración
- ⏳ Pruebas de permisos y seguridad
- ⏳ Validación de auditoría
- ⏳ Optimización de consultas

### FASE 5: Despliegue (Sprint 3 - Semana 6)
- ⏳ Migración a staging
- ⏳ UAT (User Acceptance Testing)
- ⏳ Capacitación usuarios
- ⏳ Despliegue a producción

---

## ✅ CRITERIOS DE ÉXITO

1. **Integridad de Datos**
   - ✅ Balance de comprobación = 0 en todo momento
   - ✅ Conciliación bancaria sin discrepancias
   - ✅ Todos los movimientos con documento adjunto

2. **Trazabilidad**
   - ✅ 100% de modificaciones registradas en auditoría
   - ✅ Justificación obligatoria en todos los cambios
   - ✅ Timeline completo por transacción

3. **Seguridad**
   - ✅ Solo admin/contador pueden modificar
   - ✅ RLS activo en todas las tablas sensibles
   - ✅ Documentos encriptados en storage

4. **Performance**
   - ✅ Consultas de reportes < 2 segundos
   - ✅ Generación de asientos automática sin bloqueos
   - ✅ Búsqueda de documentos instantánea

5. **Usabilidad**
   - ✅ Flujo de eventos sin cambios (retrocompatible)
   - ✅ Formularios intuitivos con validaciones
   - ✅ Descarga de documentos con un clic

---

**Documento aprobado por:** [Pendiente]  
**Fecha de aprobación:** [Pendiente]  
**Siguiente revisión:** [Sprint Review - Semana 2]
