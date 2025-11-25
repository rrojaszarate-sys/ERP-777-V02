# Database Indexes

*Extracted from migration files*

## evt_clientes

### idx_evt_clientes_company_id

```sql
CREATE INDEX IF NOT EXISTS idx_evt_clientes_company_id ON evt_clientes(company_id);
```

### idx_evt_clientes_rfc

```sql
CREATE INDEX IF NOT EXISTS idx_evt_clientes_rfc ON evt_clientes(rfc);
```

### idx_evt_clientes_activo

```sql
CREATE INDEX IF NOT EXISTS idx_evt_clientes_activo ON evt_clientes(activo);
```

### idx_evt_clientes_created_at

```sql
CREATE INDEX IF NOT EXISTS idx_evt_clientes_created_at ON evt_clientes(created_at);
```

### idx_evt_clientes_activo

```sql
CREATE INDEX idx_evt_clientes_activo ON evt_clientes(activo);
```

### idx_evt_clientes_company_id

```sql
CREATE INDEX idx_evt_clientes_company_id ON evt_clientes(company_id);
```

### idx_evt_clientes_rfc

```sql
CREATE INDEX idx_evt_clientes_rfc ON evt_clientes(rfc);
```

### idx_evt_clientes_created_at

```sql
CREATE INDEX idx_evt_clientes_created_at ON evt_clientes(created_at);
```

## evt_eventos

### idx_evt_eventos_cliente_id

```sql
CREATE INDEX idx_evt_eventos_cliente_id ON evt_eventos(cliente_id);
```

### idx_evt_eventos_responsable_id

```sql
CREATE INDEX idx_evt_eventos_responsable_id ON evt_eventos(responsable_id);
```

### idx_evt_eventos_fecha_evento

```sql
CREATE INDEX idx_evt_eventos_fecha_evento ON evt_eventos(fecha_evento);
```

### idx_evt_eventos_status_pago

```sql
CREATE INDEX idx_evt_eventos_status_pago ON evt_eventos(status_pago);
```

### idx_evt_eventos_activo

```sql
CREATE INDEX idx_evt_eventos_activo ON evt_eventos(activo);
```

## evt_gastos

### idx_evt_gastos_evento_id

```sql
CREATE INDEX idx_evt_gastos_evento_id ON evt_gastos(evento_id);
```

### idx_evt_gastos_categoria_id

```sql
CREATE INDEX idx_evt_gastos_categoria_id ON evt_gastos(categoria_id);
```

### idx_evt_gastos_fecha_gasto

```sql
CREATE INDEX idx_evt_gastos_fecha_gasto ON evt_gastos(fecha_gasto);
```

### idx_evt_gastos_activo

```sql
CREATE INDEX idx_evt_gastos_activo ON evt_gastos(activo);
```

## evt_ingresos

### idx_evt_ingresos_evento_id

```sql
CREATE INDEX idx_evt_ingresos_evento_id ON evt_ingresos(evento_id);
```

### idx_evt_ingresos_fecha_ingreso

```sql
CREATE INDEX idx_evt_ingresos_fecha_ingreso ON evt_ingresos(fecha_ingreso);
```

