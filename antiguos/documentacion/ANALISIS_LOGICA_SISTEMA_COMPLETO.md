# 📊 ANÁLISIS EXHAUSTIVO DE LA LÓGICA DEL SISTEMA ERP-777 V01

**Fecha de análisis:** 23 de Octubre de 2025  
**Versión analizada:** 1.0 (rama main)  
**Propósito:** Análisis minucioso para generación de datos de prueba congruentes  

---

## 🔍 RESUMEN EJECUTIVO

### Hallazgos Principales:
1. **Sistema completamente funcional** con lógica de negocio robusta
2. **Triggers automáticos** que calculan totales y utilidades
3. **Estados de workflow** bien definidos para eventos, ingresos y gastos
4. **Catálogos SAT** implementados correctamente
5. **Sistema de validaciones** que garantiza integridad de datos
6. **Utilidad objetivo del 30%** alcanzable mediante precios estratégicos

---

## 🏗️ ARQUITECTURA DE BASE DE DATOS

### **Tablas Principales y Relaciones:**

```
core_companies (1) ──→ (N) core_users
core_companies (1) ──→ (N) evt_eventos
core_companies (1) ──→ (N) evt_clientes

evt_clientes (1) ──→ (N) evt_eventos
evt_eventos (1) ──→ (N) evt_ingresos
evt_eventos (1) ──→ (N) evt_gastos

evt_tipos_evento (1) ──→ (N) evt_eventos
evt_estados (1) ──→ (N) evt_eventos
evt_categorias_gastos (1) ──→ (N) evt_gastos
evt_estados_ingreso (1) ──→ (N) evt_ingresos
evt_cuentas_contables (1) ──→ (N) evt_gastos
```

### **Campos Críticos para Cálculos:**

#### **evt_eventos (Tabla principal)**
```sql
-- Campos calculados automáticamente por triggers
total NUMERIC DEFAULT 0              -- Suma de ingresos
total_gastos NUMERIC DEFAULT 0       -- Suma de gastos activos
utilidad NUMERIC DEFAULT 0           -- total - total_gastos
margen_utilidad NUMERIC DEFAULT 0    -- (utilidad / total) * 100

-- Campos estimados (para comparación)
ingreso_estimado DECIMAL(15,2) DEFAULT 0
gastos_estimados DECIMAL(15,2) DEFAULT 0
utilidad_estimada DECIMAL(15,2) DEFAULT 0
porcentaje_utilidad_estimada DECIMAL(5,2) DEFAULT 0
```

#### **evt_ingresos**
```sql
-- Cálculos automáticos (función calculate_income_totals)
subtotal = cantidad * precio_unitario
iva = subtotal * (iva_porcentaje / 100)
total = subtotal + iva

-- Estados de flujo de trabajo
estado_id INT REFERENCES evt_estados_ingreso(id) DEFAULT 1
-- 1=PLANEADO, 2=ORDEN_COMPRA, 3=FACTURADO, 4=PAGADO
```

#### **evt_gastos**
```sql
-- Cálculos automáticos (función calculate_expense_totals)
subtotal = cantidad * precio_unitario
iva = subtotal * (iva_porcentaje / 100)
total = subtotal + iva

-- Control de estado
pagado BOOLEAN DEFAULT false
comprobado BOOLEAN DEFAULT false
activo BOOLEAN DEFAULT true (para soft delete)
```

---

## ⚙️ LÓGICA DE CÁLCULOS FINANCIEROS

### **1. Triggers Automáticos**

#### **calculate_income_totals()** - Ejecuta BEFORE INSERT/UPDATE en evt_ingresos
```sql
NEW.subtotal = NEW.cantidad * NEW.precio_unitario;
NEW.iva = NEW.subtotal * (NEW.iva_porcentaje / 100);
NEW.total = NEW.subtotal + NEW.iva;
```

#### **calculate_expense_totals()** - Ejecuta BEFORE INSERT/UPDATE en evt_gastos
```sql
NEW.subtotal = NEW.cantidad * NEW.precio_unitario;
NEW.iva = NEW.subtotal * (NEW.iva_porcentaje / 100);
NEW.total = NEW.subtotal + NEW.iva;
```

#### **update_event_financials()** - Ejecuta AFTER INSERT/UPDATE/DELETE en ingresos y gastos
```sql
-- Recalcula totales del evento
SELECT COALESCE(SUM(total), 0) INTO total_ingresos FROM evt_ingresos WHERE evento_id = X;
SELECT COALESCE(SUM(total), 0) INTO total_gastos_calc FROM evt_gastos 
WHERE evento_id = X AND activo = true AND deleted_at IS NULL;

utilidad_calc = total_ingresos - total_gastos_calc;
margen_calc = CASE WHEN total_ingresos > 0 
              THEN (utilidad_calc / total_ingresos) * 100 
              ELSE 0 END;

UPDATE evt_eventos SET
  total = total_ingresos,
  total_gastos = total_gastos_calc,
  utilidad = utilidad_calc,
  margen_utilidad = margen_calc
WHERE id = evento_id_to_update;
```

