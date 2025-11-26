# Módulo GNI - Gastos No Impactados

## Descripción

El módulo **Gastos No Impactados (GNI)** gestiona los gastos operativos de la empresa que **NO están asociados a eventos específicos**. Estos son gastos generales como nóminas, servicios, mantenimiento, materiales de oficina, etc.

Ubicación: **Contabilidad ERP > Gastos No Impactados**

## Arquitectura

### Tablas de Base de Datos (prefijo `cont_`)

| Tabla | Descripción | Registros |
|-------|-------------|-----------|
| `cont_gastos_externos` | Gastos no impactados | 1,989 |
| `cont_claves_gasto` | Catálogo de claves contables | 58 |
| `cont_formas_pago` | Formas de pago | 25 |
| `cont_proveedores` | Proveedores (configurables por módulo) | 240+ |
| `cont_ejecutivos` | Ejecutivos/Empleados responsables | 26 |

### Vista Principal

- **`v_gastos_no_impactados`**: Vista consolidada que une gastos con catálogos

### Estructura de Archivos

```
src/modules/contabilidad-erp/
├── pages/
│   └── GastosNoImpactadosPage.tsx   # Página principal
├── components/
│   ├── GastoFormModal.tsx           # Modal crear/editar gasto
│   ├── ImportExcelModal.tsx         # Importar desde Excel
│   └── ExportPDFModal.tsx           # Exportar a PDF
├── services/
│   └── gastosNoImpactadosService.ts # CRUD y lógica de negocio
└── types/
    └── gastosNoImpactados.ts        # Tipos TypeScript
```

## Catálogos

### Claves de Gasto
Estructura jerárquica: **CUENTA > SUBCUENTA > CLAVE**

Cuentas principales:
- GASTOS FIJOS
- MATERIALES
- ACTIVOS FIJOS
- MANTENIMIENTO
- LOGÍSTICA
- GASTOS VARIOS
- DISEÑOS
- EVENTOS INTERNOS
- CAJA CHICA
- TOKA

### Formas de Pago
- KUSPIT SP´S (transferencia)
- SANTANDER (tarjeta/transferencia)
- BBVA (transferencia)
- AMEX (tarjeta)
- EFECTIVO / CAJA CHICA
- TOKA (combustibles, telepeaje)

### Ejecutivos
Lista oficial de 26 empleados de Made Design & Events.

### Proveedores
Catálogo compartido con campo `modulo_origen` para filtrar por módulo si es necesario.

## Funcionalidades

### CRUD de Gastos
- Crear nuevo gasto
- Editar gasto existente
- Eliminar (soft delete)
- Filtrar por período, cuenta, validación, etc.

### Importación desde Excel
- Lee archivos `.xlsx` con hojas mensuales (ENE25, FEB25, etc.)
- Mapea columnas: PROVEEDOR, CONCEPTO, CLAVE, TOTAL, etc.
- Crea proveedores automáticamente si no existen

### Exportación PDF
- Genera reportes con membrete de la empresa
- Totales por período

### Validación
Estados de validación:
- `correcto`: Gasto verificado
- `pendiente`: Sin revisar
- `revisar`: Requiere atención

## Scripts de Mantenimiento

### Cargar catálogos desde Excel
```bash
node scripts/cargar_catalogos_gni.mjs
```

### Cargar gastos desde Excel
```bash
node scripts/cargar_gastos_gni.mjs
```

### Ejecutar pruebas
```bash
node scripts/test_gni.mjs
```

### Limpiar proveedores duplicados
```bash
node scripts/limpiar_proveedores.mjs
```

## Datos Cargados (Nov 2025)

| Período | Registros | Total |
|---------|-----------|-------|
| ENE25 | 162 | $2,138,046.98 |
| FEB25 | 113 | $1,417,998.98 |
| MAR25 | 231 | $1,645,615.38 |
| ABR25 | 164 | $2,315,632.61 |
| MAY25 | 208 | $2,742,260.49 |
| JUN25 | 207 | $2,473,785.25 |
| JUL25 | 244 | $3,512,372.23 |
| AGO25 | 201 | $2,013,560.52 |
| SEP25 | 177 | $1,754,911.44 |
| OCT25 | 212 | $1,904,218.42 |
| NOV25 | 70 | $804,728.30 |
| **TOTAL** | **1,989** | **$22,723,130.60** |

## Distribución por Cuenta

| Cuenta | Registros | Total |
|--------|-----------|-------|
| GASTOS FIJOS | 361 | $8,404,514.72 |
| MATERIALES | 647 | $6,429,891.40 |
| CAJA CHICA | 34 | $2,667,577.72 |
| ACTIVOS FIJOS | 233 | $2,273,417.67 |
| GASTOS VARIOS | 206 | $1,080,474.76 |
| LOGÍSTICA | 176 | $1,076,217.62 |
| MANTENIMIENTO | 237 | $447,716.62 |
| DISEÑOS | 26 | $189,916.29 |
| EVENTOS INTERNOS | 23 | $123,436.94 |
| TOKA | 46 | $29,966.86 |

## Relación con Otros Módulos

- **Eventos ERP**: En el futuro, los gastos de eventos se podrán consolidar con GNI para reportes completos
- **Eventos (sin ERP)**: Módulo de producción, NO se modifica
- **Contabilidad ERP**: GNI es parte de este módulo

## Pruebas Automatizadas

El script `test_gni.mjs` verifica:
- Catálogos cargados correctamente
- Totales de gastos
- Cifras por mes vs Excel original
- Integridad de datos
- Vista funcionando
- Distribución por cuenta

Resultado esperado: **41 pruebas pasando**
