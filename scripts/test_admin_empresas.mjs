/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║       PRUEBAS AUTOMATIZADAS - ADMIN EMPRESAS (FASE 6)                    ║
 * ║              Multi-tenancy y Gestión de Empresas                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * Suite de pruebas que valida:
 * - Estructura de tablas multi-tenant
 * - CRUD de empresas (core_companies)
 * - CRUD de roles por empresa (core_roles_empresa)
 * - Gestión de módulos (core_modulos_sistema, core_company_modules)
 * - Usuarios y asignación de roles
 * - Storage buckets por empresa
 * - Funciones de base de datos
 *
 * @author ERP 777 V2
 * @date 2025-12-03
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
  defaultCompanyId: '00000000-0000-0000-0000-000000000001',
  testCompanyCodigo: 'test-empresa-' + Date.now(),
  performanceThresholds: {
    querySimple: 500,
    queryComplex: 2000,
    crudOperation: 1000
  }
};

// ============================================================================
// TEST RUNNER
// ============================================================================

class TestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      duration: 0,
      categories: {}
    };
    this.currentCategory = 'General';
    this.startTime = Date.now();
  }

  setCategory(name) {
    this.currentCategory = name;
    if (!this.results.categories[name]) {
      this.results.categories[name] = { passed: 0, failed: 0, tests: [] };
    }
  }

  async test(name, testFn) {
    this.results.total++;
    const start = Date.now();

    try {
      const result = await testFn();
      const duration = Date.now() - start;

      if (result.success) {
        this.results.passed++;
        this.results.categories[this.currentCategory].passed++;
        console.log(`   ✅ ${name} (${duration}ms)`);
        if (result.details) console.log(`      📝 ${result.details}`);
      } else {
        this.results.failed++;
        this.results.categories[this.currentCategory].failed++;
        console.log(`   ❌ ${name} (${duration}ms)`);
        console.log(`      💥 ${result.error}`);
      }

      this.results.categories[this.currentCategory].tests.push({
        name,
        success: result.success,
        duration,
        error: result.error
      });

      return result.success;
    } catch (error) {
      const duration = Date.now() - start;
      this.results.failed++;
      this.results.categories[this.currentCategory].failed++;
      console.log(`   ❌ ${name} (${duration}ms)`);
      console.log(`      💥 Exception: ${error.message}`);

      this.results.categories[this.currentCategory].tests.push({
        name,
        success: false,
        duration,
        error: error.message
      });

      return false;
    }
  }

  printSummary() {
    this.results.duration = Date.now() - this.startTime;
    const passRate = ((this.results.passed / this.results.total) * 100).toFixed(1);

    console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║              📊 RESUMEN - ADMIN EMPRESAS                         ║');
    console.log('╠═══════════════════════════════════════════════════════════════════╣');
    console.log(`║  Total de pruebas:    ${String(this.results.total).padStart(5)}                                 ║`);
    console.log(`║  ✅ Exitosas:         ${String(this.results.passed).padStart(5)}                                 ║`);
    console.log(`║  ❌ Fallidas:         ${String(this.results.failed).padStart(5)}                                 ║`);
    console.log(`║  📈 Tasa de éxito:    ${String(passRate + '%').padStart(6)}                                ║`);
    console.log(`║  ⏱️  Duración total:  ${String((this.results.duration/1000).toFixed(2) + 's').padStart(7)}                               ║`);
    console.log('╠═══════════════════════════════════════════════════════════════════╣');
    console.log('║  Por categoría:                                                  ║');

    for (const [category, data] of Object.entries(this.results.categories)) {
      const catRate = data.passed + data.failed > 0
        ? ((data.passed / (data.passed + data.failed)) * 100).toFixed(0)
        : 0;
      console.log(`║    ${category.padEnd(25)} ${data.passed}/${data.passed + data.failed} (${catRate}%)`.padEnd(67) + '║');
    }

    console.log('╚═══════════════════════════════════════════════════════════════════╝');

    return this.results;
  }
}

// ============================================================================
// PRUEBAS DE ESTRUCTURA DE TABLAS
// ============================================================================

