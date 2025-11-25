#!/usr/bin/env node

/**
 * Script maestro para hacer un respaldo COMPLETO de la base de datos
 * Ejecuta ambos respaldos: estructura y datos
 * Genera un archivo README con información del respaldo
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function ejecutarScript(scriptPath) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Ejecutando: ${scriptPath}\n`);

    const proceso = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: __dirname
    });

    proceso.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script terminó con código ${code}`));
      }
    });

    proceso.on('error', (err) => {
      reject(err);
    });
  });
}

async function backupCompleto() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  🔄 RESPALDO COMPLETO DE BASE DE DATOS                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const inicio = Date.now();

  try {
    // 1. Respaldar estructura
    console.log('═══════════════════════════════════════════════════════════');
    console.log('PASO 1/2: Respaldando estructura de la base de datos');
    console.log('═══════════════════════════════════════════════════════════');

    await ejecutarScript(resolve(__dirname, 'backup-estructura-simple.mjs'));

    // 2. Respaldar datos
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('PASO 2/2: Respaldando datos de la base de datos');
    console.log('═══════════════════════════════════════════════════════════');

    await ejecutarScript(resolve(__dirname, 'backup-datos.mjs'));

    const duracion = ((Date.now() - inicio) / 1000).toFixed(2);

    // 3. Generar README
    const backupDir = resolve(__dirname, '../backups');
    const archivos = fs.readdirSync(backupDir);

    // Filtrar archivos generados en esta sesión (últimos 5 minutos)
    const ahora = Date.now();
    const archivosRecientes = archivos
      .filter(file => file.endsWith('.sql'))
      .map(file => ({
        nombre: file,
        path: resolve(backupDir, file),
        stats: fs.statSync(resolve(backupDir, file))
      }))
      .filter(file => (ahora - file.stats.mtimeMs) < 5 * 60 * 1000)
      .sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs);

    const archivoEstructura = archivosRecientes.find(f => f.nombre.startsWith('estructura_erp_'));
    const archivoDatos = archivosRecientes.find(f => f.nombre.startsWith('datos_'));

    let readme = '';
    readme += `# Respaldo Completo - Base de Datos ERP 777\n\n`;
    readme += `## Información del Respaldo\n\n`;
    readme += `**Fecha:** ${new Date().toLocaleString('es-MX')}\n`;
    readme += `**Duración:** ${duracion} segundos\n`;
    readme += `**Base de datos:** ${process.env.DB_NAME || 'postgres'}\n\n`;

    readme += `## Archivos Generados\n\n`;

    if (archivoEstructura) {
      const sizeMB = (archivoEstructura.stats.size / (1024 * 1024)).toFixed(2);
      readme += `### 1. Estructura de la Base de Datos\n`;
      readme += `- **Archivo:** \`${archivoEstructura.nombre}\`\n`;
      readme += `- **Tamaño:** ${sizeMB} MB\n`;
      readme += `- **Contenido:** Definiciones DDL (CREATE TABLE, índices, constraints, etc.)\n`;
      readme += `- **Uso:** Restaurar la estructura de las tablas\n\n`;
    }

    if (archivoDatos) {
      const sizeMB = (archivoDatos.stats.size / (1024 * 1024)).toFixed(2);
      readme += `### 2. Datos Completos\n`;
      readme += `- **Archivo:** \`${archivoDatos.nombre}\`\n`;
      readme += `- **Tamaño:** ${sizeMB} MB\n`;
      readme += `- **Contenido:** INSERT statements con todos los datos actuales\n`;
      readme += `- **Uso:** Restaurar los datos (requiere que la estructura ya exista)\n\n`;
    }

    readme += `## Cómo Restaurar el Respaldo\n\n`;
    readme += `### Restauración Completa (Estructura + Datos)\n\n`;
    readme += `\`\`\`bash\n`;
    readme += `# 1. Primero restaurar la estructura\n`;
    if (archivoEstructura) {
      readme += `psql "postgresql://[usuario]:[contraseña]@[host]:[puerto]/[database]" -f backups/${archivoEstructura.nombre}\n\n`;
    }
    readme += `# 2. Luego restaurar los datos\n`;
    if (archivoDatos) {
      readme += `psql "postgresql://[usuario]:[contraseña]@[host]:[puerto]/[database]" -f backups/${archivoDatos.nombre}\n`;
    }
    readme += `\`\`\`\n\n`;

    readme += `### Restauración Solo de Datos (si la estructura ya existe)\n\n`;
    readme += `\`\`\`bash\n`;
    if (archivoDatos) {
      readme += `psql "postgresql://[usuario]:[contraseña]@[host]:[puerto]/[database]" -f backups/${archivoDatos.nombre}\n`;
    }
    readme += `\`\`\`\n\n`;

    readme += `## Notas Importantes\n\n`;
    readme += `1. **Orden de restauración:** Siempre restaurar primero la ESTRUCTURA y luego los DATOS\n`;
    readme += `2. **Triggers:** Los triggers se desactivan temporalmente durante la inserción de datos\n`;
    readme += `3. **Secuencias:** Las secuencias se actualizan automáticamente después de insertar datos\n`;
    readme += `4. **Formato:** Archivos SQL planos compatibles con PostgreSQL\n`;
    readme += `5. **Base de datos vacía:** Es recomendable restaurar sobre una base de datos vacía\n\n`;

    readme += `## Scripts de Respaldo\n\n`;
    readme += `Los scripts utilizados para generar este respaldo están en:\n`;
    readme += `- \`scripts/backup-estructura-simple.mjs\` - Respaldo de estructura DDL (tablas ERP)\n`;
    readme += `- \`scripts/backup-datos.mjs\` - Respaldo de datos (INSERT statements)\n`;
    readme += `- \`scripts/backup-completo.mjs\` - Script maestro (ejecuta ambos)\n\n`;

    readme += `## Ejecución de Respaldos\n\n`;
    readme += `### Respaldo completo (recomendado)\n`;
    readme += `\`\`\`bash\n`;
    readme += `node scripts/backup-completo.mjs\n`;
    readme += `\`\`\`\n\n`;

    readme += `### Respaldo solo de estructura\n`;
    readme += `\`\`\`bash\n`;
    readme += `node scripts/backup-estructura-simple.mjs\n`;
    readme += `\`\`\`\n\n`;

    readme += `### Respaldo solo de datos\n`;
    readme += `\`\`\`bash\n`;
    readme += `node scripts/backup-datos.mjs\n`;
    readme += `\`\`\`\n\n`;

    readme += `---\n\n`;
    readme += `*Generado automáticamente por backup-completo.mjs*\n`;

    const readmePath = resolve(backupDir, 'README.md');
    fs.writeFileSync(readmePath, readme, 'utf8');

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ RESPALDO COMPLETO FINALIZADO                          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log(`⏱️  Duración total: ${duracion} segundos`);
    console.log(`📁 Directorio: backups/`);
    console.log(`📄 README generado: README.md`);

    if (archivoEstructura) {
      const sizeMB = (archivoEstructura.stats.size / (1024 * 1024)).toFixed(2);
      console.log(`📦 Estructura: ${archivoEstructura.nombre} (${sizeMB} MB)`);
    }

    if (archivoDatos) {
      const sizeMB = (archivoDatos.stats.size / (1024 * 1024)).toFixed(2);
      console.log(`💾 Datos: ${archivoDatos.nombre} (${sizeMB} MB)`);
    }

    console.log('\n✅ Respaldo completado exitosamente\n');

  } catch (error) {
    console.error('\n❌ Error durante el respaldo completo:', error.message);
    console.error(error);
    process.exit(1);
  }
}

backupCompleto().catch(console.error);
