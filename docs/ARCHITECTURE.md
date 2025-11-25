# Arquitectura del Sistema ERP-777 V1

## Índice

1. [Visión General](#visión-general)
2. [Arquitectura de Alto Nivel](#arquitectura-de-alto-nivel)
3. [Capas de la Aplicación](#capas-de-la-aplicación)
4. [Patrones de Diseño](#patrones-de-diseño)
5. [Flujos de Datos](#flujos-de-datos)
6. [Módulos del Sistema](#módulos-del-sistema)
7. [Integración con Servicios Externos](#integración-con-servicios-externos)
8. [Seguridad](#seguridad)
9. [Escalabilidad](#escalabilidad)

## Visión General

ERP-777 V1 es una aplicación web moderna construida con una arquitectura de **Single Page Application (SPA)** que utiliza React como framework de frontend y Supabase (PostgreSQL) como backend. El sistema sigue principios de **Clean Architecture** y **Domain-Driven Design (DDD)** para mantener el código organizado, escalable y mantenible.

### Principios Arquitectónicos

1. **Separación de Responsabilidades** - Cada capa tiene una responsabilidad única
2. **Inversión de Dependencias** - Las capas internas no dependen de las externas
3. **Modularidad** - Código organizado por features/dominios de negocio
4. **Reusabilidad** - Componentes y lógica reutilizables
5. **Testabilidad** - Diseño que facilita testing unitario e integración
6. **Mantenibilidad** - Código legible y fácil de modificar

## Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIO FINAL                            │
│                      (Navegador Web)                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  React     │  │  NextUI    │  │  Tailwind  │                │
│  │  Router    │  │  Components│  │  CSS       │                │
│  └────────────┘  └────────────┘  └────────────┘                │
│  ┌──────────────────────────────────────────────┐               │
│  │  Pages & Components (TSX)                    │               │
│  │  - EventosListPage                           │               │
│  │  - EventForm                                 │               │
│  │  - ExpenseForm                               │               │
│  │  - Dashboard                                 │               │
│  └──────────────────────────────────────────────┘               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│              CAPA DE LÓGICA DE NEGOCIO                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  Custom    │  │  Context   │  │  React     │                │
│  │  Hooks     │  │  Providers │  │  Query     │                │
│  └────────────┘  └────────────┘  └────────────┘                │
│  ┌──────────────────────────────────────────────┐               │
│  │  Business Logic & State Management           │               │
│  │  - useEvents()                               │               │
│  │  - useFinances()                             │               │
│  │  - useIntelligentOCR()                       │               │
│  │  - usePermissions()                          │               │
│  └──────────────────────────────────────────────┘               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    CAPA DE SERVICIOS                             │
│  ┌──────────────────────────────────────────────┐               │
│  │  API Services & Data Transformation          │               │
│  │  - eventsService.ts                          │               │
│  │  - financesService.ts                        │               │
│  │  - dualOCRService.ts                         │               │
│  │  - workflowService.ts                        │               │
│  │  - invoiceService.ts                         │               │
│  └──────────────────────────────────────────────┘               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
┌────────▼────────┐               ┌──────────▼─────────┐
│   SUPABASE      │               │  SERVICIOS         │
│   BACKEND       │               │  EXTERNOS          │
│                 │               │                    │
│ ┌─────────────┐ │               │ ┌────────────────┐ │
│ │ PostgreSQL  │ │               │ │ Google Vision  │ │
│ │   Database  │ │               │ │     API        │ │
│ └─────────────┘ │               │ └────────────────┘ │
│ ┌─────────────┐ │               │ ┌────────────────┐ │
│ │    Auth     │ │               │ │ Google Gemini  │ │
│ │  (RLS + JWT)│ │               │ │     AI         │ │
│ └─────────────┘ │               │ └────────────────┘ │
│ ┌─────────────┐ │               │                    │
│ │   Storage   │ │               └────────────────────┘
│ │  (Buckets)  │ │
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │   Realtime  │ │
│ │  (Webhooks) │ │
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │    Edge     │ │
│ │  Functions  │ │
│ └─────────────┘ │
└─────────────────┘
```

## Capas de la Aplicación

### 1. Capa de Presentación (UI Layer)

**Ubicación**: `src/modules/*/components/`, `src/modules/*/pages/`, `src/shared/components/`

**Responsabilidades**:
- Renderizar la interfaz de usuario
- Capturar interacciones del usuario
- Mostrar feedback visual (loading, errores, success)
- Validación de formularios en el cliente

**Tecnologías**:
- React 18 (componentes funcionales + hooks)
- NextUI para componentes de UI
- Tailwind CSS para estilos
- Framer Motion para animaciones
- React Router para navegación

**Ejemplo de Componente**:

```typescript
// src/modules/eventos/components/events/EventForm.tsx
export function EventForm({ eventId }: EventFormProps) {
  // Hook de lógica de negocio (capa inferior)
  const { event, loading, updateEvent } = useEvents(eventId);

  // Estado local de UI
  const [isEditing, setIsEditing] = useState(false);

  // Manejador de submit
  const handleSubmit = async (data: EventData) => {
    await updateEvent(data); // Llama a capa de lógica
  };

  // Renderizado
  return (
    <form onSubmit={handleSubmit}>
      {/* UI components */}
    </form>
  );
}
```

### 2. Capa de Lógica de Negocio (Business Logic Layer)

**Ubicación**: `src/modules/*/hooks/`, `src/core/`

**Responsabilidades**:
- Gestión del estado de la aplicación
- Orquestación de llamadas a servicios
- Transformación de datos para UI
- Validación de reglas de negocio
- Caché de datos con React Query

**Tecnologías**:
- Custom Hooks de React
- React Query (TanStack Query) para gestión de estado del servidor
- Context API para estado global

**Ejemplo de Hook**:

```typescript
// src/modules/eventos/hooks/useEvents.ts
export function useEvents(eventId?: string) {
  const supabase = useSupabase();

  // Query con React Query (caché automático)
  const { data: events, isLoading } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsService.fetchEvents(supabase),
  });

  // Mutation para crear evento
  const createMutation = useMutation({
    mutationFn: (data: EventData) =>
      eventsService.createEvent(supabase, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
    },
  });

  return {
    events,
    isLoading,
    createEvent: createMutation.mutate,
  };
}
```

### 3. Capa de Servicios (Service Layer)

**Ubicación**: `src/modules/*/services/`, `src/services/`

**Responsabilidades**:
- Comunicación con APIs externas (Supabase, Google Cloud)
- Transformación de datos entre formatos
- Lógica de negocio compleja
- Manejo de errores de red
- Retry logic y circuit breakers

**Tecnologías**:
- Supabase Client para PostgreSQL
- Fetch API / Axios para servicios externos
- Error handling y logging

**Ejemplo de Servicio**:

```typescript
// src/modules/eventos/services/eventsService.ts
export const eventsService = {
  async fetchEvents(supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from('evt_eventos')
      .select('*, evt_clientes(*), evt_tipos_evento(*)')
      .eq('activo', true)
      .order('fecha_evento', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  },

  async createEvent(supabase: SupabaseClient, eventData: EventData) {
    // Validaciones de negocio
    if (!eventData.cliente_id) {
      throw new Error('Cliente es requerido');
    }

    // Inserción en BD
    const { data, error } = await supabase
      .from('evt_eventos')
      .insert(eventData)
      .select()
      .single();

    if (error) throw error;

    // Auditoría
    await auditService.log('EVENT_CREATED', data.id);

    return data;
  },
};
```

### 4. Capa de Datos (Data Layer)

**Ubicación**: Supabase (PostgreSQL)

**Responsabilidades**:
- Persistencia de datos
- Ejecución de lógica de negocio compleja (triggers, functions)
- Seguridad a nivel de fila (RLS)
- Integridad referencial
- Auditoría de cambios

**Componentes**:
- Tablas relacionales
- Vistas materializadas
- Triggers para cálculos automáticos
- Functions de PostgreSQL
- Políticas RLS para seguridad

## Patrones de Diseño

### 1. Repository Pattern (Servicios)

Los servicios actúan como repositorios que encapsulan la lógica de acceso a datos.

```typescript
// Interfaz del repositorio
interface IEventRepository {
  fetchAll(): Promise<Event[]>;
  fetchById(id: string): Promise<Event>;
  create(data: EventData): Promise<Event>;
  update(id: string, data: Partial<EventData>): Promise<Event>;
  delete(id: string): Promise<void>;
}

// Implementación con Supabase
class EventRepository implements IEventRepository {
  constructor(private supabase: SupabaseClient) {}

  async fetchAll() {
    const { data, error } = await this.supabase
      .from('evt_eventos')
      .select('*');
    if (error) throw error;
    return data;
  }

  // ... más métodos
}
```

### 2. Custom Hooks Pattern

Encapsulación de lógica reutilizable en hooks personalizados.

```typescript
// Hook genérico de CRUD
function useCRUD<T>(tableName: string) {
  const supabase = useSupabase();

  const { data, isLoading } = useQuery({
    queryKey: [tableName],
    queryFn: () => fetchAll(supabase, tableName),
  });

  const createMutation = useMutation({
    mutationFn: (item: T) => create(supabase, tableName, item),
  });

  return { data, isLoading, create: createMutation.mutate };
}

// Uso específico
const { data: events, create: createEvent } = useCRUD<Event>('evt_eventos');
```

### 3. Observer Pattern (React Query)

React Query implementa el patrón Observer para notificar cambios de datos.

```typescript
// Componente A: Modifica datos
function ComponentA() {
  const { mutate: updateEvent } = useMutation({
    mutationFn: eventsService.updateEvent,
    onSuccess: () => {
      // Notifica a todos los observadores
      queryClient.invalidateQueries(['events']);
    },
  });
}

// Componente B: Se actualiza automáticamente
function ComponentB() {
  const { data: events } = useQuery({
    queryKey: ['events'], // Observa estos datos
  });
  // Se re-renderiza automáticamente cuando cambian
}
```

### 4. Facade Pattern (Servicios Complejos)

Simplificación de sistemas complejos detrás de una interfaz simple.

```typescript
// Facade para OCR que coordina múltiples servicios
export const ocrFacade = {
  async processDocument(file: File): Promise<ExpenseData> {
    // 1. Preprocesar imagen
    const processedImage = await imagePreprocessor.enhance(file);

    // 2. Extraer texto con OCR
    const text = await googleVisionService.extractText(processedImage);

    // 3. Clasificar documento
    const classification = await intelligentClassifier.classify(text);

    // 4. Mapear a datos estructurados
    const expenseData = await geminiMapper.mapToExpense(text, classification);

    // 5. Validar datos
    const validated = await validators.validateExpense(expenseData);

    return validated;
  }
};
```

### 5. Strategy Pattern (Procesamiento OCR)

Diferentes estrategias de procesamiento según el tipo de documento.

```typescript
interface IOCRStrategy {
  process(file: File): Promise<OCRResult>;
}

class TicketOCRStrategy implements IOCRStrategy {
  async process(file: File) {
    // Estrategia optimizada para tickets
    return await tesseractService.process(file, {
      mode: 'ticket',
      language: 'spa',
    });
  }
}

class InvoiceOCRStrategy implements IOCRStrategy {
  async process(file: File) {
    // Estrategia para facturas formales
    return await googleVisionService.process(file, {
      mode: 'invoice',
      detectTables: true,
    });
  }
}

// Contexto que usa la estrategia
class OCRProcessor {
  constructor(private strategy: IOCRStrategy) {}

  async processDocument(file: File) {
    return await this.strategy.process(file);
  }
}
```

## Flujos de Datos

### Flujo 1: Crear un Evento

```
┌─────────────────┐
│ Usuario hace    │
│ clic en "Crear  │
│ Nuevo Evento"   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ EventForm Component                 │
│ - Muestra formulario vacío          │
│ - Usuario llena campos              │
│ - Valida en cliente                 │
│ - Usuario hace submit               │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ useEvents Hook                      │
│ - Recibe datos del formulario       │
│ - Ejecuta createMutation            │
│ - Muestra loading spinner           │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ eventsService.createEvent()         │
│ - Valida reglas de negocio          │
│ - Transforma datos al formato DB    │
│ - Llama a Supabase                  │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Supabase PostgreSQL                 │
│ - INSERT en evt_eventos             │
│ - Ejecuta trigger de auditoría      │
│ - Ejecuta trigger de cálculos       │
│ - Retorna registro creado           │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ React Query Cache                   │
│ - Invalida query ['events']         │
│ - Refetch automático                │
│ - Actualiza todos los componentes   │
│   que usan esos datos               │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ UI Updates                          │
│ - Oculta loading spinner            │
│ - Muestra toast de éxito            │
│ - Navega a lista de eventos         │
│ - Lista incluye nuevo evento        │
└─────────────────────────────────────┘
```

### Flujo 2: Procesar Gasto con OCR

```
┌─────────────────┐
│ Usuario sube    │
│ imagen de ticket│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ DualOCRExpenseForm Component        │
│ - Recibe archivo                    │
│ - Muestra preview                   │
│ - Inicia procesamiento              │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ useIntelligentOCR Hook              │
│ - Comprime imagen                   │
│ - Convierte a base64 si es PDF      │
│ - Llama a dualOCRService            │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ dualOCRService.processDocument()    │
│ - Preprocesa imagen                 │
│ - Llama a Google Vision API         │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Google Cloud Vision API             │
│ - TEXT_DETECTION                    │
│ - DOCUMENT_TEXT_DETECTION           │
│ - Retorna texto completo + bloques  │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ intelligentOCRClassifier            │
│ - Envía texto a Gemini AI           │
│ - Clasifica: ticket/factura/recibo  │
│ - Extrae: proveedor, total, fecha   │
│ - Categoriza automáticamente        │
│ - Retorna datos estructurados       │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ ExpenseForm Component               │
│ - Recibe datos estructurados        │
│ - Pre-llena campos del formulario   │
│ - Usuario revisa y confirma         │
│ - Submit al backend                 │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ financesService.createExpense()     │
│ - Valida datos                      │
│ - INSERT en evt_gastos              │
│ - INSERT en ocr_documents           │
│ - Sube archivo a Storage            │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ PostgreSQL Triggers                 │
│ - calculate_expense_totals()        │
│ - update_event_financials()         │
│ - Actualiza saldos de cuentas       │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ UI Updates                          │
│ - Muestra gasto creado              │
│ - Actualiza totales del evento      │
│ - Actualiza dashboard                │
└─────────────────────────────────────┘
```

## Módulos del Sistema

### Módulo de Eventos

**Dominio**: Gestión de proyectos/eventos empresariales

**Entidades**:
- Evento
- Cliente
- Tipo de Evento
- Estado de Evento

**Casos de Uso**:
- Crear/editar/eliminar eventos
- Cambiar estado del evento (workflow)
- Asignar cliente al evento
- Consultar eventos por filtros
- Calcular rentabilidad del evento

### Módulo de Finanzas

**Dominio**: Gestión de ingresos y gastos

**Entidades**:
- Ingreso
- Gasto
- Cuenta Contable
- Categoría de Gasto

**Casos de Uso**:
- Registrar ingreso/gasto
- Procesar factura CFDI
- Conciliar cuenta bancaria
- Generar reporte financiero
- Calcular utilidad por evento

### Módulo de OCR

**Dominio**: Procesamiento inteligente de documentos

**Entidades**:
- Documento OCR
- Extracción OCR
- Clasificación de Documento

**Casos de Uso**:
- Procesar documento con OCR
- Clasificar tipo de documento
- Extraer campos estructurados
- Validar datos extraídos
- Corregir errores de OCR

### Módulo de Contabilidad

**Dominio**: Gestión contable y reportes

**Entidades**:
- Cuenta Contable
- Asiento Contable
- Balance

**Casos de Uso**:
- Gestionar plan de cuentas
- Generar reportes contables
- Exportar a Excel
- Conciliar saldos

## Integración con Servicios Externos

### Google Cloud Vision API

**Propósito**: OCR de alta precisión

**Integración**:
```typescript
// src/modules/ocr/services/googleVisionService.ts
export async function extractText(imageBase64: string) {
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`,
    {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        }],
      }),
    }
  );

  const data = await response.json();
  return data.responses[0].fullTextAnnotation.text;
}
```

### Google Gemini AI

**Propósito**: Clasificación y extracción inteligente de datos

**Integración**:
```typescript
// src/modules/ocr/services/intelligentOCRClassifier.ts
export async function classifyAndExtract(text: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `
    Analiza el siguiente texto de un documento y extrae:
    - Tipo de documento (ticket, factura, recibo)
    - Proveedor
    - Total
    - Fecha
    - Categoría de gasto

    Texto: ${text}
  `;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}
```

### Supabase

**Propósito**: Backend completo (BD, Auth, Storage, Realtime)

**Integración**:
```typescript
// src/core/config/supabase.ts
export const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

// Uso en servicios
const { data, error } = await supabase
  .from('evt_eventos')
  .select('*')
  .eq('activo', true);
```

## Seguridad

### Autenticación

- JWT tokens via Supabase Auth
- Refresh tokens automáticos
- Session storage seguro

### Autorización

- Row Level Security (RLS) en PostgreSQL
- Políticas por tabla y operación
- Validación de permisos en hooks

```sql
-- Ejemplo de política RLS
CREATE POLICY "Users can only see their company's events"
ON evt_eventos
FOR SELECT
USING (
  company_id IN (
    SELECT company_id
    FROM core_users
    WHERE id = auth.uid()
  )
);
```

### Protección de Datos

- Encriptación en tránsito (HTTPS)
- Encriptación en reposo (Supabase)
- Sanitización de inputs
- Validación en cliente y servidor
- Rate limiting en API calls

## Escalabilidad

### Optimizaciones Actuales

1. **React Query Cache** - Reduce llamadas redundantes
2. **Índices en BD** - Queries optimizados
3. **Lazy Loading** - Componentes cargados bajo demanda
4. **Image Compression** - Reducción de tamaño de archivos
5. **Pagination** - Carga de datos en lotes

### Consideraciones Futuras

1. **CDN** - Para assets estáticos
2. **Redis Cache** - Cache distribuido
3. **Load Balancer** - Distribución de carga
4. **Database Sharding** - Particionamiento de datos
5. **Microservices** - Separación de módulos críticos

---

**Fecha**: Octubre 2025
**Versión**: 1.0.0
