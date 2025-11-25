# Análisis de Problemas - Módulo de Eventos

**Fecha:** $(date +"%Y-%m-%d %H:%M")  
**Commit Actual:** b346b10 (ESTABLE)  
**Commit Corrupto Revertido:** 1dbeb8f

---

## 📋 RESUMEN EJECUTIVO

Se identificaron 4 problemas principales reportados por el usuario:

1. ✅ **Dashboard NO está en 2 renglones** - Actualmente en 5 columnas
2. ✅ **Sección de Utilidades NO es colapsable** - Siempre visible
3. ❌ **Botón "Agregar Gasto" NO funciona** - Solo hace console.log
4. ⚠️ **Tabs del modal** - Requiere verificación completa

---

## 🔍 PROBLEMA 1: Dashboard en 5 Columnas (NO en 2 Filas)

### Estado Actual
**Archivo:** `src/modules/eventos/EventosListPageNew.tsx`  
**Línea:** 730

```tsx
{/* Dashboard de Sumatorias */}
{dashboard && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
    {/* 8 tarjetas en una sola fila - INCORRECTO */}
  </div>
)}
```

### Estado Esperado
```tsx
{dashboard && (
  <div className="space-y-4">
    {/* Primera fila: 4 tarjetas */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Total Eventos */}
      {/* Ingresos */}
      {/* Gastos Totales */}
      {/* Gastos Pagados */}
    </div>
    
    {/* Segunda fila: 4 tarjetas */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Provisiones Comprometidas */}
      {/* Provisiones Totales */}
      {/* Provisiones Disponibles */}
      {/* Disponible */}
    </div>
  </div>
)}
```

### Ajustes Adicionales Requeridos
- Reducir padding de `p-4` a `p-3`
- Reducir texto de `text-sm` a `text-xs`
- Reducir títulos de `text-xl` a `text-lg`
- Asegurar responsive: `gap-4` → `gap-3`

### ⚠️ ADVERTENCIA
En commit 1dbeb8f se intentó este cambio y se dejaron divs sin cerrar, causando 32 errores de compilación JSX. Se realizó `git reset --hard b346b10` para revertir.

**LECCIÓN:** Hacer cambios completos verificando TODOS los divs de apertura y cierre.

---

## 🔍 PROBLEMA 2: Sección de Utilidades Siempre Visible

### Estado Actual
**Archivo:** `src/modules/eventos/EventosListPageNew.tsx`  
**Líneas:** 1103-1238

```tsx
{/* Grid de Utilidades + Gráfico */}
<div className="col-span-full grid grid-cols-1 lg:grid-cols-4 gap-4">
  {/* Utilidad Estimada */}
  {/* Utilidad Real */}
  {/* Utilidad Cobrada */}
  {/* Gráfico de Índice de Cobro */}
  {/* ❌ NO tiene botón ni estado para colapsar */}
</div>
```

### Estado Requerido

**1. Agregar estado (línea ~49):**
```tsx
const [showUtilidadesSection, setShowUtilidadesSection] = useState(false); // ← FALSO por defecto
```

**2. Agregar botón toggle (línea ~1100):**
```tsx
<button
  onClick={() => setShowUtilidadesSection(!showUtilidadesSection)}
  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-md hover:shadow-lg transition-all"
>
  <div className="flex items-center gap-3">
    <TrendingUp className="w-5 h-5 text-white" />
    <span className="text-lg font-semibold text-white">
      📊 Análisis de Utilidades y Rendimiento
    </span>
  </div>
  <ChevronDown
    className={`w-5 h-5 text-white transition-transform ${
      showUtilidadesSection ? 'rotate-180' : ''
    }`}
  />
</button>
```

**3. Envolver contenido en condicional:**
```tsx
{showUtilidadesSection && (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="col-span-full grid grid-cols-1 lg:grid-cols-4 gap-4"
    >
      {/* Contenido de utilidades y gráfico */}
    </motion.div>
  </AnimatePresence>
)}
```

---

## 🔍 PROBLEMA 3: Botón "Agregar Gasto" NO Funciona ⚠️ CRÍTICO

### Estado Actual
**Archivo:** `src/modules/eventos/EventoDetailModal.tsx`  
**Líneas:** 964-971

```tsx
{canCreate('gastos') && (
  <Button
    onClick={() => console.log('Create expense')}  // ⚠️ SOLO LOGS - NO HACE NADA
    className="bg-red-500 hover:bg-red-600"
  >
    <Plus className="w-4 h-4 mr-2" />
    Agregar Gasto
  </Button>
)}
```

