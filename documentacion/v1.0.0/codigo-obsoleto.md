# Registro de Código Obsoleto

## Fecha de análisis: [FECHA]

---

## Archivos Obsoletos Identificados

### Backend

#### Controladores no utilizados
- `/backend/controllers/old_inventarios.js` - Reemplazado por `/backend/modules/inventarios/controller.js`
- `/backend/controllers/old_ventas.js` - Reemplazado por `/backend/modules/ventas/controller.js`

#### Rutas deprecadas
- `/backend/routes/api_v1.js` - Se migró a `/backend/routes/api.js`
- `/backend/routes/legacy.js` - Funcionalidad integrada en nuevas rutas

#### Middlewares no utilizados
- `/backend/middleware/old_auth.js` - Reemplazado por `/backend/middleware/auth.js`
- `/backend/middleware/logger_old.js` - Funcionalidad integrada en nuevo logger

### Frontend

#### Componentes obsoletos
- `/frontend/src/components/old/` - Directorio completo de componentes antiguos
- `/frontend/src/views/legacy/` - Vistas antiguas no utilizadas

#### Servicios deprecados
- `/frontend/src/services/api_old.js` - Reemplazado por `/frontend/src/services/api.js`

### Base de Datos

#### Scripts obsoletos
- `/database/migrations/old/` - Migraciones antiguas ya aplicadas
- `/database/seeds/test_data_old.sql` - Datos de prueba obsoletos

---

## Código Duplicado Identificado

### 1. Validadores
**Ubicaciones**:
- `/backend/utils/validators.js`
- `/backend/helpers/validation.js`

**Acción recomendada**: Consolidar en `/backend/utils/validators.js`

### 2. Formateo de fechas
**Ubicaciones**:
- `/frontend/src/utils/dateFormatter.js`
- `/frontend/src/helpers/dates.js`

**Acción recomendada**: Consolidar en `/frontend/src/utils/formatters.js`

### 3. Consultas SQL similares
**Ubicaciones**:
- Múltiples archivos de modelos con consultas duplicadas

**Acción recomendada**: Crear repositorio base con métodos comunes

---

## Dependencias No Utilizadas

### Backend (package.json)
```json
{
  "unused-package-1": "^1.0.0",
  "old-library": "^2.3.4"
}
```

### Frontend (package.json)
```json
{
  "legacy-component-lib": "^3.0.0",
  "unused-util": "^1.2.3"
}
```

---

## Plan de Limpieza

### Fase 1: Respaldo (Semana 1)
- Mover archivos obsoletos a `/backup/codigo-obsoleto/[fecha]/`
- Crear script de restauración
- Documentar ubicaciones originales

### Fase 2: Consolidación (Semana 2)
- Eliminar código duplicado
- Unificar funcionalidades similares
- Actualizar referencias

### Fase 3: Eliminación (Semana 3)
- Remover dependencias no utilizadas
- Limpiar imports innecesarios
- Optimizar bundle size

### Fase 4: Validación (Semana 4)
- Ejecutar suite de pruebas completa
- Verificar funcionalidad en todos los módulos
- Documentar cambios realizados
