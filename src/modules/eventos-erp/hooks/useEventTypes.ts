import { useEffect, useState } from 'react';
import { supabase } from '../../../core/config/supabase';

export function useEventTypes() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTypes = async () => {
      const { data, error } = await supabase.from('evt_tipos_evento').select('*');
      if (error) {
        console.error('Error cargando tipos de evento:', error);
      }
      setData(data || []);
      setLoading(false);
    };

    fetchTypes();
  }, []);

  return { data, loading };
}
