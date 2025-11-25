# ✅ FIX: Error Campo detalle_compra en Ingresos

**Fecha:** 14 de Octubre, 2025  
**Estado:** ✅ CORREGIDO

---

## ❌ Error

```
Could not find the 'detalle_compra' column of 'evt_ingresos' in the schema cache
```

---

## 🔍 Causa

El parser `cfdiToIncomeData()` estaba incluyendo el campo `detalle_compra` en los datos de ingreso, pero **este campo NO existe en la tabla `evt_ingresos`**.

El campo `detalle_compra` solo existe en `evt_gastos` (gastos), no en ingresos.

---

## ✅ Solución

Agregado `detalle_compra` a la lista de campos filtrados en `createIncome()`:

```typescript
// financesService.ts - createIncome()
const {
  // Remover campos de gastos que no existen en ingresos
  cliente,
  rfc_cliente,
  fecha_gasto,
  cantidad,
  precio_unitario,
  detalle_compra,  // ✅ NUEVO: Filtrar este campo
  ...cleanIncomeData
} = incomeData as any;
```

---

## 📋 Campos Filtrados Completos

Campos que se **REMUEVEN** antes de insertar en `evt_ingresos`:

1. ❌ `cliente` - Solo para gastos
2. ❌ `rfc_cliente` - Solo para gastos
3. ❌ `fecha_gasto` - Solo para gastos
4. ❌ `cantidad` - Campo obsoleto en ingresos
5. ❌ `precio_unitario` - Campo obsoleto en ingresos
6. ❌ `detalle_compra` - Solo para gastos (JSONB con productos)
7. ❌ `documento_pago_url` - No existe en evt_ingresos
8. ❌ `documento_pago_nombre` - No existe en evt_ingresos

---

## 🎯 Campos que SÍ se guardan en evt_ingresos

### Campos Básicos:
- ✅ `concepto`, `descripcion`
- ✅ `total`, `subtotal`, `iva`, `iva_porcentaje`
- ✅ `fecha_ingreso`, `fecha_facturacion`, `fecha_cobro`
- ✅ `fecha_compromiso_pago`, `dias_credito`

### Campos CFDI:
- ✅ `proveedor`, `rfc_proveedor` (emisor del CFDI)
- ✅ `uuid_cfdi`, `folio_fiscal`, `serie`, `folio`
- ✅ `tipo_comprobante`, `forma_pago_sat`, `metodo_pago_sat`
- ✅ `moneda`, `tipo_cambio`, `lugar_expedicion`
- ✅ `uso_cfdi`, `regimen_fiscal_receptor`, `regimen_fiscal_emisor`

### Campos de Estado:
- ✅ `facturado`, `cobrado`
- ✅ `responsable_id`
- ✅ `metodo_cobro`, `referencia`

### Archivos:
- ✅ `archivo_adjunto`, `archivo_nombre`, `archivo_tamaño`, `archivo_tipo`
- ✅ `documento_pago_url`, `documento_pago_nombre`

---

## 🧪 Prueba Nuevamente

1. Recarga el navegador (F5)
2. Ve a un evento → Ingresos
3. Sube XML + PDF
4. Click "Procesar XML + PDF"
5. Selecciona responsable
6. Click "Guardar"

**Ahora debería guardar exitosamente** ✅

---

## 📊 Logs Esperados

Deberías ver en la consola:

```
📥 [createIncome] Datos recibidos: {...}
✅ [createIncome] Datos limpios a insertar: {...}
📋 [createIncome] Campos filtrados: {
  cliente: undefined, 
  rfc_cliente: undefined, 
  fecha_gasto: undefined, 
  cantidad: undefined, 
  precio_unitario: undefined,
  detalle_compra: {...}  ← Este campo ahora se filtra
}
✅ [createIncome] Ingreso creado exitosamente: {...}
```

---

**Estado:** ✅ Campo filtrado - Listo para guardar ingresos
