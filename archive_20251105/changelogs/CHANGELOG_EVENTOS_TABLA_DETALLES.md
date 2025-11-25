# 📋 Registro de Cambios - Tabla de Eventos con Detalles Financieros

**Fecha:** 2 de noviembre de 2025  
**Módulo:** Eventos - Listado Financiero  
**Archivo:** `src/modules/eventos/EventosListPageNew.tsx`  
**Commits:** 
- `ceccd8e` - feat(eventos): simplificar columnas mostrando solo totales, detalles completos en área expandible
- `ecb8ced` - fix(eventos): mostrar desgloses financieros siempre visibles en tabla, eliminar expansión de filas

---

## 🎯 Objetivo del Cambio

Mostrar **toda la información financiera detallada directamente en la tabla** sin necesidad de expandir/colapsar filas, facilitando el análisis rápido de los datos financieros de los eventos.

---

## ✅ Cambios Implementados

### 1. **Columnas con Desglose Financiero Visible**

Todas las columnas financieras ahora muestran el total en negrita más el desglose por categoría debajo:

#### **📊 Columna: Ingresos**
```
$150,000.00                    ← Total en negrita (azul)
Cobr: $100,000                 ← Cobrados (verde)
Pend: $30,000                  ← Pendientes (amarillo)
Est: $20,000                   ← Estimados (gris)
```

#### **💸 Columna: Gastos Totales**
```
$134,397.74                    ← Total en negrita (rojo oscuro)
⛽ $45,000                      ← Combustible
🛠️ $35,000                      ← Materiales
👥 $40,000                      ← Recursos Humanos
💳 $14,397                      ← Solicitudes de Pago
```

#### **✅ Columna: Gastos Pagados**
```
$100,000.00                    ← Total en negrita (rojo)
⛽ $30,000                      ← Combustible pagado
🛠️ $25,000                      ← Materiales pagados
👥 $35,000                      ← RH pagados
💳 $10,000                      ← SPs pagados
```

#### **⏳ Columna: Gastos Pendientes**
```
$34,397.74                     ← Total en negrita (naranja)
⛽ $15,000                      ← Combustible pendiente
🛠️ $10,000                      ← Materiales pendientes
👥 $5,000                       ← RH pendientes
💳 $4,397                       ← SPs pendientes
```

#### **📊 Columna: Provisiones**
```
$150,000.00                    ← Total en negrita (amarillo oscuro)
⛽ $50,000                      ← Provisión combustible/peaje
🛠️ $40,000                      ← Provisión materiales
👥 $45,000                      ← Provisión RH
💳 $15,000                      ← Provisión SPs
```

#### **💰 Columna: Disponible**
```
$50,000.00                     ← Total en negrita (verde si positivo, rojo si negativo)
⛽ $20,000                      ← Disponible combustible (gris normal)
🛠️ $15,000                      ← Disponible materiales (gris normal)
👥 $10,000                      ← Disponible RH (gris normal)
💳 $5,000                       ← Disponible SPs (gris normal)
```

**🚨 Alertas en Disponible:**
- Si alguna categoría tiene saldo negativo, se muestra en **rojo con negrita**
- Ejemplo: `⛽ -$5,000` (en rojo) indica sobregiro en combustible

---

### 2. **Eliminación de Filas Expandibles**

**Antes:**
- Tabla con botones ▶▼ en cada fila
- Al hacer clic, se expandía una fila con 6 tarjetas de resumen
- Los desgloses estaban ocultos por defecto

**Ahora:**
- Tabla simple sin botones de expansión
- Una fila por evento con toda la información visible
- Desgloses siempre a la vista en cada columna
- Interfaz más directa y eficiente

---

### 3. **Código Eliminado**

```typescript
// ❌ Estados eliminados:
const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

// ❌ Función eliminada:
const toggleRowExpansion = (eventoId: string) => { ... }

// ❌ Columna de expansión eliminada:
{
  key: 'expand',
  label: '',
  render: (_value, row) => (
    <button onClick={() => toggleRowExpansion(row.id)}>
      {expandedRows.has(row.id) ? '▼' : '▶'}
    </button>
  )
}

// ❌ Filas expandibles eliminadas (345 líneas):
{expandedRows.has(evento.id) ? (
  <tr key={evento.id + '-expanded'}>
    <td colSpan={...}>
      <div className="grid grid-cols-3 gap-4">
        {/* 6 tarjetas de resumen */}
      </div>
    </td>
  </tr>
) : null}
```

