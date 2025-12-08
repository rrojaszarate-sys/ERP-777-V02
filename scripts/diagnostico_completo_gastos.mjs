import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

const EVENTO_ID = 32;

async function diagnosticoCompleto() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('     DIAGNÓSTICO COMPLETO: GASTOS POR CATEGORÍA');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    // ============ CATEGORÍAS DISPONIBLES ============
    console.log('📋 CATEGORÍAS DE GASTOS:');
    const { data: categorias } = await supabase
        .from('evt_categorias_gastos_erp')
        .select('id, nombre, clave')
        .order('id');

    if (categorias) {
        categorias.forEach(c => console.log(`   ${c.id}: ${c.nombre} (${c.clave || 'sin clave'})`));
    }
    console.log('');

    // ============ GASTOS POR CATEGORÍA ============
    console.log('💸 GASTOS POR CATEGORÍA (evt_gastos_erp):');
    const { data: gastos } = await supabase
        .from('evt_gastos_erp')
        .select('id, concepto, total, subtotal, iva, categoria_id, pagado')
        .eq('evento_id', EVENTO_ID);

    if (gastos) {
        // Agrupar por categoría
        const porCategoria = {};
        gastos.forEach(g => {
            const catId = g.categoria_id || 'SIN_CAT';
            if (!porCategoria[catId]) {
                porCategoria[catId] = { total: 0, subtotal: 0, iva: 0, count: 0, pagados: 0, pendientes: 0 };
            }
            porCategoria[catId].total += g.total || 0;
            porCategoria[catId].subtotal += g.subtotal || 0;
            porCategoria[catId].iva += g.iva || 0;
            porCategoria[catId].count++;
            if (g.pagado) porCategoria[catId].pagados++;
            else porCategoria[catId].pendientes++;
        });

        const catNames = { 6: 'SP (Solicitudes Pago)', 7: 'RH', 8: 'Materiales', 9: 'Combustible/Peaje', 'SIN_CAT': 'Sin categoría' };

        Object.keys(porCategoria).forEach(catId => {
            const cat = porCategoria[catId];
            const nombre = catNames[catId] || `Cat ${catId}`;
            console.log(`\n   📁 ${nombre}:`);
            console.log(`      Registros: ${cat.count} (${cat.pagados} pagados, ${cat.pendientes} pendientes)`);
            console.log(`      Total: $${cat.total.toLocaleString()}`);
            console.log(`      Subtotal: $${cat.subtotal.toLocaleString()} (${(cat.subtotal / cat.total * 100).toFixed(1)}%)`);
            console.log(`      IVA: $${cat.iva.toLocaleString()} (${(cat.iva / cat.total * 100).toFixed(1)}%)`);
        });

        // Totales
        const totalGastos = gastos.reduce((s, g) => s + (g.total || 0), 0);
        const subtotalGastos = gastos.reduce((s, g) => s + (g.subtotal || 0), 0);
        const ivaGastos = gastos.reduce((s, g) => s + (g.iva || 0), 0);
        console.log(`\n   ═══════════════════════════════════════`);
        console.log(`   TOTAL GASTOS: $${totalGastos.toLocaleString()}`);
        console.log(`   TOTAL Subtotal: $${subtotalGastos.toLocaleString()}`);
        console.log(`   TOTAL IVA: $${ivaGastos.toLocaleString()}\n`);
    }

    // ============ SOLICITUDES DE PAGO (SP) - DETALLE ============
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('📋 DETALLE DE SOLICITUDES DE PAGO (SP) - Categoría 6:');
    console.log('═══════════════════════════════════════════════════════════════════');

    const { data: sp } = await supabase
        .from('evt_gastos_erp')
        .select('id, concepto, total, subtotal, iva, pagado')
        .eq('evento_id', EVENTO_ID)
        .eq('categoria_id', 6)
        .order('total', { ascending: false });

    if (sp && sp.length > 0) {
        console.log(`\n   Total SP encontrados: ${sp.length}\n`);
        sp.slice(0, 20).forEach((s, i) => {
            const tieneIVA = s.iva > 0 ? '✅' : '❌';
            console.log(`   ${i + 1}. ${s.concepto?.substring(0, 50)}`);
            console.log(`      Total: $${(s.total || 0).toLocaleString()} | Subtotal: $${(s.subtotal || 0).toLocaleString()} | IVA: $${(s.iva || 0).toLocaleString()} ${tieneIVA}`);
        });
        if (sp.length > 20) console.log(`   ... y ${sp.length - 20} más`);
    } else {
        console.log('   ⚠️  NO HAY REGISTROS EN CATEGORÍA 6 (SP)');
    }

    // ============ VERIFICAR TABLA evt_sps (si existe) ============
    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('📋 VERIFICANDO TABLA evt_sps_erp (Solicitudes de Pago separadas):');
    console.log('═══════════════════════════════════════════════════════════════════');

    const { data: spsTabla, error: spsError } = await supabase
        .from('evt_sps_erp')
        .select('id, concepto, total, subtotal, iva, pagado')
        .eq('evento_id', EVENTO_ID);

    if (spsError) {
        console.log(`   ⚠️  Error o tabla no existe: ${spsError.message}`);
    } else if (spsTabla && spsTabla.length > 0) {
        const totalSP = spsTabla.reduce((s, sp) => s + (sp.total || 0), 0);
        const subtotalSP = spsTabla.reduce((s, sp) => s + (sp.subtotal || 0), 0);
        const ivaSP = spsTabla.reduce((s, sp) => s + (sp.iva || 0), 0);
        console.log(`\n   Registros: ${spsTabla.length}`);
        console.log(`   Total: $${totalSP.toLocaleString()}`);
        console.log(`   Subtotal: $${subtotalSP.toLocaleString()}`);
        console.log(`   IVA: $${ivaSP.toLocaleString()}`);
    } else {
        console.log('   📭 Tabla vacía o no existe');
    }

    // ============ VISTA ACTUAL ============
    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('📊 VISTA vw_eventos_analisis_financiero_erp:');
    console.log('═══════════════════════════════════════════════════════════════════');

    const { data: vista } = await supabase
        .from('vw_eventos_analisis_financiero_erp')
        .select('*')
        .eq('clave_evento', 'DOT2025-003')
        .single();

    if (vista) {
        console.log(`\n   INGRESOS:`);
        console.log(`      Total: $${(vista.ingresos_totales || 0).toLocaleString()}`);
        console.log(`      Subtotal: $${(vista.ingresos_subtotal || 0).toLocaleString()}`);

        console.log(`\n   GASTOS:`);
        console.log(`      Total: $${(vista.gastos_totales || 0).toLocaleString()}`);
        console.log(`      Subtotal: $${(vista.gastos_subtotal || 0).toLocaleString()}`);
        console.log(`      - SP pagados: $${(vista.gastos_sps_pagados || 0).toLocaleString()}`);
        console.log(`      - SP pendientes: $${(vista.gastos_sps_pendientes || 0).toLocaleString()}`);
        console.log(`      - Combustible pagados: $${(vista.gastos_combustible_pagados || 0).toLocaleString()}`);
        console.log(`      - Combustible pendientes: $${(vista.gastos_combustible_pendientes || 0).toLocaleString()}`);
        console.log(`      - Materiales pagados: $${(vista.gastos_materiales_pagados || 0).toLocaleString()}`);
        console.log(`      - Materiales pendientes: $${(vista.gastos_materiales_pendientes || 0).toLocaleString()}`);
        console.log(`      - RH pagados: $${(vista.gastos_rh_pagados || 0).toLocaleString()}`);
        console.log(`      - RH pendientes: $${(vista.gastos_rh_pendientes || 0).toLocaleString()}`);

        console.log(`\n   PROVISIONES:`);
        console.log(`      Total: $${(vista.provisiones_total || 0).toLocaleString()}`);
        console.log(`      Subtotal: $${(vista.provisiones_subtotal || 0).toLocaleString()}`);

        console.log(`\n   UTILIDAD:`);
        console.log(`      Con IVA: $${(vista.utilidad_real || 0).toLocaleString()} (${(vista.margen_real_pct || 0).toFixed(1)}%)`);
        console.log(`      Sin IVA: $${(vista.utilidad_bruta || 0).toLocaleString()} (${(vista.margen_bruto_pct || 0).toFixed(1)}%)`);
    }

    // ============ ANÁLISIS DE DISCREPANCIAS ============
    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('🔍 ANÁLISIS DE DISCREPANCIAS:');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    // Comparar gastos de la tabla vs vista
    if (gastos && vista) {
        const totalGastosTabla = gastos.reduce((s, g) => s + (g.total || 0), 0);
        const totalGastosVista = vista.gastos_totales;

        if (Math.abs(totalGastosTabla - totalGastosVista) > 1) {
            console.log(`   ⚠️  DISCREPANCIA en Gastos:`);
            console.log(`      Tabla evt_gastos_erp: $${totalGastosTabla.toLocaleString()}`);
            console.log(`      Vista: $${totalGastosVista.toLocaleString()}`);
            console.log(`      Diferencia: $${(totalGastosTabla - totalGastosVista).toLocaleString()}\n`);
        } else {
            console.log(`   ✅ Gastos coinciden entre tabla y vista\n`);
        }

        // Verificar SP
        const spEnGastos = gastos.filter(g => g.categoria_id === 6);
        const sumaSPGastos = spEnGastos.reduce((s, g) => s + (g.total || 0), 0);
        const sumaSPVista = (vista.gastos_sps_pagados || 0) + (vista.gastos_sps_pendientes || 0);

        if (Math.abs(sumaSPGastos - sumaSPVista) > 1) {
            console.log(`   ⚠️  DISCREPANCIA en SP:`);
            console.log(`      Tabla (cat_id=6): $${sumaSPGastos.toLocaleString()} (${spEnGastos.length} registros)`);
            console.log(`      Vista: $${sumaSPVista.toLocaleString()}`);
            console.log(`      Diferencia: $${(sumaSPGastos - sumaSPVista).toLocaleString()}\n`);
        } else {
            console.log(`   ✅ SP coinciden: $${sumaSPGastos.toLocaleString()} (${spEnGastos.length} registros)\n`);
        }
    }

    console.log('═══════════════════════════════════════════════════════════════════\n');
}

diagnosticoCompleto().catch(console.error);
