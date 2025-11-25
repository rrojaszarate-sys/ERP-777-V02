# 💻 Ejemplos de Código para Frontend

Guía práctica con ejemplos de código React/TypeScript para implementar las provisiones desglosadas.

---

## 1. Actualizar Interface TypeScript

### Archivo: `src/modules/eventos/types/Event.ts`

```typescript
export interface Event {
  id: number;
  clave_evento: string;
  nombre_proyecto: string;
  cliente_id?: number;
  estado_id?: number;

  // ======================================
  // PROVISIONES DESGLOSADAS (NUEVO)
  // ======================================
  provision_combustible_peaje?: number;
  provision_materiales?: number;
  provision_recursos_humanos?: number;
  provision_solicitudes_pago?: number;

  // ======================================
  // CAMPOS CALCULADOS (desde vista)
  // ======================================
  provisiones?: number; // Suma automática de las 4 categorías
  utilidad_estimada?: number; // Calculada: ingresos - provisiones
  porcentaje_utilidad_estimada?: number; // Calculado

  // ======================================
  // CAMPOS OBSOLETOS (mantener por compatibilidad)
  // @deprecated - Estos campos están en cero en BD
  // ======================================
  // total_gastos?: number; // Usar vistas con _calculado
  // utilidad?: number; // Usar utilidad_real de vista
  // margen_utilidad?: number; // Usar margen_utilidad_real de vista

  // ... resto de campos existentes
  ingreso_estimado?: number;
  ganancia_estimada?: number;
  fecha_evento?: string;
  // etc.
}

// Helper para calcular total de provisiones (frontend)
export const calcularProvisionesTotal = (evento: Partial<Event>): number => {
  return (
    (evento.provision_combustible_peaje || 0) +
    (evento.provision_materiales || 0) +
    (evento.provision_recursos_humanos || 0) +
    (evento.provision_solicitudes_pago || 0)
  );
};
```

---

## 2. Componente de Formulario

### Archivo: `src/modules/eventos/components/EventForm.tsx`

#### Opción A: 4 Campos Separados (Recomendado)

```tsx
import React, { useState, useMemo } from 'react';
import { Event, calcularProvisionesTotal } from '../types/Event';

interface EventFormProps {
  initialData?: Partial<Event>;
  onSubmit: (data: Partial<Event>) => Promise<void>;
}

export const EventForm: React.FC<EventFormProps> = ({
  initialData,
  onSubmit
}) => {
  const [formData, setFormData] = useState<Partial<Event>>(
    initialData || {
      provision_combustible_peaje: 0,
      provision_materiales: 0,
      provision_recursos_humanos: 0,
      provision_solicitudes_pago: 0,
    }
  );

  // Calcular total automáticamente
  const provisionesTotal = useMemo(() =>
    calcularProvisionesTotal(formData),
    [formData]
  );

  const handleProvisionChange = (
    field: keyof Pick<Event,
      'provision_combustible_peaje' |
      'provision_materiales' |
      'provision_recursos_humanos' |
      'provision_solicitudes_pago'
    >,
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="event-form">
      {/* ... otros campos ... */}

      {/* SECCIÓN: PROVISIONES DESGLOSADAS */}
      <div className="form-section">
        <h3>Provisiones por Categoría</h3>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="provision_combustible_peaje">
              Combustible / Peaje
              <span className="field-hint">Incluye gasolina, diesel, casetas</span>
            </label>
            <input
              id="provision_combustible_peaje"
              type="number"
              step="0.01"
              min="0"
              value={formData.provision_combustible_peaje || 0}
              onChange={(e) => handleProvisionChange(
                'provision_combustible_peaje',
                e.target.value
              )}
              className="form-input"
            />
          </div>

          <div className="form-field">
            <label htmlFor="provision_materiales">
              Materiales
              <span className="field-hint">Suministros y materiales</span>
            </label>
            <input
              id="provision_materiales"
              type="number"
              step="0.01"
              min="0"
              value={formData.provision_materiales || 0}
              onChange={(e) => handleProvisionChange(
                'provision_materiales',
                e.target.value
              )}
              className="form-input"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="provision_recursos_humanos">
              Recursos Humanos
              <span className="field-hint">Personal, nómina, honorarios</span>
            </label>
            <input
              id="provision_recursos_humanos"
              type="number"
              step="0.01"
              min="0"
              value={formData.provision_recursos_humanos || 0}
              onChange={(e) => handleProvisionChange(
                'provision_recursos_humanos',
                e.target.value
              )}
              className="form-input"
            />
          </div>

          <div className="form-field">
            <label htmlFor="provision_solicitudes_pago">
              Solicitudes de Pago
              <span className="field-hint">Pagos diversos</span>
            </label>
            <input
              id="provision_solicitudes_pago"
              type="number"
              step="0.01"
              min="0"
              value={formData.provision_solicitudes_pago || 0}
              onChange={(e) => handleProvisionChange(
                'provision_solicitudes_pago',
                e.target.value
              )}
              className="form-input"
            />
          </div>
        </div>

        {/* RESUMEN: Total de Provisiones */}
        <div className="provisiones-total">
          <strong>Total Provisiones:</strong>
          <span className="total-amount">
            ${provisionesTotal.toLocaleString('es-MX', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </span>
        </div>
      </div>

      {/* ... otros campos ... */}

      <button type="submit" className="btn-primary">
        Guardar Evento
      </button>
    </form>
  );
};
```