---

### 4. **Estados Preservados**

Se mantuvieron los estados del **dashboard superior** (tarjetas resumen globales):

```typescript
// ✅ Estados mantenidos para el dashboard:
const [showGastosTotalesDetails, setShowGastosTotalesDetails] = useState(false);
const [showGastosPagadosDetails, setShowGastosPagadosDetails] = useState(false);
const [showGastosPendientesDetails, setShowGastosPendientesDetails] = useState(false);
const [showProvisionesTotalesDetails, setShowProvisionesTotalesDetails] = useState(false);
const [showProvisionesDisponiblesDetails, setShowProvisionesDisponiblesDetails] = useState(false);
const [showDisponibleDetails, setShowDisponibleDetails] = useState(false);
const [showUtilidadesSection, setShowUtilidadesSection] = useState(false);
```

Estos estados controlan la expansión de las **tarjetas de totales** en la parte superior de la página, no afectan la tabla.

---

## 🔧 Cambios Técnicos

### Interfaz TypeScript Actualizada

**Archivo:** `src/modules/eventos/hooks/useEventosFinancialList.ts`

```typescript
export interface EventoFinancialListItem {
  // ... campos existentes ...

  // ✨ NUEVOS CAMPOS AGREGADOS:

  // Gastos por Categoría - Pagados
  gastos_combustible_pagados: number;
  gastos_materiales_pagados: number;
  gastos_rh_pagados: number;
  gastos_sps_pagados: number;

  // Gastos por Categoría - Pendientes
  gastos_combustible_pendientes: number;
  gastos_materiales_pendientes: number;
  gastos_rh_pendientes: number;
  gastos_sps_pendientes: number;

  // Provisiones por Categoría
  provision_combustible_peaje: number;
  provision_materiales: number;
  provision_recursos_humanos: number;
  provision_solicitudes_pago: number;
}
```

---

## 📊 Estructura de la Tabla

### Columnas Visibles (en orden):

1. **Clave** - Código del evento
2. **Proyecto** - Nombre + fecha
3. **Cliente** - Nombre del cliente
4. **Estado** - Badge con estado del evento
5. **Ingresos** - Total + desglose (Cobr/Pend/Est)
6. **Gastos Totales** - Total + desglose por categoría
7. **Gastos Pagados** - Total + desglose por categoría
8. **Gastos Pendientes** - Total + desglose por categoría
9. **Provisiones** - Total + desglose por categoría
10. **Disponible** - Total + desglose con alertas
11. **Utilidad** - Utilidad estimada + margen %
12. **Utilidad Real** - Utilidad real + margen %
13. **Cobro** - Estado de cobro con badge
14. **Acciones** - Botones Ver/Editar/Eliminar

---

## 🎨 Estilos y Colores

### Códigos de Color por Columna:

- **Ingresos:** Azul oscuro (`text-blue-900`)
  - Cobrados: Verde (`text-green-600`)
  - Pendientes: Amarillo (`text-yellow-600`)
  - Estimados: Gris (`text-gray-400`)

- **Gastos Totales:** Rojo oscuro (`text-red-900`)
- **Gastos Pagados:** Rojo (`text-red-700`)
- **Gastos Pendientes:** Naranja (`text-orange-700`)
- **Provisiones:** Amarillo oscuro (`text-yellow-900`)
- **Disponible:** Verde si ≥ 0 (`text-green-700`), Rojo si < 0 (`text-red-700`)

### Iconos de Categorías:

- ⛽ Combustible/Peaje
- 🛠️ Materiales
- 👥 Recursos Humanos
- 💳 Solicitudes de Pago

---

## 📝 Notas de Uso

### Para el Usuario:

1. **Vista Completa:** Toda la información financiera está visible sin necesidad de hacer clic
2. **Análisis Rápido:** Puedes comparar desgloses entre eventos directamente
3. **Alertas Visuales:** Los montos negativos en Disponible se destacan en rojo
4. **Scroll Horizontal:** Si la pantalla es pequeña, usa scroll horizontal para ver todas las columnas

### Para Desarrolladores:

1. **Mantenimiento Simplificado:** Código reducido en 345 líneas
2. **Render Directo:** No hay lógica de expansión/colapso en la tabla
3. **Datos Completos:** Asegúrate que la vista `vw_eventos_analisis_financiero` incluya los campos desagregados
4. **TypeScript:** Todos los campos están tipados en `EventoFinancialListItem`