### Análisis Profundo

**Estados actuales en el componente (líneas 28-33):**
```tsx
const [activeTab, setActiveTab] = useState<'overview' | 'ingresos' | 'gastos' | 'workflow'>('overview');
const [gastos, setGastos] = useState<any[]>([]);
// ❌ NO EXISTE: showGastoModal, editingGasto
```

**Carga de datos (líneas 78-96):**
```tsx
const loadFinancialData = async () => {
  // Carga ingresos
  const { data: ingresosData } = await supabase
    .from('evt_ingresos')
    .select('*, cliente:clientes(nombre_comercial)')
    .eq('evento_id', eventoId);

  // Carga gastos
  const { data: gastosData } = await supabase
    .from('evt_gastos')
    .select('*, categoria:evt_categorias_gastos(nombre, color)')
    .eq('evento_id', eventoId);

  setGastos(gastosData || []);
  // ✅ La consulta funciona pero NO HAY UI PARA CREAR
};
```

### Solución Requerida

**1. Agregar estados necesarios (después de línea 33):**
```tsx
const [showGastoModal, setShowGastoModal] = useState(false);
const [editingGasto, setEditingGasto] = useState<any | null>(null);
```

**2. Modificar botón (línea 966):**
```tsx
onClick={() => {
  setEditingGasto(null); // Limpiar edición
  setShowGastoModal(true); // Abrir modal
}}
```

**3. Crear componente GastoModal:**

Necesitas crear un modal similar a `IngresoModal` que incluya:

```tsx
interface GastoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (gasto: any) => Promise<void>;
  eventoId: string;
  gasto?: any; // Para edición
}

const GastoModal: React.FC<GastoModalProps> = ({ isOpen, onClose, onSave, eventoId, gasto }) => {
  const [formData, setFormData] = useState({
    concepto: gasto?.concepto || '',
    total: gasto?.total || 0,
    fecha_gasto: gasto?.fecha_gasto || new Date().toISOString().split('T')[0],
    categoria_id: gasto?.categoria_id || '',
    descripcion: gasto?.descripcion || '',
    proveedor: gasto?.proveedor || '',
    referencia: gasto?.referencia || '',
    estado_pago: gasto?.estado_pago || 'pendiente',
  });

  // Cargar categorías desde evt_categorias_gastos
  const { data: categorias } = useQuery({
    queryKey: ['evt_categorias_gastos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('evt_categorias_gastos')
        .select('*')
        .order('nombre');
      return data || [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (gasto?.id) {
      // Actualizar
      await supabase
        .from('evt_gastos')
        .update(formData)
        .eq('id', gasto.id);
    } else {
      // Crear
      await supabase
        .from('evt_gastos')
        .insert([{ ...formData, evento_id: eventoId }]);
    }
    
    await onSave(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{gasto ? 'Editar Gasto' : 'Agregar Gasto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {/* Campos del formulario */}
          <div className="space-y-4">
            <Input
              label="Concepto"
              required
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
            />
            <Input
              label="Total"
              type="number"
              required
              value={formData.total}
              onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) })}
            />
            <Select
              label="Categoría"
              required
              value={formData.categoria_id}
              onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
            >
              {categorias?.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </Select>
            {/* ... más campos ... */}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {gasto ? 'Actualizar' : 'Crear'} Gasto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
```

**4. Agregar modal al componente (después de línea 1000):**
```tsx
{showGastoModal && (
  <GastoModal
    isOpen={showGastoModal}
    onClose={() => {
      setShowGastoModal(false);
      setEditingGasto(null);
    }}
    onSave={async () => {
      await loadFinancialData(); // Recargar gastos
    }}
    eventoId={eventoId}
    gasto={editingGasto}
  />
)}
```

### Campos de la tabla evt_gastos
Según la consulta existente, la tabla tiene:
- `id` - UUID (PK)
- `evento_id` - UUID (FK)
- `concepto` - text
- `total` - numeric
- `fecha_gasto` - date
- `categoria_id` - UUID (FK a evt_categorias_gastos)
- `descripcion` - text
- `proveedor` - text
- `referencia` - text
- `estado_pago` - text ('pendiente' | 'pagado')
- `created_at` - timestamp
- `updated_at` - timestamp

---

## 🔍 PROBLEMA 4: Verificación de Tabs en EventoDetailModal

### Tabs Existentes
**Archivo:** `src/modules/eventos/EventoDetailModal.tsx`  
**Línea:** 28

