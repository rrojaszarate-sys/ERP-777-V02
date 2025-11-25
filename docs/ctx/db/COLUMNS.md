# Database Columns

*Extracted from migration files*

## core_audit_log

| # | Column | Type | Definition |
|---|--------|------|------------|
| 1 | id | serial | `id serial PRIMARY KEY,` |
| 2 | company_id | uuid | `company_id uuid REFERENCES core_companies(id),` |
| 3 | user_id | uuid | `user_id uuid REFERENCES core_users(id),` |
| 4 | timestamp | timestamptz | `timestamp timestamptz DEFAULT now(),` |
| 5 | action | varchar(100) | `action varchar(100) NOT NULL,` |
| 6 | module | varchar(50) | `module varchar(50) NOT NULL,` |
| 7 | entity_type | varchar(50) | `entity_type varchar(50) NOT NULL,` |
| 8 | entity_id | varchar(100) | `entity_id varchar(100) NOT NULL,` |
| 9 | old_value | jsonb | `old_value jsonb,` |
| 10 | new_value | jsonb | `new_value jsonb,` |
| 11 | ip_address | inet | `ip_address inet,` |
| 12 | user_agent | text | `user_agent text,` |
| 13 | session_id | varchar(100) | `session_id varchar(100),` |
| 14 | success | boolean | `success boolean DEFAULT true,` |
| 15 | error_message | text | `error_message text,` |
| 16 | duration | integer | `duration integer` |

## core_companies

| # | Column | Type | Definition |
|---|--------|------|------------|
| 1 | id | uuid | `id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),` |
| 2 | nombre | varchar(255) | `nombre varchar(255) NOT NULL,` |
| 3 | rfc | varchar(13) | `rfc varchar(13) UNIQUE NOT NULL,` |
| 4 | email | varchar(255) | `email varchar(255),` |
| 5 | telefono | varchar(20) | `telefono varchar(20),` |
| 6 | direccion | text | `direccion text,` |
| 7 | logo_url | text | `logo_url text,` |
| 8 | activo | boolean | `activo boolean DEFAULT true,` |
| 9 | created_at | timestamptz | `created_at timestamptz DEFAULT now(),` |
| 10 | updated_at | timestamptz | `updated_at timestamptz DEFAULT now()` |

## core_roles

| # | Column | Type | Definition |
|---|--------|------|------------|
| 1 | id | serial | `id serial PRIMARY KEY,` |
| 2 | nombre | varchar(100) | `nombre varchar(100) UNIQUE NOT NULL,` |
| 3 | descripcion | text | `descripcion text,` |
| 4 | permisos | jsonb | `permisos jsonb DEFAULT '[]'::jsonb,` |
| 5 | activo | boolean | `activo boolean DEFAULT true,` |
| 6 | created_at | timestamptz | `created_at timestamptz DEFAULT now()` |

## core_security_config

| # | Column | Type | Definition |
|---|--------|------|------------|
| 1 | id | serial | `id serial PRIMARY KEY,` |
| 2 | company_id | uuid | `company_id uuid REFERENCES core_companies(id),` |
| 3 | security_mode | varchar(20) | `security_mode varchar(20) DEFAULT 'development',` |
| 4 | rls_enabled | boolean | `rls_enabled boolean DEFAULT false,` |
| 5 | bypass_auth | boolean | `bypass_auth boolean DEFAULT true,` |
| 6 | enable_permissions | boolean | `enable_permissions boolean DEFAULT false,` |
| 7 | session_timeout | integer | `session_timeout integer DEFAULT 480,` |
| 8 | updated_at | timestamptz | `updated_at timestamptz DEFAULT now(),` |
| 9 | updated_by | uuid | `updated_by uuid REFERENCES core_users(id)` |

## core_system_config

| # | Column | Type | Definition |
|---|--------|------|------------|
| 1 | id | serial | `id serial PRIMARY KEY,` |
| 2 | company_id | uuid | `company_id uuid REFERENCES core_companies(id),` |
| 3 | config_key | varchar(100) | `config_key varchar(100) NOT NULL,` |
| 4 | config_value | jsonb | `config_value jsonb,` |
| 5 | description | text | `description text,` |
| 6 | updated_at | timestamptz | `updated_at timestamptz DEFAULT now(),` |
| 7 | updated_by | uuid | `updated_by uuid REFERENCES core_users(id),` |

## core_user_roles

| # | Column | Type | Definition |
|---|--------|------|------------|
| 1 | id | serial | `id serial PRIMARY KEY,` |
| 2 | user_id | uuid | `user_id uuid REFERENCES core_users(id) ON DELETE CASCADE,` |
| 3 | role_id | integer | `role_id integer REFERENCES core_roles(id) ON DELETE CASCADE,` |
| 4 | asignado_por | uuid | `asignado_por uuid REFERENCES core_users(id),` |
| 5 | fecha_asignacion | timestamptz | `fecha_asignacion timestamptz DEFAULT now(),` |
| 6 | activo | boolean | `activo boolean DEFAULT true,` |

