# Formato Excel para Importación de Gastos de Eventos

## Estructura General del Excel

El Excel de gastos de eventos contiene múltiples hojas, cada una representando una categoría de gasto.

## Hojas y Categorías

| Hoja | Categoría ID | Descripción |
|------|-------------|-------------|
| `SP´S` | 6 | Solicitudes de Pago |
| `COMBUSTIBLE  PEAJE` | 9 | Combustible y Peajes |
| `RH` | 7 | Recursos Humanos / Nómina |
| `MATERIALES` | 8 | Materiales y Suministros |

## Estructura de Columnas

### SP'S, COMBUSTIBLE, RH (Estructura estándar)

| Columna | Índice | Descripción |
|---------|--------|-------------|
| A | 0 | **Status**: PAGADO, PENDIENTE, PENDIENTE DE PAGO |
| B | 1 | Método de Pago |
| C | 2 | No. Factura |
| D | 3 | Proveedor / Razón Social |
| E | 4 | **Concepto** |
| F | 5 | **Sub-Total** (SIN IVA) |
| G | 6 | **I.V.A** (puede ser 0) |
| H | 7 | **Monto a Pagar** (Total con IVA) |
| I | 8 | Fecha de Pago |

### MATERIALES (Estructura diferente)

| Columna | Índice | Descripción |
|---------|--------|-------------|
| A | 0 | **Status** |
| B | 1 | Método de Pago |
| C | 2 | No. Factura |
| D | 3 | Proveedor |
| E | 4 | **Concepto** |
| F | 5 | Costo Unitario |
| G | 6 | Piezas |
| H | 7 | **Sub-Total** (SIN IVA) |
| I | 8 | **I.V.A** |
| J | 9 | **Monto a Pagar** |
| K | 10 | Fecha de Pago |

## Reglas de Importación

### Filas Válidas
- Solo importar filas con Status: `PAGADO`, `PENDIENTE`, `PENDIENTE DE PAGO`
- **EXCLUIR** filas de suma de totales (ver lógica abajo)
- Solo importar si Subtotal > 0 O Total > 0

### Detección de Filas de TOTAL (Sumas)

⚠️ **IMPORTANTE**: No excluir "PAGO TOTAL" que significa "pago completo"

```javascript
function esFilaTotal(concepto) {
  const c = concepto.toUpperCase().trim();

  // Es fila de total si:
  if (c === 'TOTAL') return true;
  if (/^TOTAL\s+(SP|RH|COMBUSTIBLE|MATERIALES|PEAJE|EGRESOS|INGRESOS)/.test(c)) return true;
  if (c.endsWith(' TOTAL')) return true;

  // NO es fila de total si contiene 'PAGO TOTAL' (significa pago completo)
  if (c.includes('PAGO TOTAL')) return false;

  return false;
}
```

### Manejo de IVA
⚠️ **IMPORTANTE**: No calcular IVA automáticamente

| Situación en Excel | Acción |
|-------------------|--------|
| IVA = 0 | Guardar subtotal = subtotal_excel, iva = 0 |
| IVA > 0 | Guardar subtotal = subtotal_excel, iva = iva_excel |

**Error común**: La importación anterior dividía subtotal/1.16 cuando IVA=0, lo cual es incorrecto.

### Fila de Encabezado
- Buscar fila donde columna A = "status" (case insensitive)
- Los datos comienzan en la fila siguiente

## Mapeo a Base de Datos

```javascript
{
  evento_id: [ID del evento],
  company_id: [ID de la empresa],
  categoria_id: [según tabla de categorías],
  concepto: `${concepto} - ${proveedor}`,
  subtotal: parseFloat(row[subCol]),  // DIRECTO del Excel
  iva: parseFloat(row[ivaCol]),       // DIRECTO del Excel
  total: parseFloat(row[totalCol]),   // DIRECTO del Excel
  pagado: status === 'PAGADO',
  status: status === 'PAGADO' ? 'pagado' : 'pendiente',
  fecha_gasto: parseExcelDate(row[fechaCol]),
  notas: `Importado desde Excel - Hoja: ${nombreHoja}`
}
```

## Validación Post-Importación

Después de importar, verificar que:

```sql
-- Los totales deben coincidir con el Excel
SELECT 
  categoria_id,
  SUM(subtotal) as subtotal_bd,
  SUM(iva) as iva_bd,
  SUM(total) as total_bd
FROM evt_gastos_erp
WHERE evento_id = [ID]
GROUP BY categoria_id;
```

## Ejemplo de Datos

### Excel SP'S:
| Status | Concepto | Sub-Total | IVA | Monto a Pagar |
|--------|----------|-----------|-----|---------------|
| PAGADO | ESTACIONAMIENTO | $160.00 | $0.00 | $160.00 |
| PAGADO | MO TRABAJOS | $20,000.00 | $0.00 | $20,000.00 |
| PAGADO | ANTICIPO VOLUMÉTRICO | $13,450.00 | $2,152.00 | $15,602.00 |

### BD debe guardar:
| concepto | subtotal | iva | total |
|----------|----------|-----|-------|
| ESTACIONAMIENTO | 160.00 | 0.00 | 160.00 |
| MO TRABAJOS | 20000.00 | 0.00 | 20000.00 |
| ANTICIPO VOLUMÉTRICO | 13450.00 | 2152.00 | 15602.00 |

## Hoja PROVISIONES

Las provisiones están en una hoja separada con estructura:
- Son gastos estimados/proyectados
- Generalmente IVA = 0 (ya está incluido en el total)
- Se guardan en tabla `evt_provisiones_erp`

---
Última actualización: 2025-12-01
