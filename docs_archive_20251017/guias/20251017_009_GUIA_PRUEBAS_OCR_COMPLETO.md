# 🧪 GUÍA DE PRUEBAS - MÓDULO OCR CON INFORMACIÓN COMPLETA DEL ESTABLECIMIENTO

**Fecha**: 12 de Octubre, 2025
**Versión**: 2.0 - Información Completa del Establecimiento
**Puerto**: http://localhost:5174

---

## 📋 RESUMEN DE IMPLEMENTACIONES

### ✅ Características Implementadas:

1. **Corrección de errores críticos**:
   - ✅ Campo `tipo_comprobante` agregado (elimina error de constraint)
   - ✅ Total del OCR preservado (ya no se recalcula a 0)
   - ✅ Extracción de productos multi-línea funcionando

2. **Visualización mejorada de productos**:
   - ✅ Formato legible: `1. 1 x PRODUCTO - $150.00 = $150.00`
   - ✅ Conversión automática a JSONB para la base de datos
   - ✅ Textarea expandido (8 filas)

3. **Campos SAT completos**:
   - ✅ UUID CFDI, Serie, Folio, Folio Fiscal
   - ✅ Método de Pago SAT (PUE/PPD)
   - ✅ Forma de Pago SAT (01-99)
   - ✅ Uso CFDI (G01, G02, G03, P01)
   - ✅ Régimen Fiscal Receptor
   - ✅ Lugar de Expedición (CP)
   - ✅ Moneda y Tipo de Cambio

4. **Información completa del establecimiento** (NUEVO):
   - ✅ Teléfono del establecimiento
   - ✅ Email del establecimiento
   - ✅ Dirección completa
   - ✅ Información general (sucursal, horario, etc.)

---

## 🎯 CASOS DE PRUEBA

### **Caso 1: Ticket Simple (OXXO/Tienda)**

**Objetivo**: Verificar extracción básica sin productos

**Pasos**:
1. Navegar a un evento
2. Ir a la pestaña "Finanzas" → "Gastos"
3. Subir imagen de ticket de OXXO (imagen ya usada anteriormente)
4. Verificar campos autocompletados

**Resultados esperados**:
- ✅ Proveedor: OXXO
- ✅ Total: $136.50
- ✅ RFC detectado (si existe)
- ✅ Fecha extraída correctamente
- ✅ Tipo de comprobante: I (Ingreso)

**Verificación**:
```javascript
// En la consola del navegador:
console.log('Proveedor:', formData.proveedor);
console.log('Total:', formData.total);
console.log('Tipo comprobante:', formData.tipo_comprobante);
```

---

### **Caso 2: Ticket con Productos Multi-línea (Tortas Gigantes)**

**Objetivo**: Verificar extracción de 10 productos en formato multi-línea

**Pasos**:
1. Subir la imagen del ticket de Tortas Gigantes usado anteriormente
2. Esperar a que OCR procese (95% confianza)
3. Verificar campo "Detalle de Compra"

**Resultados esperados**:
```
1. 1 x P.H. / QLLO - $150.00 = $150.00
2. 1 x TRIPA - $100.00 = $100.00
3. 1 x LENGUA - $74.00 = $74.00
4. 1 x JAMAICA CHI - $44.00 = $44.00
5. 1 x SUNDAE FRESA - $40.00 = $40.00
6. 1 x FLURRY OREO - $50.00 = $50.00
7. 1 x BOHEMIA OBSCURA - $61.00 = $61.00
8. 1 x TECATE - $55.00 = $55.00
9. 1 x BOHEMIA OBSCURA - $61.00 = $61.00
10. 1 x TECATE - $55.00 = $55.00
```

**Información del establecimiento esperada**:
- ✅ Proveedor: TORTAS GIGANTES SUR 1Z
- ✅ RFC: NAVB801231JG9
- ✅ Teléfono: (extraído si aparece en el ticket)
- ✅ Dirección: CALZ LAS BOMBAS 740, COYOACAN, CDMX CP 04950
- ✅ Total: $895.00 (NO $0.00)

**Consola del navegador debe mostrar**:
```
🛒 Producto #1: P.H. / QLLO - $150.00
🛒 Producto #2: TRIPA - $100.00
...
🛒 Producto #10: TECATE - $55.00
🎯 RESULTADO FINAL: 10 productos extraídos
✅ Total seleccionado: 895
```

---

### **Caso 3: Factura CFDI (Si tienes una)**

**Objetivo**: Verificar extracción de campos SAT completos

**Pasos**:
1. Subir una factura CFDI en PDF o imagen
2. Verificar la sección "Datos Fiscales SAT (CFDI)"

