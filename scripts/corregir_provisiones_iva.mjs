import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function corregirProvisiones() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('     CORRECCIÓN DE PROVISIONES: ELIMINAR IVA');
    console.log('═══════════════════════════════════════════════════════════\n');

    // 1. Ver estado ANTES
    console.log('📦 ANTES de la corrección:');
    const { data: antes } = await supabase
        .from('evt_provisiones_erp')
        .select('id, total, subtotal, iva')
        .eq('activo', true);

    if (antes) {
        const sumaTotal = antes.reduce((s, p) => s + (p.total || 0), 0);
        const sumaSubtotal = antes.reduce((s, p) => s + (p.subtotal || 0), 0);
        const sumaIva = antes.reduce((s, p) => s + (p.iva || 0), 0);
        console.log(`   Registros: ${antes.length}`);
        console.log(`   Total: $${sumaTotal.toLocaleString()}`);
        console.log(`   Subtotal: $${sumaSubtotal.toLocaleString()}`);
        console.log(`   IVA: $${sumaIva.toLocaleString()}\n`);
    }

    // 2. Ejecutar corrección: subtotal = total, iva = 0
    console.log('🔧 Ejecutando corrección...');

    // Obtener todas las provisiones activas
    const { data: provisiones, error: fetchError } = await supabase
        .from('evt_provisiones_erp')
        .select('id, total')
        .eq('activo', true);

    if (fetchError) {
        console.error('Error al obtener provisiones:', fetchError);
        return;
    }

    let actualizados = 0;
    let errores = 0;

    for (const prov of provisiones) {
        const { error } = await supabase
            .from('evt_provisiones_erp')
            .update({
                subtotal: prov.total,
                iva: 0,
                iva_porcentaje: 0,
                updated_at: new Date().toISOString()
            })
            .eq('id', prov.id);

        if (error) {
            console.error(`   Error en provisión ${prov.id}:`, error.message);
            errores++;
        } else {
            actualizados++;
        }
    }

    console.log(`   ✅ Actualizados: ${actualizados}`);
    if (errores > 0) console.log(`   ❌ Errores: ${errores}`);

    // 3. Ver estado DESPUÉS
    console.log('\n📦 DESPUÉS de la corrección:');
    const { data: despues } = await supabase
        .from('evt_provisiones_erp')
        .select('id, total, subtotal, iva')
        .eq('activo', true);

    if (despues) {
        const sumaTotal = despues.reduce((s, p) => s + (p.total || 0), 0);
        const sumaSubtotal = despues.reduce((s, p) => s + (p.subtotal || 0), 0);
        const sumaIva = despues.reduce((s, p) => s + (p.iva || 0), 0);
        console.log(`   Registros: ${despues.length}`);
        console.log(`   Total: $${sumaTotal.toLocaleString()}`);
        console.log(`   Subtotal: $${sumaSubtotal.toLocaleString()} (ahora = Total ✅)`);
        console.log(`   IVA: $${sumaIva.toLocaleString()} (ahora = $0 ✅)`);
    }

    // 4. Ver la vista actualizada
    console.log('\n📊 Vista actualizada:');
    const { data: vista } = await supabase
        .from('vw_eventos_analisis_financiero_erp')
        .select('*')
        .eq('clave_evento', 'DOT2025-003')
        .single();

    if (vista) {
        console.log(`   Ingresos Total: $${(vista.ingresos_totales || 0).toLocaleString()}`);
        console.log(`   Ingresos Subtotal: $${(vista.ingresos_subtotal || 0).toLocaleString()}`);
        console.log(`   Gastos Total: $${(vista.gastos_totales || 0).toLocaleString()}`);
        console.log(`   Gastos Subtotal: $${(vista.gastos_subtotal || 0).toLocaleString()}`);
        console.log(`   Provisiones Total: $${(vista.provisiones_total || 0).toLocaleString()}`);
        console.log(`   Provisiones Subtotal: $${(vista.provisiones_subtotal || 0).toLocaleString()}`);
        console.log(`   ───────────────────────────────────────`);
        console.log(`   Utilidad (c/IVA): $${(vista.utilidad_real || 0).toLocaleString()}`);
        console.log(`   Utilidad (s/IVA): $${(vista.utilidad_bruta || 0).toLocaleString()}`);
        console.log(`   Margen (c/IVA): ${(vista.margen_real_pct || 0).toFixed(1)}%`);
        console.log(`   Margen (s/IVA): ${(vista.margen_bruto_pct || 0).toFixed(1)}%`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('     ✅ CORRECCIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   Las provisiones ahora NO tienen IVA (son estimaciones)');
    console.log('   Refresca la página del ERP para ver los cambios');
    console.log('═══════════════════════════════════════════════════════════\n');
}

corregirProvisiones().catch(console.error);
