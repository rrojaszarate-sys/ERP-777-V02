# 🚀 GUÍA DE EJECUCIÓN DE MIGRACIONES - MÓDULO CONTABLE

**Fecha:** 27 de Octubre, 2025  
**Proyecto:** ERP-777 V1  
**Módulo:** Sistema Contable con Trazabilidad

---

## 📋 ÍNDICE

1. [Resumen de Migraciones](#resumen-de-migraciones)
2. [Pre-requisitos](#pre-requisitos)
3. [Orden de Ejecución](#orden-de-ejecución)
4. [Validación Post-Migración](#validación-post-migración)
5. [Rollback](#rollback)
6. [Catálogo de Cuentas Inicial](#catálogo-de-cuentas-inicial)

---

## 📦 RESUMEN DE MIGRACIONES

| # | Archivo | Propósito | Tiempo Est. |
|---|---------|-----------|-------------|
| 001 | `001_normalizar_evt_cuentas.sql` | Agregar campos para catálogo de cuentas robusto | 1 min |
| 002 | `002_agregar_cuentas_a_ingresos_gastos.sql` | Añadir cuenta_id a evt_ingresos y evt_gastos | 1 min |
| 003 | `003_crear_ingresos_gastos_externos.sql` | Crear tablas para ingresos/gastos externos | 2 min |
| 004 | `004_sistema_documentos_auditoria.sql` | Crear tablas de documentos y auditoría | 2 min |
| 005 | `005_contabilidad_asientos_movimientos.sql` | Sistema de partida doble y movimientos bancarios | 3 min |
| 006 | `006_triggers_automatizacion.sql` | Triggers para asientos automáticos y trazabilidad | 2 min |
| 007 | `007_vistas_consolidadas.sql` | Vistas para reportes consolidados | 2 min |

**Tiempo Total Estimado:** 13-15 minutos

---

## ✅ PRE-REQUISITOS

### 1. Acceso a Supabase
- ✅ Usuario con permisos de administrador
- ✅ Acceso a Supabase Dashboard: https://gomnouwackzvthpwyric.supabase.co
- ✅ Conexión estable a internet

### 2. Backup de Datos
```sql
-- Ejecutar en SQL Editor ANTES de las migraciones
CREATE SCHEMA IF NOT EXISTS backup_20251027;

-- Backup tablas críticas
CREATE TABLE backup_20251027.evt_ingresos AS SELECT * FROM evt_ingresos;
CREATE TABLE backup_20251027.evt_gastos AS SELECT * FROM evt_gastos;
CREATE TABLE backup_20251027.evt_eventos AS SELECT * FROM evt_eventos;
CREATE TABLE backup_20251027.evt_cuentas AS SELECT * FROM evt_cuentas;

-- Verificar backups
SELECT 'evt_ingresos' as tabla, COUNT(*) as registros FROM backup_20251027.evt_ingresos
UNION ALL
SELECT 'evt_gastos', COUNT(*) FROM backup_20251027.evt_gastos
UNION ALL
SELECT 'evt_eventos', COUNT(*) FROM backup_20251027.evt_eventos
UNION ALL
SELECT 'evt_cuentas', COUNT(*) FROM backup_20251027.evt_cuentas;
```

### 3. Validar Función update_updated_at_column
```sql
-- Verificar que existe (se usa en triggers)
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'update_updated_at_column';

-- Si no existe, crearla:
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔄 ORDEN DE EJECUCIÓN

### PASO 1: Normalizar evt_cuentas (001)

**Archivo:** `migrations/001_normalizar_evt_cuentas.sql`

**Qué hace:**
- Agrega columnas: codigo, tipo, subtipo, naturaleza, nivel, cuenta_padre_id, acepta_movimientos, moneda, requiere_comprobante
- Crea índices para mejorar performance
- Actualiza cuentas existentes con valores por defecto

**Ejecutar:**
1. Abre Supabase Dashboard → SQL Editor
2. Copia y pega el contenido completo de `001_normalizar_evt_cuentas.sql`
3. Ejecuta (RUN)
4. Verifica que no haya errores

**Validación:**
```sql
-- Verificar nuevas columnas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'evt_cuentas' 
  AND column_name IN ('codigo', 'tipo', 'subtipo', 'naturaleza');

-- Debe retornar 4 filas
```

---

### PASO 2: Agregar Cuentas a Ingresos/Gastos (002)

**Archivo:** `migrations/002_agregar_cuentas_a_ingresos_gastos.sql`

**Qué hace:**
- Agrega cuenta_id, cuenta_contable_ingreso_id a evt_ingresos
- Agrega cuenta_id, cuenta_contable_gasto_id, pagado, fecha_pago a evt_gastos
- Crea constraints para tipo_comprobante

**Ejecutar:**
1. SQL Editor → Nueva Query
2. Pega `002_agregar_cuentas_a_ingresos_gastos.sql`
3. RUN
4. Verifica éxito

**Validación:**
```sql
SELECT 
  'evt_ingresos' as tabla,
  COUNT(*) FILTER (WHERE cuenta_id IS NOT NULL) as con_cuenta,
  COUNT(*) as total
FROM evt_ingresos
UNION ALL
SELECT 
  'evt_gastos',
  COUNT(*) FILTER (WHERE cuenta_id IS NOT NULL),
  COUNT(*)
FROM evt_gastos;
```

---

### PASO 3: Crear Tablas Ingresos/Gastos Externos (003)

**Archivo:** `migrations/003_crear_ingresos_gastos_externos.sql`

**Qué hace:**
- Crea cont_ingresos_externos
- Crea cont_gastos_externos
- Configura índices y triggers

**Ejecutar:**
1. SQL Editor → Nueva Query
2. Pega `003_crear_ingresos_gastos_externos.sql`
3. RUN

**Validación:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('cont_ingresos_externos', 'cont_gastos_externos');

-- Debe retornar 2 filas
```

---

### PASO 4: Sistema de Documentos y Auditoría (004)

**Archivo:** `migrations/004_sistema_documentos_auditoria.sql`

**Qué hace:**
- Crea cont_documentos
- Crea cont_auditoria_modificaciones
- Configura constraints y validaciones

**Ejecutar:**
1. SQL Editor → Nueva Query
2. Pega `004_sistema_documentos_auditoria.sql`
3. RUN

**Validación:**
```sql
SELECT table_name, 
       (SELECT COUNT(*) 
        FROM information_schema.columns c 
        WHERE c.table_name = t.table_name) as num_columnas
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('cont_documentos', 'cont_auditoria_modificaciones');
```

---

### PASO 5: Contabilidad - Asientos y Movimientos (005)

**Archivo:** `migrations/005_contabilidad_asientos_movimientos.sql`

**Qué hace:**
- Crea secuencia seq_numero_asiento
- Crea cont_movimientos_bancarios
- Crea cont_asientos_contables y cont_partidas
- Implementa triggers para validar balance

**Ejecutar:**
1. SQL Editor → Nueva Query
2. Pega `005_contabilidad_asientos_movimientos.sql`
3. RUN

**Validación:**
```sql
-- Verificar tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'cont_%';

-- Verificar secuencia
SELECT sequence_name 
FROM information_schema.sequences 
WHERE sequence_name = 'seq_numero_asiento';
```

---

### PASO 6: Triggers de Automatización (006)

**Archivo:** `migrations/006_triggers_automatizacion.sql`

**Qué hace:**
- Crea fn_crear_asiento_automatico() - genera asientos al cobrar/pagar
- Crea fn_auditoria_modificacion() - registra cambios con validación de rol
- Crea fn_generar_nombre_documento() - nomenclatura YYYY-MM-DD-CUENTA-ID
- Aplica triggers a todas las tablas financieras

**Ejecutar:**
1. SQL Editor → Nueva Query
2. Pega `006_triggers_automatizacion.sql`
3. RUN

**Validación:**
```sql
-- Verificar funciones
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE 'fn_%';

-- Verificar triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND trigger_name LIKE 'trg_%';
```

---

### PASO 7: Vistas Consolidadas (007)

**Archivo:** `migrations/007_vistas_consolidadas.sql`

**Qué hace:**
- Crea vw_ingresos_consolidados
- Crea vw_gastos_consolidados
- Crea vw_movimientos_cuenta
- Crea vw_balance_comprobacion
- Crea vw_auditoria_modificaciones
- Crea vw_resumen_financiero_periodo
- Configura permisos

**Ejecutar:**
1. SQL Editor → Nueva Query
2. Pega `007_vistas_consolidadas.sql`
3. RUN

**Validación:**
```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name LIKE 'vw_%';

-- Probar vista
SELECT * FROM vw_balance_comprobacion LIMIT 5;
```

---

## ✅ VALIDACIÓN POST-MIGRACIÓN

### Test 1: Balance de Comprobación
```sql
-- Debe retornar diferencia = 0 (o muy cercano a 0)
SELECT 
  SUM(total_debe) - SUM(total_haber) AS diferencia
FROM vw_balance_comprobacion;
```

### Test 2: Creación Automática de Asientos
```sql
-- Marcar un ingreso como cobrado (simulación)
-- NOTA: Reemplazar 123 con un ID real de evt_ingresos
UPDATE evt_ingresos 
SET cobrado = true, 
    fecha_cobro = CURRENT_DATE,
    cuenta_id = (SELECT id FROM evt_cuentas WHERE tipo = 'activo' LIMIT 1),
    notas = 'Prueba de asiento automático'
WHERE id = 123;

-- Verificar que se creó el asiento
SELECT * FROM cont_asientos_contables 
WHERE referencia_tabla = 'evt_ingresos' 
  AND referencia_id = 123;

-- Verificar partidas balanceadas
SELECT 
  a.numero_asiento,
  SUM(p.debe) AS total_debe,
  SUM(p.haber) AS total_haber,
  SUM(p.debe) - SUM(p.haber) AS diferencia
FROM cont_asientos_contables a
JOIN cont_partidas p ON a.id = p.asiento_id
WHERE a.referencia_tabla = 'evt_ingresos' AND a.referencia_id = 123
GROUP BY a.numero_asiento;
```

### Test 3: Auditoría de Modificaciones
```sql
-- Modificar un registro (simulación)
UPDATE evt_ingresos 
SET total = 1500.00,
    notas = 'Corrección de monto - error de captura'
WHERE id = 123;

-- Verificar registro de auditoría
SELECT * FROM vw_auditoria_modificaciones 
WHERE tabla = 'evt_ingresos' 
  AND registro_id = 123
ORDER BY fecha_modificacion DESC;
```

### Test 4: Vistas Consolidadas
```sql
-- Ingresos consolidados
SELECT origen, COUNT(*), SUM(total) 
FROM vw_ingresos_consolidados 
GROUP BY origen;

-- Gastos consolidados
SELECT origen, COUNT(*), SUM(total) 
FROM vw_gastos_consolidados 
GROUP BY origen;

-- Movimientos por cuenta
SELECT cuenta_nombre, COUNT(*), SUM(debe), SUM(haber)
FROM vw_movimientos_cuenta
GROUP BY cuenta_nombre;
```

---

## 🔙 ROLLBACK

Si algo sale mal, cada migración incluye sección de ROLLBACK al final del archivo.

**Ejemplo - Revertir migración 006:**
```sql
BEGIN;
DROP TRIGGER IF EXISTS trg_auditoria_cont_gastos_externos ON cont_gastos_externos;
DROP TRIGGER IF EXISTS trg_auditoria_cont_ingresos_externos ON cont_ingresos_externos;
DROP TRIGGER IF EXISTS trg_auditoria_evt_gastos ON evt_gastos;
DROP TRIGGER IF EXISTS trg_auditoria_evt_ingresos ON evt_ingresos;
DROP FUNCTION IF EXISTS fn_auditoria_modificacion CASCADE;
DROP TRIGGER IF EXISTS trg_asiento_cont_gastos_externos ON cont_gastos_externos;
DROP TRIGGER IF EXISTS trg_asiento_cont_ingresos_externos ON cont_ingresos_externos;
DROP TRIGGER IF EXISTS trg_asiento_evt_gastos ON evt_gastos;
DROP TRIGGER IF EXISTS trg_asiento_evt_ingresos ON evt_ingresos;
DROP FUNCTION IF EXISTS fn_crear_asiento_automatico CASCADE;
COMMIT;
```

**Restaurar desde backup:**
```sql
-- Restaurar tabla específica
BEGIN;
DELETE FROM evt_ingresos;
INSERT INTO evt_ingresos SELECT * FROM backup_20251027.evt_ingresos;
COMMIT;
```

---

## 📊 CATÁLOGO DE CUENTAS INICIAL

Ejecutar DESPUÉS de migración 001 para crear catálogo básico:

```sql
-- Ejecutar en SQL Editor
BEGIN;

-- Limpiar cuentas existentes (CUIDADO: solo si es nueva instalación)
-- TRUNCATE evt_cuentas RESTART IDENTITY CASCADE;

-- ACTIVO
INSERT INTO evt_cuentas (codigo, nombre, tipo, subtipo, naturaleza, nivel, acepta_movimientos, moneda, activo) VALUES
('1000', 'ACTIVO', 'activo', 'agrupacion', 'deudora', 1, false, 'MXN', true),
('1100', 'Activo Circulante', 'activo', 'agrupacion', 'deudora', 2, false, 'MXN', true),
('1101', 'Caja General', 'activo', 'caja', 'deudora', 3, true, 'MXN', true),
('1102', 'Caja Chica', 'activo', 'caja', 'deudora', 3, true, 'MXN', true),
('1110', 'Bancos', 'activo', 'agrupacion', 'deudora', 2, false, 'MXN', true),
('1111', 'Banco BBVA', 'activo', 'banco', 'deudora', 3, true, 'MXN', true),
('1112', 'Banco Santander', 'activo', 'banco', 'deudora', 3, true, 'MXN', true),
('1113', 'Banco HSBC', 'activo', 'banco', 'deudora', 3, true, 'MXN', true),
('1114', 'Banco Banorte', 'activo', 'banco', 'deudora', 3, true, 'MXN', true);

-- PASIVO
INSERT INTO evt_cuentas (codigo, nombre, tipo, subtipo, naturaleza, nivel, acepta_movimientos, moneda, activo) VALUES
('2000', 'PASIVO', 'pasivo', 'agrupacion', 'acreedora', 1, false, 'MXN', true),
('2100', 'Pasivo Circulante', 'pasivo', 'agrupacion', 'acreedora', 2, false, 'MXN', true),
('2101', 'Proveedores', 'pasivo', 'proveedor', 'acreedora', 3, true, 'MXN', true),
('2102', 'Acreedores Diversos', 'pasivo', 'acreedor', 'acreedora', 3, true, 'MXN', true);

-- CAPITAL
INSERT INTO evt_cuentas (codigo, nombre, tipo, subtipo, naturaleza, nivel, acepta_movimientos, moneda, activo) VALUES
('3000', 'CAPITAL', 'capital', 'agrupacion', 'acreedora', 1, false, 'MXN', true),
('3101', 'Capital Social', 'capital', 'capital_social', 'acreedora', 3, true, 'MXN', true),
('3201', 'Utilidades Acumuladas', 'capital', 'utilidades', 'acreedora', 3, true, 'MXN', true);

-- INGRESOS
INSERT INTO evt_cuentas (codigo, nombre, tipo, subtipo, naturaleza, nivel, acepta_movimientos, moneda, activo) VALUES
('4000', 'INGRESOS', 'ingreso', 'agrupacion', 'acreedora', 1, false, 'MXN', true),
('4010', 'Ingresos por Eventos', 'ingreso', 'eventos', 'acreedora', 2, true, 'MXN', true),
('4020', 'Ingresos por Servicios', 'ingreso', 'servicios', 'acreedora', 2, true, 'MXN', true),
('4030', 'Otros Ingresos', 'ingreso', 'otros', 'acreedora', 2, true, 'MXN', true);

-- GASTOS
INSERT INTO evt_cuentas (codigo, nombre, tipo, subtipo, naturaleza, nivel, acepta_movimientos, moneda, activo) VALUES
('5000', 'GASTOS', 'gasto', 'agrupacion', 'deudora', 1, false, 'MXN', true),
('5010', 'Gastos de Eventos', 'gasto', 'eventos', 'deudora', 2, true, 'MXN', true),
('5020', 'Gastos Administrativos', 'gasto', 'administrativos', 'deudora', 2, true, 'MXN', true),
('5021', 'Sueldos y Salarios', 'gasto', 'nomina', 'deudora', 3, true, 'MXN', true),
('5022', 'Renta', 'gasto', 'operativo', 'deudora', 3, true, 'MXN', true),
('5023', 'Servicios (Luz, Agua, Internet)', 'gasto', 'operativo', 'deudora', 3, true, 'MXN', true),
('5030', 'Gastos Fiscales', 'gasto', 'fiscal', 'deudora', 2, true, 'MXN', true),
('5031', 'Impuestos', 'gasto', 'fiscal', 'deudora', 3, true, 'MXN', true);

-- Actualizar cuentas padre
UPDATE evt_cuentas SET cuenta_padre_id = (SELECT id FROM evt_cuentas WHERE codigo = '1000') WHERE codigo LIKE '11%' AND codigo != '1000';
UPDATE evt_cuentas SET cuenta_padre_id = (SELECT id FROM evt_cuentas WHERE codigo = '1100') WHERE codigo LIKE '110%' AND codigo != '1100';
UPDATE evt_cuentas SET cuenta_padre_id = (SELECT id FROM evt_cuentas WHERE codigo = '1110') WHERE codigo LIKE '111%' AND codigo != '1110';

UPDATE evt_cuentas SET cuenta_padre_id = (SELECT id FROM evt_cuentas WHERE codigo = '2000') WHERE codigo LIKE '21%' AND codigo != '2000';
UPDATE evt_cuentas SET cuenta_padre_id = (SELECT id FROM evt_cuentas WHERE codigo = '3000') WHERE codigo LIKE '3%' AND codigo != '3000';
UPDATE evt_cuentas SET cuenta_padre_id = (SELECT id FROM evt_cuentas WHERE codigo = '4000') WHERE codigo LIKE '4%' AND codigo != '4000';
UPDATE evt_cuentas SET cuenta_padre_id = (SELECT id FROM evt_cuentas WHERE codigo = '5000') WHERE codigo LIKE '5%' AND codigo != '5000';

COMMIT;

-- Verificar catálogo
SELECT codigo, nombre, tipo, subtipo, nivel, acepta_movimientos 
FROM evt_cuentas 
ORDER BY codigo;
```

---

## 📞 SOPORTE

Si encuentras errores durante la migración:

1. **No ejecutar más migraciones** - detente inmediatamente
2. **Captura el error** - copia el mensaje completo
3. **Verifica logs** - revisa Supabase Dashboard → Logs
4. **Consulta documentación** - revisa `ARQUITECTURA_MODULO_CONTABLE.md`
5. **Rollback si es necesario** - usa las secciones de rollback incluidas

---

**¡IMPORTANTE!**

- ✅ Ejecutar en ORDEN (001 → 007)
- ✅ Validar cada paso antes de continuar
- ✅ Hacer backup ANTES de empezar
- ✅ Probar en ambiente de desarrollo primero
- ✅ NO ejecutar en producción sin pruebas previas

---

**Última actualización:** 27 de Octubre, 2025  
**Revisado por:** GitHub Copilot  
**Versión:** 1.0