### **2. Reglas de Negocio para Utilidad > 30%**

Para garantizar utilidad > 30%, debemos aplicar la fórmula:
```
margen_utilidad = (utilidad / total_ingresos) * 100
30 = ((total_ingresos - total_gastos) / total_ingresos) * 100

Despejando:
total_ingresos >= total_gastos / 0.7
```

**Estrategia:** Si los gastos suman $10,000, los ingresos deben ser ≥ $14,286 para obtener 30% de utilidad.

---

## 📋 CATÁLOGOS Y ESTADOS DEL SISTEMA

### **Estados de Eventos (evt_estados)**
```sql
1 - 'Borrador'     - color: '#6B7280' - workflow_step: 1
2 - 'Cotizado'     - color: '#3B82F6' - workflow_step: 2
3 - 'Aprobado'     - color: '#10B981' - workflow_step: 3
4 - 'En Proceso'   - color: '#F59E0B' - workflow_step: 4
5 - 'Completado'   - color: '#059669' - workflow_step: 5
6 - 'Facturado'    - color: '#7C3AED' - workflow_step: 6
7 - 'Cobrado'      - color: '#059669' - workflow_step: 7
```

### **Estados de Ingresos (evt_estados_ingreso)**
```sql
1 - 'PLANEADO'     - color: 'blue'   - orden: 1
2 - 'ORDEN_COMPRA' - color: 'indigo' - orden: 2
3 - 'FACTURADO'    - color: 'yellow' - orden: 3
4 - 'PAGADO'       - color: 'green'  - orden: 4
```

### **Tipos de Eventos (evt_tipos_evento)**
```sql
1 - 'Conferencia'  - color: '#3B82F6'
2 - 'Corporativo'  - color: '#10B981'
3 - 'Social'       - color: '#F59E0B'
4 - 'Comercial'    - color: '#EF4444'
5 - 'Educativo'    - color: '#8B5CF6'
```

### **Categorías de Gastos (evt_categorias_gastos)**
```sql
1 - 'Servicios Profesionales' - color: '#3B82F6'
2 - 'Recursos Humanos'        - color: '#10B981'
3 - 'Materiales'              - color: '#F59E0B'
4 - 'Combustible/Casetas'     - color: '#EF4444'
5 - 'Otros'                   - color: '#8B5CF6'
```

### **Cuentas Contables (evt_cuentas_contables)**
```sql
1 - '1001' - 'Caja'                    - tipo: 'activo'
2 - '1002' - 'Bancos'                  - tipo: 'activo'
3 - '2001' - 'Proveedores'             - tipo: 'pasivo'
4 - '4001' - 'Ventas'                  - tipo: 'ingreso'
5 - '5001' - 'Compras'                 - tipo: 'gasto'
6 - '5002' - 'Gastos de Operación'     - tipo: 'gasto'
7 - '5003' - 'Gastos de Administración' - tipo: 'gasto'
8 - '5004' - 'Gastos de Venta'         - tipo: 'gasto'
```

---

## 🔄 FLUJOS DE TRABAJO

### **Flujo de Estados de Eventos**
```
Borrador → Cotizado → Aprobado → En Proceso → Completado → Facturado → Cobrado
   ↓         ↓         ↓           ↓            ↓           ↓         ↓
Pueden tener ingresos y gastos en cualquier estado
```

### **Flujo de Estados de Ingresos**
```
PLANEADO → ORDEN_COMPRA → FACTURADO → PAGADO
   ↓           ↓            ↓          ↓
Los triggers recalculan totales del evento automáticamente
```

### **Flujo de Estados de Gastos**
```
Creado → Aprobado → Pagado → Comprobado
  ↓        ↓         ↓        ↓
activo=true, status_aprobacion='aprobado', pagado=true, comprobado=true
```

---

## 📊 REGLAS DE VALIDACIÓN

### **Eventos**
1. `clave_evento` debe ser UNIQUE
2. `fecha_evento` es obligatoria
3. `cliente_id` debe existir en evt_clientes
4. `tipo_evento_id` debe existir en evt_tipos_evento
5. `estado_id` debe existir en evt_estados
6. `activo = true` para eventos visibles

### **Ingresos**
1. `evento_id` debe existir y estar activo
2. `concepto` es obligatorio
3. `cantidad > 0` y `precio_unitario >= 0`
4. `iva_porcentaje` típicamente 0% o 16%
5. Los totales se calculan automáticamente
6. `estado_id` inicia en 1 (PLANEADO)