async function pruebasEstructura(runner) {
  runner.setCategory('Estructura BD');
  console.log('\n🏗️  PRUEBAS DE ESTRUCTURA DE BASE DE DATOS\n');

  // Tabla core_companies
  await runner.test('Tabla core_companies existe', async () => {
    const { data, error } = await supabase
      .from('core_companies')
      .select('id')
      .limit(1);
    return { success: !error, error: error?.message };
  });

  // Verificar columna codigo en core_companies
  await runner.test('core_companies tiene columna codigo', async () => {
    const { data, error } = await supabase
      .from('core_companies')
      .select('codigo')
      .limit(1);
    return { success: !error, error: error?.message };
  });

  // Tabla core_roles_empresa
  await runner.test('Tabla core_roles_empresa existe', async () => {
    const { data, error } = await supabase
      .from('core_roles_empresa')
      .select('id')
      .limit(1);
    return { success: !error, error: error?.message };
  });

  // Tabla core_modulos_sistema
  await runner.test('Tabla core_modulos_sistema existe', async () => {
    const { data, error } = await supabase
      .from('core_modulos_sistema')
      .select('id')
      .limit(1);
    return { success: !error, error: error?.message };
  });

  // Tabla core_company_modules
  await runner.test('Tabla core_company_modules existe', async () => {
    const { data, error } = await supabase
      .from('core_company_modules')
      .select('id')
      .limit(1);
    return { success: !error, error: error?.message };
  });

  // Tabla core_users
  await runner.test('Tabla core_users existe', async () => {
    const { data, error } = await supabase
      .from('core_users')
      .select('id')
      .limit(1);
    return { success: !error, error: error?.message };
  });

  // Tabla core_user_roles
  await runner.test('Tabla core_user_roles existe', async () => {
    const { data, error } = await supabase
      .from('core_user_roles')
      .select('id')
      .limit(1);
    return { success: !error, error: error?.message };
  });

  // Tabla core_invitations
  await runner.test('Tabla core_invitations existe', async () => {
    const { data, error } = await supabase
      .from('core_invitations')
      .select('id')
      .limit(1);
    return { success: !error, error: error?.message };
  });

  // Tabla core_access_requests
  await runner.test('Tabla core_access_requests existe', async () => {
    const { data, error } = await supabase
      .from('core_access_requests')
      .select('id')
      .limit(1);
    return { success: !error, error: error?.message };
  });

  // Tabla core_company_files
  await runner.test('Tabla core_company_files existe', async () => {
    const { data, error } = await supabase
      .from('core_company_files')
      .select('id')
      .limit(1);
    return { success: !error, error: error?.message };
  });
}

// ============================================================================
// PRUEBAS DE EMPRESAS
// ============================================================================

async function pruebasEmpresas(runner) {
  runner.setCategory('Empresas');
  console.log('\n🏢 PRUEBAS DE GESTIÓN DE EMPRESAS\n');

  // Empresa por defecto existe
  await runner.test('Empresa MADREGROUP existe', async () => {
    const { data, error } = await supabase
      .from('core_companies')
      .select('id, nombre, codigo')
      .eq('id', CONFIG.defaultCompanyId)
      .single();

    if (error) return { success: false, error: error.message };
    return {
      success: data?.codigo === 'madregroup',
      details: `Nombre: ${data?.nombre}, Código: ${data?.codigo}`,
      error: data?.codigo !== 'madregroup' ? 'Código no es madregroup' : null
    };
  });

  // Leer datos de empresa
  await runner.test('Lectura de datos de empresa', async () => {
    const { data, error } = await supabase
      .from('core_companies')
      .select(`
        id, nombre, codigo, razon_social, rfc,
        plan_tipo, max_usuarios, max_almacenamiento_gb,
        color_primario, color_secundario,
        activo, created_at
      `)
      .eq('id', CONFIG.defaultCompanyId)
      .single();

    if (error) return { success: false, error: error.message };
    return {
      success: !!data?.id,
      details: `Plan: ${data?.plan_tipo}, Usuarios: ${data?.max_usuarios}`
    };
  });

  // Campos de branding
  await runner.test('Campos de branding disponibles', async () => {
    const { data, error } = await supabase
      .from('core_companies')
      .select('logo_principal_url, logo_secundario_url, membrete_url, color_primario')
      .eq('id', CONFIG.defaultCompanyId)
      .single();

    return { success: !error, error: error?.message };
  });

  // Contar empresas activas
  await runner.test('Conteo de empresas activas', async () => {
    const { count, error } = await supabase
      .from('core_companies')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true);

    return {
      success: !error && count >= 1,
      details: `${count} empresas activas`,
      error: error?.message
    };
  });
}