## core_users

| # | Column | Type | Definition |
|---|--------|------|------------|
| 1 | id | uuid | `id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),` |
| 2 | company_id | uuid | `company_id uuid REFERENCES core_companies(id) ON DELETE CASCADE,` |
| 3 | email | varchar(255) | `email varchar(255) UNIQUE NOT NULL,` |
| 4 | nombre | varchar(255) | `nombre varchar(255) NOT NULL,` |
| 5 | apellidos | varchar(255) | `apellidos varchar(255),` |
| 6 | telefono | varchar(20) | `telefono varchar(20),` |
| 7 | puesto | varchar(100) | `puesto varchar(100),` |
| 8 | avatar_url | text | `avatar_url text,` |
| 9 | activo | boolean | `activo boolean DEFAULT true,` |
| 10 | ultimo_login | timestamptz | `ultimo_login timestamptz,` |
| 11 | created_at | timestamptz | `created_at timestamptz DEFAULT now(),` |
| 12 | updated_at | timestamptz | `updated_at timestamptz DEFAULT now()` |

## evt_categorias_gastos

| # | Column | Type | Definition |
|---|--------|------|------------|
| 1 | id | serial | `id serial PRIMARY KEY,` |
| 2 | company_id | uuid | `company_id uuid REFERENCES core_companies(id),` |
| 3 | nombre | varchar(100) | `nombre varchar(100) NOT NULL,` |
| 4 | descripcion | text | `descripcion text,` |
| 5 | color | varchar(7) | `color varchar(7) DEFAULT '#16A085',` |
| 6 | activo | boolean | `activo boolean DEFAULT true,` |
| 7 | created_at | timestamptz | `created_at timestamptz DEFAULT now()` |

## evt_clientes

| # | Column | Type | Definition |
|---|--------|------|------------|
| 1 | id | SERIAL | `id SERIAL PRIMARY KEY,` |
| 2 | company_id | uuid | `company_id uuid,` |
| 3 | razon_social | text | `razon_social text NOT NULL,` |
| 4 | nombre_comercial | text | `nombre_comercial text,` |
| 5 | rfc | text | `rfc text NOT NULL,` |
| 6 | email | text | `email text,` |
| 7 | telefono | text | `telefono text,` |
| 8 | direccion_fiscal | text | `direccion_fiscal text,` |
| 9 | contacto_principal | text | `contacto_principal text,` |
| 10 | telefono_contacto | text | `telefono_contacto text,` |
| 11 | email_contacto | text | `email_contacto text,` |
| 12 | regimen_fiscal | text | `regimen_fiscal text,` |
| 13 | uso_cfdi | text | `uso_cfdi text,` |
| 14 | metodo_pago | text | `metodo_pago text,` |
| 15 | forma_pago | text | `forma_pago text,` |
| 16 | dias_credito | integer | `dias_credito integer,` |
| 17 | limite_credito | numeric | `limite_credito numeric,` |
| 18 | activo | boolean | `activo boolean DEFAULT true,` |
| 19 | notas | text | `notas text,` |
| 20 | created_at | timestamptz | `created_at timestamptz DEFAULT now(),` |
| 21 | updated_at | timestamptz | `updated_at timestamptz DEFAULT now(),` |
| 22 | created_by | uuid | `created_by uuid` |
| 23 | id | serial | `id serial PRIMARY KEY,` |
| 24 | company_id | uuid | `company_id uuid REFERENCES core_companies(id),` |
| 25 | razon_social | text | `razon_social text NOT NULL,` |
| 26 | nombre_comercial | text | `nombre_comercial text,` |
| 27 | rfc | text | `rfc text NOT NULL,` |
| 28 | email | text | `email text,` |
| 29 | telefono | text | `telefono text,` |
| 30 | direccion_fiscal | text | `direccion_fiscal text,` |
| 31 | contacto_principal | text | `contacto_principal text,` |
| 32 | telefono_contacto | text | `telefono_contacto text,` |
| 33 | email_contacto | text | `email_contacto text,` |
| 34 | regimen_fiscal | text | `regimen_fiscal text,` |
| 35 | uso_cfdi | text | `uso_cfdi text,` |
| 36 | metodo_pago | text | `metodo_pago text,` |
| 37 | forma_pago | text | `forma_pago text,` |
| 38 | dias_credito | integer | `dias_credito integer,` |
| 39 | limite_credito | numeric | `limite_credito numeric,` |
| 40 | activo | boolean | `activo boolean DEFAULT true,` |
| 41 | notas | text | `notas text,` |
| 42 | created_at | timestamptz | `created_at timestamptz DEFAULT now(),` |
| 43 | updated_at | timestamptz | `updated_at timestamptz DEFAULT now(),` |
| 44 | created_by | uuid | `created_by uuid REFERENCES core_users(id)` |

