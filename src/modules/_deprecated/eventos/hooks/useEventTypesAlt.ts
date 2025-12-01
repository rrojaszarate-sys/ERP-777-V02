// src/modules/eventos/hooks/useEventTypesAlt.ts
import { useEffect, useState } from 'react';
import { supabase } from '../../../core/config/supabase';

export interface EventType {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export function useEventTypesAlt() {
  const [data, setData] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const { data: types, error: fetchError } = await supabase
          .from('tipo_evento')
          .select('*')
          .eq('activo', true);

        if (fetchError) throw fetchError;
        setData((types || []) as EventType[]);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Error desconocido'));
      } finally {
        setLoading(false);
      }
    };

    fetchTypes();
  }, []);

  return { data, loading, error };
}
