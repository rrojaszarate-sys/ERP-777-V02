# Plan de Implementación - Correcciones Módulo de Eventos

**Fecha:** $(date +"%Y-%m-%d")  
**Estado Actual:** b346b10 (ESTABLE)  
**Desarrollador:** @rodrichrz

---

## 🎯 OBJETIVO

Implementar las correcciones reportadas por el usuario:
1. ✅ Reorganizar dashboard en 2 filas de 4 columnas
2. ✅ Hacer sección de utilidades colapsable (colapsada por defecto)
3. ❌ Implementar funcionalidad de "Agregar Gasto"
4. ⚠️ Verificar que todos los tabs del modal funcionan

---

## 📁 ARCHIVOS A MODIFICAR

1. **src/modules/eventos/EventosListPageNew.tsx** - Dashboard y lista
2. **src/modules/eventos/EventoDetailModal.tsx** - Modal de detalles (botón Agregar Gasto)
3. **NUEVO: src/modules/eventos/GastoModal.tsx** - Modal para crear/editar gastos

---

## ⚙️ CAMBIO 1: Reorganizar Dashboard en 2 Filas

**Archivo:** `src/modules/eventos/EventosListPageNew.tsx`  
**Línea:** 726-1103  
**Dificultad:** 🔥🔥🔥 ALTA (JSX complejo con muchos divs)

### Estado Actual (INCORRECTO)
```tsx
{/* Dashboard de Sumatorias */}
{dashboard && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
    {/* 8 tarjetas en UNA sola fila */}
    {/* Total Eventos */}
    {/* Ingresos */}
    {/* Gastos Totales */}
    {/* Gastos Pagados */}
    {/* Provisiones Comprometidas */}
    {/* Provisiones Totales */}
    {/* Provisiones Disponibles */}
    {/* Disponible */}
    
    {/* Sección de Utilidades (col-span-full) */}
    <div className="col-span-full grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Utilidad Estimada, Real, Cobrada, Gráfico */}
    </div>
  </div>
)}
```

### Estado Objetivo (CORRECTO)
```tsx
{/* Dashboard de Sumatorias */}
{dashboard && (
  <div className="space-y-3">
    {/* Primera fila: 4 tarjetas principales */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Total Eventos */}
      {/* Ingresos */}
      {/* Gastos Totales */}
      {/* Gastos Pagados */}
    </div>

    {/* Segunda fila: 4 tarjetas de provisiones */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Provisiones Comprometidas */}
      {/* Provisiones Totales */}
      {/* Provisiones Disponibles */}
      {/* Disponible */}
    </div>

    {/* Sección de Utilidades (COLAPSABLE) - Ver Cambio 2 */}
  </div>
)}
```

### ⚠️ PUNTOS DE CORTE EXACTOS

**Cierre de Primera Fila:** Después de la tarjeta "Gastos Pagados" (línea ~883)
```tsx
          </div>
        </div> {/* ← CERRAR PRIMERA FILA AQUÍ */}

        {/* Segunda fila: 4 tarjetas de provisiones */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Gastos Pendientes (Provisiones Comprometidas) */}
```

**Cierre de Segunda Fila:** Después de la tarjeta "Disponible" (línea ~1103)
```tsx
          </div>
        </div> {/* ← CERRAR SEGUNDA FILA AQUÍ */}

        {/* Grid de Utilidades + Gráfico (ahora colapsable) */}
```

### 🔧 AJUSTES ADICIONALES
- Cambiar `gap-4` → `gap-3` (más compacto)
- Cambiar `p-4` → `p-3` (tarjetas más pequeñas)
- Cambiar `text-sm` → `text-xs` (texto más pequeño)
- Cambiar `text-xl` → `text-lg` (valores más pequeños)

---

## ⚙️ CAMBIO 2: Hacer Sección de Utilidades Colapsable

**Archivo:** `src/modules/eventos/EventosListPageNew.tsx`  
**Línea:** ~49 (estados) y ~1103 (sección)  
**Dificultad:** 🔥 BAJA

