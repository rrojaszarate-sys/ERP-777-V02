import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  console.log('=== VERIFICANDO TABLAS DE USUARIOS ===\n');

  // users_erp - solo columnas básicas
  console.log('1. Tabla users_erp (todas las columnas):');
  const { data: usersErp, error: e1 } = await supabase
    .from('users_erp')
    .select('*')
    .limit(3);

  if (e1) {
    console.log('   ERROR:', e1.message);
  } else if (usersErp && usersErp.length > 0) {
    console.log('   Columnas:', Object.keys(usersErp[0]).join(', '));
    console.log('   Total:', usersErp.length);
    usersErp.forEach(u => console.log('   -', JSON.stringify(u).substring(0, 150)));
  } else {
    console.log('   TABLA VACÍA o sin acceso');
  }

  // core_users
  console.log('\n2. Tabla core_users:');
  const { data: coreUsers, error: e2 } = await supabase
    .from('core_users')
    .select('*')
    .limit(3);

  if (e2) {
    console.log('   ERROR:', e2.message);
  } else if (coreUsers && coreUsers.length > 0) {
    console.log('   Columnas:', Object.keys(coreUsers[0]).join(', '));
    console.log('   Total:', coreUsers.length);
  }
}

check();
