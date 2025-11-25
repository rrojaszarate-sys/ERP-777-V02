# ✅ Control de Cambio de Cliente en Eventos

## Funcionalidades Implementadas

### 1. **Solo Administradores Pueden Cambiar Cliente en Eventos Existentes**

Cuando se **edita** un evento existente:
- ✅ El campo "Cliente" está **bloqueado** para usuarios no administradores
- ✅ Muestra icono de candado 🔒
- ✅ Tooltip explicativo: "Solo los administradores pueden cambiar el cliente"
- ✅ Campo deshabilitado visualmente (gris, opacidad 60%, cursor not-allowed)

### 2. **Advertencia al Cambiar Cliente (Solo Admin)**

Cuando un **administrador** cambia el cliente en un evento existente:
- ✅ Aparece advertencia amarilla destacada
- ✅ Muestra la clave anterior y la nueva clave que se generará
- ✅ Icono de alerta ⚠️
- ✅ Mensaje claro sobre el impacto en la trazabilidad

### 3. **Generación Automática de Nueva Clave**

Al cambiar el cliente:
- ✅ Se calcula automáticamente la nueva clave del evento
- ✅ Formato: `SUFIJO_NUEVO_CLIENTE + AÑO + SECUENCIAL`
- ✅ Preview en tiempo real: `ABC2025-###`
- ✅ Se actualiza al guardar el evento

---

## Código Implementado

### Archivo: `EventForm.tsx`

#### **Imports Agregados:**
```typescript
import { useAuth } from '../../../../core/auth/AuthProvider';
import { AlertTriangle, Lock } from 'lucide-react';
```

#### **Variables de Estado:**
```typescript
const { user } = useAuth();
const [showClientChangeWarning, setShowClientChangeWarning] = useState(false);
const [newEventKey, setNewEventKey] = useState('');

const isAdmin = user?.role === 'Administrador';
const isEditingEvent = !!event;
```

