# ✅ LISTA COMPLETA: Campos Filtrados en Ingresos

**Fecha:** 14 de Octubre, 2025  
**Estado:** ✅ ACTUALIZADO

---

## 📋 Campos que SE REMUEVEN de evt_ingresos

Estos campos **NO existen** en la tabla `evt_ingresos` y deben filtrarse antes del insert:

```typescript
const {
  // 1. Campos exclusivos de GASTOS:
  cliente,              // ❌ Solo gastos
  rfc_cliente,          // ❌ Solo gastos
  fecha_gasto,          // ❌ Solo gastos
  detalle_compra,       // ❌ Solo gastos (JSONB)
  
  // 2. Campos OBSOLETOS en ingresos:
  cantidad,             // ❌ Ya no se usa
  precio_unitario,      // ❌ Ya no se usa
  
  // 3. Campos que NO EXISTEN en tabla:
  documento_pago_url,   // ❌ No existe
  documento_pago_nombre, // ❌ No existe
  
  ...cleanIncomeData    // ✅ Solo quedan campos válidos
} = incomeData as any;
```

---

## ✅ Campos que SÍ se guardan en evt_ingresos

### Identificación:
- ✅ `id` (UUID auto-generado)
- ✅ `evento_id` (Foreign key a evt_eventos)

### Información Básica:
- ✅ `concepto` (Descripción corta)
- ✅ `descripcion` (Descripción detallada)

### Montos:
- ✅ `total` (Monto total)
- ✅ `subtotal` (Base gravable)
- ✅ `iva` (Impuesto)
- ✅ `iva_porcentaje` (% de IVA, default 16)

### Proveedor (Emisor del CFDI):
- ✅ `proveedor` (Nombre del emisor)
- ✅ `rfc_proveedor` (RFC del emisor)

### Fechas:
- ✅ `fecha_ingreso` (Fecha del comprobante)
- ✅ `fecha_facturacion` (Fecha de emisión)
- ✅ `fecha_cobro` (Fecha real de cobro)
- ✅ `fecha_compromiso_pago` (Fecha esperada de pago)

### Control de Pago:
- ✅ `dias_credito` (Días de crédito otorgados)
- ✅ `referencia` (Referencia de pago)
- ✅ `metodo_cobro` (Transferencia, efectivo, etc.)

### Estados:
- ✅ `facturado` (Boolean)
- ✅ `cobrado` (Boolean)

### Responsable:
- ✅ `responsable_id` (UUID del usuario responsable)

### Archivos:
- ✅ `archivo_adjunto` (URL del PDF/XML)
- ✅ `archivo_nombre` (Nombre original)
- ✅ `archivo_tamaño` (Tamaño en bytes)
- ✅ `archivo_tipo` (MIME type)

### Campos CFDI 4.0:
- ✅ `uuid_cfdi` (UUID del SAT)
- ✅ `folio_fiscal` (Folio fiscal)
- ✅ `serie` (Serie del comprobante)
- ✅ `folio` (Folio del comprobante)
- ✅ `tipo_comprobante` (I=Ingreso, E=Egreso, etc.)
- ✅ `forma_pago_sat` (Código SAT forma de pago)
- ✅ `metodo_pago_sat` (PUE, PPD, etc.)
- ✅ `moneda` (MXN, USD, etc.)
- ✅ `tipo_cambio` (Si aplica)
- ✅ `lugar_expedicion` (Código postal)
- ✅ `uso_cfdi` (Clave de uso CFDI)
- ✅ `regimen_fiscal_receptor` (Régimen del receptor)
- ✅ `regimen_fiscal_emisor` (Régimen del emisor)

### Metadata:
- ✅ `created_at` (Timestamp de creación)
- ✅ `updated_at` (Timestamp de actualización)
- ✅ `created_by` (Usuario creador)
- ✅ `deleted_at` (Soft delete)
- ✅ `deleted_by` (Usuario que eliminó)
- ✅ `delete_reason` (Razón de eliminación)
- ✅ `activo` (Boolean)
- ✅ `notas` (Notas adicionales)

---

## 🔄 Evolución de Errores

### Error 1: `cliente` column not found
**Solución:** Filtrar `cliente`, `rfc_cliente`, `fecha_gasto`

### Error 2: `detalle_compra` column not found
**Solución:** Filtrar `detalle_compra`

### Error 3: `documento_pago_nombre` column not found
**Solución:** Filtrar `documento_pago_url`, `documento_pago_nombre`

---

## 📝 Código Final

```typescript
// financesService.ts - createIncome()
async createIncome(incomeData: Partial<Income>): Promise<Income> {
  console.log('📥 [createIncome] Datos recibidos:', incomeData);
  
  // Filtrar campos que no existen en evt_ingresos
  const {
    // Campos de gastos
    cliente,
    rfc_cliente,
    fecha_gasto,
    detalle_compra,
    
    // Campos obsoletos
    cantidad,
    precio_unitario,
    
    // Campos que no existen
    documento_pago_url,
    documento_pago_nombre,
    
    // ✅ Todo lo demás es válido
    ...cleanIncomeData
  } = incomeData as any;

  console.log('✅ [createIncome] Datos limpios:', cleanIncomeData);
  console.log('📋 [createIncome] Campos filtrados:', {
    cliente,
    rfc_cliente,
    fecha_gasto,
    cantidad,
    precio_unitario,
    detalle_compra,
    documento_pago_url,
    documento_pago_nombre
  });

  const { data, error } = await supabase
    .from('evt_ingresos')
    .insert([{
      ...cleanIncomeData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    console.error('❌ [createIncome] Error de Supabase:', error);
    throw error;
  }
  
  console.log('✅ [createIncome] Ingreso creado:', data);
  return data;
}
```

---

## 🧪 Prueba Final

1. Recarga el navegador (F5)
2. Ve a un evento → Ingresos
3. Sube XML + PDF
4. Click "Procesar XML + PDF"
5. Selecciona responsable
6. Click "Guardar"

**Log esperado:**
```
📥 [createIncome] Datos recibidos: {...}
✅ [createIncome] Datos limpios: {...}
📋 [createIncome] Campos filtrados: {
  cliente: undefined,
  rfc_cliente: undefined,
  fecha_gasto: undefined,
  cantidad: undefined,
  precio_unitario: undefined,
  detalle_compra: {...},
  documento_pago_url: undefined,
  documento_pago_nombre: undefined
}
✅ [createIncome] Ingreso creado: {id: "...", concepto: "...", ...}
```

---

**Estado:** ✅ Todos los campos problemáticos filtrados
