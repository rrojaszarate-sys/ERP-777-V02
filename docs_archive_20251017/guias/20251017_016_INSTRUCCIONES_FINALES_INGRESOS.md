# 📋 INSTRUCCIONES FINALES - INGRESOS CON CAMPOS CFDI COMPLETOS

## 🎯 Resumen de Cambios Realizados

Se han actualizado los tipos TypeScript y la validación del formulario para que **evt_ingresos** tenga la misma estructura que **evt_gastos**, permitiendo almacenar todos los campos CFDI 4.0 de las facturas electrónicas.

---

## ✅ CAMBIOS COMPLETADOS

### 1. **Interfaz TypeScript `Income` actualizada** ✅
📄 **Archivo**: `src/modules/eventos/types/Finance.ts`

**Campos añadidos**:
```typescript
// ====== CLIENTE (OBLIGATORIO) ======
cliente_id: string;                 // ✅ FK a evt_clientes - OBLIGATORIO
cliente: string;                    // ✅ Nombre del cliente - OBLIGATORIO  
rfc_cliente: string;                // ✅ RFC del cliente - OBLIGATORIO

// ====== TODOS LOS CAMPOS CFDI 4.0 ======
uuid_cfdi, folio_fiscal, serie, folio, tipo_comprobante,
forma_pago_sat, metodo_pago_sat, moneda, tipo_cambio,
lugar_expedicion, uso_cfdi, regimen_fiscal_receptor,
regimen_fiscal_emisor

// ====== DETALLE DE PRODUCTOS ======
detalle_compra: {
  productos: Array<{
    descripcion, cantidad, valor_unitario, importe,
    descuento, impuestos (traslados y retenciones)
  }>
}

// ====== CAMPOS ADICIONALES ======
folio_interno, hora_emision, telefono_proveedor,
descuento, motivo_descuento, documento_pago_url,
documento_pago_nombre

// ====== METADATOS OCR ======
ocr_confianza, ocr_validado, ocr_datos_originales

// ====== SOFT DELETE ======
deleted_at, deleted_by, delete_reason
```

### 2. **Validación del formulario actualizada** ✅
📄 **Archivo**: `src/modules/eventos/components/finances/IncomeForm.tsx`

**Líneas 104-107**:
```typescript
// ✅ VALIDAR CLIENTE OBLIGATORIO
if (!formData.cliente_id || !formData.cliente_id.trim()) {
  newErrors.cliente_id = 'El cliente es obligatorio';
}
```

### 3. **formData actualizado con cliente_id** ✅
📄 **Archivo**: `src/modules/eventos/components/finances/IncomeForm.tsx`

**Líneas 45-47**:
```typescript
cliente_id: income?.cliente_id || '', // ✅ OBLIGATORIO
cliente: income?.cliente || '',
rfc_cliente: income?.rfc_cliente || '',
```

### 4. **Servicio financesService.ts actualizado** ✅
📄 **Archivo**: `src/modules/eventos/services/financesService.ts`

**Solo filtra campos obsoletos** (cantidad, precio_unitario, fecha_gasto):
```typescript
const {
  cantidad,        // ❌ Obsoleto
  precio_unitario, // ❌ Obsoleto  
  fecha_gasto,     // ❌ Use fecha_ingreso instead
  ...cleanIncomeData
} = incomeData as any;
```

### 5. **Migración SQL creada** ✅
📄 **Archivo**: `MIGRACION_INGRESOS_CFDI_COMPLETA.sql`

**284 líneas** con:
- ✅ 21+ nuevas columnas (CFDI + cliente + detalle)
- ✅ Constraints (CHECK para tipo_comprobante, forma_pago_sat, metodo_pago_sat, moneda)
- ✅ Índices (uuid_cfdi, folio_fiscal, serie/folio, cliente_id, rfc_cliente, GIN para detalle_compra)
- ✅ Comentarios en todas las columnas
- ✅ Vista unificada `vw_movimientos_financieros` (UNION de ingresos y gastos)

---

## ⚠️ PENDIENTES CRÍTICOS

### ❗ 1. **EJECUTAR LA MIGRACIÓN SQL EN LA BASE DE DATOS**

**PASO 1**: Conectar a Supabase
```bash
# Opción A: Desde terminal local
psql "postgresql://postgres.[PROJECT-REF].supabase.co:5432/postgres" \
  -U postgres

# Opción B: Desde el Dashboard de Supabase
# Ve a: SQL Editor → New Query
```