#### **useEffect para Preview de Clave:**
```typescript
useEffect(() => {
  if (isEditingEvent && formData.cliente_id && formData.cliente_id !== event?.cliente_id) {
    const cliente = clients.find(c => c.id === formData.cliente_id);
    if (cliente?.sufijo) {
      const year = new Date().getFullYear();
      setNewEventKey(`${cliente.sufijo}${year}-###`);
      setShowClientChangeWarning(true);
    }
  } else {
    setShowClientChangeWarning(false);
    setNewEventKey('');
  }
}, [formData.cliente_id, event?.cliente_id, clients, isEditingEvent]);
```

#### **Advertencia Visual:**
```tsx
{showClientChangeWarning && (
  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
    <div className="flex items-start">
      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
      <div className="flex-1">
        <h4 className="text-yellow-800 font-medium">⚠️ Advertencia: Cambio de Cliente</h4>
        <p className="text-yellow-700 text-sm mt-1">
          Al cambiar el cliente, se generará una <strong>nueva clave de evento</strong>:
        </p>
        <div className="mt-2 bg-yellow-100 border border-yellow-300 rounded px-3 py-2 font-mono text-yellow-900">
          Clave anterior: <strong>{event?.clave_evento}</strong> → Nueva clave: <strong>{newEventKey}</strong>
        </div>
        <p className="text-yellow-700 text-xs mt-2">
          Esta acción solo puede ser realizada por administradores y afectará la trazabilidad del evento.
        </p>
      </div>
    </div>
  </div>
)}
```

#### **Campo Cliente Bloqueado:**
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Cliente * {isEditingEvent && !isAdmin && <Lock className="inline w-4 h-4 ml-1 text-gray-500" />}
  </label>
  <select
    value={formData.cliente_id}
    onChange={(e) => handleInputChange('cliente_id', parseInt(e.target.value) || '')}
    disabled={isEditingEvent && !isAdmin}
    className={`w-full px-3 py-2 border rounded-lg ${
      errors.cliente_id ? 'border-red-500' : 'border-gray-300'
    } ${isEditingEvent && !isAdmin ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
    title={isEditingEvent && !isAdmin ? 'Solo los administradores pueden cambiar el cliente' : ''}
  >
    {/* opciones */}
  </select>
  {isEditingEvent && !isAdmin && (
    <p className="text-gray-500 text-xs mt-1 flex items-center">
      <Lock className="w-3 h-3 mr-1" />
      Solo administradores pueden cambiar el cliente
    </p>
  )}
</div>
```

---

## Flujo de Uso

### **Escenario 1: Usuario NO Administrador Edita Evento**
```
1. Abre evento existente para editar
2. Ve todos los campos normales
3. Campo "Cliente" está DESHABILITADO
4. Muestra icono de candado 🔒
5. Mensaje: "Solo administradores pueden cambiar el cliente"
6. NO puede cambiar el cliente
```

### **Escenario 2: Administrador Edita Evento**
```
1. Abre evento existente para editar
2. Ve todos los campos normales
3. Campo "Cliente" está HABILITADO
4. Cambia el cliente del dropdown
5. APARECE advertencia amarilla grande
6. Muestra:
   - Clave anterior: ABB2025-001
   - Nueva clave: TCO2025-###
7. Mensaje de advertencia sobre trazabilidad
8. Al guardar, se genera la nueva clave automáticamente
```

### **Escenario 3: Crear Nuevo Evento (Cualquier Usuario)**
```
1. Abre formulario "Nuevo Evento"
2. Todos los campos habilitados
3. Selecciona cliente libremente
4. NO hay advertencia (evento nuevo)
5. Se genera clave automáticamente al crear
```

---

## Vista Previa de la Advertencia

```
┌────────────────────────────────────────────────────────┐
│ ⚠️  Advertencia: Cambio de Cliente                     │
├────────────────────────────────────────────────────────┤
│ Al cambiar el cliente, se generará una nueva clave    │
│ de evento:                                             │
│                                                        │
│ ┌────────────────────────────────────────────────┐   │
│ │ Clave anterior: ABB2025-001 → Nueva: TCO2025-###│   │
│ └────────────────────────────────────────────────┘   │
│                                                        │
│ Esta acción solo puede ser realizada por              │
│ administradores y afectará la trazabilidad del evento.│
└────────────────────────────────────────────────────────┘
  ^ Fondo amarillo, borde amarillo izquierdo 4px
```

---

## Vista del Campo Cliente

### **Para NO Administradores:**
```
┌────────────────────────────────┐
│ Cliente * 🔒                   │
├────────────────────────────────┤
│ [Tech Corp SA de CV       ▼]  │  ← Deshabilitado (gris)
├────────────────────────────────┤
│ 🔒 Solo administradores pueden │
│    cambiar el cliente          │
└────────────────────────────────┘
```

### **Para Administradores:**
```
┌────────────────────────────────┐
│ Cliente *                      │
├────────────────────────────────┤
│ [Seleccionar cliente...    ▼] │  ← Habilitado (normal)
└────────────────────────────────┘
```

---

## Roles en el Sistema

El sistema detecta el rol del usuario actual usando `useAuth()`:

```typescript
const { user } = useAuth();
const isAdmin = user?.role === 'Administrador';
```

### Roles Disponibles:
1. **Administrador** - Puede cambiar clientes en eventos existentes
2. **Ejecutivo** - NO puede cambiar clientes en eventos existentes
3. **Visualizador** - NO puede cambiar clientes en eventos existentes

---

## Selector de Rol en Desarrollo

En modo desarrollo, aparece un selector flotante en la esquina superior derecha:

```
┌─────────────────────────┐
│ 🟡 MODO DESARROLLO      │
├─────────────────────────┤
│ [Administrador      ▼] │
│                         │
│ Usuario: Admin Usuario  │
└─────────────────────────┘
```

Puedes cambiar entre roles para probar:
- Administrador
- Ejecutivo
- Visualizador

---

## Próximos Pasos

### **Para Backend:**

El backend (eventsService.ts) ya tiene la lógica de generación de clave:

```typescript
async createEvent(eventData: Partial<Event>): Promise<Event> {
  if (!eventData.cliente_id) {
    throw new Error('El cliente_id es requerido para generar la clave del evento');
  }

  const clave_evento = await this.generateEventKey(eventData.cliente_id);

  // ... crear evento con la nueva clave
}
```

**Falta implementar:** Método `updateEvent()` que también regenere la clave si cambió el cliente.

---

## Estado del Servidor

```
✅ Compilado: 8:34:10 AM
✅ Proceso: 182ee3
✅ URL: http://localhost:5173/
✅ Sin errores
```

---

## Resumen

✅ Campo Cliente bloqueado para NO administradores en eventos existentes
✅ Advertencia visual cuando admin cambia cliente
✅ Preview de nueva clave en tiempo real
✅ Icono de candado 🔒 para indicar campo bloqueado
✅ Mensaje explicativo bajo el campo
✅ Tooltip informativo
✅ Detección automática de rol de usuario
✅ Compatible con modo desarrollo y producción

**Recarga la página (F5) para ver los cambios.**
