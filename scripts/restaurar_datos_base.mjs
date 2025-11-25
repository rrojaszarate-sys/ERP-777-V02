/**
 * Script para Restaurar Datos Base del Sistema
 *
 * Restaura:
 * - Companies (core_companies)
 * - Roles (core_roles)
 * - Usuarios (core_users)
 * - User Roles (core_user_roles)
 *
 * Ejecutar: node scripts/restaurar_datos_base.mjs
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Restaurando Datos Base del Sistema...\n');

async function restaurarDatosBase() {
  try {
    // ========================================================================
    // 1. CREAR COMPANY BASE
    // ========================================================================
    console.log('📦 [1/4] Creando company base...');

    const { data: existingCompany } = await supabase
      .from('core_companies')
      .select('id')
      .limit(1)
      .single();

    let companyId;

    if (existingCompany) {
      companyId = existingCompany.id;
      console.log(`  ✅ Company ya existe: ID=${companyId}`);
    } else {
      const { data: newCompany, error: companyError } = await supabase
        .from('core_companies')
        .insert({
          name: 'MADE Eventos',
          rfc: 'MADE850101ABC',
          email: 'contacto@madeeventos.com',
          phone: '555-1234567',
          address: 'Ciudad de México, México',
          is_active: true,
          settings: {
            timezone: 'America/Mexico_City',
            currency: 'MXN',
            language: 'es'
          }
        })
        .select()
        .single();

      if (companyError) {
        throw new Error(`Error creando company: ${companyError.message}`);
      }

      companyId = newCompany.id;
      console.log(`  ✅ Company creada: ID=${companyId}`);
    }

    // ========================================================================
    // 2. CREAR ROLES
    // ========================================================================
    console.log('\n👥 [2/4] Creando roles...');

    const roles = [
      {
        name: 'Administrador',
        description: 'Acceso completo al sistema',
        permissions: {
          eventos: ['read', 'write', 'delete'],
          gastos: ['read', 'write', 'delete'],
          ingresos: ['read', 'write', 'delete'],
          clientes: ['read', 'write', 'delete'],
          reportes: ['read'],
          configuracion: ['read', 'write']
        },
        is_active: true
      },
      {
        name: 'Coordinador',
        description: 'Gestión de eventos y finanzas',
        permissions: {
          eventos: ['read', 'write'],
          gastos: ['read', 'write'],
          ingresos: ['read', 'write'],
          clientes: ['read'],
          reportes: ['read']
        },
        is_active: true
      },
      {
        name: 'Visualizador',
        description: 'Solo lectura',
        permissions: {
          eventos: ['read'],
          gastos: ['read'],
          ingresos: ['read'],
          clientes: ['read'],
          reportes: ['read']
        },
        is_active: true
      }
    ];

    const roleIds = {};

    for (const role of roles) {
      const { data: existingRole } = await supabase
        .from('core_roles')
        .select('id')
        .eq('name', role.name)
        .single();

      if (existingRole) {
        roleIds[role.name] = existingRole.id;
        console.log(`  ✅ Rol "${role.name}" ya existe: ID=${existingRole.id}`);
      } else {
        const { data: newRole, error: roleError } = await supabase
          .from('core_roles')
          .insert(role)
          .select()
          .single();

        if (roleError) {
          console.error(`  ❌ Error creando rol "${role.name}":`, roleError.message);
        } else {
          roleIds[role.name] = newRole.id;
          console.log(`  ✅ Rol "${role.name}" creado: ID=${newRole.id}`);
        }
      }
    }

    // ========================================================================
    // 3. CREAR USUARIOS BASE
    // ========================================================================
    console.log('\n👤 [3/4] Creando usuarios base...');

    const users = [
      {
        email: 'admin@madeeventos.com',
        full_name: 'Administrador Principal',
        company_id: companyId,
        is_active: true,
        settings: {
          notifications: true,
          theme: 'light'
        }
      },
      {
        email: 'coordinador@madeeventos.com',
        full_name: 'Coordinador de Eventos',
        company_id: companyId,
        is_active: true,
        settings: {
          notifications: true,
          theme: 'light'
        }
      },
      {
        email: 'test@madeeventos.com',
        full_name: 'Usuario de Pruebas',
        company_id: companyId,
        is_active: true,
        settings: {
          notifications: false,
          theme: 'light'
        }
      }
    ];

    const userIds = {};

    for (const user of users) {
      const { data: existingUser } = await supabase
        .from('core_users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (existingUser) {
        userIds[user.email] = existingUser.id;
        console.log(`  ✅ Usuario "${user.email}" ya existe: ID=${existingUser.id}`);
      } else {
        const { data: newUser, error: userError } = await supabase
          .from('core_users')
          .insert(user)
          .select()
          .single();

        if (userError) {
          console.error(`  ❌ Error creando usuario "${user.email}":`, userError.message);
        } else {
          userIds[user.email] = newUser.id;
          console.log(`  ✅ Usuario "${user.email}" creado: ID=${newUser.id}`);
        }
      }
    }

    // ========================================================================
    // 4. ASIGNAR ROLES A USUARIOS
    // ========================================================================
    console.log('\n🔗 [4/4] Asignando roles a usuarios...');

    const userRoles = [
      { email: 'admin@madeeventos.com', roleName: 'Administrador' },
      { email: 'coordinador@madeeventos.com', roleName: 'Coordinador' },
      { email: 'test@madeeventos.com', roleName: 'Visualizador' }
    ];

    for (const assignment of userRoles) {
      const userId = userIds[assignment.email];
      const roleId = roleIds[assignment.roleName];

      if (!userId || !roleId) {
        console.log(`  ⏭️  Saltando asignación ${assignment.email} -> ${assignment.roleName}`);
        continue;
      }

      const { data: existing } = await supabase
        .from('core_user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .single();

      if (existing) {
        console.log(`  ✅ Rol "${assignment.roleName}" ya asignado a ${assignment.email}`);
      } else {
        const { error: assignError } = await supabase
          .from('core_user_roles')
          .insert({
            user_id: userId,
            role_id: roleId,
            assigned_by: userId, // Auto-asignado
            is_active: true
          });

        if (assignError) {
          console.error(`  ❌ Error asignando rol:`, assignError.message);
        } else {
          console.log(`  ✅ Rol "${assignment.roleName}" asignado a ${assignment.email}`);
        }
      }
    }

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║           ✅ DATOS BASE RESTAURADOS EXITOSAMENTE             ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('📊 Resumen:');
    console.log(`   - Company: ${companyId}`);
    console.log(`   - Roles: ${Object.keys(roleIds).length}`);
    console.log(`   - Usuarios: ${Object.keys(userIds).length}`);
    console.log('');
    console.log('🎯 Siguiente paso: Cargar datos de eventos');
    console.log('   npm run cargar:datos');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

restaurarDatosBase();
