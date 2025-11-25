# Mejores Prácticas y Convenciones - ERP-777 V1

## Índice

1. [Convenciones de Código](#convenciones-de-código)
2. [TypeScript](#typescript)
3. [React y Componentes](#react-y-componentes)
4. [Hooks Personalizados](#hooks-personalizados)
5. [Gestión de Estado](#gestión-de-estado)
6. [Servicios y APIs](#servicios-y-apis)
7. [Base de Datos](#base-de-datos)
8. [Seguridad](#seguridad)
9. [Performance](#performance)
10. [Testing](#testing)
11. [Git y Versionado](#git-y-versionado)
12. [Documentación](#documentación)

## Convenciones de Código

### Naming Conventions

#### Archivos

```typescript
// ✅ CORRECTO

// Componentes: PascalCase
EventForm.tsx
ExpenseCard.tsx
DashboardPage.tsx

// Hooks: camelCase con prefijo 'use'
useEvents.ts
useFinances.ts
usePermissions.ts

// Servicios: camelCase con sufijo 'Service'
eventsService.ts
financesService.ts
ocrService.ts

// Utilidades: camelCase
formatters.ts
validators.ts
calculations.ts

// Tipos/Interfaces: PascalCase
Event.ts
Finance.ts
Database.types.ts

// Constantes: camelCase o UPPER_SNAKE_CASE
constants.ts
API_ENDPOINTS.ts

// ❌ INCORRECTO
event-form.tsx          // kebab-case no preferido
UseEvents.ts            // Capitalización incorrecta
eventsservice.ts        // Sin CamelCase
event_form.tsx          // snake_case no preferido
```

#### Variables y Funciones

```typescript
// ✅ CORRECTO

// Variables: camelCase
const eventData = {...};
const userList = [...];
const isLoading = true;

// Funciones: camelCase, verbo al inicio
function fetchEvents() {}
function createExpense() {}
function validateForm() {}

// Constantes: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_PAGE_SIZE = 20;

// Booleanos: prefijo is, has, should, can
const isValid = true;
const hasPermission = false;
const shouldRender = true;
const canEdit = false;

// Event handlers: prefijo handle
const handleSubmit = () => {};
const handleChange = () => {};
const handleClick = () => {};

// Callbacks: prefijo on
const onSuccess = () => {};
const onError = () => {};
const onComplete = () => {};

// ❌ INCORRECTO
const EventData = {};      // PascalCase para variable
const fetch_events = () => {}; // snake_case
const valid = true;        // Booleano sin prefijo
const click = () => {};    // Handler sin prefijo
```

#### Componentes y Props

```typescript
// ✅ CORRECTO

// Componente con props tipadas
interface EventFormProps {
  eventId?: string;
  onSubmit: (data: EventData) => void;
  onCancel?: () => void;
}

export function EventForm({ eventId, onSubmit, onCancel }: EventFormProps) {
  // ...
}

// Props de children
interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

// ❌ INCORRECTO
export function EventForm(props: any) {} // any no permitido
export function EventForm(props) {}      // Sin tipos
```

### Organización de Imports

```typescript
// ✅ CORRECTO: Orden de imports

// 1. React y librerías externas
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

// 2. Componentes de UI externos
import { Button, Card, Input } from '@nextui-org/react';
import { Plus, Trash, Edit } from 'lucide-react';

// 3. Componentes internos (absolutos)
import { Layout } from '@/shared/components/layout/Layout';
import { Modal } from '@/shared/components/ui/Modal';

// 4. Hooks personalizados
import { useEvents } from '../hooks/useEvents';
import { usePermissions } from '@/core/permissions/usePermissions';

// 5. Servicios
import { eventsService } from '../services/eventsService';

// 6. Tipos
import type { Event, EventData } from '../types/Event';

// 7. Utilidades
import { formatCurrency } from '@/shared/utils/formatters';

// 8. Estilos (si aplica)
import './EventForm.css';

// ❌ INCORRECTO: Imports desordenados
import { formatCurrency } from '@/shared/utils/formatters';
import React from 'react';
import type { Event } from '../types/Event';
import { Button } from '@nextui-org/react';
```

## TypeScript

### Tipos Explícitos

```typescript
// ✅ CORRECTO: Siempre tipar explícitamente

function calculateTotal(subtotal: number, iva: number): number {
  return subtotal + iva;
}

const events: Event[] = await fetchEvents();

interface CreateEventParams {
  nombre: string;
  clienteId: string;
  fecha: Date;
}

// Usar tipos de unión para valores específicos
type StatusPago = 'pendiente' | 'pagado' | 'cancelado';

// ❌ INCORRECTO
function calculateTotal(subtotal, iva) { // Sin tipos
  return subtotal + iva;
}

const events = await fetchEvents(); // Tipo implícito
```

### Evitar `any`

```typescript
// ✅ CORRECTO: Usar tipos específicos

interface ApiResponse<T> {
  data: T;
  error: Error | null;
  status: number;
}

async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  // ...
}

// Si realmente no se conoce el tipo, usar unknown
function processData(data: unknown) {
  if (typeof data === 'string') {
    return data.toUpperCase();
  }
  // ...
}

// ❌ INCORRECTO
async function fetchData(url: string): Promise<any> { // any
  // ...
}

function processData(data: any) { // any
  return data.toUpperCase(); // Inseguro
}
```

### Utility Types

```typescript
// ✅ CORRECTO: Usar utility types de TypeScript

interface Event {
  id: string;
  nombre: string;
  fecha: Date;
  clienteId: string;
  activo: boolean;
}

// Partial para actualizaciones parciales
type EventUpdate = Partial<Event>;

// Omit para excluir campos
type EventCreate = Omit<Event, 'id'>;

// Pick para seleccionar campos
type EventSummary = Pick<Event, 'id' | 'nombre' | 'fecha'>;

// Required para hacer campos opcionales obligatorios
type EventRequired = Required<Event>;

// Readonly para inmutabilidad
type EventReadonly = Readonly<Event>;
```

### Generics

```typescript
// ✅ CORRECTO: Usar generics para código reutilizable

function useCRUD<T extends { id: string }>(tableName: string) {
  const { data, isLoading } = useQuery<T[]>({
    queryKey: [tableName],
    queryFn: () => fetchAll<T>(tableName),
  });

  const createMutation = useMutation<T, Error, Omit<T, 'id'>>({
    mutationFn: (item) => create<T>(tableName, item),
  });

  return { data, isLoading, create: createMutation.mutate };
}

// Uso
const { data: events } = useCRUD<Event>('evt_eventos');
```

## React y Componentes

### Componentes Funcionales

```typescript
// ✅ CORRECTO: Usar componentes funcionales con hooks

interface EventCardProps {
  event: Event;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function EventCard({ event, onEdit, onDelete }: EventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleEdit = () => {
    onEdit(event.id);
  };

  return (
    <Card>
      <h3>{event.nombre}</h3>
      {/* ... */}
    </Card>
  );
}

// ❌ INCORRECTO: Class components (obsoleto)
class EventCard extends React.Component {
  // No usar
}
```

### Composición sobre Herencia

```typescript
// ✅ CORRECTO: Composición

interface CardProps {
  children: React.ReactNode;
  title?: string;
  footer?: React.ReactNode;
}

function Card({ children, title, footer }: CardProps) {
  return (
    <div className="card">
      {title && <div className="card-header">{title}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

// Uso
<Card title="Evento" footer={<Button>Guardar</Button>}>
  <EventForm />
</Card>

// ❌ INCORRECTO: Crear variantes con herencia
class EventCard extends Card {} // No
```

### Props Drilling vs Context

```typescript
// ❌ EVITAR: Props drilling excesivo

function App() {
  const user = useAuth();
  return <Dashboard user={user} />;
}

function Dashboard({ user }) {
  return <Sidebar user={user} />;
}

function Sidebar({ user }) {
  return <UserMenu user={user} />;
}

// ✅ CORRECTO: Usar Context para datos globales

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

// Uso en cualquier nivel
function UserMenu() {
  const { user } = useAuth();
  return <div>{user.nombre}</div>;
}
```

### Lazy Loading

```typescript
// ✅ CORRECTO: Lazy loading de componentes pesados

import { lazy, Suspense } from 'react';

const EventsDashboard = lazy(() => import('./pages/EventsDashboard'));
const FinancialAnalysis = lazy(() => import('./pages/FinancialAnalysis'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/eventos" element={<EventsDashboard />} />
        <Route path="/analisis" element={<FinancialAnalysis />} />
      </Routes>
    </Suspense>
  );
}
```

### Memoización

```typescript
// ✅ CORRECTO: Usar memo, useMemo, useCallback apropiadamente

// memo para componentes que no cambian frecuentemente
export const EventCard = memo(function EventCard({ event }: EventCardProps) {
  return <Card>{event.nombre}</Card>;
});

// useMemo para cálculos costosos
function FinancialSummary({ events }: { events: Event[] }) {
  const totalUtilidad = useMemo(() => {
    return events.reduce((sum, event) => sum + event.utilidad, 0);
  }, [events]);

  return <div>Utilidad Total: {formatCurrency(totalUtilidad)}</div>;
}

// useCallback para funciones que se pasan como props
function EventsList() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  return events.map((event) => (
    <EventCard key={event.id} event={event} onSelect={handleSelect} />
  ));
}

// ❌ INCORRECTO: Memoizar todo innecesariamente
// Solo memoizar cuando hay impacto real en performance
```

## Hooks Personalizados

### Estructura de Hooks

```typescript
// ✅ CORRECTO: Hook bien estructurado

export function useEvents(eventId?: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  // Query para obtener datos
  const { data: events, isLoading, error } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsService.fetchEvents(supabase, eventId),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Mutation para crear
  const createMutation = useMutation({
    mutationFn: (data: EventData) =>
      eventsService.createEvent(supabase, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
      toast.success('Evento creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Mutation para actualizar
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EventData> }) =>
      eventsService.updateEvent(supabase, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
      toast.success('Evento actualizado');
    },
  });

  // Funciones helper
  const getEventById = useCallback((id: string) => {
    return events?.find((e) => e.id === id);
  }, [events]);

  return {
    // Datos
    events,
    isLoading,
    error,
    // Mutaciones
    createEvent: createMutation.mutate,
    updateEvent: updateMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    // Helpers
    getEventById,
  };
}
```

### Reglas de Hooks

```typescript
// ✅ CORRECTO: Hooks en el top level

function MyComponent() {
  const [state, setState] = useState(0);
  const { data } = useQuery(...);

  // ...
}

// ❌ INCORRECTO: Hooks en condicionales o loops

function MyComponent() {
  if (condition) {
    const [state, setState] = useState(0); // ❌
  }

  for (let i = 0; i < 10; i++) {
    useEffect(() => {}, []); // ❌
  }
}

// ✅ CORRECTO: Lógica condicional dentro del hook
function MyComponent() {
  const [state, setState] = useState(0);

  useEffect(() => {
    if (condition) {
      // Lógica aquí
    }
  }, [condition]);
}
```

## Gestión de Estado

### React Query para Estado del Servidor

```typescript
// ✅ CORRECTO: Usar React Query para datos del servidor

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function EventsList() {
  const queryClient = useQueryClient();

  // Fetch
  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
    staleTime: 5 * 60 * 1000, // Los datos son "frescos" por 5 min
    cacheTime: 10 * 60 * 1000, // Guardar en cache por 10 min
  });

  // Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      // Invalidar y refetch
      queryClient.invalidateQueries(['events']);
    },
  });

  // Optimistic update
  const updateMutation = useMutation({
    mutationFn: updateEvent,
    onMutate: async (newEvent) => {
      // Cancelar queries en curso
      await queryClient.cancelQueries(['events']);

      // Snapshot del valor anterior
      const previousEvents = queryClient.getQueryData(['events']);

      // Optimistic update
      queryClient.setQueryData(['events'], (old) => {
        return old.map((e) => (e.id === newEvent.id ? newEvent : e));
      });

      return { previousEvents };
    },
    onError: (err, newEvent, context) => {
      // Rollback en error
      queryClient.setQueryData(['events'], context.previousEvents);
    },
    onSettled: () => {
      // Refetch después de error o éxito
      queryClient.invalidateQueries(['events']);
    },
  });
}
```

### useState para Estado Local de UI

```typescript
// ✅ CORRECTO: useState para UI local

function EventForm() {
  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<EventData>({});

  // Estado local que no necesita estar en servidor
}
```

### Context para Estado Global de UI

```typescript
// ✅ CORRECTO: Context para estado global de UI

interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
```

## Servicios y APIs

### Estructura de Servicios

```typescript
// ✅ CORRECTO: Servicio bien estructurado

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Event, EventData } from '../types/Event';

export const eventsService = {
  /**
   * Obtiene todos los eventos activos
   * @param supabase - Cliente de Supabase
   * @param filters - Filtros opcionales
   * @returns Promise con array de eventos
   */
  async fetchEvents(
    supabase: SupabaseClient,
    filters?: { clienteId?: string; estado?: string }
  ): Promise<Event[]> {
    let query = supabase
      .from('evt_eventos')
      .select('*, evt_clientes(*), evt_tipos_evento(*)')
      .eq('activo', true)
      .order('fecha_evento', { ascending: false });

    if (filters?.clienteId) {
      query = query.eq('cliente_id', filters.clienteId);
    }

    if (filters?.estado) {
      query = query.eq('estado_id', filters.estado);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error al obtener eventos: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Crea un nuevo evento
   * @param supabase - Cliente de Supabase
   * @param eventData - Datos del evento
   * @returns Promise con evento creado
   */
  async createEvent(
    supabase: SupabaseClient,
    eventData: EventData
  ): Promise<Event> {
    // Validaciones de negocio
    if (!eventData.cliente_id) {
      throw new Error('Cliente es requerido');
    }

    if (!eventData.fecha_evento) {
      throw new Error('Fecha del evento es requerida');
    }

    // Generar clave única
    const claveEvento = await this.generateClaveEvento(supabase, eventData);

    // Insertar
    const { data, error } = await supabase
      .from('evt_eventos')
      .insert({
        ...eventData,
        clave_evento: claveEvento,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear evento: ${error.message}`);
    }

    // Auditoría
    await auditService.log(supabase, 'EVENT_CREATED', data.id);

    return data;
  },

  /**
   * Genera clave única para evento
   * @private
   */
  async generateClaveEvento(
    supabase: SupabaseClient,
    eventData: EventData
  ): Promise<string> {
    // Lógica para generar clave
    // Ej: CLI001-2025-001
    return 'generated-clave';
  },
};
```

### Manejo de Errores

```typescript
// ✅ CORRECTO: Manejo robusto de errores

export async function fetchData<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      // Error de red
      throw new Error('Error de conexión. Verifica tu internet.');
    }

    if (error instanceof SyntaxError) {
      // Error de parsing JSON
      throw new Error('Respuesta inválida del servidor.');
    }

    // Re-throw otros errores
    throw error;
  }
}

// Uso con toast
async function loadData() {
  try {
    const data = await fetchData('/api/events');
    setData(data);
  } catch (error) {
    toast.error(error.message);
    console.error('Error loading data:', error);
  }
}
```

### Retry Logic

```typescript
// ✅ CORRECTO: Implementar retry para operaciones críticas

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError!;
}

// Uso
const data = await fetchWithRetry(() => eventsService.fetchEvents(supabase));
```

## Base de Datos

### Queries Eficientes

```typescript
// ✅ CORRECTO: Select específico

const { data } = await supabase
  .from('evt_eventos')
  .select('id, nombre_proyecto, fecha_evento, evt_clientes(nombre)')
  .eq('activo', true);

// ❌ INCORRECTO: Select *
const { data } = await supabase
  .from('evt_eventos')
  .select('*'); // Trae todos los campos innecesariamente
```

### Transacciones

```typescript
// ✅ CORRECTO: Usar transacciones para operaciones múltiples

async function createEventWithInitialData(eventData: EventData) {
  // Iniciar transacción
  const { data: event, error: eventError } = await supabase
    .from('evt_eventos')
    .insert(eventData)
    .select()
    .single();

  if (eventError) throw eventError;

  try {
    // Crear ingreso inicial
    const { error: ingresoError } = await supabase
      .from('evt_ingresos')
      .insert({
        evento_id: event.id,
        concepto: 'Anticipo',
        total: eventData.anticipo,
      });

    if (ingresoError) throw ingresoError;

    return event;
  } catch (error) {
    // Rollback: eliminar evento
    await supabase.from('evt_eventos').delete().eq('id', event.id);
    throw error;
  }
}
```

### Índices y Performance

```sql
-- ✅ CORRECTO: Crear índices en columnas de búsqueda frecuente

CREATE INDEX idx_evt_eventos_cliente ON evt_eventos(cliente_id)
WHERE activo = true;

CREATE INDEX idx_evt_eventos_fecha ON evt_eventos(fecha_evento DESC);

-- Índice para búsqueda full-text
CREATE INDEX idx_evt_eventos_nombre_fts
ON evt_eventos
USING gin(to_tsvector('spanish', nombre_proyecto));
```

### RLS (Row Level Security)

```sql
-- ✅ CORRECTO: Políticas RLS granulares

-- Lectura: usuarios ven eventos de su empresa
CREATE POLICY "users_read_company_events"
ON evt_eventos FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM core_users WHERE id = auth.uid()
  )
);

-- Escritura: solo usuarios con permiso
CREATE POLICY "users_create_events"
ON evt_eventos FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM core_users WHERE id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1 FROM core_users u
    JOIN core_roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
      AND r.permisos->>'events' @> '"create"'
  )
);
```

## Seguridad

### Validación de Inputs

```typescript
// ✅ CORRECTO: Validar todos los inputs