## evt_estados

| # | Column | Type | Definition |
|---|--------|------|------------|
| 1 | id | serial | `id serial PRIMARY KEY,` |
| 2 | nombre | varchar(50) | `nombre varchar(50) UNIQUE NOT NULL,` |
| 3 | descripcion | text | `descripcion text,` |
| 4 | color | varchar(7) | `color varchar(7),` |
| 5 | orden | integer | `orden integer DEFAULT 0,` |
| 6 | workflow_step | integer | `workflow_step integer` |

## evt_eventos

| # | Column | Type | Definition |
|---|--------|------|------------|
| 1 | id | serial | `id serial PRIMARY KEY,` |
| 2 | company_id | uuid | `company_id uuid REFERENCES core_companies(id),` |
| 3 | clave_evento | varchar(50) | `clave_evento varchar(50) UNIQUE NOT NULL,` |
| 4 | nombre_proyecto | text | `nombre_proyecto text NOT NULL,` |
| 5 | descripcion | text | `descripcion text,` |
| 6 | cliente_id | integer | `cliente_id integer REFERENCES evt_clientes(id),` |
| 7 | tipo_evento_id | integer | `tipo_evento_id integer REFERENCES evt_tipos_evento(id),` |
| 8 | estado_id | integer | `estado_id integer REFERENCES evt_estados(id) DEFAULT 1,` |
| 9 | responsable_id | uuid | `responsable_id uuid REFERENCES core_users(id),` |
| 10 | fecha_evento | date | `fecha_evento date NOT NULL,` |
| 11 | fecha_fin | date | `fecha_fin date,` |
| 12 | hora_inicio | time | `hora_inicio time,` |
| 13 | hora_fin | time | `hora_fin time,` |
| 14 | lugar | text | `lugar text,` |
| 15 | numero_invitados | integer | `numero_invitados integer,` |
| 16 | presupuesto_estimado | numeric | `presupuesto_estimado numeric DEFAULT 0,` |
| 17 | subtotal | numeric | `subtotal numeric DEFAULT 0,` |
| 18 | iva_porcentaje | numeric | `iva_porcentaje numeric DEFAULT 16,` |
| 19 | iva | numeric | `iva numeric DEFAULT 0,` |
| 20 | total | numeric | `total numeric DEFAULT 0,` |
| 21 | total_gastos | numeric | `total_gastos numeric DEFAULT 0,` |
| 22 | utilidad | numeric | `utilidad numeric DEFAULT 0,` |
| 23 | margen_utilidad | numeric | `margen_utilidad numeric DEFAULT 0,` |
| 24 | status_facturacion | varchar(20) | `status_facturacion varchar(20) DEFAULT 'pendiente_facturar',` |
| 25 | status_pago | varchar(20) | `status_pago varchar(20) DEFAULT 'pendiente',` |
| 26 | fecha_facturacion | date | `fecha_facturacion date,` |
| 27 | fecha_vencimiento | date | `fecha_vencimiento date,` |
| 28 | fecha_pago | date | `fecha_pago date,` |
| 29 | documento_factura_url | text | `documento_factura_url text,` |
| 30 | documento_pago_url | text | `documento_pago_url text,` |
| 31 | prioridad | varchar(10) | `prioridad varchar(10) DEFAULT 'media',` |
| 32 | fase_proyecto | varchar(20) | `fase_proyecto varchar(20) DEFAULT 'cotizacion',` |
| 33 | notas | text | `notas text,` |
| 34 | activo | boolean | `activo boolean DEFAULT true,` |
| 35 | created_at | timestamptz | `created_at timestamptz DEFAULT now(),` |
| 36 | updated_at | timestamptz | `updated_at timestamptz DEFAULT now(),` |
| 37 | created_by | uuid | `created_by uuid REFERENCES core_users(id),` |
| 38 | updated_by | uuid | `updated_by uuid REFERENCES core_users(id)` |

## evt_gastos

