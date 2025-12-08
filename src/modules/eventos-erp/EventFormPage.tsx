import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../core/config/supabase';
import { EventForm } from '../components/events/EventForm';
import { useClients } from '../hooks/useClients';
import { Loader2 } from 'lucide-react';

const EventFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { clients } = useClients();

  const { data: event, isLoading } = useQuery({
    queryKey: ['evento', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('evt_eventos_erp')
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
        const { error } = await supabase
          .from('evt_eventos_erp')
          .update({
            ...formData,
            estado_id: formData.estado_id || 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('evt_eventos_erp')
          .insert([{
            ...formData,
            estado_id: formData.estado_id || 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }]);

        if (error) throw error;
      }

      navigate('/eventos');
    } catch (err) {
      console.error('Error guardando el evento:', err);
      alert('Hubo un error al guardar el evento. Revisa la consola.');
    }
  };

  const handleCancel = () => {
    navigate('/eventos');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-2">
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
