import { supabase } from '../../../core/config/supabase';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export class DataGeneratorService {
  private static instance: DataGeneratorService;
  private adminClient: any = null;

  private constructor() {}

  public static getInstance(): DataGeneratorService {
    if (!DataGeneratorService.instance) {
      DataGeneratorService.instance = new DataGeneratorService();
    }
    return DataGeneratorService.instance;
  }

  // Create admin client lazily when needed
  private getAdminClient() {
    if (this.adminClient) {
      return this.adminClient;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    
    // If service role key is not available, fall back to regular client
    if (!supabaseUrl || !serviceRoleKey) {
      console.warn('⚠️ Service role key not available, using regular client for admin operations');
      console.warn('Some admin operations may be limited by RLS policies');
      this.adminClient = supabase;
      return this.adminClient;
    }
    
    this.adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    return this.adminClient;
  }

  async ensureReferenceData(): Promise<{
    users: any[];
    tiposEvento: any[];
    estados: any[];
    categorias: any[];
    companyId: string;
    createdByUserId: string | null;
  }> {
    // Get the current user's company_id for RLS compliance
    const { data: { user } } = await supabase.auth.getUser();
    const adminClient = this.getAdminClient();
    let companyId = null;
    let createdByUserId = null;
    
    if (user) {
      // Check if this is a mock development user
      if (user.id === '00000000-0000-0000-0000-000000000001') {
        // For mock user, don't try to fetch from database
        companyId = null;
        createdByUserId = null;
      } else {
        try {
          const { data: userData } = await adminClient
            .from('core_users')
            .select('company_id')
            .eq('id', user.id)
            .single();
          companyId = userData?.company_id;
          createdByUserId = user.id;
        } catch (error) {
          console.warn('Could not fetch user data, using defaults');
          companyId = null;
          createdByUserId = null;
        }
      }
    }
    
    // If no company_id found, use a default one or create one
    if (!companyId) {
      // Try to get the first company or create a default one
      const { data: companies } = await adminClient
        .from('core_companies')
        .select('id')
        .limit(1);
      
      if (companies && companies.length > 0) {
        companyId = companies[0].id;
      } else {
        // Create a default company for development
        const { data: newCompany } = await adminClient
          .from('core_companies')
          .insert({
            nombre: 'Empresa de Desarrollo',
            rfc: 'EDE123456789',
            email: 'desarrollo@empresa.com',
            activo: true
          })
          .select('id')
          .single();
        companyId = newCompany?.id;
      }
    }

    // Get existing reference data
    const [usersResult, tiposResult, estadosResult, categoriasResult] = await Promise.all([
      adminClient.from('core_users').select('id, nombre').limit(10),
      adminClient.from('evt_tipos_evento').select('id, nombre').limit(10),
      adminClient.from('evt_estados').select('id, nombre').limit(10),
      adminClient.from('evt_categorias_gastos').select('id, nombre').limit(10)
    ]);

    let users = usersResult.data || [];
    let tiposEvento = tiposResult.data || [];
    let estados = estadosResult.data || [];
    let categorias = categoriasResult.data || [];

    // Create default users if none exist
    if (users.length === 0) {
      const { data: newUsers } = await adminClient
        .from('core_users')
        .insert([
          { nombre: 'Ana García Martínez', email: 'ana.garcia@madeevents.com', company_id: companyId },
          { nombre: 'Carlos Rodríguez López', email: 'carlos.rodriguez@madeevents.com', company_id: companyId },
          { nombre: 'María Elena Sánchez', email: 'maria.sanchez@madeevents.com', company_id: companyId },
          { nombre: 'José Luis Fernández', email: 'jose.fernandez@madeevents.com', company_id: companyId },
          { nombre: 'Laura Patricia Morales', email: 'laura.morales@madeevents.com', company_id: companyId }
        ])
        .select('id, nombre');
      users = newUsers || [];
      
      // Use the first created user as createdByUserId if we don't have one
      if (!createdByUserId && users.length > 0) {
        createdByUserId = users[0].id;
      }
    }

    // Create default event types if none exist
    if (tiposEvento.length === 0) {
      const { data: newTipos } = await adminClient
        .from('evt_tipos_evento')
        .insert([
          { company_id: companyId, nombre: 'Conferencia', descripcion: 'Eventos de conferencias y seminarios', color: '#3B82F6' },
          { company_id: companyId, nombre: 'Corporativo', descripcion: 'Eventos corporativos y empresariales', color: '#10B981' },
          { company_id: companyId, nombre: 'Social', descripcion: 'Eventos sociales y celebraciones', color: '#F59E0B' },
          { company_id: companyId, nombre: 'Comercial', descripcion: 'Eventos comerciales y ferias', color: '#EF4444' },
          { company_id: companyId, nombre: 'Educativo', descripcion: 'Eventos educativos y capacitación', color: '#8B5CF6' }
        ])
        .select('id, nombre');
      tiposEvento = newTipos || [];
    }

    // Create default states if none exist
    if (estados.length === 0) {
      const { data: newEstados } = await adminClient
        .from('evt_estados')
        .insert([
          { nombre: 'Borrador', descripcion: 'Evento en borrador', color: '#6B7280', orden: 1 },
          { nombre: 'Cotizado', descripcion: 'Evento cotizado', color: '#3B82F6', orden: 2 },
          { nombre: 'Aprobado', descripcion: 'Evento aprobado', color: '#10B981', orden: 3 },
          { nombre: 'En Proceso', descripcion: 'Evento en proceso', color: '#F59E0B', orden: 4 },
          { nombre: 'Completado', descripcion: 'Evento completado', color: '#059669', orden: 5 },
          { nombre: 'Facturado', descripcion: 'Evento facturado', color: '#7C3AED', orden: 6 },
          { nombre: 'Cobrado', descripcion: 'Evento cobrado', color: '#059669', orden: 7 }
        ])
        .select('id, nombre');
      estados = newEstados || [];
    }

    // Create default categories if none exist
    if (categorias.length === 0) {
      const { data: newCategorias } = await adminClient
        .from('evt_categorias_gastos')
        .insert([
          { company_id: companyId, nombre: 'Servicios Profesionales', descripcion: 'Servicios profesionales y consultoría', color: '#3B82F6' },
          { company_id: companyId, nombre: 'Recursos Humanos', descripcion: 'Gastos de personal y nómina', color: '#10B981' },
          { company_id: companyId, nombre: 'Materiales', descripcion: 'Materiales y suministros', color: '#F59E0B' },
          { company_id: companyId, nombre: 'Combustible/Casetas', descripcion: 'Combustible y gastos de transporte', color: '#EF4444' },
          { company_id: companyId, nombre: 'Otros', descripcion: 'Otros gastos diversos', color: '#8B5CF6' }
        ])
        .select('id, nombre');
      categorias = newCategorias || [];
    }

    return { users, tiposEvento, estados, categorias, companyId, createdByUserId };
  }

  async batchInsert<T>(
    tableName: string, 
    data: T[], 
    batchSize: number = 100,
    onProgress?: (current: number, total: number) => void
  ): Promise<number> {
    const adminClient = this.getAdminClient();
    let totalInserted = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const { data: insertedData, error } = await adminClient
        .from(tableName)
        .insert(batch)
        .select('id');

      if (error) {
        throw new Error(`Error inserting batch in ${tableName}: ${error.message}`);
      }

      totalInserted += insertedData?.length || 0;
      
      if (onProgress) {
        onProgress(totalInserted, data.length);
      }

      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return totalInserted;
  }

  async clearAllData(): Promise<void> {
    const adminClient = this.getAdminClient();
    // Delete in correct order to respect foreign key constraints
    const tables = ['evt_gastos_erp', 'evt_ingresos_erp', 'evt_eventos_erp', 'evt_clientes_erp'];
    
    for (const table of tables) {
      const { error } = await adminClient
        .from(table)
        .delete()
        .neq('id', 0); // Delete all records
      
      if (error) {
        throw new Error(`Error clearing ${table}: ${error.message}`);
      }
    }
  }

  generateClientes(count: number, companyId: string, createdByUserId: string | null = null): any[] {
    const NOMBRES = [
      'Ana', 'Carlos', 'María', 'José', 'Laura', 'Miguel', 'Carmen', 'Francisco',
      'Isabel', 'Antonio', 'Rosa', 'Manuel', 'Pilar', 'Jesús', 'Mercedes', 'Ángel',
      'Dolores', 'Rafael', 'Antonia', 'David', 'Josefa', 'Daniel', 'Francisca', 'Sergio',
      'Concepción', 'Alejandro', 'Teresa', 'Fernando', 'Lucía', 'Jorge', 'Cristina', 'Alberto'
    ];

    const APELLIDOS = [
      'García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez',
      'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Muñoz',
      'Álvarez', 'Romero', 'Alonso', 'Gutiérrez', 'Navarro', 'Torres', 'Domínguez', 'Vázquez',
      'Ramos', 'Gil', 'Ramírez', 'Serrano', 'Blanco', 'Suárez', 'Molina', 'Morales'
    ];

    const EMPRESAS_PREFIJOS = [
      'Corporativo', 'Grupo', 'Empresa', 'Compañía', 'Organización', 'Institución',
      'Servicios', 'Soluciones', 'Tecnología', 'Innovación', 'Desarrollo', 'Consultoría'
    ];

    const EMPRESAS_SECTORES = [
      'Tecnología', 'Construcción', 'Alimentaria', 'Textil', 'Automotriz', 'Farmacéutica',
      'Educativa', 'Financiera', 'Comercial', 'Industrial', 'Turística', 'Logística'
    ];

    const EMPRESAS_SUFIJOS = ['SA de CV', 'SA', 'SRL', 'SC', 'SPR de RL', 'AC', 'IAP'];

    const CIUDADES_MEXICO = [
      'Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León',
      'Juárez', 'Torreón', 'Querétaro', 'San Luis Potosí', 'Mérida', 'Mexicali',
      'Aguascalientes', 'Cuernavaca', 'Saltillo', 'Hermosillo', 'Culiacán', 'Durango'
    ];

    const clientes = [];
    
    for (let i = 0; i < count; i++) {
      const nombre = this.getRandomElement(NOMBRES);
      const apellido1 = this.getRandomElement(APELLIDOS);
      const apellido2 = this.getRandomElement(APELLIDOS);
      const empresa = this.getRandomElement(EMPRESAS_PREFIJOS);
      const sector = this.getRandomElement(EMPRESAS_SECTORES);
      const sufijo = this.getRandomElement(EMPRESAS_SUFIJOS);
      
      const razonSocial = `${empresa} ${sector} ${sufijo}`;
      const nombreComercial = `${empresa}${sector}`;
      const rfc = this.generateRFC(true); // Persona moral
      const email = `contacto${i}@${nombreComercial.toLowerCase().replace(/\s/g, '')}.com`;
      const ciudad = this.getRandomElement(CIUDADES_MEXICO);
      
      clientes.push({
        company_id: companyId,
        razon_social: razonSocial,
        nombre_comercial: nombreComercial,
        rfc: rfc,
        email: email,
        telefono: this.generatePhoneNumber(),
        direccion_fiscal: `Av. ${apellido1} ${this.getRandomNumber(1, 999)}, Col. ${apellido2}, ${ciudad}`,
        contacto_principal: `${nombre} ${apellido1} ${apellido2}`,
        telefono_contacto: this.generatePhoneNumber(),
        email_contacto: `${nombre.toLowerCase()}.${apellido1.toLowerCase()}@${nombreComercial.toLowerCase().replace(/\s/g, '')}.com`,
        regimen_fiscal: this.getRandomElement(['601', '612', '621']),
        uso_cfdi: this.getRandomElement(['G01', 'G02', 'G03']),
        metodo_pago: this.getRandomElement(['PUE', 'PPD']),
        forma_pago: this.getRandomElement(['01', '02', '03', '04', '28']),
        dias_credito: this.getRandomElement([15, 30, 45, 60]),
        limite_credito: this.getRandomNumber(50000, 500000),
        activo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: createdByUserId
      });
    }
    
    return clientes;
  }

  generateEventos(count: number, clienteId: number, referenceData: any): any[] {
    const CONCEPTOS_EVENTOS = [
      'Conferencia Anual', 'Seminario Empresarial', 'Taller de Capacitación', 'Evento Corporativo',
      'Lanzamiento de Producto', 'Convención', 'Simposio', 'Congreso', 'Feria Comercial',
      'Presentación Ejecutiva', 'Reunión de Accionistas', 'Celebración Corporativa'
    ];

    const eventos = [];
    
    for (let i = 0; i < count; i++) {
      const concepto = this.getRandomElement(CONCEPTOS_EVENTOS);
      const year = this.getRandomElement([2023, 2024, 2025]);
      const month = this.getRandomNumber(1, 12);
      const day = this.getRandomNumber(1, 28);
      const fechaEvento = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      const presupuesto = this.getRandomNumber(10000, 200000);
      const subtotal = presupuesto * this.getRandomNumber(80, 120) / 100;
      const iva = subtotal * 0.16;
      const total = subtotal + iva;
      const totalGastos = subtotal * this.getRandomNumber(60, 80) / 100;
      const utilidad = total - totalGastos;
      
      eventos.push({
        company_id: referenceData.companyId,
        clave_evento: `EVT-${year}-${uuidv4().substring(0, 8).toUpperCase()}`,
        nombre_proyecto: `${concepto} ${year}`,
        descripcion: `Evento empresarial de ${concepto.toLowerCase()} programado para ${fechaEvento}`,
        cliente_id: clienteId,
        tipo_evento_id: referenceData.tiposEvento.length > 0 ? this.getRandomElement(referenceData.tiposEvento).id : 1,
        estado_id: referenceData.estados.length > 0 ? this.getRandomElement(referenceData.estados).id : 1,
        responsable_id: referenceData.users.length > 0 ? this.getRandomElement(referenceData.users).id : null,
        fecha_evento: fechaEvento,
        fecha_fin: Math.random() > 0.7 ? this.addDays(fechaEvento, this.getRandomNumber(1, 3)) : null,
        hora_inicio: `${this.getRandomNumber(8, 18).toString().padStart(2, '0')}:00`,
        hora_fin: `${this.getRandomNumber(19, 23).toString().padStart(2, '0')}:00`,
        lugar: `${this.getRandomElement(['Ciudad de México', 'Guadalajara', 'Monterrey'])}, Centro de Convenciones`,
        numero_invitados: this.getRandomNumber(50, 500),
        presupuesto_estimado: presupuesto,
        subtotal: subtotal,
        iva_porcentaje: 16,
        iva: iva,
        total: total,
        total_gastos: totalGastos,
        utilidad: utilidad,
        margen_utilidad: (utilidad / total) * 100,
        status_facturacion: this.getRandomElement(['pendiente_facturar', 'facturado']),
        status_pago: this.getRandomElement(['pendiente', 'pago_pendiente', 'pagado']),
        prioridad: this.getRandomElement(['baja', 'media', 'alta']),
        fase_proyecto: this.getRandomElement(['cotizacion', 'aprobado', 'en_proceso', 'completado']),
        activo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    return eventos;
  }

  generateGastos(count: number, eventoId: number, categorias: any[]): any[] {
    const CONCEPTOS_GASTOS = {
      'Servicios Profesionales': [
        'Consultoría especializada', 'Asesoría legal', 'Servicios contables', 'Auditoría externa',
        'Diseño gráfico', 'Desarrollo web', 'Capacitación empresarial', 'Traducción de documentos',
        'Servicios de marketing', 'Fotografía profesional'
      ],
      'Recursos Humanos': [
        'Nómina quincenal', 'Prestaciones sociales', 'Seguro médico', 'Capacitación personal',
        'Uniformes', 'Bonos de productividad', 'Aguinaldo', 'Prima vacacional',
        'Fondo de ahorro', 'Comisiones de ventas'
      ],
      'Materiales': [
        'Materiales de oficina', 'Equipo de cómputo', 'Mobiliario', 'Decoración',
        'Flores y arreglos', 'Cristalería', 'Vajilla', 'Mantelería',
        'Equipo audiovisual', 'Materiales promocionales'
      ],
      'Combustible/Casetas': [
        'Gasolina vehículos', 'Diesel generadores', 'Casetas autopista', 'Estacionamiento',
        'Transporte personal', 'Flete mercancías', 'Envío documentos', 'Taxi ejecutivo',
        'Peajes carreteras', 'Combustible maquinaria'
      ],
      'Otros': [
        'Gastos varios', 'Imprevistos', 'Reparaciones menores', 'Mantenimiento',
        'Seguros', 'Licencias software', 'Suscripciones', 'Servicios públicos',
        'Limpieza', 'Seguridad'
      ]
    };

    const gastos = [];
    const categoriasGastos = Object.keys(CONCEPTOS_GASTOS);
    const gastosPerCategory = Math.floor(count / categoriasGastos.length);
    
    categoriasGastos.forEach((categoriaNombre) => {
      const categoria = categorias.find(c => c.nombre === categoriaNombre) || categorias[0];
      const conceptos = CONCEPTOS_GASTOS[categoriaNombre as keyof typeof CONCEPTOS_GASTOS];
      
      for (let i = 0; i < gastosPerCategory; i++) {
        const cantidad = this.getRandomNumber(1, 10);
        const precioUnitario = this.getRandomNumber(100, 5000);
        const subtotal = cantidad * precioUnitario;
        const iva = subtotal * 0.16;
        const total = subtotal + iva;
        
        gastos.push({
          evento_id: eventoId,
          categoria_id: categoria?.id || null,
          concepto: this.getRandomElement(conceptos),
          descripcion: `Gasto de ${categoriaNombre.toLowerCase()} para el evento`,
          cantidad: cantidad,
          precio_unitario: precioUnitario,
          subtotal: subtotal,
          iva_porcentaje: 16,
          iva: iva,
          total: total,
          proveedor: this.generateProveedorName(),
          rfc_proveedor: this.generateRFC(Math.random() > 0.5),
          fecha_gasto: this.generateRandomDate(2024, 2025),
          forma_pago: this.getRandomElement(['efectivo', 'transferencia', 'cheque', 'tarjeta']),
          referencia: `REF-${this.getRandomNumber(1000, 9999)}`,
          status_aprobacion: this.getRandomElement(['pendiente', 'aprobado', 'rechazado']),
          activo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    });
    
    return gastos;
  }

  generateIngresos(count: number, eventoId: number): any[] {
    const CONCEPTOS_INGRESOS = [
      'Pago inicial del evento', 'Anticipo 50%', 'Liquidación final', 'Pago completo',
      'Primer abono', 'Segundo abono', 'Pago por servicios adicionales', 'Ajuste de precio',
      'Bonificación por volumen', 'Descuento aplicado'
    ];

    const ingresos = [];
    
    for (let i = 0; i < count; i++) {
      const cantidad = 1;
      const precioUnitario = this.getRandomNumber(5000, 50000);
      const subtotal = cantidad * precioUnitario;
      const iva = subtotal * 0.16;
      const total = subtotal + iva;
      
      ingresos.push({
        evento_id: eventoId,
        concepto: this.getRandomElement(CONCEPTOS_INGRESOS),
        descripcion: `Ingreso ${i + 1} del evento`,
        cantidad: cantidad,
        precio_unitario: precioUnitario,
        subtotal: subtotal,
        iva_porcentaje: 16,
        iva: iva,
        total: total,
        fecha_ingreso: this.generateRandomDate(2024, 2025),
        referencia: `ING-${this.getRandomNumber(10000, 99999)}`,
        facturado: Math.random() > 0.3,
        cobrado: Math.random() > 0.5,
        metodo_cobro: this.getRandomElement(['transferencia', 'efectivo', 'cheque', 'tarjeta']),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    return ingresos;
  }

  // Utility methods
  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private generateRFC(isPersonaMoral: boolean): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    let rfc = '';
    
    // First part (3 or 4 letters)
    const letterCount = isPersonaMoral ? 3 : 4;
    for (let i = 0; i < letterCount; i++) {
      rfc += letters[Math.floor(Math.random() * letters.length)];
    }
    
    // Date part (6 numbers)
    const year = this.getRandomNumber(70, 99).toString().padStart(2, '0');
    const month = this.getRandomNumber(1, 12).toString().padStart(2, '0');
    const day = this.getRandomNumber(1, 28).toString().padStart(2, '0');
    rfc += year + month + day;
    
    // Final part (3 alphanumeric)
    for (let i = 0; i < 3; i++) {
      const useNumber = Math.random() > 0.5;
      rfc += useNumber 
        ? numbers[Math.floor(Math.random() * numbers.length)]
        : letters[Math.floor(Math.random() * letters.length)];
    }
    
    return rfc;
  }

  private generatePhoneNumber(): string {
    const area = this.getRandomNumber(55, 99);
    const number1 = this.getRandomNumber(1000, 9999);
    const number2 = this.getRandomNumber(1000, 9999);
    return `${area}-${number1}-${number2}`;
  }

  private generateProveedorName(): string {
    const prefijos = ['Servicios', 'Comercial', 'Industrial', 'Corporativo'];
    const sectores = ['Premium', 'Integral', 'Especializado', 'Profesional'];
    const sufijos = ['SA de CV', 'SA', 'SRL'];
    
    return `${this.getRandomElement(prefijos)} ${this.getRandomElement(sectores)} ${this.getRandomElement(sufijos)}`;
  }

  private generateRandomDate(startYear: number, endYear: number): string {
    const year = this.getRandomNumber(startYear, endYear);
    const month = this.getRandomNumber(1, 12);
    const day = this.getRandomNumber(1, 28);
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  private addDays(dateString: string, days: number): string {
    const date = new Date(dateString);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }
}

export const dataGeneratorService = DataGeneratorService.getInstance();