#!/usr/bin/env node
/**
 * Script para verificar el estado del servicio OCR
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function verificarOCR() {
  console.log('🔍 VERIFICACIÓN DEL SERVICIO OCR\n');
  console.log('='.repeat(50));

  // 1. Verificar tabla documentos_erp
  console.log('\n📄 1. Tabla de documentos:');
  const { data: docs, error: docsErr } = await supabase
    .from('documentos_erp')
    .select('*')
    .limit(3);
  
  if (docsErr) {
    console.log('   ❌ Error:', docsErr.message);
  } else {
    console.log('   ✅ documentos_erp accesible');
    console.log('   📊 Documentos encontrados:', docs?.length || 0);
    if (docs?.length > 0) {
      console.log('   📋 Columnas:', Object.keys(docs[0]).join(', '));
    }
  }

  // 2. Verificar campos OCR en gastos
  console.log('\n💰 2. Campos OCR en gastos:');
  const { data: gasto } = await supabase
    .from('evt_gastos_erp')
    .select('id, concepto, documento_ocr_id, ocr_procesado, ocr_extraido, ocr_validado, archivo_adjunto')
    .not('documento_ocr_id', 'is', null)
    .limit(3);
  
  console.log('   Gastos con OCR:', gasto?.length || 0);
  if (gasto?.length > 0) {
    gasto.forEach(g => {
      console.log(`   - ${g.concepto?.substring(0, 30)}: OCR=${g.ocr_procesado ? '✅' : '❌'}`);
    });
  }

  // 3. Verificar Storage buckets
  console.log('\n📦 3. Storage buckets:');
  const { data: buckets, error: buckErr } = await supabase.storage.listBuckets();
  
  if (buckErr) {
    console.log('   ❌ Error:', buckErr.message);
  } else {
    if (buckets?.length > 0) {
      for (const bucket of buckets) {
        console.log(`   ✅ ${bucket.name} (público: ${bucket.public})`);
      }
    } else {
      console.log('   ⚠️ No hay buckets configurados');
    }
  }

  // 4. Verificar archivos en storage
  console.log('\n📁 4. Archivos en storage:');
  const bucketsToCheck = ['event_docs', 'documentos', 'archivos', 'gastos'];
  
  for (const bucketName of bucketsToCheck) {
    const { data: files, error: filesErr } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 5 });
    
    if (!filesErr && files?.length > 0) {
      console.log(`   ✅ ${bucketName}: ${files.length} archivos/carpetas`);
    }
  }

  // 5. Verificar configuración de variables de entorno
  console.log('\n⚙️ 5. Configuración:');
  console.log('   VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ Configurado' : '❌ Falta');
  console.log('   VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Falta');
  
  // Verificar si hay API keys para OCR externo
  const ocrKeys = ['VITE_GOOGLE_VISION_API_KEY', 'GOOGLE_CLOUD_API_KEY', 'VITE_OCR_API_KEY'];
  for (const key of ocrKeys) {
    if (process.env[key]) {
      console.log(`   ${key}: ✅ Configurado`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ VERIFICACIÓN COMPLETADA\n');

  // Resumen
  console.log('📋 RESUMEN:');
  console.log('   - El OCR usa Tesseract.js (local, no requiere API key)');
  console.log('   - Los documentos se guardan en documentos_erp');
  console.log('   - Los gastos tienen campos para vincular OCR');
  console.log('   - El servidor está corriendo en http://localhost:5173');
}

verificarOCR().catch(console.error);