#### CSS Sugerido

```css
.form-section {
  margin: 2rem 0;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.form-section h3 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
}

.form-field label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #34495e;
}

.field-hint {
  display: block;
  font-size: 0.85rem;
  font-weight: 400;
  color: #7f8c8d;
  margin-top: 0.25rem;
}

.form-input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.provisiones-total {
  margin-top: 1.5rem;
  padding: 1rem;
  background: white;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-left: 4px solid #3498db;
}

.provisiones-total strong {
  font-size: 1.1rem;
  color: #2c3e50;
}

.total-amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: #3498db;
}
```

---

## 3. Componente de Análisis Financiero

### Archivo: `src/modules/eventos/components/ProvisionesBreakdown.tsx`

```tsx
import React from 'react';
import { Event } from '../types/Event';

interface ProvisionesBreakdownProps {
  evento: Event;
}

export const ProvisionesBreakdown: React.FC<ProvisionesBreakdownProps> = ({
  evento
}) => {
  const provisiones = [
    {
      label: 'Combustible / Peaje',
      value: evento.provision_combustible_peaje || 0,
      icon: '⛽',
      color: '#e74c3c'
    },
    {
      label: 'Materiales',
      value: evento.provision_materiales || 0,
      icon: '📦',
      color: '#f39c12'
    },
    {
      label: 'Recursos Humanos',
      value: evento.provision_recursos_humanos || 0,
      icon: '👥',
      color: '#3498db'
    },
    {
      label: 'Solicitudes de Pago',
      value: evento.provision_solicitudes_pago || 0,
      icon: '💰',
      color: '#2ecc71'
    }
  ];

  const total = provisiones.reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="provisiones-breakdown">
      <h3>Desglose de Provisiones</h3>

      <div className="provisiones-grid">
        {provisiones.map((provision) => {
          const percentage = total > 0
            ? (provision.value / total * 100).toFixed(1)
            : 0;

          return (
            <div
              key={provision.label}
              className="provision-card"
              style={{ borderColor: provision.color }}
            >
              <div className="provision-header">
                <span className="provision-icon">{provision.icon}</span>
                <span className="provision-label">{provision.label}</span>
              </div>

              <div className="provision-amount">
                ${provision.value.toLocaleString('es-MX', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>

              <div className="provision-percentage">
                {percentage}% del total
              </div>

              {/* Barra de progreso visual */}
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: provision.color
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="provisiones-total-summary">
        <strong>Total Provisiones:</strong>
        <span className="total-amount">
          ${total.toLocaleString('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </span>
      </div>
    </div>
  );
};
```

#### CSS para Breakdown

```css
.provisiones-breakdown {
  margin: 2rem 0;
}

.provisiones-breakdown h3 {
  margin-bottom: 1.5rem;
  color: #2c3e50;
}

.provisiones-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.provision-card {
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  border-left: 4px solid;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.provision-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.provision-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.provision-icon {
  font-size: 1.5rem;
}

.provision-label {
  font-weight: 600;
  color: #34495e;
  font-size: 0.9rem;
}

.provision-amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.provision-percentage {
  font-size: 0.85rem;
  color: #7f8c8d;
  margin-bottom: 0.75rem;
}

.progress-bar {
  height: 6px;
  background: #ecf0f1;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.provisiones-total-summary {
  padding: 1.5rem;
  background: #3498db;
  color: white;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.provisiones-total-summary strong {
  font-size: 1.2rem;
}

.provisiones-total-summary .total-amount {
  font-size: 2rem;
  font-weight: 700;
}
```

---

## 4. Hook Personalizado para Eventos

### Archivo: `src/modules/eventos/hooks/useEventoProvisiones.ts`

