# 🚀 Qué Hacer en Supabase - Guía Paso a Paso

**Fecha:** 12 de Octubre 2025
**Tiempo estimado:** 10 minutos

---

## ✅ PASO 1: Abrir Supabase Dashboard

1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. En el menú lateral, haz clic en **SQL Editor**

---

## ✅ PASO 2: Ejecutar Migración SQL

### Opción A: Copiar y Pegar (Recomendado)

1. Abre el archivo: `/supabase_old/migrations/20251012_add_ocr_enhanced_fields.sql`
2. Copia TODO el contenido (Ctrl+A, Ctrl+C)
3. Pega en el SQL Editor de Supabase
4. Haz clic en **RUN** (esquina inferior derecha)
5. Espera a que termine (aparecerá "Success" en verde)

### Opción B: Subir Archivo

1. En SQL Editor, haz clic en **"+ New query"**
2. Arrastra el archivo `20251012_add_ocr_enhanced_fields.sql` al editor
3. Haz clic en **RUN**

---

## ✅ PASO 3: Verificar que Todo Funciona

Ejecuta este query de verificación:

```sql
-- Verificar que los campos se crearon correctamente
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'evt_gastos'
  AND column_name IN (
    'detalle_compra',
    'telefono_proveedor',
    'folio_ticket',
    'moneda',
    'tipo_comprobante',
    'descuento',
    'propina',
    'metodo_pago_detalle',
    'num_productos',
    'hora_compra'
  )
ORDER BY column_name;
```

**Resultado esperado:** Debes ver 10 filas con estos campos

---

## ✅ PASO 4: Probar Vista Analytics

Ejecuta este query:

```sql
-- Ver la nueva vista de analytics
SELECT * FROM vw_gastos_ocr_analytics
LIMIT 5;
```

**Resultado esperado:** Query exitoso (puede estar vacío si no hay gastos con OCR aún)

---

## ✅ PASO 5: Probar Función de Estadísticas

```sql
-- Obtener estadísticas de OCR
SELECT * FROM get_ocr_stats();
```

**Resultado esperado:** Una fila con estadísticas (puede mostrar ceros si no hay gastos con OCR)

---

## 🎉 ¡LISTO! Base de Datos Actualizada

### Lo que acabas de agregar:

✅ **10 campos nuevos** a la tabla `evt_gastos`:
- `detalle_compra` (text) - Resumen de productos
- `telefono_proveedor` (varchar 20)
- `folio_ticket` (varchar 50)
- `moneda` (varchar 3, default 'MXN')
- `tipo_comprobante` (varchar 20, default 'ticket')
- `descuento` (numeric, default 0)
- `propina` (numeric, default 0)
- `metodo_pago_detalle` (varchar 50)
- `num_productos` (integer, default 0)
- `hora_compra` (time)

✅ **3 índices** para búsquedas rápidas

✅ **1 trigger** que cuenta automáticamente los productos

✅ **1 vista** para analytics (`vw_gastos_ocr_analytics`)

✅ **1 función** para estadísticas (`get_ocr_stats()`)

---

## 🔧 Si Hay Errores

### Error: "column already exists"
**Causa:** Los campos ya existen
**Solución:** Está bien, significa que ya se ejecutó antes. Continúa.

### Error: "relation does not exist"
**Causa:** La tabla `evt_gastos` no existe
**Solución:** Verifica que estás en el proyecto correcto de Supabase

### Error: "permission denied"
**Causa:** No tienes permisos
**Solución:** Asegúrate de estar logueado como owner del proyecto

---

## 📊 Validar Cambios

### Query de Validación Completa:

```sql
-- 1. Ver estructura de la tabla actualizada
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'evt_gastos'
ORDER BY ordinal_position;

-- 2. Ver índices creados
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'evt_gastos'
  AND indexname LIKE '%ocr%';

-- 3. Ver triggers
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'evt_gastos'
  AND trigger_name LIKE '%producto%';

-- 4. Probar vista analytics
SELECT COUNT(*) as total_gastos_ocr
FROM vw_gastos_ocr_analytics;

-- 5. Probar función de stats
SELECT
  total_gastos_ocr,
  promedio_confianza,
  con_productos,
  sin_productos
FROM get_ocr_stats();
```

---

## 🎯 Siguiente Paso

Después de ejecutar la migración en Supabase, vuelve a tu código y continúa con los cambios en el frontend.

Los archivos ya están listos:
- ✅ `/src/modules/eventos/components/finances/smartTicketParser.ts`
- ✅ `/src/modules/eventos/types/Finance.ts`
- ⏳ `/src/modules/eventos/components/finances/GoogleVisionExpenseForm.tsx` (requiere actualización manual)

---

## 📞 ¿Necesitas Ayuda?

Si encuentras algún error:
1. Copia el mensaje de error completo
2. Revisa la documentación en `ANALISIS_MEJORAS_OCR_COMPLETO.md`
3. Verifica que estás en el proyecto correcto

---

**¡Eso es todo para Supabase! 🎉**

Una vez ejecutado, tu base de datos estará lista para almacenar todos los datos mejorados del OCR.