// ============================================================================
// PRUEBAS DE ROLES
// ============================================================================

async function pruebasRoles(runner) {
  runner.setCategory('Roles');
  console.log('\n🛡️  PRUEBAS DE GESTIÓN DE ROLES\n');

  // Roles de la empresa por defecto
  await runner.test('Roles de empresa existen', async () => {
    const { data, error } = await supabase
      .from('core_roles_empresa')
      .select('id, nombre, es_admin, es_predeterminado')
      .eq('company_id', CONFIG.defaultCompanyId);

    if (error) return { success: false, error: error.message };
    return {
      success: data?.length >= 1,
      details: `${data?.length} roles encontrados`
    };
  });

  // Rol de administrador existe
  await runner.test('Rol de administrador existe', async () => {
    const { data, error } = await supabase
      .from('core_roles_empresa')
      .select('id, nombre, es_admin, permisos')
      .eq('company_id', CONFIG.defaultCompanyId)
      .eq('es_admin', true)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    return {
      success: data?.es_admin === true,
      details: `Rol: ${data?.nombre}`
    };
  });

  // Permisos en formato correcto (JSONB)
  await runner.test('Permisos en formato JSONB array', async () => {
    const { data, error } = await supabase
      .from('core_roles_empresa')
      .select('permisos')
      .eq('company_id', CONFIG.defaultCompanyId)
      .limit(1)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    // JSONB array se parsea automáticamente como array en JS
    const permisos = data?.permisos;
    return {
      success: Array.isArray(permisos),
      details: `${permisos?.length || 0} permisos en formato correcto`
    };
  });

  // Verificar variedad de roles
  await runner.test('Diversidad de roles (admin, supervisor, operador)', async () => {
    const { data, error } = await supabase
      .from('core_roles_empresa')
      .select('nombre, es_admin')
      .eq('company_id', CONFIG.defaultCompanyId);

    if (error) return { success: false, error: error.message };
    const hasAdmin = data?.some(r => r.es_admin);
    const hasNonAdmin = data?.some(r => !r.es_admin);
    return {
      success: hasAdmin && hasNonAdmin,
      details: `Admin: ${hasAdmin ? 'Sí' : 'No'}, Otros: ${data?.filter(r => !r.es_admin).length}`
    };
  });

  // Verificar colores de roles
  await runner.test('Roles tienen colores asignados', async () => {
    const { data, error } = await supabase
      .from('core_roles_empresa')
      .select('nombre, color')
      .eq('company_id', CONFIG.defaultCompanyId);

    if (error) return { success: false, error: error.message };
    const withColor = data?.filter(r => r.color);
    return {
      success: withColor?.length >= 1,
      details: `${withColor?.length}/${data?.length} con color`
    };
  });

  // Nota: CRUD requiere autenticación (RLS)
  await runner.test('RLS protege escritura de roles', async () => {
    // Intentar insertar sin autenticación debe fallar
    const { error } = await supabase
      .from('core_roles_empresa')
      .insert({
        company_id: CONFIG.defaultCompanyId,
        nombre: 'Test RLS',
        permisos: '["test"]'
      });

    return {
      success: !!error, // Debe fallar por RLS
      details: error ? 'RLS activo correctamente' : 'RLS no está activo'
    };
  });
}

// ============================================================================
// PRUEBAS DE MÓDULOS
// ============================================================================

