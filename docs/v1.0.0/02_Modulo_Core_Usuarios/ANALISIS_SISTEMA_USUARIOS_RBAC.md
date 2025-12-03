# Análisis Completo: Sistema de Usuarios, Roles y Permisos (RBAC)

**Fecha:** 2025-12-02
**Versión:** 1.0.0
**Estado:** Análisis para Implementación

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Estado Actual del Sistema](#2-estado-actual-del-sistema)
3. [Infraestructura Existente](#3-infraestructura-existente)
4. [Brechas Identificadas](#4-brechas-identificadas)
5. [Arquitectura Propuesta](#5-arquitectura-propuesta)
6. [Plan de Implementación](#6-plan-de-implementación)
7. [Valor Agregado y Diferenciadores](#7-valor-agregado-y-diferenciadores)
8. [Riesgos y Mitigación](#8-riesgos-y-mitigación)

---

## 1. Resumen Ejecutivo

### 1.1 Situación Actual

El sistema ERP cuenta con una **infraestructura de RBAC bien diseñada** pero **no implementada en producción**:

| Componente | Estado | Descripción |
|------------|--------|-------------|
| Tablas de usuarios | ✅ Existe | `core_users`, `core_roles`, `core_user_roles` |
| Sistema de permisos | ✅ Existe | Matriz de permisos granular en código |
| Hook usePermissions | ✅ Existe | Listo para usar |
| Autenticación | ⚠️ Parcial | Solo en modo desarrollo |
| RLS (Row Level Security) | ❌ No activo | Políticas permisivas (USING true) |
| Rutas protegidas | ❌ No existe | Todas las rutas son públicas |
| UI de gestión | ❌ No existe | Sin páginas de usuarios/roles |

### 1.2 Datos en Base de Datos

```
┌──────────────────────┬───────────┐
│ Tabla                │ Registros │
├──────────────────────┼───────────┤
│ core_users           │     3     │
│ core_roles           │     3     │
│ core_user_roles      │     3     │
│ core_companies       │     1     │
│ core_security_config │     2     │
│ core_audit_log       │    10     │
│ auth.users (Supabase)│     1     │
└──────────────────────┴───────────┘
```

### 1.3 Objetivo

Implementar un sistema completo de autenticación y autorización que permita:
- Login real con Supabase Auth
- Control de acceso basado en roles (RBAC)
- Row Level Security (RLS) por empresa
- Gestión de usuarios desde la UI
- Auditoría de acciones

---

## 2. Estado Actual del Sistema

### 2.1 Arquitectura de Autenticación

```
┌─────────────────────────────────────────────────────────────────┐
│                    MODO DESARROLLO (Actual)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐      ┌──────────────────────┐                │
│   │   Usuario    │─────▶│   AuthProvider.tsx   │                │
│   │  (Browser)   │      │                      │                │
│   └──────────────┘      │  • Selector de rol   │                │
│                         │  • Usuario simulado  │                │
│                         │  • Sin validación    │                │
│                         └──────────────────────┘                │
│                                   │                              │
│                                   ▼                              │
│                         ┌──────────────────────┐                │
│                         │    Acceso Total      │                │
│                         │  Sin Restricciones   │                │
│                         └──────────────────────┘                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Usuarios de Prueba Existentes

| ID (UUID) | Email | Nombre | Rol | Empresa |
|-----------|-------|--------|-----|---------|
| `...0001` | desarrollo@test.com | Usuario Sistema | Administrador | MADE Events |
| `...0002` | ejecutivo@madeevents.mx | Juan Carlos Pérez | Ejecutivo | MADE Events |
| `...0003` | viewer@madeevents.mx | María Elena González | Visualizador | MADE Events |

### 2.3 Roles Definidos

```typescript
// En core_roles
{
  "Administrador": ["*.*.*.*"],                    // Acceso total
  "Ejecutivo": ["eventos.create.*.*", ...],       // CRUD operativo
  "Visualizador": ["eventos.read.*.*", ...]       // Solo lectura
}
```

### 2.4 Variables de Entorno Actuales

```env
VITE_SECURITY_MODE="development"    # ⚠️ Bypass de autenticación
VITE_ENABLE_PERMISSIONS="false"     # ⚠️ Permisos deshabilitados
```

---

## 3. Infraestructura Existente

### 3.1 Tablas de Base de Datos

#### core_users
```sql
CREATE TABLE core_users (
  id uuid PRIMARY KEY,
  company_id uuid REFERENCES core_companies(id),
  email varchar(255) UNIQUE NOT NULL,
  nombre varchar(255) NOT NULL,
  apellidos varchar(255),
  telefono varchar(20),
  puesto varchar(100),
  avatar_url text,
  activo boolean DEFAULT true,
  ultimo_login timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);
```

#### core_roles
```sql
CREATE TABLE core_roles (
  id serial PRIMARY KEY,
  nombre varchar(100) UNIQUE NOT NULL,
  descripcion text,
  permisos jsonb DEFAULT '[]',  -- Array de permisos
  activo boolean DEFAULT true,
  created_at timestamptz
);
```

#### core_user_roles
```sql
CREATE TABLE core_user_roles (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES core_users(id),
  role_id integer REFERENCES core_roles(id),
  asignado_por uuid,
  fecha_asignacion timestamptz,
  activo boolean DEFAULT true,
  UNIQUE(user_id, role_id)
);
```

### 3.2 Sistema de Permisos en Código

**Ubicación:** `src/core/config/constants.ts`

```typescript
// Formato: module.action.resource.scope
PERMISSION_MATRIX = {
  'Administrador': [
    '*.*.*.*',                      // Wildcard total
    'system.admin.database.*',      // Admin BD
    'gastos.delete.hard.*',         // Hard delete
  ],
  'Ejecutivo': [
    'eventos.create.*.*',
    'eventos.update.*.*',
    'gastos.delete.soft.*',         // Solo soft delete
    'reportes.export.*.*',
  ],
  'Visualizador': [
    'eventos.read.*.*',
    'reportes.read.*.*',
  ]
}
```

**Hook de Permisos:** `src/core/permissions/usePermissions.ts`

```typescript
// Funciones disponibles
hasPermission(module, action, resource, scope)
canCreate(module)
canRead(module)
canUpdate(module)
canDelete(module)
canDeleteHard(module)
canAdminDatabase()
```

### 3.3 RLS en Tablas

| Tabla | RLS Enabled | Políticas Activas |
|-------|-------------|-------------------|
| core_users | Sí | 0 (ninguna) |
| core_roles | Sí | 0 |
| core_companies | Sí | 0 |
| evt_eventos_erp | Sí | 0 |
| evt_gastos_erp | Sí | 0 |
| cont_gastos_externos | Sí | 0 |

**Estado:** RLS habilitado pero sin políticas restrictivas.

---

## 4. Brechas Identificadas

### 4.1 ❌ Lo que NO Tenemos

#### Autenticación
- [ ] Página de login funcional en producción
- [ ] Flujo de registro de usuarios
- [ ] Reset de contraseña
- [ ] Verificación de email
- [ ] 2FA/MFA
- [ ] Gestión de sesiones

#### Gestión de Usuarios
- [ ] Página de listado de usuarios
- [ ] Formulario crear/editar usuario
- [ ] Invitar usuarios por email
- [ ] Ver historial de login
- [ ] Gestión de avatar/perfil

#### Gestión de Roles
- [ ] Página de gestión de roles
- [ ] CRUD de roles
- [ ] Editor visual de permisos
- [ ] Asignación de roles a usuarios
- [ ] Roles temporales con expiración

#### Seguridad
- [ ] Rutas protegidas (ProtectedRoute)
- [ ] Guards de autenticación
- [ ] Guards de permisos
- [ ] Políticas RLS restrictivas
- [ ] Auditoría automática

#### UI/UX
- [ ] Menú dinámico según permisos
- [ ] Botones deshabilitados sin permisos
- [ ] Página 401/403

### 4.2 ⚠️ Lo que Tenemos Incompleto

| Componente | Existe | Funciona | Producción |
|------------|--------|----------|------------|
| AuthProvider | ✅ | ⚠️ Dev only | ❌ |
| usePermissions | ✅ | ⚠️ Bypassed | ❌ |
| Tabla core_users | ✅ | ✅ | ⚠️ |
| Tabla core_roles | ✅ | ✅ | ⚠️ |
| RLS | ✅ Enabled | ❌ USING(true) | ❌ |
| Audit Log | ✅ Tabla | ❌ No se usa | ❌ |

---

## 5. Arquitectura Propuesta

### 5.1 Flujo de Autenticación Objetivo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      MODO PRODUCCIÓN (Objetivo)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐      ┌──────────────────────┐                        │
│   │   Usuario    │─────▶│    LoginPage.tsx     │                        │
│   │  (Browser)   │      │  Email + Password    │                        │
│   └──────────────┘      └──────────┬───────────┘                        │
│                                    │                                     │
│                                    ▼                                     │
│                         ┌──────────────────────┐                        │
│                         │   Supabase Auth      │                        │
│                         │  • Validar creds     │                        │
│                         │  • Crear sesión      │                        │
│                         │  • Retornar JWT      │                        │
│                         └──────────┬───────────┘                        │
│                                    │                                     │
│                                    ▼                                     │
│                         ┌──────────────────────┐                        │
│                         │   AuthProvider       │                        │
│                         │  • Cargar perfil     │                        │
│                         │  • Cargar roles      │                        │
│                         │  • Cargar permisos   │                        │
│                         └──────────┬───────────┘                        │
│                                    │                                     │
│                    ┌───────────────┼───────────────┐                    │
│                    ▼               ▼               ▼                    │
│           ┌───────────────┐ ┌───────────────┐ ┌───────────────┐        │
│           │ ProtectedRoute│ │  usePermissions│ │  RLS Policies │        │
│           │ • Autenticado │ │  • hasPermission│ │  • company_id │        │
│           │ • Tiene rol   │ │  • canCreate   │ │  • user_roles │        │
│           └───────────────┘ └───────────────┘ └───────────────┘        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Modelo de Datos Extendido

```sql
-- Agregar campos faltantes a core_users
ALTER TABLE core_users ADD COLUMN IF NOT EXISTS
  auth_user_id uuid REFERENCES auth.users(id),  -- Vinculo con Supabase Auth
  preferencias jsonb DEFAULT '{}',
  requiere_2fa boolean DEFAULT false,
  ultimo_cambio_password timestamptz,
  intentos_fallidos integer DEFAULT 0,
  bloqueado_hasta timestamptz;

-- Nueva tabla: Permisos granulares por módulo
CREATE TABLE core_module_permissions (
  id serial PRIMARY KEY,
  role_id integer REFERENCES core_roles(id),
  module varchar(50) NOT NULL,
  permissions jsonb NOT NULL,  -- {create: true, read: true, update: true, delete: false}
  created_at timestamptz DEFAULT now()
);

-- Nueva tabla: Sesiones activas
CREATE TABLE core_user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES core_users(id),
  token_hash varchar(255),
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

-- Nueva tabla: Invitaciones pendientes
CREATE TABLE core_user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL,
  role_id integer REFERENCES core_roles(id),
  company_id uuid REFERENCES core_companies(id),
  invited_by uuid REFERENCES core_users(id),
  token varchar(255) UNIQUE,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

### 5.3 Políticas RLS Propuestas

```sql
-- Política: Usuarios solo ven su empresa
CREATE POLICY "users_same_company" ON core_users
  FOR ALL
  USING (company_id = auth.jwt() ->> 'company_id');

-- Política: Eventos filtrados por empresa
CREATE POLICY "events_company_isolation" ON evt_eventos_erp
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM core_users
      WHERE core_users.auth_user_id = auth.uid()
      AND core_users.company_id = evt_eventos_erp.company_id
    )
  );

-- Política: Solo admins pueden hard delete
CREATE POLICY "admin_hard_delete" ON evt_gastos_erp
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM core_user_roles ur
      JOIN core_roles r ON ur.role_id = r.id
      JOIN core_users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND r.nombre = 'Administrador'
    )
  );
```

### 5.4 Estructura de Componentes

```
src/
├── core/
│   ├── auth/
│   │   ├── AuthProvider.tsx          # Contexto de auth (MEJORAR)
│   │   ├── useAuth.ts                 # Hook de auth
│   │   ├── ProtectedRoute.tsx         # Guard de rutas (NUEVO)
│   │   └── RequirePermission.tsx      # Guard de permisos (NUEVO)
│   ├── permissions/
│   │   ├── usePermissions.ts          # Hook existente
│   │   ├── PermissionGate.tsx         # Componente condicional (NUEVO)
│   │   └── permissionUtils.ts         # Utilidades (NUEVO)
│   └── services/
│       ├── authService.ts             # Llamadas a Supabase Auth (NUEVO)
│       ├── userService.ts             # CRUD usuarios (NUEVO)
│       └── roleService.ts             # CRUD roles (NUEVO)
│
├── modules/
│   └── admin/
│       ├── pages/
│       │   ├── UsersPage.tsx          # Listado usuarios (NUEVO)
│       │   ├── UserFormPage.tsx       # Crear/editar usuario (NUEVO)
│       │   ├── RolesPage.tsx          # Gestión roles (NUEVO)
│       │   ├── PermissionsPage.tsx    # Editor permisos (NUEVO)
│       │   ├── AuditLogPage.tsx       # Logs de auditoría (NUEVO)
│       │   └── SecurityConfigPage.tsx # Config seguridad (NUEVO)
│       ├── components/
│       │   ├── UserTable.tsx
│       │   ├── UserForm.tsx
│       │   ├── RoleCard.tsx
│       │   ├── PermissionMatrix.tsx
│       │   └── InviteUserModal.tsx
│       └── hooks/
│           ├── useUsers.ts
│           ├── useRoles.ts
│           └── useAuditLog.ts
│
└── pages/
    ├── LoginPage.tsx                  # Página login (MEJORAR)
    ├── ForgotPasswordPage.tsx         # Reset password (NUEVO)
    ├── AcceptInvitePage.tsx           # Aceptar invitación (NUEVO)
    └── UnauthorizedPage.tsx           # Error 403 (NUEVO)
```

---

## 6. Plan de Implementación

### Fase 1: Fundamentos de Autenticación (Sprint 1)

#### Semana 1-2

| Tarea | Prioridad | Complejidad |
|-------|-----------|-------------|
| Mejorar AuthProvider para producción | CRÍTICA | Media |
| Crear LoginPage funcional | CRÍTICA | Baja |
| Implementar ProtectedRoute | CRÍTICA | Media |
| Conectar auth.users con core_users | CRÍTICA | Media |
| Página de logout | ALTA | Baja |

**Entregables:**
- Login/logout funcional
- Rutas protegidas por autenticación
- Sincronización de usuarios Supabase ↔ core_users

### Fase 2: Sistema de Roles y Permisos (Sprint 2)

#### Semana 3-4

| Tarea | Prioridad | Complejidad |
|-------|-----------|-------------|
| Cargar roles desde BD en AuthProvider | CRÍTICA | Media |
| Activar usePermissions en todos los módulos | ALTA | Alta |
| Crear UI de gestión de usuarios | ALTA | Media |
| Crear UI de gestión de roles | ALTA | Media |
| Menú dinámico según permisos | MEDIA | Media |

**Entregables:**
- Permisos funcionales en toda la app
- CRUD de usuarios
- CRUD de roles
- Navegación condicional

### Fase 3: Row Level Security (Sprint 3)

#### Semana 5-6

| Tarea | Prioridad | Complejidad |
|-------|-----------|-------------|
| Crear políticas RLS por company_id | CRÍTICA | Alta |
| Crear políticas RLS por rol | ALTA | Alta |
| Testing exhaustivo de RLS | CRÍTICA | Alta |
| Documentar políticas RLS | MEDIA | Baja |

**Entregables:**
- Aislamiento de datos por empresa
- Restricciones de acceso por rol
- Suite de tests RLS

### Fase 4: Funcionalidades Avanzadas (Sprint 4)

#### Semana 7-8

| Tarea | Prioridad | Complejidad |
|-------|-----------|-------------|
| Sistema de invitaciones | MEDIA | Media |
| Reset de contraseña | ALTA | Baja |
| Auditoría automática | ALTA | Media |
| UI de logs de auditoría | MEDIA | Media |
| Multi-factor auth (2FA) | MEDIA | Alta |

**Entregables:**
- Flujo de invitación de usuarios
- Reset password por email
- Logs de auditoría completos
- 2FA opcional

---

## 7. Valor Agregado y Diferenciadores

### 7.1 Funcionalidades Base (Necesarias)

| Funcionalidad | Descripción |
|---------------|-------------|
| Login/Logout | Autenticación con Supabase |
| RBAC básico | 3 roles predefinidos |
| RLS | Aislamiento por empresa |
| Gestión usuarios | CRUD desde UI |

### 7.2 Funcionalidades Avanzadas (Deberíamos Tener)

| Funcionalidad | Descripción | Valor |
|---------------|-------------|-------|
| Roles personalizables | Admin puede crear roles | Flexibilidad |
| Permisos granulares | Por módulo/acción | Control fino |
| Auditoría completa | Log de todas las acciones | Trazabilidad |
| Sesiones activas | Ver/cerrar sesiones | Seguridad |
| Políticas de contraseña | Complejidad, expiración | Cumplimiento |

### 7.3 Diferenciadores (Podemos Agregar)

| Funcionalidad | Descripción | Valor Agregado |
|---------------|-------------|----------------|
| 🔐 **SSO** | Login con Google/Microsoft | UX empresarial |
| 📱 **2FA/MFA** | Autenticación multi-factor | Seguridad premium |
| 👥 **Jerarquía de aprobación** | Flujos de aprobación por rol | Gobernanza |
| 📊 **Dashboard de seguridad** | Métricas, alertas, tendencias | Visibilidad |
| 🔔 **Alertas de seguridad** | Login sospechoso, brute force | Proactividad |
| 📜 **Políticas por compañía** | Config de seguridad por tenant | Multi-tenant |
| 🌍 **Restricción geográfica** | Bloqueo por país/IP | Cumplimiento |
| ⏰ **Horarios de acceso** | Restricción por horario | Control laboral |
| 📱 **App móvil auth** | Push notifications para 2FA | Conveniencia |
| 🔄 **Rotación de tokens** | Renovación automática | Seguridad |

### 7.4 Innovaciones Propuestas

#### 1. **Panel de Control de Seguridad**
```
┌────────────────────────────────────────────────────────────┐
│  🔒 SECURITY DASHBOARD                                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Usuarios Activos: 45    Sesiones: 52    Alertas: 3 ⚠️    │
│                                                            │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ Logins Hoy       │  │ Acciones Críticas│               │
│  │ ████████░░ 80%   │  │ 12 eliminaciones │               │
│  │ 127 exitosos     │  │ 3 cambios config │               │
│  │ 8 fallidos       │  │ 45 exports       │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                            │
│  [Ver Audit Log] [Config Alertas] [Exportar Reporte]      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### 2. **Asistente de Permisos con IA**
- Sugerir permisos basados en el puesto
- Detectar permisos excesivos
- Recomendar roles similares

#### 3. **Modo "Incógnito" para Admins**
- Ver la app como otro usuario
- Sin modificar datos
- Para testing y soporte

#### 4. **Expiración de Permisos**
- Permisos temporales (ej: acceso a proyecto)
- Notificación antes de expirar
- Renovación con aprobación

---

## 8. Riesgos y Mitigación

### 8.1 Riesgos Técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| RLS mal configurado | Media | CRÍTICO | Testing exhaustivo |
| Pérdida de sesiones | Baja | Alto | Manejo de errores |
| Performance con muchos usuarios | Baja | Medio | Índices optimizados |
| Incompatibilidad con código existente | Alta | Medio | Migración gradual |

### 8.2 Riesgos de Negocio

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Usuarios sin acceso por error | Media | Alto | Rol de respaldo |
| Admins bloqueados | Baja | CRÍTICO | Super-admin en BD |
| Resistencia al cambio | Alta | Medio | Capacitación |

### 8.3 Plan de Rollback

1. Variable `VITE_SECURITY_MODE=development` reactiva modo desarrollo
2. Script SQL para restaurar políticas RLS permisivas
3. Usuario admin de emergencia en BD

---

## Apéndice A: Checklist de Implementación

### Autenticación
- [ ] AuthProvider mejorado
- [ ] LoginPage funcional
- [ ] LogoutPage
- [ ] ProtectedRoute
- [ ] Página 401 Unauthorized
- [ ] Página 403 Forbidden
- [ ] Reset password
- [ ] Verificación email

### Usuarios
- [ ] UsersPage (listado)
- [ ] UserFormPage (crear/editar)
- [ ] UserProfilePage
- [ ] InviteUserModal
- [ ] userService.ts

### Roles
- [ ] RolesPage
- [ ] RoleFormPage
- [ ] PermissionMatrix
- [ ] roleService.ts

### Permisos
- [ ] Activar usePermissions globalmente
- [ ] PermissionGate component
- [ ] Menú dinámico
- [ ] Botones condicionales

### RLS
- [ ] Políticas por company_id
- [ ] Políticas por rol
- [ ] Políticas de auditoría
- [ ] Tests de RLS

### Auditoría
- [ ] Trigger automático
- [ ] AuditLogPage
- [ ] Export de logs
- [ ] Alertas

---

## Apéndice B: Estimación de Esfuerzo

| Fase | Duración | Desarrolladores | Story Points |
|------|----------|-----------------|--------------|
| Fase 1: Auth básico | 2 semanas | 1 | 21 |
| Fase 2: RBAC | 2 semanas | 1-2 | 34 |
| Fase 3: RLS | 2 semanas | 1 | 21 |
| Fase 4: Avanzado | 2 semanas | 1 | 21 |
| **Total** | **8 semanas** | 1-2 | **97** |

---

**Documento generado automáticamente por Claude Code**
**Próximos pasos:** Revisión con el equipo y priorización de features
