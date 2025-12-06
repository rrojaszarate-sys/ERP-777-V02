// Script para crear tabla via conexión PostgreSQL directa
import pg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ No se encontró DATABASE_URL');
    process.exit(1);
}

console.log('🔌 Conectando a PostgreSQL...');

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function createTable() {
    try {
        await client.connect();
        console.log('✅ Conectado a la base de datos\n');

        const sql = `
      -- Crear la tabla evt_documentos_erp
      CREATE TABLE IF NOT EXISTS public.evt_documentos_erp (
        id SERIAL PRIMARY KEY,
        evento_id INTEGER NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        path TEXT NOT NULL,
        created_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        
        CONSTRAINT evt_documentos_erp_evento_id_fkey 
          FOREIGN KEY (evento_id) 
          REFERENCES public.evt_eventos_erp(id)
          ON DELETE CASCADE
      );

      -- Crear índice
      CREATE INDEX IF NOT EXISTS idx_evt_documentos_erp_evento_id 
        ON public.evt_documentos_erp(evento_id);
    `;

        console.log('🔨 Creando tabla evt_documentos_erp...');
        await client.query(sql);
        console.log('✅ Tabla creada exitosamente\n');

        // Habilitar RLS
        console.log('🔒 Habilitando Row Level Security...');
        await client.query(`
      ALTER TABLE public.evt_documentos_erp ENABLE ROW LEVEL SECURITY;
    `);
        console.log('✅ RLS habilitado\n');

        // Crear política
        console.log('📋 Creando política de acceso...');
        await client.query(`
      DROP POLICY IF EXISTS "evt_documentos_erp_all_access" ON public.evt_documentos_erp;
    `);
        await client.query(`
      CREATE POLICY "evt_documentos_erp_all_access" ON public.evt_documentos_erp
        FOR ALL USING (true) WITH CHECK (true);
    `);
        console.log('✅ Política creada\n');

        // Verificar
        console.log('🔍 Verificando estructura de la tabla...');
        const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'evt_documentos_erp'
      ORDER BY ordinal_position;
    `);

        console.log('📊 Columnas de evt_documentos_erp:');
        result.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });

        console.log('\n✅ ¡TABLA CREADA EXITOSAMENTE!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.message.includes('already exists')) {
            console.log('\n⚠️ La tabla o índice ya existe (esto está bien)');
        }
    } finally {
        await client.end();
    }
}

createTable();
