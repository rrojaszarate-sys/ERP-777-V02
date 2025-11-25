# 🔄 Corrección: Cuentas Bancarias → Cuentas Contables

**Fecha:** 28 de Octubre de 2025  
**Autor:** Sistema ERP-777

---

## 📋 Problema Identificado

Se detectó que en el código existía una confusión entre dos conceptos:
- ❌ **evt_cuentas_bancarias** (tabla incorrecta creada por error)
- ✅ **evt_cuentas_contables** (tabla correcta del sistema)

---

## 🔧 Cambios Realizados

### 1. **Script SQL de Migración** ✅
**Archivo:** `MIGRATION_AGREGAR_RESPONSABLE_CUENTA_BANCARIA.sql`

#### Cambios aplicados:
- ✅ Reemplazado `evt_cuentas_bancarias` → `evt_cuentas_contables`
- ✅ Reemplazado `cuenta_bancaria_id` → `cuenta_contable_id`
- ✅ Actualizado título del script
- ✅ Actualizados comentarios y mensajes

#### Estructura del script:
```sql
-- PARTE 1: Verificación inicial
-- PARTE 2: Agregar columna responsable_id a evt_gastos
-- PARTE 3: Agregar columna responsable_id a evt_ingresos
-- PARTE 4: Asignar valores por defecto a gastos
-- PARTE 5: Asignar valores por defecto a ingresos
-- PARTE 6: Aplicar constraints NOT NULL
-- PARTE 7: Crear CHECK constraints (reglas de negocio)
-- PARTE 8: Crear índices para rendimiento
-- PARTE 9: Verificación final
-- PARTE 10: Reporte de distribución
```

#### Campos agregados:
```sql
-- evt_gastos
ALTER TABLE evt_gastos ADD COLUMN responsable_id UUID REFERENCES auth.users(id);
ALTER TABLE evt_gastos ADD COLUMN cuenta_contable_id UUID REFERENCES evt_cuentas_contables(id);

-- evt_ingresos
ALTER TABLE evt_ingresos ADD COLUMN responsable_id UUID REFERENCES auth.users(id);
ALTER TABLE evt_ingresos ADD COLUMN cuenta_contable_id UUID REFERENCES evt_cuentas_contables(id);
```

#### Constraints aplicados:
```sql
-- NOT NULL
ALTER TABLE evt_gastos ALTER COLUMN responsable_id SET NOT NULL;
ALTER TABLE evt_gastos ALTER COLUMN cuenta_contable_id SET NOT NULL;
ALTER TABLE evt_ingresos ALTER COLUMN responsable_id SET NOT NULL;
ALTER TABLE evt_ingresos ALTER COLUMN cuenta_contable_id SET NOT NULL;

-- CHECK (Reglas de negocio)
ALTER TABLE evt_gastos 
  ADD CONSTRAINT chk_gastos_cuenta_contable_range 
  CHECK (cuenta_contable_id::text::integer <= 23);

ALTER TABLE evt_ingresos 
  ADD CONSTRAINT chk_ingresos_cuenta_contable_range 
  CHECK (cuenta_contable_id::text::integer >= 24);
```

---

### 2. **Formulario de Ingresos (IncomeForm.tsx)** ✅
**Archivo:** `src/modules/eventos/components/finances/IncomeForm.tsx`

#### Cambios aplicados:
```typescript
// ANTES:
cuenta_bancaria_id: income?.cuenta_bancaria_id || '', // ❌ INCORRECTO

// DESPUÉS:
cuenta_contable_id: income?.cuenta_contable_id || '', // ✅ CORRECTO
```

```tsx
// ANTES:
<label>Cuenta Bancaria *</label>
<select value={formData.cuenta_bancaria_id} ... >

// DESPUÉS:
<label>Cuenta Contable *</label>
<select value={formData.cuenta_contable_id} ... >
```

---

## 📊 Reglas de Negocio Implementadas

### **Segregación de Cuentas Contables**

| Tipo de Transacción | Rango de Cuentas | Constraint |
|---------------------|------------------|------------|
| **Gastos** | id ≤ 23 | `chk_gastos_cuenta_contable_range` |
| **Ingresos** | id ≥ 24 | `chk_ingresos_cuenta_contable_range` |

### **Campos Obligatorios**

| Tabla | Campos Obligatorios (NOT NULL) |
|-------|-------------------------------|
| `evt_gastos` | `responsable_id`, `cuenta_contable_id` |
| `evt_ingresos` | `responsable_id`, `cuenta_contable_id` |

---

## 🚀 Instrucciones de Ejecución

### **Paso 1: Ejecutar Script SQL**
1. Abrir Supabase SQL Editor
2. Copiar TODO el contenido de `MIGRATION_AGREGAR_RESPONSABLE_CUENTA_BANCARIA.sql`
3. Pegar en SQL Editor
4. Click en **RUN**