import { z } from 'zod';

const eventSchema = z.object({
  nombre_proyecto: z.string().min(3).max(200),
  cliente_id: z.string().uuid(),
  fecha_evento: z.date().min(new Date()),
  total_estimado: z.number().positive(),
});

function createEvent(rawData: unknown) {
  // Validar y parsear
  const validData = eventSchema.parse(rawData);

  // Continuar con datos validados
  return eventsService.createEvent(supabase, validData);
}

// ❌ INCORRECTO: Sin validación
function createEvent(data: any) {
  return eventsService.createEvent(supabase, data); // Inseguro
}
```

### Sanitización

```typescript
// ✅ CORRECTO: Sanitizar HTML

import DOMPurify from 'dompurify';

function renderDescription(html: string) {
  const clean = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

// ❌ INCORRECTO: XSS vulnerable
function renderDescription(html: string) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />; // ❌
}
```

### Secrets y Env Vars

```typescript
// ✅ CORRECTO: Usar variables de entorno

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// ❌ INCORRECTO: Hardcodear secrets
const API_KEY = 'sk-1234567890abcdef'; // ❌ NUNCA
```

## Performance

### Code Splitting

```typescript
// ✅ CORRECTO: Dividir bundles grandes

// Lazy load de rutas
const EventsDashboard = lazy(() => import('./pages/EventsDashboard'));
const FinancialReports = lazy(() => import('./pages/FinancialReports'));

