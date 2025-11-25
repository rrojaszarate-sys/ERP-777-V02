# 🔧 DEBUG: Problema al Guardar Gastos en Módulo de Eventos

## 📋 Problema Reportado
- **Síntoma**: Al intentar guardar un gasto, no se guarda y NO aparece nada en consola
- **Módulo afectado**: Eventos → Gastos → Nuevo Gasto con OCR Dual
- **Componente**: `DualOCRExpenseForm.tsx`

## ✅ Mejoras Implementadas

### 1. **Logging Mejorado en Todo el Flujo**

Se agregaron logs detallados en 3 capas:

#### **Capa 1: Formulario (`DualOCRExpenseForm.tsx`)**
```typescript
// Al hacer submit del formulario:
console.log('📤 [DualOCRExpenseForm] Enviando datos a onSave...');
console.log('📋 [DualOCRExpenseForm] Todos los datos a enviar:', JSON.stringify(dataToSend, null, 2));

// Al ejecutar onSave:
console.log('✅ [DualOCRExpenseForm] onSave ejecutado correctamente');

// Si hay error:
console.error('❌ [DualOCRExpenseForm] Error al llamar onSave:', error);
console.error('❌ [DualOCRExpenseForm] Stack:', error instanceof Error ? error.stack : 'N/A');
```

#### **Capa 2: Componente Padre (`ExpenseTab.tsx`)**
```typescript
// Al recibir onSave:
console.log('📤 [ExpenseTab] onSave llamado con datos:', data);

// Al crear gasto nuevo:
console.log('➕ [ExpenseTab] Creando nuevo gasto');
createExpense({ ...data, evento_id: eventId });

// Si hay error:
console.error('❌ [ExpenseTab] Error en onSave:', error);
```

#### **Capa 3: Hook de React Query (`useFinances.ts`)**
```typescript
// Al iniciar mutación:
console.log('🚀 [useExpenses] Iniciando creación de gasto con datos:', expenseData);

// Al completar con éxito:
console.log('✅ [useExpenses] Gasto creado exitosamente:', data);
toast.success('✅ Gasto guardado correctamente');

// Al fallar:
console.error('❌ [useExpenses] Error al crear gasto:', error);
console.error('❌ [useExpenses] Error.message:', error?.message);
console.error('❌ [useExpenses] Error completo:', error);
toast.error(`❌ Error al guardar: ${errorMessage}`);
```

#### **Capa 4: Servicio (`financesService.ts`)**
```typescript
// Al iniciar inserción:
console.log('🚀 [financesService.createExpense] Iniciando creación de gasto');
console.log('📋 [financesService] Datos recibidos:', expenseData);

// Antes de insertar en BD:
console.log('📤 [financesService] Datos a insertar en BD:', dataToInsert);

// Al completar:
console.log('✅ [financesService] Gasto creado exitosamente:', data);

// Si hay error:
console.error('❌ [financesService] Error de Supabase:', error);
console.error('❌ [financesService] Error creating expense:', error);
```

### 2. **Validación y Limpieza de Datos**

El servicio ahora limpia campos que no existen en la base de datos:
```typescript
const camposAEliminar = [
  '_detalle_compra_json',
  'direccion_proveedor',
  'email_proveedor',
  'uso_cfdi',
  'regimen_fiscal_receptor',
  'establecimiento_info',
  'folio',
  'regimen_fiscal'
];
```

Y convierte campos vacíos a `null` para evitar errores de tipo:
```typescript
// Convertir "" → null para campos numéricos
const camposNumericos = ['categoria_id', 'cantidad', 'precio_unitario', 'subtotal', 'iva', 'total', 'tipo_cambio'];
```

### 3. **Mensajes Toast de Feedback**

- **Éxito**: `✅ Gasto guardado correctamente`
- **Error**: `❌ Error al guardar: [mensaje de error detallado]`

## 🧪 Cómo Probar y Diagnosticar

### **Paso 1: Abrir la Consola del Navegador**
1. Presiona **F12** (o **Cmd+Option+I** en Mac)
2. Ve a la pestaña **Console**
3. Limpia la consola (botón 🚫 o **Ctrl+L**)

### **Paso 2: Navegar al Formulario de Gastos**
1. Abre http://localhost:5173
2. Ve a **Eventos** → Selecciona un evento
3. Pestaña **Gastos**
4. Click en **Nuevo Gasto OCR Dual**

### **Paso 3: Llenar el Formulario Mínimo**
```
Concepto: "Prueba de guardado"
Total: 100
```
> **Nota**: NO es necesario llenar todos los campos. 
> `categoria_id` puede quedar vacío (se convierte a NULL automáticamente)

### **Paso 4: Hacer Click en "Guardar Gasto"**

### **Paso 5: Observar la Consola**

#### **✅ Flujo Exitoso (Deberías ver esto):**
```
📤 [DualOCRExpenseForm] Enviando datos a onSave...
📋 [DualOCRExpenseForm] Todos los datos a enviar: {...}
✅ [DualOCRExpenseForm] onSave ejecutado correctamente
📤 [ExpenseTab] onSave llamado con datos: {...}
➕ [ExpenseTab] Creando nuevo gasto
🚀 [useExpenses] Iniciando creación de gasto con datos: {...}
🚀 [financesService.createExpense] Iniciando creación de gasto
📋 [financesService] Datos recibidos: {...}
📤 [financesService] Datos a insertar en BD: {...}
✅ [financesService] Gasto creado exitosamente: {...}
✅ [useExpenses] Gasto creado exitosamente: {...}
[Toast verde] ✅ Gasto guardado correctamente
```

