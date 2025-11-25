# Database Constraints

*Extracted from migration files*

## core_audit_log

**Primary Keys:**
- id

**Foreign Keys:**
- company_id: `company_id uuid REFERENCES core_companies(id),`
- user_id: `user_id uuid REFERENCES core_users(id),`

## core_companies

**Primary Keys:**
- id

**Unique:**
- rfc

## core_roles

**Primary Keys:**
- id

**Unique:**
- nombre

## core_security_config

**Primary Keys:**
- id

**Foreign Keys:**
- company_id: `company_id uuid REFERENCES core_companies(id),`
- updated_by: `updated_by uuid REFERENCES core_users(id)`

## core_system_config

**Primary Keys:**
- id

**Foreign Keys:**
- company_id: `company_id uuid REFERENCES core_companies(id),`
- updated_by: `updated_by uuid REFERENCES core_users(id),`

## core_user_roles

**Primary Keys:**
- id

**Foreign Keys:**
- user_id: `user_id uuid REFERENCES core_users(id) ON DELETE CASCADE,`
- role_id: `role_id integer REFERENCES core_roles(id) ON DELETE CASCADE,`
- asignado_por: `asignado_por uuid REFERENCES core_users(id),`

## core_users

**Primary Keys:**
- id

**Foreign Keys:**
- company_id: `company_id uuid REFERENCES core_companies(id) ON DELETE CASCADE,`

**Unique:**
- email

## evt_categorias_gastos

**Primary Keys:**
- id

**Foreign Keys:**
- company_id: `company_id uuid REFERENCES core_companies(id),`

## evt_clientes

**Primary Keys:**
- id
- id

**Foreign Keys:**
- company_id: `company_id uuid REFERENCES core_companies(id),`
- created_by: `created_by uuid REFERENCES core_users(id)`

## evt_estados

**Primary Keys:**
- id

**Unique:**
- nombre

## evt_eventos

**Primary Keys:**
- id

**Foreign Keys:**
- company_id: `company_id uuid REFERENCES core_companies(id),`
- cliente_id: `cliente_id integer REFERENCES evt_clientes(id),`
- tipo_evento_id: `tipo_evento_id integer REFERENCES evt_tipos_evento(id),`
- estado_id: `estado_id integer REFERENCES evt_estados(id) DEFAULT 1,`
- responsable_id: `responsable_id uuid REFERENCES core_users(id),`
- created_by: `created_by uuid REFERENCES core_users(id),`
- updated_by: `updated_by uuid REFERENCES core_users(id)`

**Unique:**
- clave_evento

## evt_gastos

**Primary Keys:**
- id

**Foreign Keys:**
- evento_id: `evento_id integer REFERENCES evt_eventos(id) ON DELETE CASCADE,`
- categoria_id: `categoria_id integer REFERENCES evt_categorias_gastos(id),`
- aprobado_por: `aprobado_por uuid REFERENCES core_users(id),`
- deleted_by: `deleted_by uuid REFERENCES core_users(id),`
- created_by: `created_by uuid REFERENCES core_users(id)`

## evt_ingresos

**Primary Keys:**
- id

**Foreign Keys:**
- evento_id: `evento_id integer REFERENCES evt_eventos(id) ON DELETE CASCADE,`
- created_by: `created_by uuid REFERENCES core_users(id)`

## evt_tipos_evento

**Primary Keys:**
- id

**Foreign Keys:**
- company_id: `company_id uuid REFERENCES core_companies(id),`

