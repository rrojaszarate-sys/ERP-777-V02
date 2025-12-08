import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../core/config/supabase';
import { EventForm } from '../components/events/EventForm';
import { useClients } from '../hooks/useClients';
import { DocumentosEvento } from './documents/DocumentosEvento';
import toast from 'react-hot-toast';
import { EventoFormData } from '../types/FormData';
import { Loader2 } from 'lucide-react';

const EventFormPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id } = useParams();
  const { clients } = useClients();

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

  const handleSave = async (formData: EventoFormData) => {
    try {
      if (id) {
        // @ts-ignore
        const { error } = await supabase
          .from('evt_eventos')
          .update({
            ...formData,
            estado_id: formData.estado_id || 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (error) throw error;
        navigate(`/eventos/${id}`);
      } else {
        // @ts-ignore
        const { data, error } = await supabase
          .from('evt_eventos')
          .insert([{
            ...formData,
            estado_id: formData.estado_id || 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])
          .select()
          .single();

        if (error) throw error;
        navigate(`/eventos/${data.id}`);
      }
    } catch (err) {
      console.error('Error guardando el evento:', err);
      toast.error(err instanceof Error ? err.message : 'Hubo un error al guardar el evento.');
    }
  };

  const handleCancel = () => {
    navigate('/eventos');
  };

  const handleDocumentUploaded = () => {
    queryClient.invalidateQueries({ queryKey: ['evento', id] });
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

      {event && (
        <div className="mt-4 p-4 bg-white border rounded-lg shadow-sm">
          <h3 className="text-sm font-semibold mb-2 text-gray-700">Documentos del Evento</h3>
          <DocumentosEvento
            eventoId={event.id}
            estadoActual={event.estado_id}
            onDocumentUploaded={handleDocumentUploaded}
          />
        </div>
      )}
    </div>
  );
};

export default EventFormPage;
