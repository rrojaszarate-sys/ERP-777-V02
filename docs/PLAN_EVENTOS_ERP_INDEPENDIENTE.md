# PLAN: Tropicalización Módulo Eventos-ERP (Independiente)

## Objetivo
Crear un módulo Eventos-ERP completamente independiente del módulo Eventos (producción), con conceptos financieros alineados al Excel del cliente y configuración flexible de visualización.

---

## 1. FÓRMULAS FINANCIERAS (Según Excel del Cliente)

### 1.1 Conceptos Clave
```
INGRESOS          = Todos los ingresos (cobrados + pendientes)
GASTOS            = Todos los gastos ejecutados (pagados + pendientes de pago)
PROVISIONES       = Presupuesto reservado por categoría
PROV. DISPONIBLES = MAX(0, PROVISIONES - GASTOS)  // Nunca negativo
UTILIDAD          = INGRESOS - GASTOS - PROVISIONES_DISPONIBLES
MARGEN %          = (UTILIDAD / INGRESOS) * 100
```

### 1.2 Categorías de Gastos/Provisiones
| ID | Categoría | Icono |
|----|-----------|-------|
| 6  | SP's (Solicitudes de Pago) | 💳 |
| 7  | RH (Recursos Humanos) | 👥 |
| 8  | Materiales | 🛠️ |
| 9  | Combustible/Peaje | 🚗⛽ |

### 1.3 Semáforo de Utilidad (Colores)
| Margen % | Color | Etiqueta |
|----------|-------|----------|
| >= 35%   | Verde | Excelente |
| 25-34%   | Amarillo | Regular |
| 1-24%    | Rojo | Bajo |
| <= 0%    | Gris | Ninguno |

---

## 2. ESTRUCTURA DE TABLAS (Independientes)

### 2.1 Tablas Eventos-ERP (a crear si no existen)
```sql
-- Tablas principales
eventos_erp           -- Eventos
clientes_erp          -- Clientes
ingresos_erp          -- Ingresos
gastos_erp            -- Gastos
estados_erp           -- Estados del workflow
tipos_evento_erp      -- Tipos de evento
categorias_gasto_erp  -- Categorías de gasto

-- Tablas auxiliares
historial_estados_erp -- Historial de cambios de estado
documentos_erp        -- Documentos adjuntos
```

### 2.2 Vista Principal (Nueva)
```sql
CREATE VIEW vw_eventos_erp_analisis AS
-- Similar a vw_eventos_analisis_financiero pero:
-- 1. Usa tablas *_erp
-- 2. Incluye columna "utilidad" con fórmula correcta
-- 3. Incluye "provisiones_disponibles" con MAX(0, ...)
```

---

## 3. MENÚ Y NAVEGACIÓN

### 3.1 Agregar Eventos-ERP al Menú (Layout.tsx)
```typescript
{
  id: 'eventos-erp',
  name: 'Eventos-ERP',
  icon: Calendar,
  active: true,
  color: 'text-orange-600',
  submenu: [
    { name: 'Lista de Eventos', path: '/eventos-erp', icon: List },
    { name: 'Clientes', path: '/eventos-erp/clientes', icon: Users },
    { name: 'Proyectos y Gantt', path: '/eventos-erp/proyectos', icon: FolderKanban },
    { name: 'Análisis Financiero', path: '/eventos-erp/analisis', icon: BarChart3 },
    { name: 'Flujo de Estados', path: '/eventos-erp/workflow', icon: Settings },
    { name: 'Catálogos', path: '/eventos-erp/catalogos', icon: FolderOpen }
  ]
}
```

### 3.2 Rutas en App.tsx
```typescript
// Rutas de Eventos-ERP (independientes)
<Route path="eventos-erp" element={<EventosERPDashboard />} />
<Route path="eventos-erp/lista" element={<EventosERPListPage />} />
<Route path="eventos-erp/clientes" element={<ClientesERPPage />} />
// ... etc
```

---

## 4. COMPONENTES UI