**Resultados esperados**:
- ✅ UUID CFDI: (36 caracteres formato 8-4-4-4-12)
- ✅ Serie y Folio
- ✅ Tipo de Comprobante: I (por defecto)
- ✅ Método de Pago SAT: PUE o PPD
- ✅ Forma de Pago SAT: 01-99
- ✅ Uso CFDI: G01, G02, G03, P01
- ✅ Lugar de Expedición: Código postal de 5 dígitos
- ✅ Moneda: MXN (por defecto)

---

### **Caso 4: Ticket con Información Completa del Establecimiento**

**Objetivo**: Verificar extracción de teléfono, email, dirección, sucursal

**Pasos**:
1. Subir un ticket que contenga:
   - Teléfono de 10 dígitos
   - Email del establecimiento
   - Dirección completa
   - Información de sucursal
   - Horario de atención

**Ejemplo de ticket ideal**:
```
ESTABLECIMIENTO XYZ
RFC: ABC123456789
CALZ REFORMA 123, COL CENTRO
MEXICO, CDMX CP 06000
TEL: 5555551234
Email: contacto@establecimiento.com
Sucursal: Centro
Horario: 9:00 AM - 10:00 PM

1 PRODUCTO A          $100.00
2 PRODUCTO B          $50.00
                 TOTAL: $150.00
```

**Resultados esperados**:
- ✅ Proveedor: ESTABLECIMIENTO XYZ
- ✅ RFC: ABC123456789
- ✅ **Teléfono**: 5555551234
- ✅ **Email**: contacto@establecimiento.com
- ✅ **Dirección**: CALZ REFORMA 123, COL CENTRO, MEXICO, CDMX CP 06000
- ✅ **Info General**: Sucursal: Centro | Horario: 9:00 AM - 10:00 PM
- ✅ Productos: 2 productos extraídos
- ✅ Total: $150.00

---

### **Caso 5: Guardar en Base de Datos**

**Objetivo**: Verificar que TODO se guarda correctamente

**Pasos**:
1. Completar el formulario con datos del OCR
2. Hacer clic en "Guardar Gasto"
3. Verificar mensaje de éxito
4. Recargar la página
5. Buscar el gasto recién creado

**Verificaciones**:

**En la consola del navegador**:
```javascript
// Debe mostrar:
✅ Usando total del OCR: 895
📦 Detalle compra final (JSONB): [{"descripcion":"P.H. / QLLO", ...}]
✅ Gasto guardado exitosamente
```

