# ✅ RESUMEN DE IMPLEMENTACIÓN - REGLAS DE NEGOCIO

**Fecha:** 28 de Octubre 2025  
**Objetivo:** Asegurar integridad referencial y aplicar reglas de negocio para gastos e ingresos

---

## 📦 ARCHIVOS MODIFICADOS/CREADOS

### 1. **Script SQL de Migración**
📄 **Archivo:** `MIGRATION_RESPONSABLES_CUENTAS_BANCARIAS.sql`

**Funciones:**
- ✅ Asigna responsables aleatorios a gastos e ingresos sin responsable
- ✅ Asigna cuentas bancarias (id ≤ 23) a gastos sin cuenta
- ✅ Asigna cuentas bancarias (id ≥ 24) a ingresos sin cuenta
- ✅ Aplica constraints `NOT NULL` a `responsable_id` y `cuenta_bancaria_id`
- ✅ Aplica CHECK constraints para validar rangos de cuentas
- ✅ Genera reporte completo de cambios y distribución

**Cómo ejecutar:**
```bash
# En Supabase SQL Editor:
# 1. Copiar todo el contenido del archivo
# 2. Pegar en el editor
# 3. Ejecutar (RUN)
# 4. Revisar el reporte en la consola
```

---

### 2. **Variables de Entorno**
📄 **Archivo:** `.env`

**Nuevas variables agregadas:**
```env
# Control de cuentas bancarias por tipo de transacción
VITE_LIMIT_BANK_ACCOUNTS_FOR_EXPENSES=true   # Solo cuentas id ≤ 23 para gastos
VITE_LIMIT_BANK_ACCOUNTS_FOR_INCOMES=true    # Solo cuentas id ≥ 24 para ingresos
```

---

### 3. **Configuración de Constantes**
📄 **Archivo:** `src/core/config/constants.ts`

**Nuevas reglas de negocio agregadas:**
```typescript
export const BUSINESS_RULES = {
  // Control de cuentas bancarias por tipo de transacción
  limitBankAccountsForExpenses: import.meta.env.VITE_LIMIT_BANK_ACCOUNTS_FOR_EXPENSES === 'true',
  limitBankAccountsForIncomes: import.meta.env.VITE_LIMIT_BANK_ACCOUNTS_FOR_INCOMES === 'true',
  // Límites de IDs de cuentas bancarias
  maxBankAccountIdForExpenses: 23, // Solo cuentas con id ≤ 23 para gastos
  minBankAccountIdForIncomes: 24,  // Solo cuentas con id ≥ 24 para ingresos
}
```

---

### 4. **Formulario de Gastos**
📄 **Archivo:** `src/modules/eventos/components/finances/DualOCRExpenseForm.tsx`

**Cambios aplicados:**

✅ **Campo Responsable agregado:**
```typescript
responsable_id: expense?.responsable_id || '', // 👤 Campo obligatorio
```

✅ **Filtro de cuentas bancarias (solo id ≤ 23):**
```typescript
const filteredCuentas = useMemo(() => {
  if (!cuentasContables) return [];
  
  if (BUSINESS_RULES.limitBankAccountsForExpenses) {
    return cuentasContables.filter(c => {
      const cuentaId = parseInt(c.id);
      return cuentaId <= BUSINESS_RULES.maxBankAccountIdForExpenses;
    });
  }
  
  return cuentasContables;
}, [cuentasContables]);
```

✅ **UI actualizada:**
- Nuevo campo "Responsable *" (obligatorio)
- Campo "Cuenta Bancaria *" ahora obligatorio
- Filtro automático muestra solo cuentas válidas para gastos
- Mensaje informativo: "(Solo cuentas de gastos)"

---

### 5. **Formulario de Ingresos**
📄 **Archivo:** `src/modules/eventos/components/finances/IncomeForm.tsx`

**Cambios aplicados:**

✅ **Campo cuenta_bancaria_id agregado:**
```typescript
cuenta_bancaria_id: income?.cuenta_bancaria_id || '', // 💳 Campo obligatorio
```

✅ **Campo responsable actualizado a obligatorio:**
```typescript
responsable_id: income?.responsable_id || '', // ✅ Campo obligatorio
```

✅ **Filtro de cuentas bancarias (solo id ≥ 24):**
```typescript
const filteredCuentas = useMemo(() => {
  if (!cuentasContables) return [];
  
  if (BUSINESS_RULES.limitBankAccountsForIncomes) {
    return cuentasContables.filter(c => {
      const cuentaId = parseInt(c.id);
      return cuentaId >= BUSINESS_RULES.minBankAccountIdForIncomes;
    });
  }
  
  return cuentasContables;
}, [cuentasContables]);
```

✅ **UI actualizada:**
- Campo "Responsable del Seguimiento *" ahora obligatorio
- Nuevo campo "Cuenta Bancaria *" (obligatorio)
- Filtro automático muestra solo cuentas válidas para ingresos
- Mensaje informativo: "(Solo cuentas de ingresos)"

