# ✅ RESUMEN: Ingresos con Campos CFDI Completos

## 🎯 ¿Qué se hizo?

Se actualizó el sistema para que **evt_ingresos** pueda guardar TODOS los campos de una factura CFDI 4.0, igual que evt_gastos.

---

## ✅ COMPLETADO

1. **TypeScript actualizado** → Interface `Income` ahora tiene 21+ campos nuevos (CFDI + cliente)
2. **Validación del formulario** → Cliente es OBLIGATORIO
3. **Servicio de guardado** → Solo filtra 3 campos obsoletos (cantidad, precio_unitario, fecha_gasto)
4. **SQL migration creado** → 284 líneas con todas las columnas, constraints, índices

---

## ⚠️ PENDIENTE (DEBES HACER TÚ)

### 1️⃣ EJECUTAR LA MIGRACIÓN SQL ⚠️ CRÍTICO

```bash
# Conéctate a Supabase y ejecuta:
\i MIGRACION_INGRESOS_CFDI_COMPLETA.sql
```

O copia el contenido de `MIGRACION_INGRESOS_CFDI_COMPLETA.sql` en el SQL Editor de Supabase.

**SIN ESTO, EL SISTEMA NO FUNCIONARÁ** ⚠️

---

### 2️⃣ AGREGAR SELECTOR DE CLIENTE AL FORMULARIO

📄 **Archivo**: `src/modules/eventos/components/finances/IncomeForm.tsx`

**Paso A**: Importar hook (línea ~6)
```typescript
import { useClients } from '../../hooks/useClients';
```

**Paso B**: Usar hook (línea ~60)
```typescript
const { clients, loading: loadingClients } = useClients();
```

**Paso C**: Agregar dropdown ANTES del selector de Responsable (línea ~570)

```tsx
{/* Cliente */}
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
    className={`w-full px-4 py-3 border rounded-lg ${
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
</div>
```

---

### 3️⃣ PROBAR

1. ✅ Ejecuta la migración SQL
2. ✅ Agrega el selector de cliente
3. ✅ Reinicia el servidor (`npm run dev`)
4. ✅ Ve a un evento → Ingresos → Nuevo Ingreso
5. ✅ Sube XML + PDF → Click "Procesar"
6. ✅ Selecciona un cliente (obligatorio)
7. ✅ Click "Guardar"
8. ✅ Verifica en Supabase que se guardaron todos los campos CFDI

---

## 📄 Documentación Completa

Lee `INSTRUCCIONES_FINALES_INGRESOS.md` para:
- Detalles de cada cambio
- Troubleshooting
- Checklist completo
- Verificaciones SQL

---

**Estado Actual**:
- ✅ TypeScript actualizado
- ✅ Validación actualizada  
- ✅ SQL migration creado
- ⏳ Migración pendiente de ejecutar
- ⏳ HTML pendiente de actualizar