### Paso 1: Agregar Estado (línea ~49)

Buscar donde están los otros estados collapse:
```tsx
const [showGastosTotalesDetails, setShowGastosTotalesDetails] = useState(false);
const [showGastosPagadosDetails, setShowGastosPagadosDetails] = useState(false);
// ... otros estados ...
```

Agregar DESPUÉS:
```tsx
const [showUtilidadesSection, setShowUtilidadesSection] = useState(false); // ← COLAPSADO por defecto
```

### Paso 2: Agregar Botón Toggle (línea ~1103)

ANTES de la línea:
```tsx
{/* Grid de Utilidades + Gráfico */}
<div className="col-span-full grid grid-cols-1 lg:grid-cols-4 gap-4">
```

INSERTAR:
```tsx
{/* Botón para expandir/colapsar Utilidades */}
<button
  onClick={() => setShowUtilidadesSection(!showUtilidadesSection)}
  className="col-span-full w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-md hover:shadow-lg transition-all"
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

### Paso 3: Envolver Grid de Utilidades (línea ~1103)

CAMBIAR:
```tsx
{/* Grid de Utilidades + Gráfico */}
<div className="col-span-full grid grid-cols-1 lg:grid-cols-4 gap-4">
  {/* Utilidad Estimada */}
  {/* Utilidad Real */}
  {/* Utilidad Cobrada */}
  {/* Índice de Cobro */}
</div>
```

POR:
```tsx
{/* Grid de Utilidades + Gráfico (condicional) */}
{showUtilidadesSection && (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="col-span-full grid grid-cols-1 lg:grid-cols-4 gap-4"
    >
      {/* Utilidad Estimada */}
      {/* Utilidad Real */}
      {/* Utilidad Cobrada */}
      {/* Índice de Cobro */}
    </motion.div>
  </AnimatePresence>
)}
```

---

## ⚙️ CAMBIO 3: Implementar Funcionalidad "Agregar Gasto"

**Archivos:**
- `src/modules/eventos/EventoDetailModal.tsx` (modificar)
- `src/modules/eventos/GastoModal.tsx` (crear nuevo)

**Dificultad:** 🔥🔥 MEDIA

### Paso 1: Crear GastoModal.tsx

Crear archivo: `src/modules/eventos/GastoModal.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface GastoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  eventoId: string;
  gasto?: any; // Para edición (opcional)
}