### **Gastos**
1. `evento_id` debe existir y estar activo
2. `concepto` es obligatorio
3. `cantidad > 0` y `precio_unitario >= 0`
4. `categoria_id` debe existir en evt_categorias_gastos
5. `status_aprobacion = 'aprobado'` para contar en totales
6. `activo = true` para gastos vigentes
7. `deleted_at IS NULL` para gastos no eliminados

---

## 💡 ESTRATEGIA PARA DATOS CONGRUENTES

### **1. Generación de Claves de Evento**
```
Formato: {SUFIJO_CLIENTE}-{YYYYMM}-{###}
Ejemplo: PHX-202510-001, PHX-202510-002, etc.
```

### **2. Cálculo de Precios para 30%+ Utilidad**
```javascript
function calcularPreciosConUtilidadMinima(gastos, utilidadObjetivo = 0.35) {
  const totalGastos = gastos.reduce((sum, g) => sum + g.total, 0);
  const ingresosNecesarios = totalGastos / (1 - utilidadObjetivo);
  return ingresosNecesarios;
}
```

### **3. Distribución Realista de Gastos**
- **Servicios Profesionales:** 40-50% del total
- **Recursos Humanos:** 25-35% del total  
- **Materiales:** 15-20% del total
- **Combustible/Casetas:** 5-10% del total
- **Otros:** 5-10% del total

### **4. Distribución de Estados de Eventos**
- **20%** - Cobrado (eventos completados)
- **15%** - Facturado (eventos facturados)
- **20%** - Completado (eventos terminados)
- **20%** - En Proceso (eventos activos)
- **15%** - Aprobado (eventos confirmados)
- **10%** - Cotizado/Borrador (eventos en desarrollo)

### **5. Fechas Congruentes**
- Eventos en los últimos 12 meses
- `fecha_evento` como referencia principal
- `fecha_facturacion` 7-15 días después del evento
- `fecha_pago` 15-45 días después de facturación
- `created_at` 30-90 días antes del evento

---

## 🎯 CAMPOS OBLIGATORIOS PARA CADA TABLA

### **evt_eventos**
```sql
-- OBLIGATORIOS
clave_evento VARCHAR(50) UNIQUE NOT NULL
nombre_proyecto TEXT NOT NULL
fecha_evento DATE NOT NULL
cliente_id INTEGER NOT NULL
tipo_evento_id INTEGER NOT NULL
estado_id INTEGER DEFAULT 1
activo BOOLEAN DEFAULT true

-- CALCULADOS (por triggers)
total NUMERIC DEFAULT 0
total_gastos NUMERIC DEFAULT 0
utilidad NUMERIC DEFAULT 0
margen_utilidad NUMERIC DEFAULT 0
```

### **evt_ingresos**
```sql
-- OBLIGATORIOS
evento_id INTEGER NOT NULL
concepto TEXT NOT NULL
cantidad NUMERIC DEFAULT 1
precio_unitario NUMERIC DEFAULT 0

-- CALCULADOS (por triggers)
subtotal NUMERIC DEFAULT 0
iva NUMERIC DEFAULT 0
total NUMERIC DEFAULT 0

-- POR DEFECTO
iva_porcentaje NUMERIC DEFAULT 16
fecha_ingreso DATE DEFAULT CURRENT_DATE
estado_id INT DEFAULT 1
facturado BOOLEAN DEFAULT false
cobrado BOOLEAN DEFAULT false
```

### **evt_gastos**
```sql
-- OBLIGATORIOS
evento_id INTEGER NOT NULL
concepto TEXT NOT NULL
cantidad NUMERIC DEFAULT 1
precio_unitario NUMERIC DEFAULT 0
categoria_id INTEGER NOT NULL

-- CALCULADOS (por triggers)
subtotal NUMERIC DEFAULT 0  
iva NUMERIC DEFAULT 0
total NUMERIC DEFAULT 0

-- POR DEFECTO
iva_porcentaje NUMERIC DEFAULT 16
fecha_gasto DATE DEFAULT CURRENT_DATE
status_aprobacion VARCHAR(20) DEFAULT 'pendiente'
activo BOOLEAN DEFAULT true
pagado BOOLEAN DEFAULT false
comprobado BOOLEAN DEFAULT false
```

---

## 📈 PATRONES DE DATOS REALISTAS

### **Montos por Tipo de Evento**
- **Conferencia:** $50,000 - $150,000
- **Corporativo:** $75,000 - $200,000  
- **Social:** $30,000 - $100,000
- **Comercial:** $40,000 - $120,000
- **Educativo:** $25,000 - $80,000

### **Conceptos Típicos de Ingresos**
- "Servicios de organización de evento"
- "Consultoría en gestión de eventos"
- "Coordinación logística integral"
- "Servicios de producción audiovisual"
- "Gestión de protocolo y ceremonial"