// Lazy load de componentes pesados
const HeavyChart = lazy(() => import('./components/HeavyChart'));

function ChartContainer() {
  return (
    <Suspense fallback={<Skeleton />}>
      <HeavyChart data={data} />
    </Suspense>
  );
}
```

### Imágenes Optimizadas

```typescript
// ✅ CORRECTO: Comprimir imágenes antes de subir

import { compressImage } from '@/shared/utils/imageCompression';

async function uploadImage(file: File) {
  const compressed = await compressImage(file, {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.8,
  });

  return supabase.storage.from('images').upload(path, compressed);
}
```

### Debounce y Throttle

```typescript
// ✅ CORRECTO: Debounce para búsquedas

import { useDebouncedCallback } from 'use-debounce';

function SearchBar() {
  const [query, setQuery] = useState('');

  const debouncedSearch = useDebouncedCallback((value: string) => {
    performSearch(value);
  }, 500);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  return <input value={query} onChange={handleChange} />;
}
```

## Testing

### Unit Tests

```typescript
// ✅ CORRECTO: Test unitario

import { describe, it, expect } from 'vitest';
import { formatCurrency } from './formatters';

describe('formatCurrency', () => {
  it('should format positive numbers correctly', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00');
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('should format negative numbers correctly', () => {
    expect(formatCurrency(-500)).toBe('-$500.00');
  });

  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});
```

### Integration Tests

```typescript
// ✅ CORRECTO: Test de integración

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventForm } from './EventForm';

