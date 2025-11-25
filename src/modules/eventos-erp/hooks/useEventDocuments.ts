import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../core/config/supabase';

export interface EventDocument {
  id: string;
  evento_id: string;
  nombre: string;
  url: string;
  path: string;
  created_at: string;
}

export const useEventDocuments = (eventId: string | null) => {
  const queryClient = useQueryClient();

  // 🔎 Leer documentos
  const documentsQuery = useQuery({
    queryKey: ['event-documents', eventId],
    queryFn: async (): Promise<EventDocument[]> => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from('evt_documentos')
        .select('*')
        .eq('evento_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!eventId,
    staleTime: 1000 * 60 * 5,
  });

  // ➕ Insertar documento
  const addDocumentMutation = useMutation({
    mutationFn: async (doc: Partial<EventDocument>) => {
      const { data, error } = await supabase
        .from('evt_documentos')
        .insert([doc])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-documents', eventId] });
    },
  });

  // ❌ Eliminar documento
  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('evt_documentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-documents', eventId] });
    },
  });

  return {
    documents: documentsQuery.data || [],
    isLoading: documentsQuery.isLoading,
    error: documentsQuery.error,
    refetch: documentsQuery.refetch,
    addDocument: addDocumentMutation.mutate,
    deleteDocument: deleteDocumentMutation.mutate,
    isAdding: addDocumentMutation.isPending,
    isDeleting: deleteDocumentMutation.isPending,
  };
};