export const GastoModal: React.FC<GastoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  eventoId,
  gasto
}) => {
  const [loading, setLoading] = useState(false);
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

  // Cargar categorías de gastos
  const { data: categorias, isLoading: loadingCategorias } = useQuery({
    queryKey: ['evt_categorias_gastos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evt_categorias_gastos')
        .select('*')
        .order('nombre');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Resetear form cuando cambia el gasto
  useEffect(() => {
    if (gasto) {
      setFormData({
        concepto: gasto.concepto || '',
        total: gasto.total || 0,
        fecha_gasto: gasto.fecha_gasto || new Date().toISOString().split('T')[0],
        categoria_id: gasto.categoria_id || '',
        descripcion: gasto.descripcion || '',
        proveedor: gasto.proveedor || '',
        referencia: gasto.referencia || '',
        estado_pago: gasto.estado_pago || 'pendiente',
      });
    }
  }, [gasto]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (gasto?.id) {
        // Actualizar gasto existente
        const { error } = await supabase
          .from('evt_gastos')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', gasto.id);

        if (error) throw error;
      } else {
        // Crear nuevo gasto
        const { error } = await supabase
          .from('evt_gastos')
          .insert([{
            ...formData,
            evento_id: eventoId,
            created_at: new Date().toISOString(),
          }]);

        if (error) throw error;
      }

      await onSave(); // Recargar lista
      onClose();
    } catch (error) {
      console.error('Error al guardar gasto:', error);
      alert('Error al guardar el gasto. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {gasto ? 'Editar Gasto' : 'Agregar Gasto'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Concepto */}
          <div className="space-y-2">
            <Label htmlFor="concepto">Concepto *</Label>
            <Input
              id="concepto"
              required
              placeholder="Ej: Gasolina para transporte"
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
            />
          </div>

          {/* Total y Fecha */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total">Total *</Label>
              <Input
                id="total"
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={formData.total}
                onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_gasto">Fecha del Gasto *</Label>
              <Input
                id="fecha_gasto"
                type="date"
                required
                value={formData.fecha_gasto}
                onChange={(e) => setFormData({ ...formData, fecha_gasto: e.target.value })}
              />
            </div>
          </div>

          {/* Categoría y Estado de Pago */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoria_id">Categoría *</Label>
              {loadingCategorias ? (
                <div className="flex items-center gap-2 p-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-500">Cargando...</span>
                </div>
              ) : (
                <Select
                  value={formData.categoria_id}
                  onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado_pago">Estado de Pago</Label>
              <Select
                value={formData.estado_pago}
                onValueChange={(value) => setFormData({ ...formData, estado_pago: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">⏳ Pendiente</SelectItem>
                  <SelectItem value="pagado">✅ Pagado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Proveedor y Referencia */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="proveedor">Proveedor</Label>
              <Input
                id="proveedor"
                placeholder="Nombre del proveedor"
                value={formData.proveedor}
                onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referencia">Referencia/Folio</Label>
              <Input
                id="referencia"
                placeholder="Folio o referencia"
                value={formData.referencia}
                onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              placeholder="Detalles adicionales del gasto..."
              rows={3}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            />
          </div>

          {/* Botones */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.concepto || !formData.total || !formData.categoria_id}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {gasto ? 'Actualizar' : 'Crear'} Gasto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
```

### Paso 2: Modificar EventoDetailModal.tsx

**2.1 - Agregar import (línea ~1)**
```tsx
import { GastoModal } from './GastoModal';
```

**2.2 - Agregar estados (después de línea 33)**
```tsx
const [showGastoModal, setShowGastoModal] = useState(false);
const [editingGasto, setEditingGasto] = useState<any | null>(null);
```

**2.3 - Modificar botón "Agregar Gasto" (línea ~966)**

CAMBIAR:
```tsx
<Button
  onClick={() => console.log('Create expense')}  // ❌ SOLO LOGS
  className="bg-red-500 hover:bg-red-600"
>
  <Plus className="w-4 h-4 mr-2" />
  Agregar Gasto
</Button>
```

POR:
```tsx
<Button
  onClick={() => {
    setEditingGasto(null); // Limpiar edición
    setShowGastoModal(true); // Abrir modal
  }}
  className="bg-red-500 hover:bg-red-600"
>
  <Plus className="w-4 h-4 mr-2" />
  Agregar Gasto
</Button>
```

**2.4 - Agregar modal al final (antes del último `</Dialog>`)**
```tsx
{/* Modal de Gasto */}
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

---

## ⚙️ CAMBIO 4: Verificar Tabs del Modal

**Archivo:** `src/modules/eventos/EventoDetailModal.tsx`  
**Dificultad:** 🔥 BAJA (solo verificación)

### Tabs a Probar

1. **Tab "Overview"**
   - Click en tab
   - Verificar que muestra tarjetas resumen
   - Verificar cálculos (ingresos, gastos, utilidad)

2. **Tab "Ingresos"**
   - Click en "Agregar Ingreso" → debe abrir modal
   - Crear ingreso de prueba
   - Editar ingreso (click en botón editar)
   - Eliminar ingreso (click en botón eliminar)
   - Verificar lista se actualiza

3. **Tab "Gastos"** ⚠️ CRÍTICO
   - Click en "Agregar Gasto" → debe abrir **NUEVO** modal
   - Crear gasto de prueba
   - Verificar sub-tabs: todos, combustible, materiales, rh, sps
   - Editar gasto (click en botón editar)
   - Eliminar gasto (click en botón eliminar)

4. **Tab "Workflow"**
   - Verificar que muestra historial de estados
   - Probar cambio de estado (si aplica)

### Checklist de Validación
```
[ ] Overview tab carga correctamente
[ ] Ingresos tab: crear funciona
[ ] Ingresos tab: editar funciona
[ ] Ingresos tab: eliminar funciona
[ ] Gastos tab: crear funciona (NUEVO con GastoModal)
[ ] Gastos tab: editar funciona
[ ] Gastos tab: eliminar funciona
[ ] Gastos tab: sub-tabs funcionan
[ ] Workflow tab carga correctamente
```

---

## 🚀 ORDEN DE IMPLEMENTACIÓN

### Paso 1: Cambio más fácil primero
✅ **CAMBIO 2:** Hacer sección de utilidades colapsable
- Bajo riesgo
- Fácil de revertir
- No afecta estructura principal

### Paso 2: Funcionalidad crítica
✅ **CAMBIO 3:** Implementar "Agregar Gasto"
- Crear GastoModal.tsx
- Modificar EventoDetailModal.tsx
- Probar creación/edición

### Paso 3: Reorganización compleja
⚠️ **CAMBIO 1:** Reorganizar dashboard en 2 filas
- ALTO RIESGO de corromper JSX
- Hacer backup antes
- Verificar CADA div de apertura/cierre

### Paso 4: Validación
✅ **CAMBIO 4:** Verificar todos los tabs
- Prueba manual completa
- Documentar bugs encontrados

---

## ⚠️ PRECAUCIONES ANTES DE CAMBIO 1

### Backup
```bash
cd /home/rodrichrz/proyectos/Made-Erp-777-ok/ERP-777-V01-CLEAN
cp src/modules/eventos/EventosListPageNew.tsx src/modules/eventos/EventosListPageNew.tsx.backup
```

### Contar divs antes de editar
```bash
# Contar divs de apertura
grep -o "<div" src/modules/eventos/EventosListPageNew.tsx | wc -l

# Contar divs de cierre
grep -o "</div>" src/modules/eventos/EventosListPageNew.tsx | wc -l

# DEBEN SER IGUALES
```

### Compilar después de CADA cambio
```bash
npm run build
# Si hay error JSX, revertir INMEDIATAMENTE
```

---

## 📝 CHECKLIST DE DEPLOY

Una vez completadas TODAS las modificaciones:

```
[ ] Compilación exitosa (npm run build)
[ ] No hay errores TypeScript críticos
[ ] Dashboard en 2 filas funciona
[ ] Sección utilidades colapsable funciona
[ ] GastoModal creado y funcional
[ ] Botón "Agregar Gasto" abre modal
[ ] Todos los tabs verificados
[ ] Prueba en local exitosa
[ ] Commit con mensaje descriptivo
[ ] Push a origin/main
[ ] Deployment Vercel exitoso
[ ] Prueba en producción
```

### Comando de Commit
```bash
git add .
git commit -m "feat(eventos): Reorganizar dashboard en 2 filas, agregar sección colapsable de utilidades e implementar funcionalidad de agregar gasto

- Reorganizar 8 tarjetas del dashboard en 2 filas de 4 columnas
- Hacer sección de análisis de utilidades colapsable (colapsada por defecto)
- Crear componente GastoModal para agregar/editar gastos
- Conectar botón 'Agregar Gasto' al nuevo modal
- Reducir tamaños (padding p-3, gap-3, text-xs)
- Verificar funcionalidad de todos los tabs del modal

Refs: #eventos-dashboard #gasto-modal"

git push origin main
```

---

## 📚 DOCUMENTACIÓN ADICIONAL

Ver también:
- `/docs/ANALISIS_PROBLEMAS_EVENTOS.md` - Análisis detallado de problemas
- `/docs/ctx/` - Contexto del proyecto

---

**Última actualización:** $(date)  
**Desarrollador:** @rodrichrz
