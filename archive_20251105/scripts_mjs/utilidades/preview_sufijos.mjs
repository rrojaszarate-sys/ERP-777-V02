import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function previewSufijos() {
  console.log('📊 PREVIEW: Sufijos que se generarán\n');
  console.log('━'.repeat(80));
  
  const { data: clientes } = await supabase
    .from('evt_clientes')
    .select('id, razon_social, nombre_comercial, sufijo')
    .eq('activo', true)
    .order('created_at', { ascending: false });
  
  clientes?.forEach(cliente => {
    const nombre = cliente.nombre_comercial || cliente.razon_social;
    // Eliminar todo lo que no sea letra
    const limpio = nombre.replace(/[^A-Za-z]/g, '');
    // Tomar primeras 3 letras
    let nuevoSufijo = limpio.substring(0, 3).toUpperCase();
    // Rellenar con X si es necesario
    while (nuevoSufijo.length < 3) {
      nuevoSufijo += 'X';
    }
    
    console.log(`${cliente.id.toString().padStart(3)} | ${nombre.padEnd(30)} | Actual: "${cliente.sufijo}" → Nuevo: "${nuevoSufijo}"`);
  });
  
  console.log('━'.repeat(80));
}

previewSufijos();
