# 🧪 TEST MANUAL: Módulo de Ingresos

## ✅ FIX APLICADO

### Problema Resuelto:
**Error:** `invalid input syntax for type date: ""`

**Causa:** El formulario enviaba strings vacíos (`""`) en campos de fecha, y PostgreSQL solo acepta `null` o fechas válidas.

**Solución:** Convertir strings vacíos a `null` antes de insertar.

---

## 📋 PRUEBAS A REALIZAR

### 1. PRUEBA BÁSICA (Sin XML)

1. Ve a un evento
2. Click en "Ingresos"
3. Click "Nuevo Ingreso"
4. **Llena SOLO los campos mínimos:**
   - Concepto: "Prueba Manual"
   - Total: 1000
   - Cliente: Selecciona un cliente
5. **NO subas XML ni PDF aún**
6. Click "Crear Ingreso"
7. **Resultado esperado:** Error que dice "La factura PDF es obligatoria"

### 2. PRUEBA CON XML + PDF

1. Click "Nuevo Ingreso"
2. **Arrastra el XML:** `20255200238260Factura.xml`
3. **Arrastra el PDF:** `20255200238260Factura.pdf`
4. **Click "Procesar XML + PDF"**
5. **Verifica que se auto-llenen:**
   - ✓ Concepto
   - ✓ Total, Subtotal, IVA
   - ✓ UUID, Serie, Folio
   - ✓ Proveedor (SAMSUNG)
   - ✓ RFC Proveedor
6. **Selecciona un Cliente**
7. **Click "Crear Ingreso"**
8. **Resultado esperado:** ✅ Sin errores, ingreso creado

### 3. VERIFICAR EN CONSOLA

Después de crear, verifica en la consola del navegador (F12):

```
✅ Deberías ver:
📥 [createIncome] Datos recibidos: {...}
📅 [createIncome] Fechas validadas: {fecha_facturacion: "2025-04-21", ...}
✅ [createIncome] Ingreso creado exitosamente: {...}

❌ NO deberías ver:
invalid input syntax for type date
Error 400
PGRST204 (campo no encontrado)
```

---

## 🔍 SI AÚN FALLA

### Verifica que ejecutaste la migración SQL:

En Supabase SQL Editor:

```sql
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'evt_ingresos'
  AND column_name IN ('proveedor', 'rfc_proveedor', 'cliente', 'rfc_cliente');
```

**Debe retornar 4 filas**. Si no, ejecuta `FIX_INGRESOS_FINAL.sql` de nuevo.

### Limpia el cache del navegador:

1. F12 → Application → Clear Storage
2. F5 (recargar página)

---

## ✅ CHECKLIST FINAL

- [ ] Migración SQL ejecutada en Supabase
- [ ] Servidor reiniciado (`npm run dev`)
- [ ] Cache del navegador limpiado
- [ ] Página recargada (F5)
- [ ] Prueba 1: Error correcto de "PDF obligatorio"
- [ ] Prueba 2: XML + PDF carga y guarda correctamente
- [ ] Sin error 400 en consola
- [ ] Sin error "invalid input syntax for type date"
- [ ] Ingreso aparece en la lista

---

**Marca cada checkbox cuando lo completes** ✅