### 4.1 Dashboard Resumen (Estilo Excel)
```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│  EVENTOS    │  INGRESOS   │   GASTOS    │ PROVISIONES │  UTILIDAD   │
│     72      │  $11,360K   │  $7,167K    │    $87K     │   $4,106K   │
│             │ ▼ Desglose  │ ▼ Desglose  │ ▼ Desglose  │  [GAUGE]    │
│             │ Cobr: $8.3M │ 🚗 $960K    │ 🚗 $0K      │    37%      │
│             │ Pend: $3.0M │ 🛠️ $2.1M    │ 🛠️ $0K      │   Verde     │
│             │ Est:  $0K   │ 👥 $2.9M    │ 👥 $11K     │             │
│             │             │ 💳 $1.1M    │ 💳 $268M    │             │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

### 4.2 Tabla de Eventos
| CLAVE | PROYECTO | CLIENTE | ESTADO | INGRESOS | GASTOS | PROVISIONES | UTILIDAD | ACCIONES |
|-------|----------|---------|--------|----------|--------|-------------|----------|----------|
| EVT-001 | Evento X | Cliente Y | Acuerdo | $91K | $72K | $0K | $19K [37%] Verde | 👁️ ✏️ 🗑️ |

### 4.3 Configuración de Gráficas
Crear página de configuración en Admin para:
- [ ] Mostrar/Ocultar gauge en dashboard
- [ ] Mostrar/Ocultar gauge en tabla
- [ ] Formato de números (K, M, normal)
- [ ] Mostrar/Ocultar centavos
- [ ] Columnas visibles por defecto
- [ ] Colores del semáforo personalizables

---

## 5. ARCHIVOS A CREAR/MODIFICAR

### 5.1 Nuevos Archivos
```
src/modules/eventos-erp-v2/
├── pages/
│   ├── EventosERPDashboard.tsx      # Dashboard principal
│   ├── EventosERPListPage.tsx       # Lista de eventos
│   ├── ClientesERPPage.tsx          # Gestión de clientes
│   ├── AnalisisFinancieroPage.tsx   # Análisis financiero
│   └── ConfiguracionERPPage.tsx     # Configuración de visualización
├── components/
│   ├── ResumenFinanciero.tsx        # Dashboard cards
│   ├── TablaEventos.tsx             # Tabla principal
│   ├── GaugeChart.tsx               # Gráfica de utilidad
│   └── ConfigPanel.tsx              # Panel de configuración
├── hooks/
│   ├── useEventosERP.ts             # Hook para datos
│   ├── useConfiguracionERP.ts       # Hook para configuración
│   └── useCalculosFinancieros.ts    # Hook para fórmulas
├── services/
│   └── eventosERPService.ts         # Servicio Supabase
└── types/
    └── eventosERP.types.ts          # Tipos TypeScript
```

### 5.2 Archivos a Modificar
```
src/shared/components/layout/Layout.tsx  # Agregar menú Eventos-ERP
src/App.tsx                              # Agregar rutas
```

### 5.3 Migraciones SQL
```
migrations/
├── 013_crear_tablas_eventos_erp.sql
└── 014_crear_vista_eventos_erp_analisis.sql
```

---

## 6. CONFIGURACIÓN DE VISUALIZACIÓN

### 6.1 Estructura de Configuración
```typescript
interface ConfiguracionEventosERP {
  // Dashboard
  dashboard: {
    mostrarGauge: boolean;
    mostrarDesglose: boolean;
    formatoNumeros: 'normal' | 'miles' | 'millones';
    mostrarCentavos: boolean;
  };

  // Tabla
  tabla: {
    columnasVisibles: string[];
    mostrarGaugeInline: boolean;
    filasPorPagina: number;
    expandirAutomatico: boolean;
  };

  // Semáforo
  semaforo: {
    verde: number;    // Default: 35
    amarillo: number; // Default: 25
    rojo: number;     // Default: 1
  };
}
```

### 6.2 Almacenamiento
- Opción A: localStorage (por usuario, sin BD)
- Opción B: Tabla `configuraciones_erp` en Supabase
- Opción C: Archivo de configuración en código (constantes)

**Recomendación:** Empezar con Opción A (localStorage), migrar a B después.

---

## 7. FASES DE IMPLEMENTACIÓN

### Fase 1: Base de Datos (1-2 días)
- [ ] Verificar/crear tablas *_erp
- [ ] Crear vista vw_eventos_erp_analisis con fórmula correcta
- [ ] Migrar datos de prueba

### Fase 2: Backend/Servicios (1 día)
- [ ] Crear eventosERPService.ts
- [ ] Crear hooks para datos y cálculos
- [ ] Tests unitarios de fórmulas

### Fase 3: UI Principal (2-3 días)
- [ ] Dashboard con cards y separadores
- [ ] Tabla de eventos con columna Utilidad
- [ ] Gauge chart funcional
- [ ] Agregar al menú

### Fase 4: Configuración (1 día)
- [ ] Panel de configuración en Admin
- [ ] localStorage para preferencias
- [ ] Aplicar configuración a componentes

### Fase 5: Pruebas E2E (1 día)
- [ ] Tests Cypress completos
- [ ] Verificar independencia de módulo Eventos
- [ ] Pruebas de regresión

---

## 8. NOTAS IMPORTANTES

1. **NO TOCAR** el módulo Eventos (producción con tablas evt_*)
2. **INDEPENDENCIA TOTAL** - Eventos-ERP debe funcionar sin afectar Eventos
3. **FÓRMULA DE UTILIDAD** debe coincidir exactamente con el Excel del cliente
4. **PROVISIONES** nunca negativas (usar Math.max(0, ...))

---

## 9. PRÓXIMOS PASOS

Cuando apruebes este plan:
1. Verificar estructura de tablas *_erp existentes
2. Crear vista SQL con fórmula correcta
3. Implementar UI por fases
4. Agregar al menú
5. Crear configuración

¿Apruebas este plan para proceder?
