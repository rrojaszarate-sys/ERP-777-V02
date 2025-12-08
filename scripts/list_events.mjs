
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function listEvents() {
    const { data, error } = await supabase
        .from('evt_eventos_erp')
        .select('*')
        .limit(5);

    if (error) {
        console.log('Error:', error.message);
    } else {
        console.log('Eventos encontrados:', data.length);
        data.forEach(e => {
            console.log(`ID: ${e.id} | Nombre: ${e.nombre} | Clave: ${e.clave_evento || e.clave}`);
        });
    }
}

listEvents();
