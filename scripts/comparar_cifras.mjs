import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function compararCifras() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('     COMPARACIÓN: EXCEL vs BASE DE DATOS vs VISTA');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    // Valores del Excel (de la imagen)
    const EXCEL = {
        ingresos: { subtotal: 3784962.56, iva: 605594.01, total: 4390556.57 },
        sp: { subtotal: 826051.73, iva: 33622.66, total: 859674.39 },
        combustible: { subtotal: 26427.59, iva: 3923.19, total: 30350.78 },
        rh: { subtotal: 40552.09, iva: 0, total: 40552.09 },
        materiales: { subtotal: 411968.91, iva: 65915.03, total: 477883.94 },
        provisiones: { subtotal: 1500970.64, iva: 0, total: 1500970.64 },
        totalEgresos: { subtotal: 2805970.96, iva: 103460.87, total: 2909431.83 },
        utilidad: 978991.60
    };

    console.log('📋 VALORES ESPERADOS (del Excel):');
    console.log('   INGRESOS:');
    console.log(`      Total: $${EXCEL.ingresos.total.toLocaleString()} | Subtotal: $${EXCEL.ingresos.subtotal.toLocaleString()} | IVA: $${EXCEL.ingresos.iva.toLocaleString()}`);

    console.log('   EGRESOS:');
    console.log(`      SP´S:         Subtotal: $${EXCEL.sp.subtotal.toLocaleString()} | IVA: $${EXCEL.sp.iva.toLocaleString()} | Total: $${EXCEL.sp.total.toLocaleString()}`);
    console.log(`      Combustible:  Subtotal: $${EXCEL.combustible.subtotal.toLocaleString()} | IVA: $${EXCEL.combustible.iva.toLocaleString()} | Total: $${EXCEL.combustible.total.toLocaleString()}`);
    console.log(`      RH:           Subtotal: $${EXCEL.rh.subtotal.toLocaleString()} | IVA: $${EXCEL.rh.iva.toLocaleString()} | Total: $${EXCEL.rh.total.toLocaleString()}`);
    console.log(`      Materiales:   Subtotal: $${EXCEL.materiales.subtotal.toLocaleString()} | IVA: $${EXCEL.materiales.iva.toLocaleString()} | Total: $${EXCEL.materiales.total.toLocaleString()}`);
    console.log(`      Provisiones:  Subtotal: $${EXCEL.provisiones.subtotal.toLocaleString()} | IVA: $${EXCEL.provisiones.iva.toLocaleString()} | Total: $${EXCEL.provisiones.total.toLocaleString()}`);
    console.log(`      ─────────────────────────────────────────────────────────────`);
    console.log(`      TOTAL EGRESOS: Subtotal: $${EXCEL.totalEgresos.subtotal.toLocaleString()} | IVA: $${EXCEL.totalEgresos.iva.toLocaleString()} | Total: $${EXCEL.totalEgresos.total.toLocaleString()}`);
    console.log(`   UTILIDAD: $${EXCEL.utilidad.toLocaleString()} (25.87%)`);

    // Valores en la base de datos
    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('📊 VALORES EN BASE DE DATOS:');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    // Ingresos
    const { data: ingresos } = await supabase.from('evt_ingresos_erp').select('*').eq('evento_id', 32);
    const ingTotal = ingresos?.reduce((s, i) => s + (i.total || 0), 0) || 0;
    const ingSubtotal = ingresos?.reduce((s, i) => s + (i.subtotal || 0), 0) || 0;
    const ingIva = ingresos?.reduce((s, i) => s + (i.iva || 0), 0) || 0;
    console.log('   INGRESOS:');
    console.log(`      Total: $${ingTotal.toLocaleString()} | Subtotal: $${ingSubtotal.toLocaleString()} | IVA: $${ingIva.toLocaleString()}`);
    if (Math.abs(ingTotal - EXCEL.ingresos.total) > 1) {
        console.log(`      ⚠️  DIFERENCIA: $${(ingTotal - EXCEL.ingresos.total).toLocaleString()}`);
    } else {
        console.log(`      ✅ Coincide`);
    }

    // Gastos por categoría
    console.log('\n   GASTOS:');
    const categorias = [
        { id: 6, nombre: 'SP´S', excel: EXCEL.sp },
        { id: 9, nombre: 'Combustible', excel: EXCEL.combustible },
        { id: 7, nombre: 'RH', excel: EXCEL.rh },
        { id: 8, nombre: 'Materiales', excel: EXCEL.materiales }
    ];

    let totalGastosDB = 0, subtotalGastosDB = 0, ivaGastosDB = 0;

    for (const cat of categorias) {
        const { data } = await supabase.from('evt_gastos_erp').select('*').eq('evento_id', 32).eq('categoria_id', cat.id);
        const total = data?.reduce((s, g) => s + (g.total || 0), 0) || 0;
        const subtotal = data?.reduce((s, g) => s + (g.subtotal || 0), 0) || 0;
        const iva = data?.reduce((s, g) => s + (g.iva || 0), 0) || 0;

        totalGastosDB += total;
        subtotalGastosDB += subtotal;
        ivaGastosDB += iva;

        console.log(`      ${cat.nombre}: (${data?.length || 0} registros)`);
        console.log(`         BD:    Subtotal: $${subtotal.toLocaleString()} | IVA: $${iva.toLocaleString()} | Total: $${total.toLocaleString()}`);
        console.log(`         Excel: Subtotal: $${cat.excel.subtotal.toLocaleString()} | IVA: $${cat.excel.iva.toLocaleString()} | Total: $${cat.excel.total.toLocaleString()}`);

        const diffTotal = total - cat.excel.total;
        if (Math.abs(diffTotal) > 1) {
            console.log(`         ⚠️  DIFERENCIA: $${diffTotal.toLocaleString()}`);
        } else {
            console.log(`         ✅ Coincide`);
        }
    }

    // Provisiones
    const { data: provisiones } = await supabase.from('evt_provisiones_erp').select('*').eq('evento_id', 32).eq('activo', true);
    const provTotal = provisiones?.reduce((s, p) => s + (p.total || 0), 0) || 0;
    const provSubtotal = provisiones?.reduce((s, p) => s + (p.subtotal || 0), 0) || 0;
    const provIva = provisiones?.reduce((s, p) => s + (p.iva || 0), 0) || 0;

    console.log(`\n      Provisiones: (${provisiones?.length || 0} registros)`);
    console.log(`         BD:    Subtotal: $${provSubtotal.toLocaleString()} | IVA: $${provIva.toLocaleString()} | Total: $${provTotal.toLocaleString()}`);
    console.log(`         Excel: Subtotal: $${EXCEL.provisiones.subtotal.toLocaleString()} | IVA: $${EXCEL.provisiones.iva.toLocaleString()} | Total: $${EXCEL.provisiones.total.toLocaleString()}`);

    const diffProv = provTotal - EXCEL.provisiones.total;
    if (Math.abs(diffProv) > 1) {
        console.log(`         ⚠️  DIFERENCIA: $${diffProv.toLocaleString()}`);
    } else {
        console.log(`         ✅ Coincide`);
    }

    // Total Egresos
    const totalEgresosDB = totalGastosDB + provTotal;
    const subtotalEgresosDB = subtotalGastosDB + provSubtotal;
    const ivaEgresosDB = ivaGastosDB + provIva;

    console.log(`\n      ─────────────────────────────────────────────────────────────`);
    console.log(`      TOTAL EGRESOS:`);
    console.log(`         BD:    Subtotal: $${subtotalEgresosDB.toLocaleString()} | IVA: $${ivaEgresosDB.toLocaleString()} | Total: $${totalEgresosDB.toLocaleString()}`);
    console.log(`         Excel: Subtotal: $${EXCEL.totalEgresos.subtotal.toLocaleString()} | IVA: $${EXCEL.totalEgresos.iva.toLocaleString()} | Total: $${EXCEL.totalEgresos.total.toLocaleString()}`);

    // Utilidad
    const utilidadDB = ingSubtotal - subtotalEgresosDB;
    console.log(`\n   UTILIDAD (subtotales):`);
    console.log(`      BD:    $${utilidadDB.toLocaleString()}`);
    console.log(`      Excel: $${EXCEL.utilidad.toLocaleString()}`);

    // Vista
    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('📊 VALORES EN LA VISTA (vw_eventos_analisis_financiero_erp):');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const { data: vista } = await supabase
        .from('vw_eventos_analisis_financiero_erp')
        .select('*')
        .eq('clave_evento', 'DOT2025-003')
        .single();

    if (vista) {
        console.log('   INGRESOS:');
        console.log(`      Total: $${(vista.ingresos_totales || 0).toLocaleString()} | Subtotal: $${(vista.ingresos_subtotal || 0).toLocaleString()}`);

        console.log('   GASTOS:');
        console.log(`      Total: $${(vista.gastos_totales || 0).toLocaleString()} | Subtotal: $${(vista.gastos_subtotal || 0).toLocaleString()}`);
        console.log(`      - SP pagados: $${(vista.gastos_sps_pagados || 0).toLocaleString()} | pendientes: $${(vista.gastos_sps_pendientes || 0).toLocaleString()}`);
        console.log(`      - Combustible pagados: $${(vista.gastos_combustible_pagados || 0).toLocaleString()} | pendientes: $${(vista.gastos_combustible_pendientes || 0).toLocaleString()}`);
        console.log(`      - RH pagados: $${(vista.gastos_rh_pagados || 0).toLocaleString()} | pendientes: $${(vista.gastos_rh_pendientes || 0).toLocaleString()}`);
        console.log(`      - Materiales pagados: $${(vista.gastos_materiales_pagados || 0).toLocaleString()} | pendientes: $${(vista.gastos_materiales_pendientes || 0).toLocaleString()}`);

        console.log('   PROVISIONES:');
        console.log(`      Total: $${(vista.provisiones_total || 0).toLocaleString()} | Subtotal: $${(vista.provisiones_subtotal || 0).toLocaleString()}`);

        console.log('   UTILIDAD:');
        console.log(`      Con IVA: $${(vista.utilidad_real || 0).toLocaleString()} (${(vista.margen_real_pct || 0).toFixed(2)}%)`);
        console.log(`      Sin IVA: $${(vista.utilidad_bruta || 0).toLocaleString()} (${(vista.margen_bruto_pct || 0).toFixed(2)}%)`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════════\n');
}

compararCifras().catch(console.error);
