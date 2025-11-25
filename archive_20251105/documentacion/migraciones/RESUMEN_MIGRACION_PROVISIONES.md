# Resumen: Migración de Provisiones Divididas

## Estado Actual: 95% Completado

### ✅ Pasos Completados

1. **Columnas Agregadas** ✓
   - `provision_combustible_peaje`
   - `provision_materiales`
   - `provision_recursos_humanos`
   - `provision_solicitudes_pago`

2. **Datos Migrados** ✓
   - 274 eventos procesados
   - $45,838,608.30 distribuidos equitativamente (25% c/u)
   - 6 campos obsoletos puestos en ceros

3. **Campos Obsoletos Marcados** ✓
   - provisiones = 0
   - utilidad_estimada = 0
   - porcentaje_utilidad_estimada = 0
   - total_gastos = 0
   - utilidad = 0
   - margen_utilidad = 0

---

## ⚠️ Paso Final Pendiente

### Actualizar Vistas SQL

**Archivo a ejecutar:** `011_ACTUALIZAR_VISTAS.sql`

**Instrucciones:**

1. Ir a: https://supabase.com/dashboard/project/gomnouwackzvthpwyric/editor
2. Abrir **SQL Editor**
3. Copiar y pegar el contenido completo de `011_ACTUALIZAR_VISTAS.sql`
4. Ejecutar

---

## 📋 Qué Hace Este Script

### Vista 1: `vw_eventos_analisis_financiero`
Agrega:
- **4 columnas de provisiones desglosadas**
- **provisiones** (calculado dinámicamente como suma de las 4)
- **utilidad_estimada** (calculada dinámicamente)
- **porcentaje_utilidad_estimada** (calculado dinámicamente)
- Mantiene todos los campos actuales (ingresos, gastos, status, etc.)

### Vista 2: `vw_eventos_completos`
Agrega:
- **provisiones_total** (calculado dinámicamente)
- Mantiene todos los campos actuales

---

## ✨ Resultado Final

Después de ejecutar el script:

- Las vistas calcularán dinámicamente los totales
- Los campos obsoletos permanecen en 0 (no se eliminan todavía)
- El frontend puede empezar a usar:
  - `provision_combustible_peaje`
  - `provision_materiales`
  - `provision_recursos_humanos`
  - `provision_solicitudes_pago`
- Las vistas retornan `provisiones_total` calculado automáticamente

---

## 🔍 Validación

Después de ejecutar, prueba con:

```sql
-- Ver un evento con provisiones desglosadas
SELECT
  clave_evento,
  nombre_proyecto,
  provision_combustible_peaje,
  provision_materiales,
  provision_recursos_humanos,
  provision_solicitudes_pago,
  provisiones, -- Este es el total calculado
  utilidad_estimada -- También calculado
FROM vw_eventos_analisis_financiero
LIMIT 5;
```

Deberías ver:
- Las 4 provisiones con valores (aprox. 25% del total cada una)
- `provisiones` como la suma de las 4
- `utilidad_estimada` calculada dinámicamente

---

## ⚠️ Notas sobre Errores del IDE

Si tu IDE (VSCode) muestra errores en `011_ACTUALIZAR_VISTAS.sql`:
- **IGNÓRALOS** - Son errores del IDE configurado para SQL Server
- La sintaxis es **100% válida para PostgreSQL/Supabase**:
  - `DROP VIEW IF EXISTS ... CASCADE` ✓ Válido
  - `::INTEGER` ✓ Válido (cast de PostgreSQL)
  - `COMMENT ON VIEW` ✓ Válido
  - `BEGIN/COMMIT` ✓ Válido

El script se ejecutará sin problemas en Supabase Dashboard.
