import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  console.log('=== VERIFICANDO TABLAS DE USUARIOS ===\n');

  // users_erp
  console.log('1. Tabla users_erp:');
  const { data: usersErp, error: e1 } = await supabase
    .from('users_erp')
    .select('id, nombre, apellidos, email, activo')
    .limit(5);

  if (e1) {
    console.log('   ERROR:', e1.message);
  } else {
    console.log('   Encontrados:', usersErp?.length || 0);
    usersErp?.forEach(u => console.log('   -', u.nombre, u.apellidos, '|', u.email, '| activo:', u.activo));
  }

  // core_users
  console.log('\n2. Tabla core_users:');
  const { data: coreUsers, error: e2 } = await supabase
    .from('core_users')
    .select('id, nombre, apellidos, email')
    .limit(5);

  if (e2) {
    console.log('   ERROR:', e2.message);
  } else {
    console.log('   Encontrados:', coreUsers?.length || 0);
    coreUsers?.forEach(u => console.log('   -', u.nombre, u.apellidos, '|', u.email));
  }
}

check();
