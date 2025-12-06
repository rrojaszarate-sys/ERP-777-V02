// Script para verificar tablas de documentos en Supabase
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env
dotenv.config({ path: resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkTables() {
    console.log('🔍 Verificando tablas de documentos en la base de datos...\n');

    // 1. Verificar si existe evt_documentos
    console.log('1️⃣ Verificando evt_documentos...');
    const { data: docs1, error: err1 } = await supabase
        .from('evt_documentos')
        .select('*')
        .limit(1);

    if (err1) {
        console.log('   ❌ evt_documentos NO existe o error:', err1.message);
    } else {
        console.log('   ✅ evt_documentos existe');
    }

    // 2. Verificar si existe evt_documentos_erp
    console.log('\n2️⃣ Verificando evt_documentos_erp...');
    const { data: docs2, error: err2 } = await supabase
        .from('evt_documentos_erp')
        .select('*')
        .limit(1);

    if (err2) {
        console.log('   ❌ evt_documentos_erp NO existe o error:', err2.message);
        console.log('\n📝 NECESITAS CREAR LA TABLA evt_documentos_erp');
        console.log('   Ejecuta el script: sql/CREAR_EVT_DOCUMENTOS_ERP.sql');
    } else {
        console.log('   ✅ evt_documentos_erp existe');
    }

    // 3. Verificar evt_eventos vs evt_eventos_erp
    console.log('\n3️⃣ Verificando tablas de eventos...');

    const { data: evts1, error: errEvt1 } = await supabase
        .from('evt_eventos')
        .select('id')
        .limit(1);

    const { data: evts2, error: errEvt2 } = await supabase
        .from('evt_eventos_erp')
        .select('id')
        .limit(1);

    console.log('   evt_eventos:', errEvt1 ? '❌ No existe' : '✅ Existe');
    console.log('   evt_eventos_erp:', errEvt2 ? '❌ No existe' : '✅ Existe');

    // 4. Listar todas las tablas evt_*
    console.log('\n4️⃣ Listando tablas evt_*...');
    const { data: tables, error: tablesErr } = await supabase.rpc('get_evt_tables');

    if (tablesErr) {
        console.log('   ⚠️ No se pudo listar tablas (función RPC no existe)');
        console.log('   Puedes verificar manualmente en el Dashboard de Supabase');
    } else {
        console.log('   Tablas encontradas:', tables);
    }
}

checkTables().catch(console.error);