**PASO 2**: Ejecutar el archivo completo
```bash
# Desde terminal
\i MIGRACION_INGRESOS_CFDI_COMPLETA.sql

# O copia y pega el contenido completo en el SQL Editor
```

**PASO 3**: Verificar que se crearon las columnas
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns  
WHERE table_name = 'evt_ingresos'
ORDER BY ordinal_position;
```

Deberías ver las nuevas columnas:
- uuid_cfdi (VARCHAR 36)
- folio_fiscal (VARCHAR 50)
- serie (VARCHAR 25)
- folio (VARCHAR 50)
- cliente_id (INTEGER)
- cliente (VARCHAR 255)
- rfc_cliente (VARCHAR 13)
- detalle_compra (JSONB)
- ... y 13 más

---

### ❗ 2. **AGREGAR SELECTOR DE CLIENTE AL FORMULARIO**

📄 **Archivo a modificar**: `src/modules/eventos/components/finances/IncomeForm.tsx`

**A. Importar el hook de clientes**

En las líneas **1-10**, agregar:
```typescript
import { useClients } from '../../hooks/useClients';
```

**B. Usar el hook dentro del componente**

Busca la línea **60** (donde está `useUsers()`) y agrega debajo:
```typescript
const { data: users, loading: loadingUsers } = useUsers();
const { clients, loading: loadingClients } = useClients(); // ✅ AGREGAR ESTA LÍNEA
```

**C. Agregar el selector en el HTML**

Busca el selector de **Responsable** (aproximadamente línea **570**) y agrega ANTES:

```tsx
{/* ====== CLIENTE (OBLIGATORIO) ====== */}
<div>
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
    Cliente *
  </label>
  <select
    value={formData.cliente_id}
    onChange={(e) => {
      const selectedCliente = clients?.find(c => c.id === e.target.value);
      handleInputChange('cliente_id', e.target.value);
      if (selectedCliente) {
        handleInputChange('cliente', selectedCliente.nombre);
        handleInputChange('rfc_cliente', selectedCliente.rfc || '');
      }
    }}
    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
      errors.cliente_id ? 'border-red-500' : 'border-gray-300'
    }`}
    disabled={loadingClients}
  >
    <option value="">Selecciona un cliente</option>
    {clients?.map((cliente) => (
      <option key={cliente.id} value={cliente.id}>
        {cliente.nombre} {cliente.rfc ? `- ${cliente.rfc}` : ''}
      </option>
    ))}
  </select>
  {errors.cliente_id && (
    <p className="text-red-500 text-sm mt-1">{errors.cliente_id}</p>
  )}
  <p className="text-xs text-gray-500 mt-1">
    ℹ️ El cliente es obligatorio para poder facturar este ingreso
  </p>
</div>
```

---

### ❗ 3. **PROBAR EL FLUJO COMPLETO**

**Test 1: Carga de factura XML + PDF**
1. ✅ Ve a un evento
2. ✅ Click en pestaña "Ingresos"
3. ✅ Click en "Nuevo Ingreso"
4. ✅ Sube XML + PDF
5. ✅ Click en "Procesar XML + PDF"
6. ✅ Verifica que se llenen los campos automáticamente

**Test 2: Selección de cliente**
1. ✅ Después de procesar XML, selecciona un cliente del dropdown
2. ✅ Verifica que no puedas guardar sin seleccionar cliente
3. ✅ Verifica que aparezca el mensaje de error: "El cliente es obligatorio"

**Test 3: Guardar y verificar en base de datos**
1. ✅ Completa todos los campos (concepto, total, fecha, cliente)
2. ✅ Click en "Guardar"
3. ✅ Abre la consola del navegador (F12)
4. ✅ Busca el log: `📥 [createIncome] Datos a insertar:`
5. ✅ Verifica que los campos CFDI estén presentes

**Test 4: Verificar en Supabase**
1. ✅ Ve a Supabase Dashboard → Table Editor → evt_ingresos
2. ✅ Busca el último registro insertado
3. ✅ Verifica que las columnas CFDI tengan valores
4. ✅ Verifica que cliente_id, cliente, rfc_cliente estén llenos

---

