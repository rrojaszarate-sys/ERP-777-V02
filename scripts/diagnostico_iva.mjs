import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function diagnosticar() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('     DIAGNÓSTICO DE IVA EN TODOS LOS REGISTROS');
    console.log('═══════════════════════════════════════════════════════════\n');

    // ============ INGRESOS ============
    console.log('📈 INGRESOS:');
    const { data: ingresos } = await supabase
        .from('evt_ingresos_erp')
        .select('id, concepto, total, subtotal, iva')
        .eq('evento_id', 32);

    if (ingresos && ingresos.length > 0) {
        let sumaTotal = 0, sumaSubtotal = 0, sumaIva = 0;
        ingresos.forEach(i => {
            sumaTotal += i.total || 0;
            sumaSubtotal += i.subtotal || 0;
            sumaIva += i.iva || 0;
            console.log(`   ${i.concepto?.substring(0, 40)}`);
            console.log(`     Total: $${(i.total || 0).toLocaleString()} | Subtotal: $${(i.subtotal || 0).toLocaleString()} | IVA: $${(i.iva || 0).toLocaleString()}`);
        });
        console.log(`   ───────────────────────────────────────`);
        console.log(`   SUMA Total: $${sumaTotal.toLocaleString()}`);
        console.log(`   SUMA Subtotal: $${sumaSubtotal.toLocaleString()} (${(sumaSubtotal / sumaTotal * 100).toFixed(1)}%)`);
        console.log(`   SUMA IVA: $${sumaIva.toLocaleString()} (${(sumaIva / sumaTotal * 100).toFixed(1)}%)\n`);
    }

    // ============ GASTOS ============
    console.log('💸 GASTOS:');
    const { data: gastos } = await supabase
        .from('evt_gastos_erp')
        .select('id, concepto, total, subtotal, iva, categoria_id')
        .eq('evento_id', 32);

    if (gastos && gastos.length > 0) {
        let sumaTotal = 0, sumaSubtotal = 0, sumaIva = 0;
        gastos.forEach(g => {
            sumaTotal += g.total || 0;
            sumaSubtotal += g.subtotal || 0;
            sumaIva += g.iva || 0;
        });
        console.log(`   Registros: ${gastos.length}`);
        console.log(`   SUMA Total: $${sumaTotal.toLocaleString()}`);
        console.log(`   SUMA Subtotal: $${sumaSubtotal.toLocaleString()} (${(sumaSubtotal / sumaTotal * 100).toFixed(1)}%)`);
        console.log(`   SUMA IVA: $${sumaIva.toLocaleString()} (${(sumaIva / sumaTotal * 100).toFixed(1)}%)\n`);
    }

    // ============ PROVISIONES ============
    console.log('📦 PROVISIONES:');
    const { data: provisiones } = await supabase
        .from('evt_provisiones_erp')
        .select('id, concepto, total, subtotal, iva, iva_porcentaje')
        .eq('evento_id', 32)
        .eq('activo', true);

    if (provisiones && provisiones.length > 0) {
        let sumaTotal = 0, sumaSubtotal = 0, sumaIva = 0;
        provisiones.forEach(p => {
            sumaTotal += p.total || 0;
            sumaSubtotal += p.subtotal || 0;
            sumaIva += p.iva || 0;
        });
        console.log(`   Registros: ${provisiones.length}`);
        console.log(`   SUMA Total: $${sumaTotal.toLocaleString()}`);
        console.log(`   SUMA Subtotal: $${sumaSubtotal.toLocaleString()} (${(sumaSubtotal / sumaTotal * 100).toFixed(1)}%)`);
        console.log(`   SUMA IVA: $${sumaIva.toLocaleString()} (${(sumaIva / sumaTotal * 100).toFixed(1)}%)`);
        console.log(`\n   ⚠️  Si las provisiones son estimaciones, el IVA debería ser $0\n`);
    }

    // ============ VISTA ACTUAL ============
    console.log('📊 VISTA vw_eventos_analisis_financiero_erp:');
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
    console.log('     ANÁLISIS:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   - Si Subtotal es ~86% del Total, el IVA se calculó correctamente');
    console.log('   - Si Subtotal es diferente, revisar los datos originales del Excel');
    console.log('   - Las PROVISIONES son estimaciones y NO deberían tener IVA');
    console.log('═══════════════════════════════════════════════════════════\n');
}

diagnosticar().catch(console.error);
