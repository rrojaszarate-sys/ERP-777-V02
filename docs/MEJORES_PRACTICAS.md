# Mejores Prácticas - MADE ERP System

## 📚 Tabla de Contenidos

1. [TypeScript](#typescript)
2. [Logging](#logging)
3. [Code Splitting](#code-splitting)
4. [Manejo de Errores](#manejo-de-errores)
5. [Hooks Personalizados](#hooks-personalizados)
6. [Supabase](#supabase)
7. [Performance](#performance)

---

## TypeScript

### ✅ Evitar el uso de `any`

**❌ Malo:**
```typescript
const handleSubmit = (data: any) => {
  // ...
};
```

**✅ Bueno:**
```typescript
import { EventoFormData } from '../types/FormData';

const handleSubmit = (data: EventoFormData) => {
  // TypeScript puede validar los campos
};
```

### ✅ Crear Interfaces Específicas

**Ubicación**: `src/modules/eventos/types/`

```typescript
// Cliente.ts
export interface Cliente {
  id: number;
  razon_social: string;
  nombre_comercial?: string;
  rfc?: string;
  // ...
}

export interface ClienteFormData {
  razon_social: string;
  nombre_comercial?: string;
  // Solo campos editables
}
```

### ✅ Usar tipos de retorno explícitos

```typescript
// ✅ Bueno
async function fetchEventos(): Promise<Evento[]> {
  const { data } = await supabase.from('evt_eventos').select('*');
  return data || [];
}

// ❌ Malo
async function fetchEventos() {
  const { data } = await supabase.from('evt_eventos').select('*');
  return data;
}
```

---

## Logging

### ✅ Usar el Sistema de Logger

**Importar el logger apropiado:**

```typescript
import { workflowLogger, fileLogger, dbLogger, apiLogger } from '../core/utils/logger';
```

### ❌ NO usar console.log directamente

```typescript
// ❌ Malo
console.log('Estado cambiado', { eventId, newState });

// ✅ Bueno
workflowLogger.info('Estado cambiado', { eventId, newState });
```

### Niveles de Log

```typescript
// Debug - solo en desarrollo
workflowLogger.debug('Detalles de debugging', data);

// Info - información general
workflowLogger.info('Operación exitosa', result);

// Warn - advertencias
workflowLogger.warn('Advertencia: dato no encontrado', { id });

// Error - errores
workflowLogger.error('Error al procesar', error);
```

### Contextos Especializados

```typescript
import {
  workflowLogger,  // Para flujo de estados
  fileLogger,      // Para subida de archivos
  dbLogger,        // Para operaciones de BD
  apiLogger,       // Para llamadas API
  authLogger       // Para autenticación
} from '../core/utils/logger';
```

---

## Code Splitting

### ✅ Usar lazy loading para rutas

```typescript
import { lazy, Suspense } from 'react';

const EventsListPage = lazy(() =>
  import('./modules/eventos/pages/EventsListPage')
    .then(m => ({ default: m.EventsListPage }))
);

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/eventos" element={<EventsListPage />} />
      </Routes>
    </Suspense>
  );
}
```

### ✅ Configurar Manual Chunks en Vite

Ver: `vite.config.ts`

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
        'eventos-module': ['./src/modules/eventos/...'],
      }
    }
  }
}
```

---

## Manejo de Errores

### ✅ Try-Catch con Logger

```typescript
async function saveEvento(data: EventoFormData) {
  try {
    const { error } = await supabase
      .from('evt_eventos')
      .insert(data);

    if (error) throw error;

    toast.success('Evento guardado correctamente');
  } catch (err) {
    workflowLogger.error('Error al guardar evento', err);
    toast.error(err instanceof Error ? err.message : 'Error desconocido');
  }
}
```

### ✅ Validación de Tipos

```typescript
if (error instanceof Error) {
  // Error conocido con mensaje
  workflowLogger.error('Error procesando', error);
  toast.error(error.message);
} else {
  // Error desconocido
  workflowLogger.error('Error desconocido', error);
  toast.error('Ocurrió un error inesperado');
}
```

---

## Hooks Personalizados

### ✅ Estructura de un Hook

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../../../core/config/supabase';
import { dbLogger } from '../../../core/utils/logger';

export interface EventType {
  id: number;
  nombre: string;
  activo: boolean;
}

export function useEventTypes() {
  const [data, setData] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const { data: types, error: fetchError } = await supabase
          .from('tipo_evento')
          .select('*')
          .eq('activo', true);

        if (fetchError) throw fetchError;
        setData((types || []) as EventType[]);
      } catch (err) {
        dbLogger.error('Error fetching event types', err);
        setError(err instanceof Error ? err : new Error('Error desconocido'));
      } finally {
        setLoading(false);
      }
    };

    fetchTypes();
  }, []);

  return { data, loading, error };
}
```

### ✅ Siempre incluir estados de carga y error

```typescript
const { data, loading, error } = useEventTypes();

if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
if (!data || data.length === 0) return <EmptyState />;

return <DataDisplay data={data} />;
```

---

## Supabase

### ✅ Manejo de Errores de Supabase

```typescript
const { data, error } = await supabase
  .from('evt_eventos')
  .select('*')
  .eq('id', eventId)
  .single();

if (error) {
  dbLogger.error('Error fetching event', error);
  throw new Error(`No se pudo cargar el evento: ${error.message}`);
}

if (!data) {
  throw new Error('Evento no encontrado');
}
```

### ✅ Usar tipos específicos con Supabase

```typescript
// Con tipo específico
const { data } = await supabase
  .from('evt_eventos')
  .select('id, nombre_proyecto, cliente_id')
  .returns<Pick<Evento, 'id' | 'nombre_proyecto' | 'cliente_id'>[]>();

// En lugar de
const { data } = await supabase
  .from('evt_eventos')
  .select('id, nombre_proyecto, cliente_id'); // data: any[]
```

### ✅ Invalidar queries después de mutaciones

```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const handleSave = async (data: EventoFormData) => {
  await supabase.from('evt_eventos').insert(data);

  // Invalidar para refetch
  await queryClient.invalidateQueries({ queryKey: ['eventos'] });
  await queryClient.invalidateQueries({ queryKey: ['evento', id] });
};
```

---

## Performance

### ✅ Memoización con useMemo

```typescript
const expensiveCalculation = useMemo(() => {
  return events.reduce((sum, event) => sum + event.total, 0);
}, [events]); // Solo recalcular si events cambia
```

### ✅ useCallback para funciones en props

```typescript
const handleClick = useCallback((id: number) => {
  // ...
}, [/* dependencies */]);

// Evita re-renders innecesarios en componentes hijos
<ChildComponent onClick={handleClick} />
```

### ✅ Lazy loading de componentes pesados

```typescript
import { lazy } from 'react';

const HeavyChart = lazy(() => import('./components/HeavyChart'));

function Dashboard() {
  return (
    <Suspense fallback={<Skeleton />}>
      <HeavyChart data={data} />
    </Suspense>
  );
}
```

---

## Checklist de Revisión

Antes de hacer commit, verificar:

- [ ] ❌ No hay `console.log` directos (usar logger)
- [ ] ❌ No hay `any` innecesarios (crear interfaces)
- [ ] ✅ Errores manejados con try-catch
- [ ] ✅ Logger usado para errores críticos
- [ ] ✅ Toast para feedback al usuario
- [ ] ✅ Tipos TypeScript explícitos
- [ ] ✅ Queries invalidadas después de mutaciones
- [ ] ✅ Loading y error states implementados

---

## Recursos

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React Query Best Practices](https://tanstack.com/query/latest/docs/framework/react/guides/query-functions)
- [Supabase TypeScript Support](https://supabase.com/docs/guides/api/rest/generating-types)
- [Vite Code Splitting](https://vitejs.dev/guide/features.html#async-chunk-loading-optimization)

---

**Última actualización**: 2025-10-06