### **Paso 2: Verificar Resultados**
Ejecutar las siguientes consultas para verificar:

```sql
-- Verificar que no haya registros sin responsable
SELECT COUNT(*) FROM evt_gastos WHERE responsable_id IS NULL;  -- debe ser 0
SELECT COUNT(*) FROM evt_ingresos WHERE responsable_id IS NULL;  -- debe ser 0

-- Verificar que no haya registros sin cuenta contable
SELECT COUNT(*) FROM evt_gastos WHERE cuenta_contable_id IS NULL;  -- debe ser 0
SELECT COUNT(*) FROM evt_ingresos WHERE cuenta_contable_id IS NULL;  -- debe ser 0

-- Verificar reglas de negocio
SELECT COUNT(*) FROM evt_gastos WHERE cuenta_contable_id::text::integer > 23;  -- debe ser 0
SELECT COUNT(*) FROM evt_ingresos WHERE cuenta_contable_id::text::integer < 24;  -- debe ser 0
```

### **Paso 3: Reiniciar Servidor de Desarrollo**
```bash
# Detener servidor actual (Ctrl+C)
npm run dev
```

---

## ✅ Estado de la Corrección

### **Archivos Modificados:**
- ✅ `MIGRATION_AGREGAR_RESPONSABLE_CUENTA_BANCARIA.sql` (corregido completamente)
- ✅ `src/modules/eventos/components/finances/IncomeForm.tsx` (corregido)
- ⏳ `src/modules/eventos/components/finances/DualOCRExpenseForm.tsx` (pendiente - revisar si usa cuenta_bancaria_id)

### **Archivos NO Modificados (código correcto):**
- ✅ `src/modules/eventos/services/accountsService.ts` (ya usa evt_cuentas_contables)
- ✅ `src/modules/eventos/hooks/useCuentasContables.ts` (ya usa evt_cuentas_contables)
- ✅ `src/modules/admin/components/CuentasContablesAdmin.tsx` (ya usa evt_cuentas_contables)

### **Archivos a Ignorar/Deprecar:**
- 🗑️ `FIX_PRUEBAS_PENDIENTES.sql` (archivo antiguo con referencia a evt_cuentas_bancarias)
- 🗑️ `verificar_categorias.sql` (archivo de verificación antiguo)
- 🗑️ `MIGRATION_RESPONSABLES_CUENTAS_BANCARIAS.sql` (reemplazado por el nuevo script)

---

## 📝 Notas Importantes

1. **La tabla `evt_cuentas_bancarias` NO EXISTE en la base de datos actual**
   - Era una referencia incorrecta en archivos SQL antiguos
   - El sistema siempre ha usado `evt_cuentas_contables`

2. **El código TypeScript ya era correcto**
   - Todos los servicios y hooks usan `evt_cuentas_contables`
   - Solo los archivos SQL tenían referencias incorrectas

3. **La migración es segura**
   - El script crea columnas nuevas (`responsable_id`, `cuenta_contable_id`)
   - No modifica datos existentes (solo los completa si faltan)
   - Usa transacciones para evitar inconsistencias

4. **Variables de entorno necesarias**
   - Ya están configuradas en `.env`:
     ```env
     VITE_LIMIT_BANK_ACCOUNTS_FOR_EXPENSES=true
     VITE_LIMIT_BANK_ACCOUNTS_FOR_INCOMES=true
     ```

---

## 🎯 Próximos Pasos

1. ✅ **Ejecutar script SQL en Supabase**
2. ✅ **Verificar con queries de validación**
3. ✅ **Reiniciar servidor de desarrollo**
4. ⏳ **Probar formularios de gastos e ingresos**
5. ⏳ **Verificar que los dropdowns muestren solo cuentas válidas**

---

## 🆘 Troubleshooting

### Error: "column responsable_id does not exist"
**Causa:** El script no se ejecutó correctamente  
**Solución:** Ejecutar el script SQL completo en Supabase

### Error: "relation evt_cuentas_bancarias does not exist"
**Causa:** Referencia antigua a tabla incorrecta  
**Solución:** Usar el nuevo script (ya corregido)

### Error: "violates check constraint chk_gastos_cuenta_contable_range"
**Causa:** Intentando asignar cuenta de ingresos (id ≥ 24) a un gasto  
**Solución:** Seleccionar una cuenta con id ≤ 23

### Error: "violates check constraint chk_ingresos_cuenta_contable_range"
**Causa:** Intentando asignar cuenta de gastos (id ≤ 23) a un ingreso  
**Solución:** Seleccionar una cuenta con id ≥ 24

---

## 📚 Referencias

- **Tabla correcta:** `evt_cuentas_contables`
- **Campos agregados:** `responsable_id`, `cuenta_contable_id`
- **Constraints:** NOT NULL + CHECK (rangos de cuentas)
- **Business Rules:** Definidos en `src/core/config/constants.ts`

---

**Última actualización:** 28 de Octubre de 2025 - 18:30
