import { useEffect, useState } from 'react';
import { supabase } from '../../../core/config/supabase';

interface User {
  id: string;
  nombre: string;
  email: string;
}

export function useUsers() {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('users_erp')
        .select('id, nombre, email')
        .eq('activo', true);

      if (!error) setData(data || []);
      setLoading(false);
    };

    fetchUsers();
  }, []);

  return { data, loading };
}