#### **❌ Si Hay Error (Deberías ver algo como esto):**
```
📤 [DualOCRExpenseForm] Enviando datos a onSave...
📋 [DualOCRExpenseForm] Todos los datos a enviar: {...}
✅ [DualOCRExpenseForm] onSave ejecutado correctamente
📤 [ExpenseTab] onSave llamado con datos: {...}
➕ [ExpenseTab] Creando nuevo gasto
🚀 [useExpenses] Iniciando creación de gasto con datos: {...}
🚀 [financesService.createExpense] Iniciando creación de gasto
📋 [financesService] Datos recibidos: {...}
❌ [financesService] Error de Supabase: {mensaje de error}
❌ [useExpenses] Error al crear gasto: {error}
❌ [useExpenses] Error.message: {mensaje}
[Toast rojo] ❌ Error al guardar: {mensaje}
```

#### **⚠️ Si NO aparece NADA en consola:**

Esto indicaría que:
1. **El formulario no se está enviando** → Revisar validación previa
2. **El botón no está conectado** → Revisar `onSubmit={handleSubmit}`
3. **JavaScript bloqueado** → Revisar errores de compilación
4. **Evento cancelado** → Revisar `e.preventDefault()`

### **Paso 6: Identificar el Punto de Falla**

Busca el **ÚLTIMO LOG** que apareció antes del error:

| Último Log | Problema en | Solución |
|------------|-------------|----------|
| `📤 [DualOCRExpenseForm] Enviando datos...` | Formulario | Revisar validación, revisar `onSave` prop |
| `📤 [ExpenseTab] onSave llamado...` | Hook/Mutación | Revisar `createExpense`, revisar importación |
| `🚀 [useExpenses] Iniciando creación...` | Servicio | Revisar `financesService.createExpense` |
| `📤 [financesService] Datos a insertar...` | Base de Datos | Revisar esquema de `evt_gastos`, permisos RLS |

## 🔍 Errores Comunes y Soluciones

### **1. Error: "invalid input syntax for type integer: ''"**
**Causa**: Campo numérico recibe cadena vacía
**Solución**: Ya implementada - se convierten `""` → `null`

### **2. Error: "column 'direccion_proveedor' does not exist"**
**Causa**: Campo no existe en la tabla `evt_gastos`
**Solución**: Ya implementada - se eliminan campos inexistentes antes de insertar

### **3. Error: "new row violates row-level security policy"**
**Causa**: Usuario sin permisos para insertar en `evt_gastos`
**Solución**: 
```sql
-- Verificar políticas RLS en Supabase Dashboard
SELECT * FROM pg_policies WHERE tablename = 'evt_gastos';

-- Verificar usuario autenticado
SELECT auth.uid();
```

### **4. Error: "foreign key violation on 'categoria_id'"**
**Causa**: `categoria_id` apunta a una categoría inexistente
**Solución**: Dejar campo vacío o seleccionar categoría válida

### **5. No aparece ningún log**
**Causa**: Error de compilación TypeScript o React
**Solución**: 
```bash
# Ver errores de compilación en terminal
cd /home/rodrichrz/proyectos/V20---\ recuperacion/project2
npm run dev

# Buscar errores en rojo
```

## 📝 Información para Reportar

Si el problema persiste, copia y envía:

1. **Logs de consola completos** (desde que abres el formulario hasta el error)
2. **Datos que intentaste guardar**:
   ```javascript
   // Copiar desde consola:
   console.log('📋 [DualOCRExpenseForm] Todos los datos a enviar:', ...)
   ```
3. **Mensajes de error** (si hay):
   ```javascript
   // Copiar desde consola:
   ❌ [financesService] Error de Supabase: {...}
   ```
4. **Screenshot del formulario** mostrando qué campos llenaste

## 🎯 Próximos Pasos

Si todo funciona correctamente con estos logs, se pueden:
1. **Reducir verbosidad** de logs (quitar algunos `console.log`)
2. **Agregar analytics** para trackear guardados exitosos/fallidos
3. **Mejorar mensajes de error** para el usuario final
4. **Agregar validación en tiempo real** de campos

## 📚 Archivos Modificados

1. `/src/modules/eventos/components/finances/DualOCRExpenseForm.tsx`
   - Mejorado logging en `handleSubmit`
   
2. `/src/modules/eventos/components/finances/ExpenseTab.tsx`
   - Agregado logging en callback `onSave`
   - Agregado manejo de errores con `try/catch`
   
3. `/src/modules/eventos/hooks/useFinances.ts`
   - Agregado logging en mutación `createExpenseMutation`
   - Agregado `onError` handler con toast
   - Agregado toast de éxito en `onSuccess`
   
4. `/src/modules/eventos/services/financesService.ts`
   - Ya tenía logging completo (sin cambios)

---

**Última actualización**: 14 octubre 2025
**Estado**: ✅ Logs implementados - Listo para testing