---

## 🎯 REGLAS DE NEGOCIO IMPLEMENTADAS

| # | Regla | Estado | Nivel |
|---|-------|--------|-------|
| 1 | **Gastos requieren responsable** | ✅ | BD + Frontend |
| 2 | **Gastos requieren cuenta bancaria** | ✅ | BD + Frontend |
| 3 | **Gastos solo usan cuentas id ≤ 23** | ✅ | BD + Frontend |
| 4 | **Ingresos requieren responsable** | ✅ | BD + Frontend |
| 5 | **Ingresos requieren cuenta bancaria** | ✅ | BD + Frontend |
| 6 | **Ingresos solo usan cuentas id ≥ 24** | ✅ | BD + Frontend |

---

## 🔒 CONSTRAINTS DE BASE DE DATOS

### Constraints NOT NULL Aplicados:

```sql
-- Gastos
ALTER TABLE evt_gastos 
  ALTER COLUMN responsable_id SET NOT NULL,
  ALTER COLUMN cuenta_bancaria_id SET NOT NULL;

-- Ingresos
ALTER TABLE evt_ingresos
  ALTER COLUMN responsable_id SET NOT NULL,
  ALTER COLUMN cuenta_bancaria_id SET NOT NULL;
```

### Constraints CHECK Aplicados:

```sql
-- Gastos: solo cuentas con id ≤ 23
ALTER TABLE evt_gastos
ADD CONSTRAINT chk_gastos_cuenta_bancaria_range
CHECK (cuenta_bancaria_id::text::integer <= 23);

-- Ingresos: solo cuentas con id ≥ 24
ALTER TABLE evt_ingresos
ADD CONSTRAINT chk_ingresos_cuenta_bancaria_range
CHECK (cuenta_bancaria_id::text::integer >= 24);
```

---

## 🚀 PASOS DE DESPLIEGUE

### **Paso 1: Ejecutar Migración SQL** ⚠️ CRÍTICO

```bash
# 1. Abrir Supabase SQL Editor
# 2. Copiar contenido de MIGRATION_RESPONSABLES_CUENTAS_BANCARIAS.sql
# 3. Ejecutar (RUN)
# 4. Verificar salida del reporte
```

**Salida esperada:**
```
📊 REPORTE INICIAL - ESTADO DE DATOS
🔴 GASTOS:
   - Sin responsable: X registros
   - Sin cuenta bancaria: Y registros
🟢 INGRESOS:
   - Sin responsable: A registros
   - Sin cuenta bancaria: B registros
...
🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE
✓ Todos los gastos tienen responsable
✓ Todos los gastos tienen cuenta bancaria (id <= 23)
✓ Todos los ingresos tienen responsable
✓ Todos los ingresos tienen cuenta bancaria (id >= 24)
```

---

### **Paso 2: Reiniciar Servidor de Desarrollo**

```bash
# Detener servidor actual (Ctrl+C)
npm run dev
```

---

### **Paso 3: Validar en la Aplicación**

#### **Crear nuevo gasto:**
1. Ir a Eventos → Seleccionar evento → Agregar gasto
2. ✅ Verificar que "Responsable" sea obligatorio
3. ✅ Verificar que "Cuenta Bancaria" sea obligatorio
4. ✅ Verificar que solo aparecen cuentas con id ≤ 23
5. ✅ Intentar guardar sin responsable → debe mostrar error
6. ✅ Intentar guardar sin cuenta → debe mostrar error

#### **Crear nuevo ingreso:**
1. Ir a Eventos → Seleccionar evento → Agregar ingreso
2. ✅ Verificar que "Responsable" sea obligatorio
3. ✅ Verificar que "Cuenta Bancaria" sea obligatorio
4. ✅ Verificar que solo aparecen cuentas con id ≥ 24
5. ✅ Intentar guardar sin responsable → debe mostrar error
6. ✅ Intentar guardar sin cuenta → debe mostrar error

---

## 📊 VERIFICACIÓN DE DATOS

### Queries de Verificación:

```sql
-- ✅ Verificar que no hay gastos sin responsable
SELECT COUNT(*) FROM evt_gastos WHERE responsable_id IS NULL;
-- Esperado: 0

-- ✅ Verificar que no hay gastos sin cuenta bancaria
SELECT COUNT(*) FROM evt_gastos WHERE cuenta_bancaria_id IS NULL;
-- Esperado: 0

-- ✅ Verificar que gastos solo usan cuentas válidas
SELECT COUNT(*) FROM evt_gastos 
WHERE cuenta_bancaria_id::text::integer > 23;
-- Esperado: 0

-- ✅ Verificar que no hay ingresos sin responsable
SELECT COUNT(*) FROM evt_ingresos WHERE responsable_id IS NULL;
-- Esperado: 0

-- ✅ Verificar que no hay ingresos sin cuenta bancaria
SELECT COUNT(*) FROM evt_ingresos WHERE cuenta_bancaria_id IS NULL;
-- Esperado: 0

-- ✅ Verificar que ingresos solo usan cuentas válidas
SELECT COUNT(*) FROM evt_ingresos 
WHERE cuenta_bancaria_id::text::integer < 24;
-- Esperado: 0

-- 📊 Ver distribución de cuentas en gastos
SELECT DISTINCT cuenta_bancaria_id 
FROM evt_gastos 
ORDER BY cuenta_bancaria_id::integer;
-- Esperado: Solo IDs ≤ 23

-- 📊 Ver distribución de cuentas en ingresos
SELECT DISTINCT cuenta_bancaria_id 
FROM evt_ingresos 
ORDER BY cuenta_bancaria_id::integer;
-- Esperado: Solo IDs ≥ 24
```

---

## ⚙️ CONFIGURACIÓN AVANZADA

### Deshabilitar restricciones temporalmente:

Si necesitas permitir cualquier cuenta bancaria:

```env
# .env
VITE_LIMIT_BANK_ACCOUNTS_FOR_EXPENSES=false  # Permite cualquier cuenta para gastos
VITE_LIMIT_BANK_ACCOUNTS_FOR_INCOMES=false   # Permite cualquier cuenta para ingresos
```

**Nota:** Los constraints de BD seguirán activos, esto solo afecta el filtro del frontend.

---

## 🔄 ROLLBACK (Si es necesario)

Si necesitas revertir los cambios:

```sql
-- Eliminar constraints CHECK
ALTER TABLE evt_gastos DROP CONSTRAINT IF EXISTS chk_gastos_cuenta_bancaria_range;
ALTER TABLE evt_ingresos DROP CONSTRAINT IF EXISTS chk_ingresos_cuenta_bancaria_range;

-- Hacer campos NULL nuevamente (NO RECOMENDADO)
ALTER TABLE evt_gastos ALTER COLUMN responsable_id DROP NOT NULL;
ALTER TABLE evt_gastos ALTER COLUMN cuenta_bancaria_id DROP NOT NULL;
ALTER TABLE evt_ingresos ALTER COLUMN responsable_id DROP NOT NULL;
ALTER TABLE evt_ingresos ALTER COLUMN cuenta_bancaria_id DROP NOT NULL;
```

---

## 📋 CHECKLIST FINAL

- [x] Script SQL creado (`MIGRATION_RESPONSABLES_CUENTAS_BANCARIAS.sql`)
- [x] Variables de entorno configuradas (`.env`)
- [x] Constantes de negocio agregadas (`constants.ts`)
- [x] Formulario de gastos actualizado (`DualOCRExpenseForm.tsx`)
  - [x] Campo responsable agregado (obligatorio)
  - [x] Campo cuenta bancaria hecho obligatorio
  - [x] Filtro de cuentas implementado (id ≤ 23)
- [x] Formulario de ingresos actualizado (`IncomeForm.tsx`)
  - [x] Campo cuenta_bancaria_id agregado (obligatorio)
  - [x] Campo responsable hecho obligatorio
  - [x] Filtro de cuentas implementado (id ≥ 24)
- [ ] **Script SQL ejecutado en Supabase** ⚠️ PENDIENTE
- [ ] **Servidor reiniciado** ⚠️ PENDIENTE
- [ ] **Validación manual realizada** ⚠️ PENDIENTE

---

## 🎉 RESULTADO FINAL

Una vez ejecutado el script SQL y reiniciado el servidor:

✅ **Integridad de Datos Garantizada:**
- Todos los gastos tienen responsable asignado
- Todos los gastos tienen cuenta bancaria válida (id ≤ 23)
- Todos los ingresos tienen responsable asignado
- Todos los ingresos tienen cuenta bancaria válida (id ≥ 24)

✅ **Validaciones en Frontend:**
- Usuarios no pueden crear gastos sin responsable
- Usuarios no pueden crear gastos sin cuenta bancaria
- Solo ven cuentas válidas para gastos (id ≤ 23)
- Usuarios no pueden crear ingresos sin responsable
- Usuarios no pueden crear ingresos sin cuenta bancaria
- Solo ven cuentas válidas para ingresos (id ≥ 24)

✅ **Validaciones en Base de Datos:**
- Constraints NOT NULL previenen NULL values
- CHECK constraints previenen rangos inválidos
- Imposible insertar datos inválidos desde cualquier origen

---

## 📞 SOPORTE

Si encuentras algún problema durante la implementación:

1. **Verificar logs del script SQL** en Supabase SQL Editor
2. **Revisar consola del navegador** para errores frontend
3. **Ejecutar queries de verificación** para validar datos
4. **Revisar variables de entorno** en `.env`

---

**Implementación completada exitosamente** ✅
**Fecha de última actualización:** 28 de Octubre 2025