| # | Column | Type | Definition |
|---|--------|------|------------|
| 1 | id | serial | `id serial PRIMARY KEY,` |
| 2 | evento_id | integer | `evento_id integer REFERENCES evt_eventos(id) ON DELETE CASCADE,` |
| 3 | categoria_id | integer | `categoria_id integer REFERENCES evt_categorias_gastos(id),` |
| 4 | concepto | text | `concepto text NOT NULL,` |
| 5 | descripcion | text | `descripcion text,` |
| 6 | cantidad | numeric | `cantidad numeric DEFAULT 1,` |
| 7 | precio_unitario | numeric | `precio_unitario numeric DEFAULT 0,` |
| 8 | subtotal | numeric | `subtotal numeric DEFAULT 0,` |
| 9 | iva_porcentaje | numeric | `iva_porcentaje numeric DEFAULT 16,` |
| 10 | iva | numeric | `iva numeric DEFAULT 0,` |
| 11 | total | numeric | `total numeric DEFAULT 0,` |
| 12 | proveedor | text | `proveedor text,` |
| 13 | rfc_proveedor | varchar(13) | `rfc_proveedor varchar(13),` |
| 14 | fecha_gasto | date | `fecha_gasto date DEFAULT CURRENT_DATE,` |
| 15 | forma_pago | varchar(20) | `forma_pago varchar(20) DEFAULT 'transferencia',` |
| 16 | referencia | text | `referencia text,` |
| 17 | documento_url | text | `documento_url text,` |
| 18 | status_aprobacion | varchar(20) | `status_aprobacion varchar(20) DEFAULT 'pendiente',` |
| 19 | aprobado_por | uuid | `aprobado_por uuid REFERENCES core_users(id),` |
| 20 | fecha_aprobacion | date | `fecha_aprobacion date,` |
| 21 | archivo_adjunto | text | `archivo_adjunto text,` |
| 22 | archivo_nombre | text | `archivo_nombre text,` |
| 23 | archivo_tipo | varchar(100) | `archivo_tipo varchar(100),` |
| 24 | notas | text | `notas text,` |
| 25 | deleted_at | timestamptz | `deleted_at timestamptz,` |
| 26 | deleted_by | uuid | `deleted_by uuid REFERENCES core_users(id),` |
| 27 | delete_reason | text | `delete_reason text,` |
| 28 | activo | boolean | `activo boolean DEFAULT true,` |
| 29 | created_at | timestamptz | `created_at timestamptz DEFAULT now(),` |
| 30 | updated_at | timestamptz | `updated_at timestamptz DEFAULT now(),` |
| 31 | created_by | uuid | `created_by uuid REFERENCES core_users(id)` |

## evt_ingresos

| # | Column | Type | Definition |
|---|--------|------|------------|
| 1 | id | serial | `id serial PRIMARY KEY,` |
| 2 | evento_id | integer | `evento_id integer REFERENCES evt_eventos(id) ON DELETE CASCADE,` |
| 3 | concepto | text | `concepto text NOT NULL,` |
| 4 | descripcion | text | `descripcion text,` |
| 5 | cantidad | numeric | `cantidad numeric DEFAULT 1,` |
| 6 | precio_unitario | numeric | `precio_unitario numeric DEFAULT 0,` |
| 7 | subtotal | numeric | `subtotal numeric DEFAULT 0,` |
| 8 | iva_porcentaje | numeric | `iva_porcentaje numeric DEFAULT 16,` |
| 9 | iva | numeric | `iva numeric DEFAULT 0,` |
| 10 | total | numeric | `total numeric DEFAULT 0,` |
| 11 | fecha_ingreso | date | `fecha_ingreso date DEFAULT CURRENT_DATE,` |
| 12 | referencia | text | `referencia text,` |
| 13 | documento_url | text | `documento_url text,` |
| 14 | facturado | boolean | `facturado boolean DEFAULT false,` |
| 15 | cobrado | boolean | `cobrado boolean DEFAULT false,` |
| 16 | fecha_facturacion | date | `fecha_facturacion date,` |
| 17 | fecha_cobro | date | `fecha_cobro date,` |
| 18 | metodo_cobro | varchar(20) | `metodo_cobro varchar(20),` |
| 19 | archivo_adjunto | text | `archivo_adjunto text,` |
| 20 | archivo_nombre | text | `archivo_nombre text,` |
| 21 | archivo_tipo | varchar(100) | `archivo_tipo varchar(100),` |
| 22 | notas | text | `notas text,` |
| 23 | created_at | timestamptz | `created_at timestamptz DEFAULT now(),` |
| 24 | updated_at | timestamptz | `updated_at timestamptz DEFAULT now(),` |
| 25 | created_by | uuid | `created_by uuid REFERENCES core_users(id)` |

## evt_tipos_evento

| # | Column | Type | Definition |
|---|--------|------|------------|
| 1 | id | serial | `id serial PRIMARY KEY,` |
| 2 | company_id | uuid | `company_id uuid REFERENCES core_companies(id),` |
| 3 | nombre | varchar(100) | `nombre varchar(100) NOT NULL,` |
| 4 | descripcion | text | `descripcion text,` |
| 5 | color | varchar(7) | `color varchar(7) DEFAULT '#74F1C8',` |
| 6 | activo | boolean | `activo boolean DEFAULT true,` |
| 7 | created_at | timestamptz | `created_at timestamptz DEFAULT now()` |

