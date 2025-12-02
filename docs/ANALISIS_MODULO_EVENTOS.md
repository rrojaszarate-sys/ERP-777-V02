# ANÁLISIS COMPLETO - MÓDULO DE EVENTOS

**Fecha:** 2025-12-02
**Versión:** 1.0

---

## 1. RESUMEN EJECUTIVO

El módulo de Eventos es el core del ERP para gestión de proyectos/eventos con:
- **107 archivos** TypeScript/React
- **11 servicios** backend
- **19 custom hooks** para manejo de estado
- **54 componentes** UI organizados por funcionalidad

### Estado Actual
| Aspecto | Estado | Notas |
|---------|--------|-------|
| CRUD Eventos | ✅ Funcional | Crear, editar, eliminar (soft delete) |
| CRUD Clientes | ✅ Funcional | 7 clientes activos |
| CRUD Ingresos | ✅ Funcional | Con soporte CFDI 4.0 |
| CRUD Gastos | ✅ Funcional | 276 registros activos |
| OCR | ✅ Funcional | Dual: Google Vision + Gemini |
| Análisis Financiero | ✅ Funcional | Vista calcula correctamente |
| Integración Almacén | ⚠️ Parcial | Falta testing |
| Workflow Estados | ✅ Funcional | 7 estados definidos |

---

## 2. ESTRUCTURA DE BASE DE DATOS

### Tablas Principales (sufijo _erp)
```
evt_eventos_erp          - 2 eventos activos
evt_clientes_erp         - 7 clientes activos
evt_ingresos_erp         - 7 registros
evt_gastos_erp           - 276 registros
evt_categorias_gastos_erp - 4 categorías
evt_estados_erp          - Estados del workflow
evt_provisiones_erp      - Provisiones estimadas
```

### Categorías de Gastos
| ID | Nombre | Descripción |
|----|--------|-------------|
| 6 | SPs (Solicitudes de Pago) | Honorarios, consultorías |
| 7 | RH (Recursos Humanos) | Nómina, prestaciones |
| 8 | Materiales | Insumos, equipamiento |
| 9 | Combustible/Peaje | Gasolina, casetas |

### Vista de Análisis Financiero
`vw_eventos_analisis_financiero_erp` - Calcula:
- Ingresos totales/subtotal/IVA/cobrados/pendientes
- Gastos totales por categoría
- Provisiones
- Utilidad real y bruta
- Márgenes (%)

---

## 3. PROBLEMAS DETECTADOS

### CRÍTICOS

#### 3.1 Gastos sin Categoría (4 registros)
```sql
ID  | evento_id | concepto         | total     | categoria_id
913 |         4 | Catering         | 290,000   | NULL
914 |         4 | Seguridad        | 160,000   | NULL
911 |         4 | Honorarios Staff | 400,000   | NULL
912 |         4 | Bonos Personal   | 150,000   | NULL
```
**Impacto:** No se categorizan en reportes por categoría
**Solución:** Asignar categoría apropiada (RH o SPs)

#### 3.2 DualOCRExpenseForm.tsx (134KB)
- Archivo excesivamente grande
- Lógica duplicada
- 8 métodos diferentes para extraer total
- Difícil de mantener y testear

**Recomendación:** Refactorizar en módulos separados:
- OCR Processing Service
- Data Extraction Utilities
- Form Component (UI only)

#### 3.3 Totales Denormalizados en evt_eventos_erp
Los campos `total_ingresos`, `total_gastos`, `utilidad` en la tabla principal muestran 0.00 aunque hay datos.

**Análisis:** La vista `vw_eventos_analisis_financiero_erp` calcula correctamente. Los campos denormalizados no se actualizan.

**Impacto:** Bajo - La aplicación usa la vista para mostrar datos.

---

### MAYORES

#### 3.4 Inconsistencia de Tipos de ID
- Event: `id: string` en algunos tipos
- Event: `id: number` en otros hooks
- Causa confusión y errores de tipo

#### 3.5 Console.log en Producción
20+ archivos con `console.log` no estructurados.

#### 3.6 Campos Deprecados Sin Limpiar
- `hora_inicio`, `hora_fin` marcados @deprecated
- Aún existen en formularios y BD

---

### MENORES

#### 3.7 Validaciones Incompletas
- Sin validación de límites de crédito
- Sin prevención de duplicados (RFC)
- Formato RFC no siempre validado

#### 3.8 Sin Paginación
EventsListPage carga todos los eventos sin paginar.

---

## 4. FLUJO DE DATOS

### 4.1 Crear Evento
```
Usuario → EventForm
  ↓
Validación (nombre, cliente, fecha)
  ↓
Calcular provisiones (4 categorías)
  ↓
Generar clave_evento (SUFIJO+AÑO+SECUENCIA)
  ↓
INSERT evt_eventos_erp
  ↓
Invalidar cache React Query
```

### 4.2 Agregar Ingreso
```
EventDetail → IncomeTab → IncomeForm
  ↓
Input: concepto, total, cliente_id*, fecha, días_crédito
  ↓
Validación: cliente_id OBLIGATORIO, total > 0
  ↓
Calcular: fecha_compromiso = fecha + días_crédito
  ↓
INSERT evt_ingresos_erp
  ↓
Invalidar queries: incomes, events, financial-summary
```

