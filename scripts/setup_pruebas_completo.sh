#!/bin/bash

# ============================================================================
# Script Único para Cargar Datos de Prueba
# ============================================================================

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║       🚀 CARGA DE DATOS DE PRUEBA - UN SOLO COMANDO          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================================================
# PASO 1: Verificar Cuentas Contables (NO tocar, solo verificar)
# ============================================================================
echo -e "${YELLOW}[1/3] Verificando cuentas contables existentes...${NC}"

node -e "
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('evt_cuentas_contables')
    .select('id, codigo, nombre, tipo')
    .order('id');

  if (error) {
    console.error('❌ Error consultando cuentas:', error.message);
    process.exit(1);
  }

  console.log('  ✅ Cuentas encontradas:', data?.length || 0);

  const gastos = data?.filter(c => c.tipo === 'gasto' && c.id <= 23) || [];
  const ingresos = data?.filter(c => c.tipo === 'ingreso' && c.id >= 24) || [];

  console.log('     - Cuentas de gasto (ID ≤ 23):', gastos.length);
  console.log('     - Cuentas de ingreso (ID ≥ 24):', ingresos.length);

  if (gastos.length === 0 || ingresos.length === 0) {
    console.error('❌ Faltan cuentas contables necesarias');
    console.error('   Ejecuta: npm run crear:cuentas');
    process.exit(1);
  }
}

check();
" || exit 1

echo ""

# ============================================================================
# PASO 2: Verificar Usuarios (NO tocar, solo verificar)
# ============================================================================
echo -e "${YELLOW}[2/3] Verificando usuarios existentes...${NC}"

node -e "
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('core_users')
    .select('id, email, nombre, apellidos, activo')
    .eq('activo', true);

  if (error) {
    console.error('❌ Error consultando usuarios:', error.message);
    process.exit(1);
  }

  console.log('  ✅ Usuarios encontrados:', data?.length || 0);
  data?.forEach(u => {
    console.log('     -', u.email, '(' + u.nombre, u.apellidos + ')');
  });

  if (!data || data.length === 0) {
    console.error('❌ No hay usuarios en la base de datos');
    console.error('   Los usuarios deben existir previamente');
    process.exit(1);
  }
}

check();
" || exit 1

echo ""

# ============================================================================
# PASO 3: Cargar Datos de Prueba (eventos, gastos, ingresos)
# ============================================================================
echo -e "${YELLOW}[3/3] Cargando datos de prueba...${NC}"
npm run cargar:datos

if [ $? -eq 0 ]; then
  echo ""
  echo "╔═══════════════════════════════════════════════════════════════╗"
  echo "║           ✅ DATOS DE PRUEBA CARGADOS EXITOSAMENTE           ║"
  echo "╚═══════════════════════════════════════════════════════════════╝"
  echo ""
  echo -e "${GREEN}🎉 Sistema listo para pruebas!${NC}"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  PRÓXIMOS PASOS:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "1. Verificar datos cargados:"
  echo "   ${YELLOW}npm run test:automatizado${NC}"
  echo ""
  echo "2. Iniciar aplicación (terminal 1):"
  echo "   ${YELLOW}npm run dev${NC}"
  echo ""
  echo "3. Ejecutar pruebas UI (terminal 2):"
  echo "   ${YELLOW}npm run cypress:open${NC}"
  echo ""
else
  echo ""
  echo "╔═══════════════════════════════════════════════════════════════╗"
  echo "║              ❌ ERROR EN LA CARGA DE DATOS                   ║"
  echo "╚═══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Revisa el error arriba y corrige antes de continuar."
  exit 1
fi
