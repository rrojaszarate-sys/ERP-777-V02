# Documentación Ejecutiva: Portal de Solicitudes

## Información General

| Campo | Valor |
|-------|-------|
| **Módulo** | Portal de Solicitudes |
| **Versión** | 1.0.0 |
| **Fecha** | Diciembre 2025 |
| **Estado** | Producción |
| **Audiencia** | Proveedores, Clientes, Dirección |

---

## 1. Descripción General

El **Portal de Solicitudes** es una interfaz web externa que permite a proveedores y clientes interactuar con el sistema ERP sin necesidad de acceso al sistema interno. Proporciona:

- Acceso seguro mediante autenticación con Google
- Vista de eventos asignados
- Sistema de mensajería bidireccional
- Carga de reportes de gastos con procesamiento OCR
- Dashboard personalizado por proveedor

---

## 2. Arquitectura del Portal

### 2.1 Componentes Principales

```
Portal de Solicitudes
├── Autenticación (Google OAuth)
├── Dashboard Principal
│   ├── Resumen de eventos
│   ├── Notificaciones
│   └── Métricas
├── Eventos del Proveedor
│   ├── Lista de eventos asignados
│   ├── Detalles del evento
│   └── Estado de pagos
├── Centro de Mensajes
│   ├── Bandeja de entrada
│   ├── Mensajes enviados
│   └── Nuevo mensaje
└── Reportes de Gastos
    ├── Lista de reportes
    ├── Nuevo reporte
    ├── Carga de comprobantes
    └── Estado de aprobación
```

