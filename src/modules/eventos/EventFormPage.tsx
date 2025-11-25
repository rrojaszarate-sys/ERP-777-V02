import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../core/config/supabase';
import { EventForm } from '../components/events/EventForm';
import { useClients } from '../hooks/useClients';

const EventFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { clients } = useClients();

  // 👇 Si hay id, cargamos el evento desde Supabase
  const { data: event, isLoading } = useQuery({
    queryKey: ['evento', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('evt_eventos')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleSave = async (formData: any) => {
    try {
      if (id) {
        // 🔄 Actualizar evento
        const { error } = await supabase
          .from('evt_eventos')
          .update({
            ...formData,
            estado_id: formData.estado_id || 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        // 🆕 Crear evento nuevo
        const { error } = await supabase
          .from('evt_eventos')
          .insert([{
            ...formData,
            estado_id: formData.estado_id || 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }]);

        if (error) throw error;
      }

      navigate('/eventos'); // volver a lista
    } catch (err) {
      console.error('Error guardando el evento:', err);
      alert('Hubo un error al guardar el evento. Revisa la consola.');
    }
  };

  const handleCancel = () => {
    navigate('/eventos');
  };

  if (isLoading) return <p className="p-6">Cargando evento...</p>;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        {id ? 'Editar Evento' : 'Nuevo Evento'}
      </h1>
      <EventForm
        event={event}
        clients={clients}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default EventFormPage;