## 📊 RESUMEN DE ARCHIVOS MODIFICADOS

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `Finance.ts` | 1-154 | ✅ Interfaz Income con 21+ campos nuevos |
| `IncomeForm.tsx` | 45-47 | ✅ formData con cliente_id, cliente, rfc_cliente |
| `IncomeForm.tsx` | 104-107 | ✅ Validación cliente obligatorio |
| `financesService.ts` | 40-56 | ✅ Solo filtra 3 campos obsoletos |
| `MIGRACION_INGRESOS_CFDI_COMPLETA.sql` | 1-284 | ✅ SQL completo para agregar columnas |

---

## 🎯 ORDEN DE EJECUCIÓN

```
1. ✅ COMPLETADO: Actualizar Finance.ts
2. ✅ COMPLETADO: Actualizar IncomeForm.tsx (formData + validación)
3. ✅ COMPLETADO: Actualizar financesService.ts
4. ⏳ PENDIENTE: EJECUTAR migración SQL en Supabase
5. ⏳ PENDIENTE: Agregar selector de cliente en IncomeForm.tsx
6. ⏳ PENDIENTE: Probar flujo completo
```

---

## 🚨 NOTAS IMPORTANTES

### ⚠️ **NO ejecutes el código actual sin ejecutar la migración SQL primero**
- El código asume que las columnas existen en la base de datos
- Si guardas sin ejecutar la migración, obtendrás error "column does not exist"

### ⚠️ **El cliente es OBLIGATORIO**
- Sin cliente_id, el formulario no se guardará
- El selector debe estar antes del botón de guardar
- Debe mostrar nombre y RFC del cliente

### ⚠️ **El XML del CFDI es la fuente de verdad**
- Los datos se extraen del XML con `cfdiXmlParser.ts`
- `cfdiToIncomeData()` ya está corregido para ingresos
- Mapea `emisor → proveedor` y `receptor → cliente`

### ⚠️ **Campos obsoletos**
- `cantidad` y `precio_unitario` están obsoletos
- Ahora se usa solo `total` (del XML)
- `subtotal = total / iva_factor`

---

## 📞 SI ALGO FALLA

### Error: "Could not find 'cliente_id' column"
→ **No ejecutaste la migración SQL**. Ve al paso ❗1.

### Error: "El cliente es obligatorio"
→ **Esto está correcto**. Selecciona un cliente del dropdown.

### No aparece el dropdown de clientes
→ **Falta agregar el selector**. Ve al paso ❗2.

### Los campos CFDI no se guardan
→ **Revisa la consola**. Debe aparecer el log `📥 [createIncome] Datos a insertar`.
→ Si aparecen los datos pero no se guardan, verifica la migración SQL.

### El XML no se procesa correctamente
→ **Verifica que sea un CFDI 4.0 válido**.
→ Revisa el log `✅ [processDocuments] Datos CFDI extraídos:` en consola.

---

## ✅ CHECKLIST FINAL

Antes de dar por terminado:

- [ ] ✅ Ejecutar `MIGRACION_INGRESOS_CFDI_COMPLETA.sql` en Supabase
- [ ] ✅ Verificar columnas nuevas con query de verificación
- [ ] ✅ Agregar `import { useClients } from '../../hooks/useClients';`
- [ ] ✅ Agregar hook `const { clients, loading: loadingClients } = useClients();`
- [ ] ✅ Agregar selector de cliente en el HTML
- [ ] ✅ Probar subir XML + PDF
- [ ] ✅ Probar selección de cliente
- [ ] ✅ Probar validación (sin cliente debe fallar)
- [ ] ✅ Probar guardar exitoso
- [ ] ✅ Verificar datos en Supabase Dashboard
- [ ] ✅ Verificar que todos los campos CFDI se guardaron

---

## 🎉 RESULTADO ESPERADO

Después de completar todos los pasos:

1. **Formulario de ingresos**:
   - ✅ Dropdown de clientes (obligatorio)
   - ✅ Campos calculados automáticamente desde XML
   - ✅ Validación funcional
   - ✅ Mensajes de error claros

2. **Base de datos evt_ingresos**:
   - ✅ Misma estructura que evt_gastos
   - ✅ Todos los campos CFDI 4.0
   - ✅ Cliente obligatorio
   - ✅ detalle_compra con productos
   - ✅ Índices y constraints

3. **Vista unificada**:
   - ✅ `vw_movimientos_financieros` combina ingresos y gastos
   - ✅ Reportes unificados posibles

---

**Última actualización**: Jueves 9 de enero 2025
**Estado**: TypeScript y validación completados ✅ | SQL pendiente ⏳ | HTML pendiente ⏳
