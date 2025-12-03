import { useEffect, useState } from 'react';
import { supabase } from '../../../core/config/supabase';
import { useAuth } from '../../../core/auth/AuthProvider';

interface User {
  id: string;
  nombre: string;
  email: string;
  company_id?: string;
}

/**
 * Hook para obtener usuarios/ejecutivos de la empresa actual
 * Usado para seleccionar responsables en formularios de ingresos/gastos
 */
export function useUsers() {
  const { user } = useAuth();
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        // Construir query base
        let query = supabase
          .from('core_users')
          .select('id, nombre, email, company_id')
          .eq('activo', true);

        // Filtrar por company_id si el usuario tiene uno
        if (user?.company_id) {
          query = query.eq('company_id', user.company_id);
        }

        const { data: usuarios, error: queryError } = await query.order('nombre');

        if (queryError) {
          console.error('Error cargando usuarios:', queryError);
          setError(queryError.message);
          setData([]);
        } else {
          console.log('✅ Usuarios/Responsables cargados:', usuarios?.length || 0);
          setData(usuarios || []);
        }
      } catch (err: any) {
        console.error('Error en fetchUsers:', err);
        setError(err.message);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user?.company_id]);

  return { data, loading, error };
}