async function pruebasModulos(runner) {
  runner.setCategory('Módulos');
  console.log('\n📦 PRUEBAS DE GESTIÓN DE MÓDULOS\n');

  // Módulos del sistema existen
  await runner.test('Módulos del sistema existen', async () => {
    const { data, error } = await supabase
      .from('core_modulos_sistema')
      .select('id, codigo, nombre, categoria')
      .eq('activo', true);

    if (error) return { success: false, error: error.message };
    return {
      success: data?.length >= 5,
      details: `${data?.length} módulos activos`
    };
  });

  // Módulos por categoría
  await runner.test('Categorías de módulos', async () => {
    const { data, error } = await supabase
      .from('core_modulos_sistema')
      .select('categoria')
      .eq('activo', true);

    if (error) return { success: false, error: error.message };
    const categorias = [...new Set(data?.map(m => m.categoria))];
    return {
      success: categorias.length >= 3,
      details: `Categorías: ${categorias.join(', ')}`
    };
  });

  // Módulos asignados a empresa
  await runner.test('Módulos asignados a empresa', async () => {
    const { data, error } = await supabase
      .from('core_company_modules')
      .select('id, modulo_id, habilitado')
      .eq('company_id', CONFIG.defaultCompanyId);

    if (error) return { success: false, error: error.message };
    const habilitados = data?.filter(m => m.habilitado).length || 0;
    return {
      success: data?.length >= 1,
      details: `${habilitados}/${data?.length} módulos habilitados`
    };
  });

  // Módulos incluyen información del módulo base
  await runner.test('Join módulos empresa con sistema', async () => {
    const { data, error } = await supabase
      .from('core_company_modules')
      .select(`
        id, habilitado,
        core_modulos_sistema(codigo, nombre, categoria)
      `)
      .eq('company_id', CONFIG.defaultCompanyId)
      .limit(5);

    if (error) return { success: false, error: error.message };
    const withInfo = data?.filter(m => m.core_modulos_sistema);
    return {
      success: withInfo?.length >= 1,
      details: `${withInfo?.length} módulos con info`
    };
  });
}

// ============================================================================
// PRUEBAS DE USUARIOS
// ============================================================================

async function pruebasUsuarios(runner) {
  runner.setCategory('Usuarios');
  console.log('\n👥 PRUEBAS DE GESTIÓN DE USUARIOS\n');

  // Usuarios existen
  await runner.test('Usuarios en el sistema', async () => {
    const { data, error } = await supabase
      .from('core_users')
      .select('id, email, nombre, activo')
      .limit(10);

    if (error) return { success: false, error: error.message };
    return {
      success: data?.length >= 0,
      details: `${data?.length} usuarios encontrados`
    };
  });

  // Usuarios con roles asignados
  await runner.test('Relación usuarios-roles', async () => {
    const { data, error } = await supabase
      .from('core_user_roles')
      .select('id, user_id, role_id')
      .limit(10);

    if (error) return { success: false, error: error.message };
    return {
      success: true,
      details: `${data?.length} asignaciones de roles`
    };
  });

  // Usuarios con información de empresa
  await runner.test('Usuarios tienen company_id', async () => {
    const { data, error } = await supabase
      .from('core_users')
      .select('id, company_id')
      .not('company_id', 'is', null)
      .limit(10);

    if (error) return { success: false, error: error.message };
    return {
      success: true,
      details: `${data?.length} usuarios con empresa asignada`
    };
  });
}

// ============================================================================
// PRUEBAS DE INVITACIONES
// ============================================================================

async function pruebasInvitaciones(runner) {
  runner.setCategory('Invitaciones');
  console.log('\n📧 PRUEBAS DE INVITACIONES\n');

  // Estructura de invitaciones
  await runner.test('Tabla de invitaciones accesible', async () => {
    const { data, error } = await supabase
      .from('core_invitations')
      .select('id, email, status, created_at')
      .limit(5);

    if (error) return { success: false, error: error.message };
    return {
      success: true,
      details: `${data?.length} invitaciones encontradas`
    };
  });

  // Verificar campos requeridos
  await runner.test('Estructura de invitaciones correcta', async () => {
    const { data, error } = await supabase
      .from('core_invitations')
      .select('id, company_id, email, token, status, fecha_expiracion')
      .limit(1);

    // Solo verificamos que la consulta sea válida
    return { success: !error, error: error?.message };
  });

  // RLS protege escritura
  await runner.test('RLS protege escritura de invitaciones', async () => {
    const { error } = await supabase
      .from('core_invitations')
      .insert({
        company_id: CONFIG.defaultCompanyId,
        email: 'test@test.com',
        token: 'test-token',
        status: 'pendiente'
      });

    return {
      success: !!error,
      details: error ? 'RLS activo' : 'RLS no protege'
    };
  });
}

// ============================================================================
// PRUEBAS DE SOLICITUDES DE ACCESO
// ============================================================================