**En Supabase Studio** (https://gomnouwackzvthpwyric.supabase.co):
```sql
SELECT 
  proveedor,
  rfc_proveedor,
  telefono_proveedor,
  email_proveedor,
  direccion_proveedor,
  establecimiento_info,
  total,
  tipo_comprobante,
  detalle_compra,
  jsonb_array_length(detalle_compra) as num_productos
FROM evt_gastos
WHERE id = (SELECT MAX(id) FROM evt_gastos)
```

**Resultados esperados**:
- ✅ Todos los campos poblados
- ✅ `tipo_comprobante` = 'I'
- ✅ `total` = 895.00 (NO 0)
- ✅ `detalle_compra` tiene 10 elementos JSON
- ✅ `num_productos` = 10

---

## 🐛 ERRORES CONOCIDOS Y SOLUCIONES

### Error 1: "check_tipo_comprobante constraint violation"

**Causa**: Campo `tipo_comprobante` es null o inválido

**Solución implementada**: 
- ✅ Valor por defecto 'I' en formData
- ✅ Dropdown con valores SAT válidos
- ✅ Migración actualizada con constraint

**Verificación**:
```sql
-- Debe retornar solo: I, E, T, N, P
SELECT DISTINCT tipo_comprobante FROM evt_gastos;
```

---

### Error 2: Total aparece como $0.00

**Causa**: financesService recalculaba el total

**Solución implementada**:
```typescript
// Ahora preserva el total del OCR
if (hasProvidedTotal) {
  total = expenseData.total!;
  // No recalcula
}
```

**Verificación en consola**:
```
✅ Usando total del OCR: 895
```

---

### Error 3: Productos no se extraen

**Causa**: Formato multi-línea no detectado

**Solución implementada**:
- ✅ MÉTODO 3: Detecta descripción en línea N y precio en línea N+1
- ✅ Validaciones mejoradas
- ✅ Logs detallados

**Verificación en consola**:
```
🔍 MULTI-LÍNEA detectada en líneas 16-17:
   Línea 16: "1 P.H. / QLLO"
   Línea 17: "$150.00" → Precio: 150
✅ Producto MULTI-LÍNEA 1 agregado
```

---

## 📊 VERIFICACIÓN DE DATOS EN BASE DE DATOS

### Query 1: Verificar último gasto con toda la información

```sql
SELECT 
  g.id,
  g.concepto,
  g.proveedor,
  g.rfc_proveedor,
  g.telefono_proveedor,
  g.email_proveedor,
  g.direccion_proveedor,
  g.establecimiento_info,
  g.total,
  g.tipo_comprobante,
  g.forma_pago_sat,
  g.metodo_pago_sat,
  jsonb_array_length(g.detalle_compra) as num_productos,
  g.detalle_compra,
  g.created_at
FROM evt_gastos g
ORDER BY g.created_at DESC
LIMIT 1;
```

### Query 2: Estadísticas de gastos con productos

```sql
SELECT 
  COUNT(*) as total_gastos,
  COUNT(detalle_compra) as gastos_con_productos,
  SUM(jsonb_array_length(detalle_compra)) as total_productos_registrados,
  AVG(total) as promedio_gasto
FROM evt_gastos
WHERE activo = true;
```

### Query 3: Gastos con información completa del establecimiento

```sql
SELECT 
  proveedor,
  rfc_proveedor,
  telefono_proveedor,
  email_proveedor,
  direccion_proveedor,
  COUNT(*) as num_compras,
  SUM(total) as total_gastado
FROM evt_gastos
WHERE activo = true
  AND telefono_proveedor IS NOT NULL
  AND direccion_proveedor IS NOT NULL
GROUP BY proveedor, rfc_proveedor, telefono_proveedor, 
         email_proveedor, direccion_proveedor
ORDER BY total_gastado DESC;
```

---

## ✅ CHECKLIST DE PRUEBAS COMPLETO

### Funcionalidad Básica:
- [ ] OCR procesa imagen correctamente (>90% confianza)
- [ ] Proveedor se extrae del ticket
- [ ] RFC se detecta correctamente
- [ ] Total se extrae sin recalcular a 0
- [ ] Fecha se formatea correctamente (YYYY-MM-DD)

### Productos:
- [ ] Productos multi-línea se extraen (10/10)
- [ ] Formato legible en textarea
- [ ] JSONB se guarda en base de datos
- [ ] Cantidad y precios correctos

### Información del Establecimiento (NUEVO):
- [ ] Teléfono se extrae (10 dígitos)
- [ ] Email se detecta correctamente
- [ ] Dirección completa se captura
- [ ] Sucursal se identifica
- [ ] Horario se extrae
- [ ] Info general se combina correctamente

### Campos SAT:
- [ ] Tipo de comprobante por defecto 'I'
- [ ] UUID CFDI se detecta (si existe)
- [ ] Serie y folio se extraen
- [ ] Método de pago SAT (PUE/PPD)
- [ ] Forma de pago SAT (01-99)
- [ ] Uso CFDI se selecciona
- [ ] Lugar de expedición (CP)

### Guardado:
- [ ] No hay errores de constraint
- [ ] Total se guarda correctamente
- [ ] Productos en JSONB válido
- [ ] Todos los campos del establecimiento guardados
- [ ] Mensaje de éxito aparece
- [ ] Gasto aparece en la lista

### Consola del Navegador:
- [ ] No hay errores rojos
- [ ] Logs de productos visibles
- [ ] "✅ Gasto guardado exitosamente"
- [ ] "✅ Usando total del OCR: XXX"

---

## 🎯 RESULTADOS ESPERADOS FINALES

Al subir el ticket de **Tortas Gigantes**:

```
✅ Proveedor: TORTAS GIGANTES SUR 1Z
✅ RFC: NAVB801231JG9
✅ Teléfono: (si aparece en ticket)
✅ Dirección: CALZ LAS BOMBAS 740, COYOACAN, CDMX CP 04950
✅ Email: (si aparece en ticket)
✅ Info General: Sucursal: CALZ LAS BOMBAS 740 HUIXILA
✅ Total: $895.00
✅ Productos: 10 productos
✅ Tipo Comprobante: I
✅ Guardado: ✅ SIN ERRORES
```

**Consola**:
```
📦 DETALLE DE TODOS LOS PRODUCTOS EXTRAÍDOS:
🛒 Producto #1: P.H. / QLLO
🛒 Producto #2: TRIPA
...
🛒 Producto #10: TECATE
🎯 RESULTADO FINAL: 10 productos extraídos
✅ Gasto guardado exitosamente
```

---

## 📞 SOPORTE

Si alguna prueba falla:

1. Verificar consola del navegador (F12)
2. Revisar Network tab para errores de Supabase
3. Verificar que la migración se ejecutó:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'evt_gastos' 
   AND column_name IN ('telefono_proveedor', 'direccion_proveedor', 
                       'email_proveedor', 'establecimiento_info', 
                       'detalle_compra', 'tipo_comprobante');
   ```

**Fecha de última actualización**: 12 de Octubre, 2025
**Versión**: 2.0 - Información Completa del Establecimiento
