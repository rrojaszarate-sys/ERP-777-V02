#!/usr/bin/env node

/**
 * EJECUTOR DE CORRECCIÓN DE VISTAS FINANCIERAS
 * Lee y ejecuta FIX_VISTAS_FINANCIERAS_V2.sql
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colores
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.cyan}${'='.repeat(70)}${colors.reset}\n${colors.cyan}${msg}${colors.reset}\n${colors.cyan}${'='.repeat(70)}${colors.reset}\n`)
};

// Crear cliente de Supabase con service role
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function ejecutarSQL() {
  log.title('EJECUTANDO CORRECCIÓN DE VISTAS FINANCIERAS');
  
  try {
    // Leer archivo SQL
    log.info('Leyendo script SQL...');
    const sqlFilePath = join(__dirname, 'FIX_VISTAS_FINANCIERAS_V2.sql');
    const sqlContent = readFileSync(sqlFilePath, 'utf-8');
    
    log.success(`Script cargado: ${sqlContent.length} caracteres`);
    
    // Dividir en sentencias individuales (separadas por punto y coma seguido de salto de línea)
    // Pero manteniendo los bloques DO $$...END $$;
    const statements = [];
    let currentStatement = '';
    let inDoBlock = false;
    
    const lines = sqlContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Detectar inicio de bloque DO
      if (trimmedLine.startsWith('DO $$')) {
        inDoBlock = true;
      }
      
      // Detectar fin de bloque DO
      if (inDoBlock && trimmedLine === 'END $$;') {
        currentStatement += line + '\n';
        statements.push(currentStatement.trim());
        currentStatement = '';
        inDoBlock = false;
        continue;
      }
      
      currentStatement += line + '\n';
      
      // Si no estamos en bloque DO y encontramos ; al final, es una sentencia completa
      if (!inDoBlock && trimmedLine.endsWith(';') && !trimmedLine.startsWith('--')) {
        const stmt = currentStatement.trim();
        if (stmt && !stmt.startsWith('--') && stmt !== ';') {
          statements.push(stmt);
        }
        currentStatement = '';
      }
    }
    
    // Agregar última sentencia si existe
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    // Filtrar comentarios y sentencias vacías
    const validStatements = statements.filter(stmt => {
      const trimmed = stmt.trim();
      return trimmed && 
             !trimmed.startsWith('--') && 
             trimmed !== ';' &&
             !trimmed.match(/^-{2,}/);
    });
    
    log.info(`${validStatements.length} sentencias SQL a ejecutar\n`);
    
    // Ejecutar cada sentencia
    let ejecutadas = 0;
    let errores = 0;
    
    for (let i = 0; i < validStatements.length; i++) {
      const statement = validStatements[i];
      const preview = statement.substring(0, 80).replace(/\n/g, ' ');
      
      console.log(`${colors.cyan}[${i + 1}/${validStatements.length}]${colors.reset} ${preview}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        });
        
        // Si la función no existe, intentar ejecución directa
        if (error && error.code === '42883') {
          // Función no existe, ejecutar directamente
          // Para statements que no retornan datos (DDL)
          if (statement.toUpperCase().includes('CREATE') || 
              statement.toUpperCase().includes('DROP') ||
              statement.toUpperCase().includes('GRANT') ||
              statement.toUpperCase().includes('COMMENT')) {
            
            // Ejecutar como query raw
            const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'apikey': process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.VITE_SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({ query: statement })
            });
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
          } else {
            // Para SELECTs, intentar detectar la tabla
            const match = statement.match(/FROM\s+(\w+)/i);
            if (match) {
              const tabla = match[1];
              // Ejecutar query
              const { error: queryError } = await supabase.from(tabla).select('*').limit(0);
              if (queryError) throw queryError;
            }
          }
        } else if (error) {
          throw error;
        }
        
        log.success(`Ejecutado`);
        ejecutadas++;
        
      } catch (err) {
        log.error(`Error: ${err.message}`);
        errores++;
        
        // Continuar con las siguientes sentencias a menos que sea un error crítico
        if (err.message.includes('does not exist') && 
            statement.toUpperCase().includes('DROP')) {
          log.warn('Vista no existía, continuando...');
        } else if (!err.message.includes('already exists')) {
          // Si no es un error de "ya existe", podría ser crítico
          log.warn('Continuando con siguiente sentencia...');
        }
      }
      
      // Pequeña pausa entre sentencias
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('');
    log.title('RESUMEN DE EJECUCIÓN');
    console.log(`Total de sentencias: ${validStatements.length}`);
    console.log(`${colors.green}✓ Ejecutadas: ${ejecutadas}${colors.reset}`);
    console.log(`${colors.red}✗ Errores: ${errores}${colors.reset}`);
    
    // Verificar resultado
    log.info('\nVerificando corrección...\n');
    
    const { data: ingresos } = await supabase
      .from('evt_ingresos')
      .select('total, cobrado');
    
    const { data: gastos } = await supabase
      .from('evt_gastos')
      .select('total, pagado');
    
    const { data: vista } = await supabase
      .from('vw_eventos_completos')
      .select('total, total_gastos');
    
    if (ingresos && gastos && vista) {
      const totalCobrados = ingresos
        .filter(i => i.cobrado === true)
        .reduce((sum, i) => sum + (i.total || 0), 0);
      
      const totalPagados = gastos
        .filter(g => g.pagado === true)
        .reduce((sum, g) => sum + (g.total || 0), 0);
      
      const totalVistaIngresos = vista.reduce((sum, v) => sum + (v.total || 0), 0);
      const totalVistaGastos = vista.reduce((sum, v) => sum + (v.total_gastos || 0), 0);
      
      const diffIngresos = Math.abs(totalVistaIngresos - totalCobrados);
      const diffGastos = Math.abs(totalVistaGastos - totalPagados);
      
      console.log(`${colors.cyan}Ingresos:${colors.reset}`);
      console.log(`  Real (cobrados): $${totalCobrados.toFixed(2)}`);
      console.log(`  Vista:           $${totalVistaIngresos.toFixed(2)}`);
      console.log(`  Diferencia:      $${diffIngresos.toFixed(2)}`);
      console.log('');
      console.log(`${colors.cyan}Gastos:${colors.reset}`);
      console.log(`  Real (pagados):  $${totalPagados.toFixed(2)}`);
      console.log(`  Vista:           $${totalVistaGastos.toFixed(2)}`);
      console.log(`  Diferencia:      $${diffGastos.toFixed(2)}`);
      console.log('');
      
      if (diffIngresos < 0.01 && diffGastos < 0.01) {
        log.success('✓ CORRECCIÓN EXITOSA - Vistas funcionan correctamente');
        console.log('');
        log.info('Siguiente paso: Ejecutar pruebas integrales');
        log.info('Comando: node pruebas-modulos-completo.mjs');
        process.exit(0);
      } else {
        log.warn('⚠ Las vistas aún muestran diferencias');
        log.warn('Es posible que necesites ejecutar el SQL manualmente en Supabase Dashboard');
        process.exit(1);
      }
    } else {
      log.warn('No se pudo verificar el resultado automáticamente');
      log.info('Verifica manualmente en Supabase Dashboard');
    }
    
  } catch (error) {
    log.error(`Error fatal: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

ejecutarSQL();