```tsx
const [activeTab, setActiveTab] = useState<'overview' | 'ingresos' | 'gastos' | 'workflow'>('overview');
```

### Tabs a Verificar

#### 1. Tab "Overview" (Resumen)
- **Estado:** ✅ Probablemente funcional
- **Contenido:** Tarjetas resumen financiero
- **Necesita:** Verificación visual

#### 2. Tab "Ingresos"
- **Estado:** ✅ Probablemente funcional
- **Contenido:** Lista de ingresos con CRUD completo
- **Características:**
  - Botón "Agregar Ingreso" (probablemente funcional)
  - Editar ingreso
  - Eliminar ingreso
- **Necesita:** Verificar que el modal de ingresos funcione

#### 3. Tab "Gastos"
- **Estado:** ⚠️ PARCIALMENTE FUNCIONAL
- **Problema Conocido:** Botón "Agregar Gasto" NO funciona
- **Características:**
  - Sub-tabs: todos, combustible, materiales, rh, sps
  - Lista de gastos (funcional)
  - Editar gasto (¿funcional?)
  - Eliminar gasto (¿funcional?)
  - **⚠️ Crear gasto (NO FUNCIONAL)**
- **Necesita:** Implementar modal de creación

#### 4. Tab "Workflow"
- **Estado:** ❓ Desconocido
- **Contenido:** Transiciones de estado del evento
- **Necesita:** Verificación completa

### Recomendación
Realizar prueba manual de TODOS los tabs para verificar:
1. Cambio entre tabs funciona
2. Botones de acción funcionan
3. Modales abren y cierran correctamente
4. Datos se guardan correctamente
5. UI se actualiza después de cambios

---

## 📊 COMPARACIÓN: Otros Dashboards del Proyecto

### Objetivo
Actualizar todos los dashboards basándose en el diseño de gestión de eventos.

### Dashboards a Actualizar

Buscar en el proyecto archivos que contengan:
- `dashboard` en el nombre
- Grid layouts con `grid-cols-`
- Tarjetas de resumen financiero

### Patrón a Aplicar

**Design Pattern Eventos:**
1. **Layout:** 2 filas x 4 columnas (responsive)
2. **Spacing:** gap-3, p-3
3. **Typography:** text-xs, text-lg
4. **Colors:** Gradientes para headers
5. **Collapse:** Secciones colapsables con AnimatePresence
6. **Icons:** Lucide React icons
7. **Responsiveness:** grid-cols-1 md:grid-cols-2 lg:grid-cols-4

### Archivos Candidatos (requiere búsqueda)
```bash
find src -type f -name "*Dashboard*.tsx" -o -name "*List*.tsx" | grep -v node_modules
```

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Fase 1: Correcciones Inmediatas (SEGURO)
- [x] Revertir a commit estable b346b10
- [ ] Reorganizar dashboard en 2 filas CON CUIDADO
- [ ] Hacer sección de utilidades colapsable
- [ ] Commit + Push

### Fase 2: Funcionalidad Crítica
- [ ] Crear GastoModal component
- [ ] Agregar estados showGastoModal, editingGasto
- [ ] Conectar botón "Agregar Gasto"
- [ ] Implementar lógica de creación/edición
- [ ] Commit + Push

### Fase 3: Verificación
- [ ] Probar todos los tabs del modal
- [ ] Verificar responsive en móvil/tablet/desktop
- [ ] Revisar permisos (canCreate, canUpdate, canDelete)
- [ ] Commit + Push

### Fase 4: Expansión
- [ ] Buscar otros dashboards en el proyecto
- [ ] Aplicar mismo patrón de diseño
- [ ] Actualizar documentación completa
- [ ] Commit + Push + Restart services

---

## 🛠️ COMANDOS ÚTILES

### Verificar errores
```bash
npm run build  # Ver errores de compilación
npm run type-check  # Solo TypeScript
```

### Búsqueda de archivos
```bash
# Buscar dashboards
grep -r "grid-cols-" src --include="*.tsx"

# Buscar modals
find src -name "*Modal*.tsx"
```

### Git
```bash
# Ver estado actual
git log --oneline -5

# Crear commit seguro
git add .
git commit -m "feat(eventos): Reorganizar dashboard en 2 filas y agregar sección colapsable"
git push origin main

# Si algo sale mal
git reset --hard HEAD~1  # Revertir último commit
```

---

## ⚠️ ADVERTENCIAS Y LECCIONES APRENDIDAS

### ❌ Error Anterior: Commit 1dbeb8f Corrupto
**Problema:** Se intentó reorganizar el dashboard pero se dejaron divs sin cerrar.