---

## 🚀 Beneficios

### Ventajas del Nuevo Diseño:

✅ **Mayor Visibilidad:** Todo el detalle financiero visible de inmediato  
✅ **Análisis Más Rápido:** No necesitas expandir cada fila  
✅ **Código Más Simple:** -345 líneas de código  
✅ **Mejor Performance:** Menos estados y renders condicionales  
✅ **UX Mejorada:** Interfaz más directa y predecible  
✅ **Alertas Claras:** Valores negativos destacados en rojo  

### Posibles Desventajas:

⚠️ **Más Espacio Vertical:** Cada fila ocupa más altura  
⚠️ **Scroll Horizontal:** En pantallas pequeñas requiere scroll  

---

## 🔄 Comparación Antes/Después

### ANTES (con expansión):
```
Clave | Proyecto | Cliente | Ingresos ($) | Utilidad | Estado | [▶]
E-001 | Obra X   | ACME    | $150,000     | $30,000  | Activo | [▶]
```
*Al hacer clic en ▶ se expandía mostrando 6 tarjetas con detalles*

### AHORA (sin expansión):
```
Clave | Proyecto | Ingresos           | Gastos Totales     | ... | Acciones
E-001 | Obra X   | $150,000.00        | $134,397.74        |     | [👁️][✏️][🗑️]
      |          | Cobr: $100,000     | ⛽ $45,000          |     |
      |          | Pend: $30,000      | 🛠️ $35,000          |     |
      |          | Est: $20,000       | 👥 $40,000          |     |
      |          |                    | 💳 $14,397          |     |
```

---

## 📦 Archivos Modificados

1. **`src/modules/eventos/EventosListPageNew.tsx`**
   - ✅ Columnas actualizadas con desgloses visibles
   - ✅ Eliminada lógica de expansión de filas
   - ✅ Simplificada estructura de la tabla
   - ✅ Preservados estados del dashboard superior

2. **`src/modules/eventos/hooks/useEventosFinancialList.ts`**
   - ✅ Agregados campos de categorías a interfaz `EventoFinancialListItem`

---

## 🧪 Pruebas Recomendadas

### Pruebas Manuales:

1. ✅ Verificar que todos los desgloses se muestren correctamente
2. ✅ Confirmar alertas en rojo para valores negativos en Disponible
3. ✅ Probar scroll horizontal en pantallas pequeñas
4. ✅ Verificar que los totales coincidan con los desgloses
5. ✅ Comprobar que las acciones (Ver/Editar/Eliminar) funcionen
6. ✅ Validar colores y formato de números

### Datos de Prueba:

```sql
-- Verificar que la vista incluye los campos desagregados:
SELECT 
  clave_evento,
  gastos_combustible_pagados,
  gastos_materiales_pagados,
  gastos_rh_pagados,
  gastos_sps_pagados,
  provision_combustible_peaje,
  provision_materiales,
  provision_recursos_humanos,
  provision_solicitudes_pago
FROM vw_eventos_analisis_financiero
LIMIT 5;
```

---

## 🔮 Mejoras Futuras Sugeridas

1. **Filtros por Categoría:** Permitir filtrar eventos por gastos en categorías específicas
2. **Exportar a Excel:** Incluir desgloses en la exportación
3. **Gráficos por Categoría:** Visualización de distribución de gastos
4. **Ordenamiento:** Permitir ordenar por categorías individuales
5. **Resaltado Condicional:** Destacar automáticamente categorías con sobregiro
6. **Vista Compacta:** Opción para ocultar desgloses y ver solo totales

---

## 👨‍💻 Desarrollador

**Implementado por:** GitHub Copilot  
**Revisado por:** Usuario  
**Fecha de Implementación:** 2 de noviembre de 2025

---

## 📞 Soporte

Si encuentras problemas con la visualización de los desgloses o datos incorrectos:

1. Verifica que la vista SQL `vw_eventos_analisis_financiero` esté actualizada
2. Confirma que los campos de categorías existen en la base de datos
3. Revisa la consola del navegador para errores de TypeScript
4. Valida que los datos se estén cargando correctamente desde el hook

---

**Estado:** ✅ **IMPLEMENTADO Y PUBLICADO**  
**Commits en repositorio:** 
- `ceccd8e` (inicial con tarjetas)
- `ecb8ced` (corrección final con desgloses visibles)

**URL del Servidor de Desarrollo:** http://localhost:5173/
