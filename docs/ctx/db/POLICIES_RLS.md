# Database RLS Policies and Permissions

## Tables with RLS

**Enabled**: 14/14

### Tables with RLS Enabled ✓

- evt_clientes
- core_companies
- core_roles
- core_users
- core_user_roles
- core_system_config
- core_security_config
- core_audit_log
- evt_tipos_evento
- evt_estados
- evt_categorias_gastos
- evt_eventos
- evt_ingresos
- evt_gastos

## Policies

### core_audit_log

**Users can read audit log**

```sql
CREATE POLICY "Users can read audit log" ON core_audit_log FOR SELECT TO authenticated USING (true);
```

### core_companies

**Users can manage companies**

```sql
CREATE POLICY "Users can manage companies" ON core_companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### core_roles

**Users can read roles**

```sql
CREATE POLICY "Users can read roles" ON core_roles FOR SELECT TO authenticated USING (true);
```

### core_security_config

**Users can manage security config**

```sql
CREATE POLICY "Users can manage security config" ON core_security_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### core_system_config

**Users can manage system config**

```sql
CREATE POLICY "Users can manage system config" ON core_system_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### core_user_roles

**Users can manage user roles**

```sql
CREATE POLICY "Users can manage user roles" ON core_user_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### core_users

**Users can manage users**

```sql
CREATE POLICY "Users can manage users" ON core_users FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### evt_categorias_gastos

**Users can manage expense categories**

```sql
CREATE POLICY "Users can manage expense categories" ON evt_categorias_gastos FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### evt_clientes

**Users can manage clients**

```sql
CREATE POLICY "Users can manage clients"
  ON evt_clientes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

**Users can manage clients**

```sql
CREATE POLICY "Users can manage clients" ON evt_clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### evt_estados

**Users can read event states**

```sql
CREATE POLICY "Users can read event states" ON evt_estados FOR SELECT TO authenticated USING (true);
```

### evt_eventos

**Users can manage events**

```sql
CREATE POLICY "Users can manage events" ON evt_eventos FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### evt_gastos

**Users can manage expenses**

```sql
CREATE POLICY "Users can manage expenses" ON evt_gastos FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### evt_ingresos

**Users can manage income**

```sql
CREATE POLICY "Users can manage income" ON evt_ingresos FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### evt_tipos_evento

**Users can manage event types**

```sql
CREATE POLICY "Users can manage event types" ON evt_tipos_evento FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

