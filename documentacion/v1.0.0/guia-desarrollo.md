# Guía de Desarrollo

## Configuración del Entorno

### Requisitos
- Node.js v18+
- MySQL 8.0+
- Git
- Editor de código (VS Code recomendado)

### Extensiones VS Code Recomendadas
- ESLint
- Prettier
- GitLens
- MySQL

## Estándares de Código

### JavaScript/Node.js
- Usar ES6+
- Nombres descriptivos en español
- Funciones documentadas con JSDoc
- Async/await para operaciones asíncronas

### React
- Componentes funcionales con hooks
- PropTypes para validación
- Nombres de componentes en PascalCase

### SQL
- Nombres de tablas en minúsculas
- Usar snake_case
- Índices en columnas de búsqueda

## Flujo de Trabajo Git

### Ramas
- `main`: Producción
- `develop`: Desarrollo
- `feature/nombre`: Nuevas características
- `fix/nombre`: Correcciones

### Commits
Formato: `tipo(alcance): descripción`

Tipos:
- `feat`: Nueva característica
- `fix`: Corrección
- `docs`: Documentación
- `refactor`: Refactorización
- `test`: Tests

Ejemplo: `feat(ventas): agregar cancelación de ventas`

## Creación de Nuevos Módulos

### 1. Backend
```bash
mkdir -p backend/modules/nuevo_modulo
cd backend/modules/nuevo_modulo
touch controller.js routes.js service.js model.js
```

### 2. Frontend
```bash
mkdir -p frontend/src/pages/NuevoModulo
mkdir -p frontend/src/components/nuevo_modulo
```

### 3. Base de Datos
```bash
# Crear nueva migración
touch database/migrations/00X_crear_tabla_nuevo.sql
```

## Testing

### Backend
```bash
npm test
```

### Frontend
```bash
cd frontend && npm test
```

## Despliegue

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm start
```
