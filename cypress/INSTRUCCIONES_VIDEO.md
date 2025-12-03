# Generación de Video de Demostración - Módulo de Eventos

## Archivos de Prueba Creados

| Archivo | Descripción |
|---------|-------------|
| `cypress/e2e/demo-eventos-video.cy.ts` | Suite optimizada para video de demostración |
| `cypress/e2e/eventos-modulo-completo.cy.ts` | Suite completa con todas las pruebas |

## Requisitos

1. **Node.js** instalado (v18+)
2. **Servidor de desarrollo** ejecutándose en `http://localhost:5174`
3. **Chrome** o **Electron** instalado

## Ejecutar desde Windows (Recomendado)

### Opción 1: Script Automático

```bash
# En la carpeta del proyecto
run-cypress-demo.bat
```

### Opción 2: Línea de Comandos

```bash
# 1. Abrir terminal en la carpeta del proyecto

# 2. Iniciar servidor de desarrollo (en una terminal)
npm run dev

# 3. Ejecutar pruebas (en otra terminal)
npx cypress run --spec "cypress/e2e/demo-eventos-video.cy.ts" --browser chrome
```

### Opción 3: Modo Interactivo (para ver en tiempo real)

```bash
npx cypress open
```

Luego seleccionar:
- E2E Testing
- Chrome (o tu navegador preferido)
- Archivo: `demo-eventos-video.cy.ts`

## Ubicación del Video

Los videos se guardan en:
```
cypress/videos/demo-eventos-video.cy.ts.mp4
```

## Estructura del Video de Demostración

El video muestra las siguientes secciones:

### 1. Dashboard Principal
- Carga inicial del sistema
- Métricas generales

### 2. Gestión de Clientes
- Listado de clientes
- Búsqueda de clientes
- Modal de nuevo cliente

### 3. Listado de Eventos
- Vista de tabla
- Filtros y búsqueda

### 4. Detalle de Evento
- **Tab Overview**: Métricas y gráficos gauge
- **Tab Ingresos**: Listado y totales
- **Tab Gastos**: Navegación por categorías
  - Todos
  - Combustible/Peaje
  - Materiales
  - RH (Recursos Humanos)
  - SPs (Solicitudes de Pago)
- **Tab Provisiones**: Listado y categorías
- **Tab Workflow**: Estados y avance

### 5. Workflow Visual
- Diagrama de flujo de estados

### 6. Análisis Financiero
- Gráficos y métricas
- Dashboard financiero

### 7. Catálogos
- Configuración del módulo

### 8. Integración con Inventario
- Dashboard de inventario
- Productos disponibles
- Integración evento-almacén

## Configuración de Video

La configuración en `cypress.config.js`:

```javascript
{
  video: true,
  videoCompression: 32,
  videosFolder: "cypress/videos",
  viewportWidth: 1920,
  viewportHeight: 1080,
}
```

## Personalización

### Cambiar tiempos de pausa

En `demo-eventos-video.cy.ts`:

```typescript
const PAUSE_SHORT = 800;   // Pausas cortas
const PAUSE_MEDIUM = 1500; // Pausas medias
const PAUSE_LONG = 2500;   // Pausas largas
```

### Cambiar resolución

En `cypress.config.js`:

```javascript
viewportWidth: 1920,
viewportHeight: 1080,
```

## Solución de Problemas

### Error SIGILL en WSL2

Cypress no es compatible con WSL2 directamente. Ejecutar desde Windows nativo.

### El servidor no está en el puerto correcto

Editar `cypress.config.js`:
```javascript
baseUrl: "http://localhost:5174",  // Cambiar al puerto correcto
```

### Video muy largo/corto

Ajustar las constantes de pausa en el archivo de pruebas.

## Contacto

Para soporte técnico: desarrollo@madegroup.mx