describe('EventForm', () => {
  it('should create event on submit', async () => {
    const onSubmit = vi.fn();
    render(<EventForm onSubmit={onSubmit} />);

    // Llenar formulario
    await userEvent.type(screen.getByLabelText('Nombre'), 'Evento Test');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    // Verificar
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        nombre_proyecto: 'Evento Test',
      });
    });
  });
});
```

## Git y Versionado

### Commits Semánticos

```bash
# ✅ CORRECTO: Commits descriptivos y semánticos

git commit -m "feat(eventos): agregar filtro por estado"
git commit -m "fix(gastos): corregir cálculo de IVA"
git commit -m "docs(readme): actualizar instrucciones de instalación"
git commit -m "refactor(services): extraer lógica de validación"
git commit -m "test(finances): agregar tests unitarios"
git commit -m "chore(deps): actualizar dependencias"
git commit -m "perf(queries): optimizar query de eventos"

# Prefijos:
# - feat: Nueva característica
# - fix: Corrección de bug
# - docs: Documentación
# - style: Formato, sin cambios de código
# - refactor: Refactorización
# - test: Tests
# - chore: Mantenimiento
# - perf: Mejora de performance

# ❌ INCORRECTO
git commit -m "cambios"
git commit -m "fix"
git commit -m "varios cambios en eventos y gastos"
```

### Branches

```bash
# ✅ CORRECTO: Nombres descriptivos

