import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../core/config/supabase';
import { EventForm } from '../components/events/EventForm';
import { useClients } from '../hooks/useClients';
import { DocumentosEvento } from './documents/DocumentosEvento';
import toast from 'react-hot-toast';
import { EventoFormData } from '../types/FormData';

const EventFormPage: React.FC = () => {
  const queryClient = useQueryClient();
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

  // ✅ Maneja creación o actualización de evento
  const handleSave = async (formData: EventoFormData) => {
    try {
      if (id) {
        // @ts-ignore - Supabase generated types are too restrictive
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
        // @ts-ignore - Supabase generated types are too restrictive
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

        // Redireccionamos al formulario con ID para poder cargar documentos
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
    // Invalida la query del evento para que se recargue automáticamente
    queryClient.invalidateQueries({ queryKey: ['evento', id] });
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

      {event && (
        <div className="mt-8 p-6 bg-white border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Documentos del Evento</h2>
          <p className="text-sm text-gray-500 mb-4">
            Sube los documentos clave para gestionar el flujo de trabajo del evento.
          </p>
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