### 2.2 Rutas del Portal

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/portal` | PortalLayout | Layout principal |
| `/portal/dashboard` | PortalDashboard | Dashboard principal |
| `/portal/eventos` | PortalEventos | Eventos asignados |
| `/portal/mensajes` | PortalMensajes | Centro de mensajes |
| `/portal/gastos` | PortalGastos | Reportes de gastos |
| `/portal/perfil` | PortalPerfil | Perfil del usuario |

---

## 3. Autenticación

### 3.1 Flujo de Autenticación

1. **Inicio de Sesión**
   - El proveedor hace clic en "Iniciar con Google"
   - Se redirige a Google OAuth
   - Google valida las credenciales
   - Se retorna el token al portal

2. **Vinculación de Cuenta**
   - El sistema busca el email en la tabla `proveedores_erp`
   - Si existe, vincula automáticamente
   - Si no existe, muestra error de proveedor no registrado

3. **Sesión Activa**
   - Token JWT almacenado en localStorage
   - Renovación automática antes de expirar
   - Logout cierra sesión en ambos sistemas

### 3.2 Configuración Requerida

```typescript
// Variables de entorno necesarias
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx
```

---

## 4. Funcionalidades Principales

### 4.1 Dashboard del Proveedor

El dashboard presenta un resumen ejecutivo:

| Sección | Información |
|---------|-------------|
| **Eventos Activos** | Número de eventos asignados actualmente |
| **Pagos Pendientes** | Monto total pendiente de pago |
| **Mensajes Nuevos** | Mensajes sin leer |
| **Próximo Evento** | Fecha del próximo evento |

**Widgets incluidos:**
- Calendario de eventos del mes
- Gráfica de ingresos por mes
- Lista de notificaciones recientes
- Accesos rápidos a funciones principales

### 4.2 Vista de Eventos

Lista de todos los eventos donde el proveedor está asignado.

**Campos visibles:**
- Nombre del evento
- Fecha y hora
- Ubicación
- Rol asignado
- Estado del evento
- Monto acordado
- Estado de pago

**Filtros disponibles:**
- Por fecha (rango)
- Por estado (pendiente, en curso, completado)
- Por estado de pago

### 4.3 Centro de Mensajes

Sistema de comunicación bidireccional entre proveedor y empresa.

**Características:**
- Bandeja de entrada con mensajes recibidos
- Mensajes enviados con estado de lectura
- Composición de nuevo mensaje
- Adjuntos de archivos (PDF, imágenes)
- Notificaciones por email (opcional)

**Tabla: mensajes_portal**
```sql
CREATE TABLE mensajes_portal (
  id SERIAL PRIMARY KEY,
  proveedor_id INTEGER REFERENCES proveedores_erp(id),
  asunto TEXT NOT NULL,
  contenido TEXT NOT NULL,
  tipo VARCHAR(20) DEFAULT 'general',
  direccion VARCHAR(20), -- 'entrante' o 'saliente'
  leido BOOLEAN DEFAULT FALSE,
  fecha_lectura TIMESTAMP,
  archivos_adjuntos JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

### 4.4 Reportes de Gastos

Sistema para que proveedores reporten gastos relacionados con eventos.

**Flujo de Reporte:**
1. Proveedor crea nuevo reporte
2. Selecciona evento relacionado
3. Agrega líneas de gasto con detalles
4. Adjunta comprobantes (fotos de tickets)
5. Sistema procesa OCR automáticamente
6. Reporte enviado para aprobación
7. Administrador aprueba/rechaza
8. Notificación al proveedor

**Estados del Reporte:**
| Estado | Descripción |
|--------|-------------|
| `borrador` | En edición por el proveedor |
| `enviado` | Pendiente de revisión |
| `en_revision` | Siendo revisado por administrador |
| `aprobado` | Aprobado para pago |
| `rechazado` | Rechazado con observaciones |
| `pagado` | Reintegro realizado |

**Procesamiento OCR:**
- Extracción automática de:
  - RFC del emisor
  - Fecha del comprobante
  - Subtotal, IVA, Total
  - Concepto principal
- Validación de formato de factura mexicana
- Almacenamiento de imagen original

---

## 5. Seguridad

### 5.1 Control de Acceso

- Cada proveedor solo ve sus propios datos
- RLS (Row Level Security) activo en todas las tablas
- Tokens con expiración de 24 horas
- Refresh token de 7 días

### 5.2 Políticas RLS

```sql
-- Proveedores solo ven sus eventos
CREATE POLICY "proveedores_ver_sus_eventos" 
ON eventos_proveedores_erp FOR SELECT
USING (proveedor_id = auth.uid()::integer);

-- Proveedores solo ven sus mensajes
CREATE POLICY "proveedores_ver_sus_mensajes"
ON mensajes_portal FOR SELECT
USING (proveedor_id = auth.uid()::integer);

-- Proveedores solo ven sus gastos
CREATE POLICY "proveedores_ver_sus_gastos"
ON gastos_proveedor_erp FOR SELECT
USING (proveedor_id = auth.uid()::integer);
```

### 5.3 Validaciones de Datos

- Todos los uploads pasan por validación de tipo MIME
- Tamaño máximo de archivo: 10MB
- Formatos permitidos: PDF, JPG, PNG
- Sanitización de inputs para prevenir XSS

---

## 6. Interfaz de Usuario

### 6.1 Diseño

- **Framework UI:** Tailwind CSS + shadcn/ui
- **Tema:** Coherente con sistema principal (paletas dinámicas)
- **Responsive:** Adaptado a móvil, tablet y desktop
- **Accesibilidad:** WCAG 2.1 AA

### 6.2 Componentes Principales

```typescript
// Estructura de componentes
src/modules/portal/
├── components/
│   ├── PortalLayout.tsx       // Layout con sidebar
│   ├── PortalHeader.tsx       // Header con usuario
│   ├── PortalSidebar.tsx      // Navegación lateral
│   ├── EventoCard.tsx         // Tarjeta de evento
│   ├── MensajeItem.tsx        // Ítem de mensaje
│   └── ReporteGastoForm.tsx   // Formulario de gastos
├── pages/
│   ├── PortalDashboard.tsx    // Dashboard principal
│   ├── PortalEventos.tsx      // Lista de eventos
│   ├── PortalMensajes.tsx     // Centro de mensajes
│   └── PortalGastos.tsx       // Reportes de gastos
└── hooks/
    ├── usePortalAuth.ts       // Autenticación
    ├── usePortalEventos.ts    // Datos de eventos
    └── usePortalMensajes.ts   // Datos de mensajes
```

---

## 7. Integraciones

### 7.1 Google OAuth

Configuración en Google Cloud Console:
1. Crear proyecto en GCP
2. Habilitar Google+ API
3. Configurar OAuth consent screen
4. Crear credenciales OAuth 2.0
5. Agregar URIs de redirección

### 7.2 OCR (Procesamiento de Comprobantes)

- **Servicio:** Google Cloud Vision API
- **Edge Function:** `supabase/functions/ocr-process`
- **Endpoint:** `/functions/v1/ocr-process`

**Request:**
```json
{
  "image": "base64_encoded_image",
  "tipo": "factura"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rfc": "ABC123456789",
    "fecha": "2025-12-01",
    "subtotal": 1000.00,
    "iva": 160.00,
    "total": 1160.00,
    "concepto": "Servicio de catering"
  }
}
```

### 7.3 Notificaciones por Email

- **Servicio:** Supabase Edge Functions con Resend
- **Eventos que disparan email:**
  - Nuevo mensaje recibido
  - Reporte de gastos aprobado/rechazado
  - Pago procesado
  - Nuevo evento asignado

---

## 8. Métricas y Reportes

### 8.1 Métricas del Portal

| Métrica | Descripción |
|---------|-------------|
| Usuarios activos | Proveedores que accedieron en últimos 30 días |
| Mensajes enviados | Total de mensajes por período |
| Gastos reportados | Suma de gastos por mes |
| Tiempo de respuesta | Promedio de respuesta a mensajes |

### 8.2 Reportes Disponibles

**Para Administradores:**
- Actividad de proveedores
- Gastos pendientes de aprobación
- Mensajes sin responder
- Proveedores más activos

**Para Proveedores:**
- Historial de pagos
- Eventos completados
- Resumen de gastos reembolsados

---

## 9. Configuración de Despliegue

### 9.1 Variables de Entorno

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx

# Google OAuth
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com

# Portal
VITE_PORTAL_URL=https://portal.tudominio.com
VITE_API_BASE_URL=https://api.tudominio.com
```

### 9.2 Build para Producción

```bash
# Build del portal
npm run build

# Variables específicas
VITE_APP_ENV=production npm run build
```

---

## 10. Soporte y Mantenimiento

### 10.1 Logs y Monitoreo

- Logs en Supabase Dashboard
- Errores de autenticación registrados
- Métricas de uso por proveedor

### 10.2 Problemas Comunes

| Problema | Solución |
|----------|----------|
| No puede iniciar sesión | Verificar que el email esté registrado como proveedor |
| No ve sus eventos | Verificar asignación en eventos_proveedores_erp |
| OCR no funciona | Verificar configuración de Google Vision API |
| Mensajes no se envían | Verificar conexión y RLS policies |

---

## 11. Roadmap

### Próximas Funcionalidades

- [ ] App móvil nativa (React Native)
- [ ] Firma digital de contratos
- [ ] Chat en tiempo real
- [ ] Calendario sincronizado con Google/Outlook
- [ ] Portal multi-idioma (EN/ES)
- [ ] Notificaciones push

---

*Documento generado para el equipo de desarrollo y stakeholders.*  
*Última actualización: Diciembre 2025*