git checkout -b feature/expense-ocr-integration
git checkout -b fix/calculation-rounding-error
git checkout -b refactor/extract-validation-utils
git checkout -b hotfix/production-login-bug

# ❌ INCORRECTO
git checkout -b branch1
git checkout -b cambios
git checkout -b test
```

## Documentación

### Comentarios de Código

```typescript
// ✅ CORRECTO: Comentar el "por qué", no el "qué"

/**
 * Calcula el margen de utilidad de un evento.
 *
 * Nota: El cálculo se hace sobre el total de ingresos, no sobre el subtotal,
 * porque así lo requiere la normativa contable de la empresa.
 *
 * @param ingresos - Total de ingresos del evento
 * @param gastos - Total de gastos del evento
 * @returns Margen de utilidad en porcentaje (0-100)
 */
function calcularMargenUtilidad(ingresos: number, gastos: number): number {
  if (ingresos === 0) return 0;
  return ((ingresos - gastos) / ingresos) * 100;
}

// ❌ INCORRECTO: Comentar lo obvio
// Suma a y b
function suma(a: number, b: number): number {
  return a + b; // Retorna la suma
}
```

### JSDoc

```typescript
// ✅ CORRECTO: JSDoc completo

/**
 * Procesa un documento con OCR y extrae datos estructurados.
 *
 * Este servicio primero preprocesa la imagen para mejorar la calidad,
 * luego usa Google Vision API para extraer el texto, y finalmente
 * usa Gemini AI para clasificar y estructurar los datos.
 *
 * @param file - Archivo de imagen o PDF a procesar
 * @param options - Opciones de procesamiento
 * @param options.provider - Proveedor de OCR ('google' | 'tesseract')
 * @param options.enhance - Si se debe mejorar la imagen primero
 * @returns Promise con datos estructurados del documento
 * @throws {Error} Si el archivo no es válido o el OCR falla
 *
 * @example
 * ```typescript
 * const result = await processDocument(file, {
 *   provider: 'google',
 *   enhance: true
 * });
 * console.log(result.proveedor, result.total);
 * ```
 */
export async function processDocument(
  file: File,
  options: ProcessOptions
): Promise<ExpenseData> {
  // ...
}
```

---

**Fecha**: Octubre 2025
**Versión**: 1.0.0