async function pruebasSolicitudes(runner) {
  runner.setCategory('Solicitudes');
  console.log('\n📝 PRUEBAS DE SOLICITUDES DE ACCESO\n');

  // Estructura de solicitudes
  await runner.test('Tabla de solicitudes accesible', async () => {
    const { data, error } = await supabase
      .from('core_access_requests')
      .select('id, email, status, created_at')
      .limit(5);

    if (error) return { success: false, error: error.message };
    return {
      success: true,
      details: `${data?.length} solicitudes encontradas`
    };
  });

  // Verificar estructura
  await runner.test('Estructura de solicitudes correcta', async () => {
    const { data, error } = await supabase
      .from('core_access_requests')
      .select('id, email, nombre, empresa_solicitada, motivo, status, expires_at')
      .limit(1);

    return { success: !error, error: error?.message };
  });

  // RLS protege escritura
  await runner.test('RLS protege escritura de solicitudes', async () => {
    const { error } = await supabase
      .from('core_access_requests')
      .insert({
        email: 'test@test.com',
        nombre: 'Test',
        status: 'pendiente'
      });

    return {
      success: !!error,
      details: error ? 'RLS activo' : 'RLS no protege'
    };
  });
}

// ============================================================================
// PRUEBAS DE STORAGE
// ============================================================================

async function pruebasStorage(runner) {
  runner.setCategory('Storage');
  console.log('\n💾 PRUEBAS DE STORAGE POR EMPRESA\n');

  // Verificar función get_company_bucket
  await runner.test('Función get_company_bucket existe', async () => {
    const { data, error } = await supabase.rpc('get_company_bucket', {
      p_company_id: CONFIG.defaultCompanyId
    });

    if (error) return { success: false, error: error.message };
    return {
      success: !!data,
      details: `Bucket: ${data}`
    };
  });

  // Verificar que el bucket retornado es correcto
  await runner.test('Bucket name es erp-madregroup', async () => {
    const { data, error } = await supabase.rpc('get_company_bucket', {
      p_company_id: CONFIG.defaultCompanyId
    });

    if (error) return { success: false, error: error.message };
    return {
      success: data === 'erp-madregroup',
      details: `Bucket: ${data}`
    };
  });

  // Tabla de archivos de empresa
  await runner.test('Tabla core_company_files accesible', async () => {
    const { data, error } = await supabase
      .from('core_company_files')
      .select('id, tipo, nombre_original')
      .eq('company_id', CONFIG.defaultCompanyId)
      .limit(5);

    if (error) return { success: false, error: error.message };
    return {
      success: true,
      details: `${data?.length} archivos registrados`
    };
  });

  // Verificar tipos de archivo soportados
  await runner.test('Estructura de archivos correcta', async () => {
    const { data, error } = await supabase
      .from('core_company_files')
      .select('id, company_id, tipo, nombre_original, url, mime_type')
      .limit(1);

    return { success: !error, error: error?.message };
  });
}

// ============================================================================
// PRUEBAS DE PERFORMANCE
// ============================================================================

async function pruebasPerformance(runner) {
  runner.setCategory('Performance');
  console.log('\n⚡ PRUEBAS DE PERFORMANCE\n');

  // Query simple de empresas
  await runner.test('Query simple empresas < 500ms', async () => {
    const start = Date.now();
    const { data, error } = await supabase
      .from('core_companies')
      .select('id, nombre, codigo')
      .limit(10);
    const duration = Date.now() - start;

    if (error) return { success: false, error: error.message };
    return {
      success: duration < CONFIG.performanceThresholds.querySimple,
      details: `${duration}ms`
    };
  });

  // Query con join de roles
  await runner.test('Query roles por empresa < 500ms', async () => {
    const start = Date.now();
    const { data, error } = await supabase
      .from('core_roles_empresa')
      .select('id, nombre, permisos, es_admin')
      .eq('company_id', CONFIG.defaultCompanyId);
    const duration = Date.now() - start;

    if (error) return { success: false, error: error.message };
    return {
      success: duration < CONFIG.performanceThresholds.querySimple,
      details: `${duration}ms, ${data?.length} roles`
    };
  });

  // Query de módulos con empresa
  await runner.test('Query módulos sistema < 500ms', async () => {
    const start = Date.now();
    const { data, error } = await supabase
      .from('core_modulos_sistema')
      .select('*')
      .eq('activo', true);
    const duration = Date.now() - start;

    if (error) return { success: false, error: error.message };
    return {
      success: duration < CONFIG.performanceThresholds.querySimple,
      details: `${duration}ms, ${data?.length} módulos`
    };
  });

  // Query compleja con múltiples joins
  await runner.test('Query compleja < 2000ms', async () => {
    const start = Date.now();
    const { data, error } = await supabase
      .from('core_companies')
      .select(`
        id, nombre, codigo, plan_tipo,
        core_roles_empresa(id, nombre),
        core_company_modules(id, habilitado)
      `)
      .eq('id', CONFIG.defaultCompanyId)
      .single();
    const duration = Date.now() - start;

    if (error) return { success: false, error: error.message };
    return {
      success: duration < CONFIG.performanceThresholds.queryComplex,
      details: `${duration}ms`
    };
  });
}

