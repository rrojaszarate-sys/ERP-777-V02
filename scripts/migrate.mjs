/**
 * Script de migración de base de datos
 * 
 * Ejecuta todas las migraciones pendientes en orden secuencial
 * 
 * Uso: node scripts/migrate.mjs
 */

import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Configuración de base de datos
const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true
};

/**
 * Ejecutar migraciones
 */
async function migrate() {
  let connection;
  
  try {
    console.log('🔄 Conectando a base de datos...\n');
    connection = await mysql.createConnection(config);
    
    // Crear tabla de migraciones si no existe
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Obtener migraciones ejecutadas
    const [executedMigrations] = await connection.execute(
      'SELECT name FROM migrations'
    );
    const executed = executedMigrations.map(m => m.name);
    
    // Leer archivos de migración
    const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️  No existe el directorio de migraciones');
      return;
    }
    
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    let count = 0;
    
    for (const file of files) {
      if (executed.includes(file)) {
        console.log(`⏭️  Saltando: ${file} (ya ejecutada)`);
        continue;
      }
      
      console.log(`🔧 Ejecutando: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      await connection.query(sql);
      await connection.execute(
        'INSERT INTO migrations (name) VALUES (?)',
        [file]
      );
      
      console.log(`✅ Completada: ${file}\n`);
      count++;
    }
    
    console.log(`\n✨ Migraciones completadas: ${count}`);
    
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