```typescript
import { useMemo } from 'react';
import { Event } from '../types/Event';

export const useEventoProvisiones = (evento: Event) => {
  // Calcular total de provisiones
  const provisionesTotal = useMemo(() => {
    return (
      (evento.provision_combustible_peaje || 0) +
      (evento.provision_materiales || 0) +
      (evento.provision_recursos_humanos || 0) +
      (evento.provision_solicitudes_pago || 0)
    );
  }, [
    evento.provision_combustible_peaje,
    evento.provision_materiales,
    evento.provision_recursos_humanos,
    evento.provision_solicitudes_pago
  ]);

  // Calcular porcentajes
  const porcentajes = useMemo(() => {
    if (provisionesTotal === 0) {
      return {
        combustible: 0,
        materiales: 0,
        recursosHumanos: 0,
        solicitudesPago: 0
      };
    }

    return {
      combustible: ((evento.provision_combustible_peaje || 0) / provisionesTotal * 100),
      materiales: ((evento.provision_materiales || 0) / provisionesTotal * 100),
      recursosHumanos: ((evento.provision_recursos_humanos || 0) / provisionesTotal * 100),
      solicitudesPago: ((evento.provision_solicitudes_pago || 0) / provisionesTotal * 100)
    };
  }, [evento, provisionesTotal]);

  // Validar si tiene provisiones
  const tieneProvisiones = provisionesTotal > 0;

  return {
    provisionesTotal,
    porcentajes,
    tieneProvisiones,
    provisiones: {
      combustible: evento.provision_combustible_peaje || 0,
      materiales: evento.provision_materiales || 0,
      recursosHumanos: evento.provision_recursos_humanos || 0,
      solicitudesPago: evento.provision_solicitudes_pago || 0
    }
  };
};
```

---

## 5. Consultas Supabase

### Obtener Evento con Provisiones

```typescript
import { supabase } from '@/lib/supabase';

// Desde tabla (para editar)
export const getEventoForEdit = async (eventoId: number) => {
  const { data, error } = await supabase
    .from('evt_eventos')
    .select(`
      id,
      clave_evento,
      nombre_proyecto,
      provision_combustible_peaje,
      provision_materiales,
      provision_recursos_humanos,
      provision_solicitudes_pago,
      ingreso_estimado,
      ganancia_estimada
    `)
    .eq('id', eventoId)
    .single();

  if (error) throw error;
  return data;
};

// Desde vista (para mostrar con cálculos)
export const getEventoWithAnalysis = async (eventoId: number) => {
  const { data, error } = await supabase
    .from('vw_eventos_analisis_financiero')
    .select(`
      id,
      clave_evento,
      nombre_proyecto,
      provision_combustible_peaje,
      provision_materiales,
      provision_recursos_humanos,
      provision_solicitudes_pago,
      provisiones,
      utilidad_estimada,
      porcentaje_utilidad_estimada,
      gastos_totales,
      status_presupuestal
    `)
    .eq('id', eventoId)
    .single();

  if (error) throw error;
  return data;
};
```

### Actualizar Provisiones

```typescript
export const updateEventoProvisiones = async (
  eventoId: number,
  provisiones: {
    provision_combustible_peaje: number;
    provision_materiales: number;
    provision_recursos_humanos: number;
    provision_solicitudes_pago: number;
  }
) => {
  const { error } = await supabase
    .from('evt_eventos')
    .update(provisiones)
    .eq('id', eventoId);

  if (error) throw error;
};
```

---

## 6. Ejemplo Completo: Página de Edición

```tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EventForm } from '../components/EventForm';
import { getEventoForEdit, updateEventoProvisiones } from '../api/eventos';
import { Event } from '../types/Event';

export const EventoEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [evento, setEvento] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvento();
  }, [id]);

  const loadEvento = async () => {
    try {
      const data = await getEventoForEdit(Number(id));
      setEvento(data);
    } catch (error) {
      console.error('Error cargando evento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: Partial<Event>) => {
    try {
      await updateEventoProvisiones(Number(id), {
        provision_combustible_peaje: formData.provision_combustible_peaje || 0,
        provision_materiales: formData.provision_materiales || 0,
        provision_recursos_humanos: formData.provision_recursos_humanos || 0,
        provision_solicitudes_pago: formData.provision_solicitudes_pago || 0
      });

      navigate(`/eventos/${id}`);
    } catch (error) {
      console.error('Error actualizando evento:', error);
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (!evento) return <div>Evento no encontrado</div>;

  return (
    <div className="evento-edit-page">
      <h1>Editar Evento: {evento.clave_evento}</h1>
      <EventForm
        initialData={evento}
        onSubmit={handleSubmit}
      />
    </div>
  );
};
```

---

## 🎯 Checklist de Implementación

### Paso 1: Tipos
- [ ] Actualizar `Event.ts` con nuevos campos
- [ ] Agregar helper `calcularProvisionesTotal`
- [ ] Crear hook `useEventoProvisiones`

### Paso 2: API
- [ ] Crear funciones de consulta en `api/eventos.ts`
- [ ] Crear función de actualización

### Paso 3: Componentes
- [ ] Actualizar `EventForm.tsx`
- [ ] Crear `ProvisionesBreakdown.tsx`
- [ ] Actualizar componentes de análisis

### Paso 4: Testing
- [ ] Probar creación de evento con provisiones
- [ ] Probar edición de provisiones
- [ ] Probar visualización de desglose
- [ ] Validar cálculos automáticos

---

**¡Listo para implementar!** 🚀