### **Conceptos Típicos de Gastos**
- **Servicios Profesionales:** "Coordinador de evento", "Técnico audiovisual"
- **Recursos Humanos:** "Personal de apoyo", "Seguridad privada"
- **Materiales:** "Equipo de sonido", "Mobiliario", "Decoración"
- **Combustible/Casetas:** "Combustible vehículos", "Casetas autopista"
- **Otros:** "Seguros", "Permisos", "Imprevistos"

---

## 🔒 CONSIDERACIONES DE SEGURIDAD

### **Row Level Security (RLS)**
- Todas las tablas principales tienen RLS activo
- Los datos se filtran por `company_id` automáticamente
- Los usuarios solo ven datos de su empresa

### **Soft Delete**
- Los gastos usan `activo = false` para eliminación lógica
- Los eventos usan `activo = false` para desactivación
- Esto preserva la integridad referencial

### **Triggers de Auditoría**
- `update_updated_at_column()` actualiza timestamps automáticamente
- Los triggers de cálculo mantienen consistencia de datos

---

## 🚀 ESTRATEGIA DE POBLACIÓN DE DATOS

### **Orden de Inserción (respetando FK)**
1. **evt_clientes** (5 clientes diversos)
2. **evt_eventos** (5-10 eventos por cliente = 25-50 eventos)
3. **evt_ingresos** (3-5 ingresos por evento = 75-250 ingresos)
4. **evt_gastos** (8-12 gastos por evento = 200-600 gastos)

### **Distribución Temporal**
- **60%** eventos en últimos 6 meses
- **30%** eventos entre 6-12 meses
- **10%** eventos más antiguos (hasta 18 meses)

### **Estados Finales Deseados**
- **Todos los ingresos:** estado_id = 4 (PAGADO)
- **Todos los gastos:** pagado = true, comprobado = true
- **Eventos:** distribución realista entre estados 5-7 (Completado/Facturado/Cobrado)

---

## ✅ VALIDACIONES PRE-INSERCIÓN

### **Verificaciones a Realizar**
1. Verificar existencia de catálogos (tipos, estados, categorías)
2. Validar que existan usuarios para responsables
3. Confirmar estructura de tablas (columnas requeridas)
4. Probar conectividad con Supabase
5. Verificar permisos de inserción

### **Limpieza Segura**
```sql
-- Orden de eliminación (respetando FK)
DELETE FROM evt_gastos WHERE evento_id IN (SELECT id FROM evt_eventos WHERE activo = true);
DELETE FROM evt_ingresos WHERE evento_id IN (SELECT id FROM evt_eventos WHERE activo = true);
DELETE FROM evt_eventos WHERE activo = true;
-- NO eliminar evt_clientes para preservar referencia histórica
-- Solo marcar como activo = false si es necesario
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### **Pre-requisitos**
- [ ] Verificar conexión a Supabase
- [ ] Confirmar existencia de catálogos base
- [ ] Validar estructura de tablas actualizada
- [ ] Verificar triggers activos
- [ ] Confirmar permisos de inserción

### **Datos Base**
- [ ] 5 clientes con datos fiscales completos
- [ ] Sufijos únicos por cliente (3 caracteres)
- [ ] Contactos principales definidos
- [ ] Datos congruentes (RFC válidos, etc.)

### **Eventos**
- [ ] 5-10 eventos por cliente
- [ ] Claves únicas por cliente
- [ ] Fechas en rango 6-18 meses
- [ ] Estados distribuidos realísticamente
- [ ] Tipos de evento variados

### **Finanzas**
- [ ] 3-5 ingresos por evento
- [ ] 8-12 gastos por evento  
- [ ] Utilidad > 30% garantizada
- [ ] Estados finales = pagado/cobrado
- [ ] Categorías de gastos distribuidas

### **Validación Post-Inserción**
- [ ] Verificar cálculos automáticos
- [ ] Confirmar utilidades > 30%
- [ ] Validar integridad referencial
- [ ] Probar consultas en frontend
- [ ] Verificar métricas de dashboard

---

## 🎯 OBJETIVOS DE CALIDAD DE DATOS

### **Consistencia**
- ✅ Todos los totales calculados automáticamente
- ✅ Estados finales congruentes (pagado/cobrado)
- ✅ Fechas en secuencia lógica
- ✅ Montos realistas por tipo de evento

### **Realismo**
- ✅ Conceptos de ingresos/gastos coherentes
- ✅ Distribución de categorías realista  
- ✅ Proveedores variados y creíbles
- ✅ Referencias y descripciones detalladas

### **Completitud**
- ✅ Todos los campos obligatorios poblados
- ✅ Relaciones FK correctamente establecidas
- ✅ Estados finales alcanzados
- ✅ Metadatos de auditoría completos

---

**Análisis completado exitosamente** ✅  
**Fecha:** 23 de Octubre de 2025  
**Listo para generación de script de población de datos**