### 4.3 Agregar Gasto
```
ExpenseTab → [SimpleExpenseForm | OCRForm | MaterialForm]
  ↓
Input: concepto, subtotal, IVA, categoria_id, proveedor
  ↓
Validación cuadre fiscal: subtotal + IVA = total
  ↓
INSERT evt_gastos_erp
  ↓
Invalidar queries
```

### 4.4 Material de Almacén
```
MaterialAlmacenForm
  ↓
Tipo: 'gasto' (ingreso material) | 'retorno' (devolución)
  ↓
Seleccionar productos del catálogo
  ↓
Definir cantidades y costos
  ↓
[Opcional] Afectar inventario:
  ↓ Firmas duales requeridas
  ↓ createDocumentoInventario()
  ↓ confirmarDocumento()
  ↓
INSERT evt_gastos_erp (categoria_id = 8)
```

---

## 5. INTEGRACIONES

### 5.1 Con Módulo Almacén
- MaterialAlmacenForm.tsx importa servicios de inventario
- Categoría Materiales (id=8) para gastos
- Firma dual para afectar stock

### 5.2 Con Módulo Contabilidad
- accountsService.ts para cuentas contables
- Campo cuenta_id en gastos
- Facilita reportes contables

### 5.3 Con Módulo Facturas
- Parseo XML CFDI 4.0
- Extracción automática de datos SAT
- Cálculo fecha vencimiento

---

## 6. MÉTRICAS ACTUALES

### Datos de Prueba
| Métrica | Evento 1 (DOT2025-003) | Evento 4 (TEST-CALC) |
|---------|------------------------|----------------------|
| Ingresos | $4,390,556.57 | $4,500,000.00 |
| Gastos | $1,450,507.89 | $2,131,369.66 |
| Utilidad | $1,439,078.04 | $768,630.34 |
| Margen | 32.78% | 17.08% |
| # Gastos | 264 | 12 |
| # Ingresos | 3 | 4 |

### Distribución de Gastos por Categoría
| Categoría | # Gastos | Total |
|-----------|----------|-------|
| Materiales | 125 | $1,215,301.29 |
| SPs | 113 | $895,673.39 |
| Combustible/Peaje | 27 | $430,350.78 |
| RH | 7 | $40,552.09 |
| Sin categoría | 4 | $1,000,000.00 |

---

## 7. RECOMENDACIONES

### Corto Plazo (Inmediato)
1. ✅ Asignar categoría a 4 gastos sin categoría
2. ⏳ Agregar validación de categoria_id obligatorio
3. ⏳ Crear suite de pruebas Cypress

### Mediano Plazo
1. Refactorizar DualOCRExpenseForm.tsx
2. Unificar tipos de ID
3. Implementar paginación en listas
4. Centralizar logging

### Largo Plazo
1. Eliminar campos deprecados
2. Sincronización con sistema externo de facturas
3. Flujo de aprobación multi-nivel
4. Reportes fiscales automáticos

---

## 8. COBERTURA DE PRUEBAS REQUERIDA

### Pruebas E2E (Cypress)
1. **Flujo Cliente**
   - Crear cliente con datos completos
   - Validar RFC único
   - Editar cliente existente

2. **Flujo Evento**
   - Crear evento desde cliente
   - Validar generación de clave
   - Cambiar estados (workflow)

3. **Flujo Ingresos**
   - Agregar ingreso manual
   - Subir factura XML
   - Marcar como cobrado

4. **Flujo Gastos**
   - Agregar gasto manual
   - Validar cuadre fiscal
   - Agregar gasto OCR
   - Agregar material de almacén

5. **Análisis Financiero**
   - Verificar cálculos de utilidad
   - Verificar márgenes
   - Verificar provisiones vs gastos reales

---

## 9. ARCHIVOS CLAVE PARA REVISAR

```
src/modules/eventos-erp/
├── pages/EventsListPage.tsx         # Dashboard principal
├── components/EventoDetailModal.tsx  # Detalle evento
├── components/finances/
│   ├── IncomeForm.tsx               # 56KB - Formulario ingresos
│   ├── ExpenseForm.tsx              # 29KB - Formulario gastos
│   ├── DualOCRExpenseForm.tsx       # 134KB - OCR (refactorizar!)
│   ├── MaterialAlmacenForm.tsx      # 38KB - Integración almacén
│   └── RetornoMaterialForm.tsx      # 25KB - Devoluciones
├── services/
│   ├── eventsService.ts             # CRUD eventos
│   ├── financesService.ts           # 862 líneas - CRUD financiero
│   └── workflowService.ts           # Estados y transiciones
└── hooks/
    ├── useEventosFinancialList.ts   # 20KB - Lista con análisis
    └── useFinancialSummary.ts       # Resumen financiero
```

---

## 10. CONCLUSIÓN

El módulo de eventos está **funcionalmente completo** con capacidades robustas de:
- Gestión de eventos y clientes
- Seguimiento financiero (ingresos/gastos)
- OCR para captura automática
- Análisis financiero con proyecciones vs realidad
- Integración con almacén y contabilidad

**Áreas de mejora principales:**
1. Refactorización de código grande (OCR)
2. Consistencia de tipos
3. Validaciones más estrictas
4. Suite de pruebas automatizadas

El sistema es **apto para producción** con las correcciones menores indicadas.
