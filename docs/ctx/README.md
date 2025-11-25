# Database Context Documentation

Documentación completa del esquema de base de datos del sistema MADE ERP v2.0.

## 📚 Contenido

### Base de Datos (`db/`)
- **OVERVIEW.md** - Información general del servidor PostgreSQL/Supabase
- **SCHEMAS.md** - Esquemas disponibles en la base de datos
- **TABLES.md** - Lista de tablas con estado RLS y accesibilidad
- **COLUMNS.md** - Definición completa de todas las columnas
- **CONSTRAINTS.md** - Primary keys, foreign keys y constraints
- **INDEXES.md** - Índices para optimización de consultas
- **TYPES_ENUMS.md** - Tipos de datos y ENUMs personalizados
- **SEQUENCES.md** - Secuencias auto-incrementales
- **FUNCTIONS.sql** - Funciones PL/pgSQL
- **TRIGGERS.sql** - Triggers de base de datos
- **VIEWS.sql** - Vistas SQL
- **MATVIEWS.sql** - Vistas materializadas
- **POLICIES_RLS.md** - Políticas de Row Level Security
- **MIGRATIONS.md** - Historial de migraciones aplicadas

### Storage (`storage/`)
- **BUCKETS.md** - Buckets de Supabase Storage
- **POLICIES.md** - Políticas de acceso a Storage

## 🔍 Navegación Rápida

### Por Módulo

#### Core System
- `core_companies` - Empresas/organizaciones
- `core_users` - Usuarios del sistema
- `core_roles` - Roles de usuario
- `core_user_roles` - Asignación de roles a usuarios
- `core_system_config` - Configuración del sistema
- `core_security_config` - Configuración de seguridad
- `core_audit_log` - Log de auditoría

#### Eventos
- `evt_eventos` - Eventos principales
- `evt_clientes` - Clientes
- `evt_ingresos` - Ingresos por evento
- `evt_gastos` - Gastos por evento
- `evt_tipos_evento` - Tipos/categorías de eventos
- `evt_estados` - Estados del workflow
- `evt_categorias_gastos` - Categorías de gastos

## 🔐 Seguridad

- ✓ **RLS habilitado**: 14/14 tablas (100%)
- ✓ **Políticas activas**: 15 políticas configuradas
- ✓ **Todas las tablas accesibles** vía API con autenticación

## 📊 Estadísticas

| Métrica | Valor |
|---------|-------|
| Tablas | 14 |
| Columnas | 224 |
| Índices | 19 |
| Funciones | 1 |
| Triggers | 11 |
| Políticas RLS | 15 |

## 🚀 Uso

Esta documentación sirve como referencia para:
- Desarrollo de nuevas funcionalidades
- Debugging y troubleshooting
- Análisis de rendimiento
- Auditoría de seguridad
- Onboarding de nuevos desarrolladores

## 📝 Actualización

Esta documentación fue generada automáticamente el 2025-10-04.

Para regenerar:
```bash
node db_introspect_v2.mjs
```

## 📄 Reportes

Ver `reports/db_introspection_summary.md` para un resumen ejecutivo completo.