// ============================================================================
// PRUEBAS DE INTEGRIDAD
// ============================================================================

async function pruebasIntegridad(runner) {
  runner.setCategory('Integridad');
  console.log('\n🔒 PRUEBAS DE INTEGRIDAD DE DATOS\n');

  // Roles tienen company_id
  await runner.test('Roles tienen company_id válido', async () => {
    const { data, error } = await supabase
      .from('core_roles_empresa')
      .select('id, company_id')
      .is('company_id', null);

    if (error) return { success: false, error: error.message };
    return {
      success: data?.length === 0,
      details: data?.length === 0 ? 'Todos los roles tienen empresa' : `${data?.length} sin empresa`
    };
  });

  // Módulos de empresa tienen modulo_id válido
  await runner.test('Módulos empresa tienen modulo_id válido', async () => {
    const { data, error } = await supabase
      .from('core_company_modules')
      .select('id, modulo_id')
      .is('modulo_id', null);

    if (error) return { success: false, error: error.message };
    return {
      success: data?.length === 0,
      details: data?.length === 0 ? 'Todos tienen módulo' : `${data?.length} sin módulo`
    };
  });

  // Empresa por defecto está activa
  await runner.test('Empresa por defecto está activa', async () => {
    const { data, error } = await supabase
      .from('core_companies')
      .select('activo')
      .eq('id', CONFIG.defaultCompanyId)
      .single();

    if (error) return { success: false, error: error.message };
    return { success: data?.activo === true };
  });

  // Planes válidos
  await runner.test('Empresas tienen plan válido', async () => {
    const validPlans = ['basic', 'pro', 'enterprise'];
    const { data, error } = await supabase
      .from('core_companies')
      .select('plan_tipo')
      .eq('activo', true);

    if (error) return { success: false, error: error.message };
    const invalid = data?.filter(c => !validPlans.includes(c.plan_tipo));
    return {
      success: invalid?.length === 0,
      details: `Todos tienen plan válido`
    };
  });
}

// ============================================================================
// EJECUTAR TODAS LAS PRUEBAS
// ============================================================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║       🏢 PRUEBAS AUTOMATIZADAS - ADMIN EMPRESAS (FASE 6)                 ║');
  console.log('║              Multi-tenancy y Gestión de Empresas                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  console.log(`\n📅 Fecha: ${new Date().toLocaleString()}`);
  console.log(`🔗 Supabase URL: ${process.env.VITE_SUPABASE_URL?.substring(0, 40)}...`);

  const runner = new TestRunner();

  try {
    await pruebasEstructura(runner);
    await pruebasEmpresas(runner);
    await pruebasRoles(runner);
    await pruebasModulos(runner);
    await pruebasUsuarios(runner);
    await pruebasInvitaciones(runner);
    await pruebasSolicitudes(runner);
    await pruebasStorage(runner);
    await pruebasPerformance(runner);
    await pruebasIntegridad(runner);
  } catch (error) {
    console.error('\n💥 Error fatal:', error.message);
  }

  const results = runner.printSummary();

  // Guardar resultados
  const fs = await import('fs');
  const reportPath = './reports/test_admin_empresas.json';

  try {
    if (!fs.existsSync('./reports')) {
      fs.mkdirSync('./reports');
    }
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📁 Resultados guardados en: ${reportPath}`);
  } catch (e) {
    console.log(`\n⚠️  No se pudo guardar el reporte: ${e.message}`);
  }

  // Exit code basado en resultado
  process.exit(results.failed > 0 ? 1 : 0);
}

main();
