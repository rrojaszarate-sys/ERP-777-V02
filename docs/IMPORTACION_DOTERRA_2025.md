# 📋 DOCUMENTACIÓN DE IMPORTACIÓN - DOTERRA CONVENCIÓN 2025

## 📁 Archivo Fuente
- **Nombre**: `DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx`
- **Ubicación**: `/home/rodri/proyectos/ERP-777-V02-pc/ERP-777-V02/`
- **Fecha de importación**: 2025-12-05

---

## 🎯 Evento Importado

| Campo | Valor |
|-------|-------|
| **ID** | 1 |
| **Clave** | DOT2025-003 |
| **Nombre** | CONVENCIÓN DOTERRA 2025 |
| **Cliente** | DOTERRA |
| **Fechas** | Julio - Diciembre 2025 |

---

## 📊 RESUMEN FINANCIERO IMPORTADO

### 💰 INGRESOS (3 registros)

| Concepto | Monto |
|----------|-------|
| CONVENCIÓN DOTERRA 2025 ANTICIPO | $1,939,105.30 |
| CONVENCIÓN DOTERRA 2025 FINIQUITO | $2,052,301.58 |
| CONVENCIÓN DOTERRA 2025 FEE | $399,149.69 |
| **TOTAL INGRESOS** | **$4,390,556.57** |

### 💳 GASTOS POR CATEGORÍA

| Categoría | ID Cat. | Registros | Monto Total |
|-----------|---------|-----------|-------------|
| SP's (Solicitudes de Pago) | 6 | 113 | $895,673.39 |
| Combustible/Peaje | 9 | 25 | $60,701.56 |
| RH (Recursos Humanos) | 7 | 8 | $81,104.18 |
| Materiales | 8 | 121 | $961,815.57 |
| **TOTAL GASTOS** | - | **267** | **$1,999,294.70** |

### 📋 PROVISIONES

| Registros | Monto Total |
|-----------|-------------|
| 25 | $3,001,941.28 |

### 📈 RESULTADO

| Concepto | Monto |
|----------|-------|
| Ingresos | $4,390,556.57 |
| (-) Gastos | $1,999,294.70 |
| (-) Provisiones | $3,001,941.28 |
| **UTILIDAD** | **-$610,679.41** |

---

## 📂 ESTRUCTURA DEL EXCEL

### Hojas del archivo:

1. **RESUMEN CIERRE INTERNO** - Información general e ingresos
2. **SP´S** - Solicitudes de Pago
3. **COMBUSTIBLE PEAJE** - Gastos de combustible y peajes
4. **RH** - Recursos Humanos (nóminas)
5. **MATERIALES** - Materiales y suministros
6. **PROVISIONES** - Gastos pendientes/estimados

### Estructura de columnas por hoja:

#### GASTOS (SP's, Combustible, RH):
| Columna | Campo |
|---------|-------|
| A | Status (PAGADO/PENDIENTE) |
| B | Método de Pago |
| C | No. Factura |
| D | Proveedor / Razón Social |
| E | Concepto |
| F | Sub-Total |
| G | I.V.A |
| H | Monto a Pagar |
| I | Fecha de Pago |

#### MATERIALES:
| Columna | Campo |
|---------|-------|
| A | Status |
| B | Método de Pago |
| C | No. Factura |
| D | Proveedor |
| E | Concepto |
| F | Costo Unitario |
| G | Piezas |
| H | Sub-Total |
| I | I.V.A |
| J | Monto a Pagar |
| K | Fecha de Pago |

#### PROVISIONES:
| Columna | Campo |
|---------|-------|
| A | Proveedor / Razón Social |
| B | Concepto |
| C | Sub-Total |
| D | I.V.A |
| E | Monto a Pagar |
| F | Notas |

---

## 🔧 SCRIPT DE IMPORTACIÓN

**Archivo**: `/home/rodri/proyectos/ERP-777-V02-pc/ERP-777-V02/scripts/reimportar_evento_completo.mjs`

### Ejecución:
```bash
cd /home/rodri/proyectos/ERP-777-V02-pc/ERP-777-V02
node scripts/reimportar_evento_completo.mjs
```

### Proceso del script:
1. **Borrado de datos existentes** del evento ID=1
   - Gastos
   - Ingresos
   - Provisiones

2. **Importación de gastos** por categoría
   - Lee cada pestaña del Excel
   - Identifica filas con datos válidos (monto > 0)
   - Calcula subtotal e IVA (monto/1.16)
   - Inserta en `evt_gastos_erp`

3. **Importación de provisiones**
   - Lee pestaña PROVISIONES
   - Crea proveedores si no existen
   - Inserta en `evt_provisiones_erp`

4. **Importación de ingresos**
   - Inserta los 3 ingresos principales de DOTERRA
   - Datos hardcodeados del Excel

5. **Verificación final**
   - Muestra totales por categoría
   - Calcula utilidad

---

## ⚠️ NOTAS IMPORTANTES

1. **IVA**: Se calcula como 16% sobre el subtotal (monto/1.16)
2. **Filas de totales**: El script ignora filas sin monto o con monto = 0
3. **Company ID**: `00000000-0000-0000-0000-000000000001`
4. **Evento ID**: `1`

---

## 📅 Historial de Importaciones

| Fecha | Acción | Resultado |
|-------|--------|-----------|
| 2025-12-05 | Reimportación completa | ✅ Exitosa |

---

*Documentación generada automáticamente*
