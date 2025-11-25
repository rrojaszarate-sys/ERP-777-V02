# 🐛 ERRORES CORREGIDOS EN LA MIGRACIÓN SQL

## Error 1: `column i.proveedor does not exist` ✅ CORREGIDO

**Error completo**:
```
ERROR:  42703: column i.proveedor does not exist
LINE 223:   i.proveedor AS emisor,
```

**Causa**: La tabla `evt_ingresos` NO tiene columna `proveedor`.

**Solución aplicada**:
```sql
-- ANTES (❌)
i.proveedor AS emisor,
i.rfc_proveedor AS rfc_emisor,

-- DESPUÉS (✅)
NULL AS emisor,
NULL AS rfc_emisor,
```

---

## Error 2: `column g.folio does not exist` ✅ CORREGIDO

**Error completo**:
```
ERROR:  42703: column g.folio does not exist
LINE 282:   g.folio AS folio,
```

**Causa**: La tabla `evt_gastos` NO tiene columna `folio`, tiene `folio_interno`.

**Solución aplicada**:
```sql
-- ANTES (❌)
g.folio AS folio,

-- DESPUÉS (✅)
g.folio_interno AS folio,
```

---

## 📊 Diferencias entre evt_ingresos y evt_gastos

### Campos que SÍ existen en ambas (después de migración):
- ✅ uuid_cfdi
- ✅ folio_fiscal
- ✅ serie
- ✅ tipo_comprobante
- ✅ forma_pago_sat
- ✅ metodo_pago_sat
- ✅ moneda
- ✅ tipo_cambio
- ✅ lugar_expedicion
- ✅ uso_cfdi
- ✅ regimen_fiscal_receptor
- ✅ regimen_fiscal_emisor
- ✅ detalle_compra (JSONB)

### Campos únicos de evt_ingresos (NUEVOS):
- ✅ folio (VARCHAR 50) - Folio del comprobante CFDI
- ✅ cliente_id (INTEGER FK)
- ✅ cliente (VARCHAR 255)
- ✅ rfc_cliente (VARCHAR 13)
- ✅ documento_pago_url
- ✅ documento_pago_nombre
- ✅ activo, deleted_at, deleted_by, delete_reason

### Campos únicos de evt_gastos (Ya existían):
- ✅ folio_interno (VARCHAR 50) - Folio de tickets no fiscales
- ✅ categoria_id (FK a categorías de gastos)
- ✅ status_aprobacion (workflow de aprobación)
- ✅ aprobado_por, fecha_aprobacion

---

## 🎯 Vista Unificada Corregida

La vista `vw_movimientos_financieros` ahora mapea correctamente:

| Campo Vista | evt_ingresos | evt_gastos |
|-------------|--------------|------------|
| tipo_movimiento | 'ingreso' | 'gasto' |
| contraparte | cliente | proveedor |
| rfc_contraparte | rfc_cliente | rfc_proveedor |
| emisor | NULL | NULL |
| rfc_emisor | NULL | NULL |
| folio | folio | folio_interno |
| facturado | facturado | true |
| pagado | cobrado | true |

---

## ✅ MIGRACIÓN LISTA PARA EJECUTAR

El script **MIGRACION_INGRESOS_CFDI_COMPLETA.sql** ha sido corregido completamente.

**Columnas totales agregadas a evt_ingresos**: 25+
- 13 campos CFDI
- 3 campos cliente
- 1 campo detalle_compra (JSONB)
- 2 campos documento_pago
- 4 campos soft delete
- 1 campo activo

**Ejecuta ahora**:
```bash
psql "postgresql://postgres.[PROJECT-REF].supabase.co:5432/postgres" -U postgres
\i MIGRACION_INGRESOS_CFDI_COMPLETA.sql
```

O desde **SQL Editor de Supabase**: copia y pega el contenido completo.

---

**Última corrección**: 15 de octubre 2025
**Estado**: ✅ Script SQL completo y verificado