**Síntomas:**
```
Error: Expected corresponding JSX closing tag for <div> (1483:4)
Error: Unexpected token )}. Did you mean {'}'}? (1274)
Error: motion.div no tiene etiqueta de cierre correspondiente (580)
```

**Solución aplicada:**
```bash
git reset --hard b346b10  # Revertir a commit estable
```

**Lección:** Cuando modifiques JSX con múltiples divs:
1. Cuenta TODOS los `<div>` de apertura
2. Cuenta TODOS los `</div>` de cierre
3. Verifica que coincidan ANTES de guardar
4. Usa editor con auto-close tags
5. Formatea código después de editar (Prettier)
6. Compila antes de commit

### ✅ Mejores Prácticas
1. **Pequeños cambios verificables** - No hagas 5 cambios a la vez
2. **Compila después de cada cambio** - `npm run build`
3. **Commits atómicos** - Un problema = un commit
4. **Mensajes descriptivos** - "feat(eventos): Agregar X" no "fix"
5. **Branch por feature** - No edites directo en main (ideal)

---

## 📝 CHECKLIST DE VALIDACIÓN

Antes de considerar COMPLETADO:

### Dashboard
- [ ] Grid está en 2 filas de 4 columnas
- [ ] Responsive funciona (móvil: 1 col, tablet: 2 cols, desktop: 4 cols)
- [ ] Padding reducido a p-3
- [ ] Texto reducido a text-xs
- [ ] Gap reducido a gap-3
- [ ] Tarjetas colapsables individuales funcionan
- [ ] No hay errores de JSX
- [ ] No hay errores de TypeScript críticos

### Sección de Utilidades
- [ ] Botón toggle funcional
- [ ] Estado por defecto: COLAPSADO (false)
- [ ] AnimatePresence smooth
- [ ] Iconos ChevronDown rotan correctamente
- [ ] Contenido se renderiza cuando está expandido
- [ ] No afecta performance

### Botón Agregar Gasto
- [ ] Modal GastoModal creado
- [ ] Estados showGastoModal, editingGasto agregados
- [ ] Botón abre modal
- [ ] Formulario tiene todos los campos
- [ ] Categorías se cargan desde DB
- [ ] Validación de campos requeridos
- [ ] Guardar crea registro en evt_gastos
- [ ] Lista se actualiza después de guardar
- [ ] Modal se cierra correctamente

### Tabs del Modal
- [ ] Overview tab funciona
- [ ] Ingresos tab funciona (incluye crear/editar/eliminar)
- [ ] Gastos tab funciona (incluye crear/editar/eliminar con nuevo modal)
- [ ] Workflow tab funciona
- [ ] Cambio entre tabs smooth
- [ ] Datos persisten al cambiar tabs

### Otros Dashboards
- [ ] Identificados todos los dashboards del proyecto
- [ ] Patrón aplicado consistentemente
- [ ] Responsive verificado en todos
- [ ] No hay regresiones

### Deployment
- [ ] Commit con mensaje descriptivo
- [ ] Push exitoso a origin/main
- [ ] Vercel deployment exitoso
- [ ] Servidor desarrollo reiniciado
- [ ] Prueba en producción exitosa

### Documentación
- [ ] README actualizado
- [ ] Diagramas de arquitectura
- [ ] Ejemplos de uso
- [ ] Screenshots actualizados
- [ ] Changelog actualizado

---

## 📚 ARCHIVOS RELACIONADOS

### Componentes Principales
- `src/modules/eventos/EventosListPageNew.tsx` - Dashboard y lista
- `src/modules/eventos/EventoDetailModal.tsx` - Modal de detalles
- `src/modules/eventos/EventoFormModal.tsx` - Formulario de evento (¿existe?)
- `src/modules/eventos/GastoModal.tsx` - **CREAR ESTE ARCHIVO**

### Tipos y Utilidades
- `src/types/eventos.ts` - Tipos TypeScript (revisar)
- `src/lib/supabase.ts` - Cliente Supabase
- `src/hooks/usePermissions.ts` - Hook de permisos

### Base de Datos
- `supabase/migrations/*.sql` - Migraciones
- Tablas relacionadas:
  - `evt_eventos`
  - `evt_ingresos`
  - `evt_gastos`
  - `evt_categorias_gastos`
  - `vw_eventos_analisis_financiero` (vista)

---

**Última actualización:** $(date)  
**Autor:** GitHub Copilot  
**Estado:** ANÁLISIS COMPLETO - LISTO PARA IMPLEMENTACIÓN
