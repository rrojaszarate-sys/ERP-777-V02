/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║              SCRIPT DE POBLACIÓN COMPLETA - ERP 777 V2                   ║
 * ║          Ciclos Completos de Funcionalidad para Sistema de Eventos       ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Este script crea:
 * 1. Almacenes de diferentes tipos (materia prima, herramientas, decoración, etc.)
 * 2. Productos por categoría para cada tipo de evento
 * 3. Eventos con escenarios completos (boda, corporativo, congreso, social)
 * 4. Clientes variados con diferentes perfiles
 * 5. Ciclos completos: Provisión → Aprobación → Gasto → Pago
 * 6. Ingresos facturados y por facturar
 * 
 * @author Sistema de Diagnóstico ERP 777 V2
 * @date 2025-12-03
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// ============================================================================
// DATOS DE CONFIGURACIÓN
// ============================================================================

// Obtener company_id existente
async function getCompanyId() {
  const { data } = await supabase
    .from('almacenes_erp')
    .select('company_id')
    .limit(1)
    .single();
  return data?.company_id || '00000000-0000-0000-0000-000000000001';
}

// Obtener user_id existente (puede ser null)
async function getUserId() {
  return null; // Los campos creado_por pueden ser null
}

// ============================================================================
// 1. ALMACENES POR TIPO
// ============================================================================

const ALMACENES = [
  {
    nombre: 'Almacén Principal - Materiales',
    descripcion: 'Almacén central de materiales para construcción y montaje de eventos',
    ubicacion: 'Nave Industrial A - Zona Norte',
    tipo: 'principal',
    activo: true
  },
  {
    nombre: 'Bodega de Herramientas',
    descripcion: 'Herramientas eléctricas y manuales para montaje',
    ubicacion: 'Nave Industrial A - Área de Herramientas',
    tipo: 'principal',
    activo: true
  },
  {
    nombre: 'Almacén de Decoración',
    descripcion: 'Elementos decorativos, telas, flores artificiales, centros de mesa',
    ubicacion: 'Nave Industrial B - Decoración',
    tipo: 'principal',
    activo: true
  },
  {
    nombre: 'Almacén de Iluminación',
    descripcion: 'Equipos de iluminación, LEDs, reflectores, controladores',
    ubicacion: 'Nave Industrial B - Iluminación',
    tipo: 'principal',
    activo: true
  },
  {
    nombre: 'Almacén de Audio y Video',
    descripcion: 'Equipos de sonido, pantallas, proyectores, micrófonos',
    ubicacion: 'Nave Industrial C - Audio/Video',
    tipo: 'principal',
    activo: true
  },
  {
    nombre: 'Bodega de Mobiliario',
    descripcion: 'Mesas, sillas, carpas, tarimas, escenarios',
    ubicacion: 'Nave Industrial D - Mobiliario',
    tipo: 'principal',
    activo: true
  },
  {
    nombre: 'Almacén de Consumibles',
    descripcion: 'Artículos desechables, insumos de limpieza, papelería',
    ubicacion: 'Oficinas Centrales - Almacén',
    tipo: 'sucursal',
    activo: true
  },
  {
    nombre: 'Almacén en Tránsito',
    descripcion: 'Productos en movimiento entre almacenes o hacia eventos',
    ubicacion: 'Virtual - Tránsito',
    tipo: 'transito',
    activo: true
  }
];

// ============================================================================
// 2. PRODUCTOS POR CATEGORÍA
// ============================================================================

const PRODUCTOS = [
  // ILUMINACIÓN
  { clave: 'ILU-LED-001', nombre: 'LED Par 64 RGBW 54x3W', categoria: 'Iluminación', unidad: 'PZA', costo: 1500, precio_venta: 2500 },
  { clave: 'ILU-MOV-001', nombre: 'Cabeza Móvil Beam 230W', categoria: 'Iluminación', unidad: 'PZA', costo: 8500, precio_venta: 15000 },
  { clave: 'ILU-ESP-001', nombre: 'Esfera de Espejos 40cm', categoria: 'Iluminación', unidad: 'PZA', costo: 800, precio_venta: 1500 },
  { clave: 'ILU-CTRL-001', nombre: 'Controlador DMX 512 Canales', categoria: 'Iluminación', unidad: 'PZA', costo: 3500, precio_venta: 6000 },
  { clave: 'ILU-TRUS-001', nombre: 'Truss Aluminio 3m', categoria: 'Iluminación', unidad: 'PZA', costo: 2500, precio_venta: 4500 },
  { clave: 'ILU-SERIE-001', nombre: 'Serie LED Blanco Cálido 10m', categoria: 'Iluminación', unidad: 'PZA', costo: 150, precio_venta: 350 },
  { clave: 'ILU-SPOT-001', nombre: 'Spotlight LED 100W', categoria: 'Iluminación', unidad: 'PZA', costo: 1200, precio_venta: 2200 },
  
  // AUDIO
  { clave: 'AUD-BOC-001', nombre: 'Bocina Activa 15" 1000W', categoria: 'Audio', unidad: 'PZA', costo: 8000, precio_venta: 14000 },
  { clave: 'AUD-SUB-001', nombre: 'Subwoofer Activo 18" 1500W', categoria: 'Audio', unidad: 'PZA', costo: 12000, precio_venta: 20000 },
  { clave: 'AUD-MIC-001', nombre: 'Micrófono Inalámbrico UHF', categoria: 'Audio', unidad: 'PZA', costo: 2500, precio_venta: 4500 },
  { clave: 'AUD-MIX-001', nombre: 'Mezcladora Digital 16 Canales', categoria: 'Audio', unidad: 'PZA', costo: 15000, precio_venta: 25000 },
  { clave: 'AUD-AMP-001', nombre: 'Amplificador de Potencia 2x500W', categoria: 'Audio', unidad: 'PZA', costo: 6000, precio_venta: 10000 },
  
  // MOBILIARIO
  { clave: 'MOB-SILLA-001', nombre: 'Silla Tiffany Blanca', categoria: 'Mobiliario', unidad: 'PZA', costo: 180, precio_venta: 350 },
  { clave: 'MOB-SILLA-002', nombre: 'Silla Avant Garde Negra', categoria: 'Mobiliario', unidad: 'PZA', costo: 250, precio_venta: 450 },
  { clave: 'MOB-MESA-001', nombre: 'Mesa Redonda 1.5m 10 personas', categoria: 'Mobiliario', unidad: 'PZA', costo: 800, precio_venta: 1500 },
  { clave: 'MOB-MESA-002', nombre: 'Mesa Rectangular Banquete 2.4m', categoria: 'Mobiliario', unidad: 'PZA', costo: 600, precio_venta: 1200 },
  { clave: 'MOB-TARI-001', nombre: 'Tarima Modular 1x2m', categoria: 'Mobiliario', unidad: 'PZA', costo: 1500, precio_venta: 2800 },
  { clave: 'MOB-CARP-001', nombre: 'Carpa 10x20m con Estructura', categoria: 'Mobiliario', unidad: 'PZA', costo: 25000, precio_venta: 45000 },
  { clave: 'MOB-MANTEL-001', nombre: 'Mantel Redondo Premium', categoria: 'Mobiliario', unidad: 'PZA', costo: 120, precio_venta: 250 },
  
  // DECORACIÓN
  { clave: 'DEC-FLOR-001', nombre: 'Arreglo Floral Centro de Mesa', categoria: 'Decoración', unidad: 'PZA', costo: 350, precio_venta: 800 },
  { clave: 'DEC-TELA-001', nombre: 'Tela Organza Metro', categoria: 'Decoración', unidad: 'MTO', costo: 45, precio_venta: 120 },
  { clave: 'DEC-GLOB-001', nombre: 'Arco de Globos Orgánico', categoria: 'Decoración', unidad: 'PZA', costo: 1200, precio_venta: 3500 },
  { clave: 'DEC-VELA-001', nombre: 'Velas LED Flotantes (pack 12)', categoria: 'Decoración', unidad: 'PAQUETE', costo: 180, precio_venta: 400 },
  { clave: 'DEC-CORT-001', nombre: 'Cortina LED 3x3m', categoria: 'Decoración', unidad: 'PZA', costo: 800, precio_venta: 1800 },
  
  // HERRAMIENTAS
  { clave: 'HER-TAL-001', nombre: 'Taladro Inalámbrico 20V', categoria: 'Herramientas', unidad: 'PZA', costo: 2500, precio_venta: 0 },
  { clave: 'HER-ESCA-001', nombre: 'Escalera Telescópica 6m', categoria: 'Herramientas', unidad: 'PZA', costo: 3500, precio_venta: 0 },
  { clave: 'HER-SIERR-001', nombre: 'Sierra Circular 7 1/4', categoria: 'Herramientas', unidad: 'PZA', costo: 1800, precio_venta: 0 },
  { clave: 'HER-GATO-001', nombre: 'Gato Hidráulico Carretilla', categoria: 'Herramientas', unidad: 'PZA', costo: 4500, precio_venta: 0 },
  
  // MATERIALES
  { clave: 'MAT-CABLE-001', nombre: 'Cable Uso Rudo 3x12 (100m)', categoria: 'Material Eléctrico', unidad: 'ROLLO', costo: 2800, precio_venta: 4500 },
  { clave: 'MAT-CINTA-001', nombre: 'Cinta Gaffer Negra 50m', categoria: 'Material Eléctrico', unidad: 'PZA', costo: 180, precio_venta: 350 },
  { clave: 'MAT-EXT-001', nombre: 'Extensión Industrial 30m', categoria: 'Material Eléctrico', unidad: 'PZA', costo: 850, precio_venta: 1500 },
  { clave: 'MAT-CONEC-001', nombre: 'Conector Powercon Macho', categoria: 'Material Eléctrico', unidad: 'PZA', costo: 120, precio_venta: 250 },
  
  // VIDEO
  { clave: 'VID-PANT-001', nombre: 'Pantalla LED P3.9 Indoor (m2)', categoria: 'Video', unidad: 'M', costo: 15000, precio_venta: 28000 },
  { clave: 'VID-PROY-001', nombre: 'Proyector 10,000 Lumens', categoria: 'Video', unidad: 'PZA', costo: 25000, precio_venta: 45000 },
  { clave: 'VID-LIENZO-001', nombre: 'Lienzo Front/Back 4x3m', categoria: 'Video', unidad: 'PZA', costo: 3500, precio_venta: 7000 },
  { clave: 'VID-CAM-001', nombre: 'Cámara PTZ Full HD', categoria: 'Video', unidad: 'PZA', costo: 8000, precio_venta: 15000 },
  
  // CONSUMIBLES
  { clave: 'CON-PILAS-001', nombre: 'Pilas AA Alkalinas (pack 48)', categoria: 'Consumibles', unidad: 'PAQUETE', costo: 280, precio_venta: 500 },
  { clave: 'CON-CINTAP-001', nombre: 'Cinta Plástica Seguridad 500m', categoria: 'Consumibles', unidad: 'ROLLO', costo: 150, precio_venta: 300 },
  { clave: 'CON-ZIP-001', nombre: 'Cinchos Plásticos 30cm (100pz)', categoria: 'Consumibles', unidad: 'PAQUETE', costo: 85, precio_venta: 180 }
];

// ============================================================================
// 3. CLIENTES
// ============================================================================

const CLIENTES = [
  {
    razon_social: 'Corporativo Azteca SA de CV',
    nombre_comercial: 'Grupo Azteca',
    rfc: 'CAZ150120AB1',
    email: 'eventos@grupoazteca.com',
    telefono: '5551234567',
    direccion: 'Av. Reforma 500, CDMX',
    tipo_cliente: 'corporativo'
  },
  {
    razon_social: 'María García López',
    nombre_comercial: null,
    rfc: 'GALM850315MN2',
    email: 'maria.garcia@gmail.com',
    telefono: '5559876543',
    direccion: 'Col. Roma Norte 123, CDMX',
    tipo_cliente: 'particular'
  },
  {
    razon_social: 'Hoteles Premium de México SA de CV',
    nombre_comercial: 'Hoteles Premium',
    rfc: 'HPM100805KL9',
    email: 'eventos@hotelespremium.mx',
    telefono: '5552468135',
    direccion: 'Av. Insurgentes Sur 1500, CDMX',
    tipo_cliente: 'corporativo'
  },
  {
    razon_social: 'Universidad Nacional Autónoma de México',
    nombre_comercial: 'UNAM',
    rfc: 'UNA290715TA7',
    email: 'congresos@unam.mx',
    telefono: '5556228800',
    direccion: 'Ciudad Universitaria, Coyoacán, CDMX',
    tipo_cliente: 'institucional'
  },
  {
    razon_social: 'Roberto Hernández Martínez',
    nombre_comercial: null,
    rfc: 'HEMR900428XY3',
    email: 'roberto.hmtz@outlook.com',
    telefono: '5553691472',
    direccion: 'Col. Condesa 456, CDMX',
    tipo_cliente: 'particular'
  },
  {
    razon_social: 'Farmacéutica Global SA de CV',
    nombre_comercial: 'FarmaGlobal',
    rfc: 'FGL080910QR5',
    email: 'eventos@farmaglobal.com',
    telefono: '5557894561',
    direccion: 'Parque Industrial Toluca, Edo. Mex',
    tipo_cliente: 'corporativo'
  },
  {
    razon_social: 'Asociación Mexicana de Eventos AC',
    nombre_comercial: 'AME',
    rfc: 'AME151220PL8',
    email: 'direccion@ame.org.mx',
    telefono: '5551593574',
    direccion: 'WTC CDMX, Piso 12',
    tipo_cliente: 'institucional'
  },
  {
    razon_social: 'Ana Patricia Sánchez Ruiz',
    nombre_comercial: null,
    rfc: 'SARA880612BC4',
    email: 'ana.sanchez.r@gmail.com',
    telefono: '5558527419',
    direccion: 'Col. Del Valle 789, CDMX',
    tipo_cliente: 'particular'
  }
];

// ============================================================================
// 4. ESCENARIOS DE EVENTOS
// ============================================================================

const EVENTOS = [
  // BODA PREMIUM
  {
    clave_evento: 'BODA-2025-001',
    nombre_proyecto: 'Boda García-Hernández',
    descripcion: 'Boda premium con 350 invitados en hacienda, decoración floral, iluminación arquitectónica, banda en vivo y DJ',
    fecha_evento: '2025-03-15',
    fecha_fin: '2025-03-16',
    lugar: 'Hacienda San Gabriel, Morelos',
    numero_invitados: 350,
    prioridad: 'alta',
    fase_proyecto: 'preparacion',
    tipo_evento: 'Boda',
    estado: 'Confirmado',
    ingreso_estimado: 850000,
    ingresos: [
      { concepto: 'Anticipo 50%', monto: 425000, cobrado: true },
      { concepto: 'Segundo pago 30%', monto: 255000, cobrado: true },
      { concepto: 'Liquidación 20%', monto: 170000, cobrado: false }
    ],
    gastos: [
      { concepto: 'Renta de hacienda', monto: 120000, categoria: 'SP', pagado: true },
      { concepto: 'Catering 350 pax', monto: 175000, categoria: 'SP', pagado: true },
      { concepto: 'Decoración floral', monto: 85000, categoria: 'MAT', pagado: true },
      { concepto: 'Iluminación arquitectónica', monto: 45000, categoria: 'MAT', pagado: false },
      { concepto: 'Banda en vivo', monto: 35000, categoria: 'SP', pagado: false },
      { concepto: 'DJ y audio', monto: 25000, categoria: 'SP', pagado: false },
      { concepto: 'Transporte equipo', monto: 8500, categoria: 'COMB', pagado: true },
      { concepto: 'Personal montaje (8 personas)', monto: 16000, categoria: 'RH', pagado: false }
    ],
    provisiones: [
      { concepto: 'Fotografía y video', monto: 45000, categoria: 'SP' },
      { concepto: 'Pastel de bodas', monto: 15000, categoria: 'MAT' },
      { concepto: 'Pirotecnia', monto: 25000, categoria: 'SP' }
    ]
  },
  
  // EVENTO CORPORATIVO
  {
    clave_evento: 'CORP-2025-001',
    nombre_proyecto: 'Convención Anual Grupo Azteca',
    descripcion: 'Convención corporativa de 3 días con 500 asistentes, conferencias, área de exposición y cena de gala',
    fecha_evento: '2025-04-10',
    fecha_fin: '2025-04-12',
    lugar: 'Centro de Convenciones CDMX',
    numero_invitados: 500,
    prioridad: 'alta',
    fase_proyecto: 'cotizacion',
    tipo_evento: 'Corporativo',
    estado: 'Cotización Enviada',
    ingreso_estimado: 1500000,
    ingresos: [
      { concepto: 'Anticipo cotización', monto: 150000, cobrado: true }
    ],
    gastos: [
      { concepto: 'Renta centro convenciones', monto: 280000, categoria: 'SP', pagado: false }
    ],
    provisiones: [
      { concepto: 'Producción escenario principal', monto: 180000, categoria: 'MAT' },
      { concepto: 'Pantallas LED', monto: 250000, categoria: 'MAT' },
      { concepto: 'Audio profesional 3 días', monto: 120000, categoria: 'SP' },
      { concepto: 'Iluminación escénica', monto: 85000, categoria: 'MAT' },
      { concepto: 'Catering 3 días', monto: 350000, categoria: 'SP' },
      { concepto: 'Personal técnico', monto: 75000, categoria: 'RH' },
      { concepto: 'Transporte y viáticos', monto: 35000, categoria: 'COMB' }
    ]
  },
  
  // CONGRESO ACADÉMICO
  {
    clave_evento: 'CONG-2025-001',
    nombre_proyecto: 'Congreso Internacional de Medicina',
    descripcion: 'Congreso médico internacional con 1200 asistentes, 40 ponentes, área de exposición farmacéutica',
    fecha_evento: '2025-05-20',
    fecha_fin: '2025-05-23',
    lugar: 'Centro Médico Nacional, CDMX',
    numero_invitados: 1200,
    prioridad: 'alta',
    fase_proyecto: 'negociacion',
    tipo_evento: 'Congreso',
    estado: 'Negociación',
    ingreso_estimado: 2800000,
    ingresos: [],
    gastos: [],
    provisiones: [
      { concepto: 'Renta instalaciones 4 días', monto: 450000, categoria: 'SP' },
      { concepto: 'Producción audiovisual', monto: 380000, categoria: 'MAT' },
      { concepto: 'Sistema de traducción simultánea', monto: 120000, categoria: 'SP' },
      { concepto: 'Catering y coffee breaks', monto: 480000, categoria: 'SP' },
      { concepto: 'Stands de exposición', monto: 250000, categoria: 'MAT' },
      { concepto: 'Personal operativo', monto: 180000, categoria: 'RH' },
      { concepto: 'Señalética y branding', monto: 95000, categoria: 'MAT' },
      { concepto: 'Hospedaje ponentes', monto: 280000, categoria: 'SP' },
      { concepto: 'Transportación', monto: 85000, categoria: 'COMB' }
    ]
  },
  
  // FIESTA XV AÑOS
  {
    clave_evento: 'SOC-2025-001',
    nombre_proyecto: 'XV Años Valentina Sánchez',
    descripcion: 'Fiesta de XV años con 200 invitados, temática jardín encantado',
    fecha_evento: '2025-02-22',
    fecha_fin: '2025-02-22',
    lugar: 'Salón Jardines del Pedregal',
    numero_invitados: 200,
    prioridad: 'media',
    fase_proyecto: 'ejecucion',
    tipo_evento: 'Social',
    estado: 'En Curso',
    ingreso_estimado: 280000,
    ingresos: [
      { concepto: 'Anticipo 50%', monto: 140000, cobrado: true },
      { concepto: 'Segundo pago 30%', monto: 84000, cobrado: true },
      { concepto: 'Liquidación 20%', monto: 56000, cobrado: false }
    ],
    gastos: [
      { concepto: 'Renta salón', monto: 45000, categoria: 'SP', pagado: true },
      { concepto: 'Decoración temática', monto: 55000, categoria: 'MAT', pagado: true },
      { concepto: 'DJ y audio', monto: 18000, categoria: 'SP', pagado: true },
      { concepto: 'Iluminación LED', monto: 22000, categoria: 'MAT', pagado: true },
      { concepto: 'Servicio banquete 200 pax', monto: 70000, categoria: 'SP', pagado: true },
      { concepto: 'Transporte equipo', monto: 5500, categoria: 'COMB', pagado: true },
      { concepto: 'Montaje (4 personas)', monto: 8000, categoria: 'RH', pagado: true }
    ],
    provisiones: []
  },
  
  // EVENTO FINALIZADO CON GANANCIA
  {
    clave_evento: 'CORP-2024-015',
    nombre_proyecto: 'Lanzamiento Producto FarmaGlobal',
    descripcion: 'Evento de lanzamiento de nuevo medicamento con 150 médicos invitados',
    fecha_evento: '2024-11-15',
    fecha_fin: '2024-11-15',
    lugar: 'Hotel St. Regis, CDMX',
    numero_invitados: 150,
    prioridad: 'alta',
    fase_proyecto: 'finalizado',
    tipo_evento: 'Corporativo',
    estado: 'Finalizado',
    ingreso_estimado: 450000,
    ingresos: [
      { concepto: 'Pago total evento', monto: 450000, cobrado: true }
    ],
    gastos: [
      { concepto: 'Renta salón hotel', monto: 85000, categoria: 'SP', pagado: true },
      { concepto: 'Catering 150 pax', monto: 67500, categoria: 'SP', pagado: true },
      { concepto: 'Producción escenario', monto: 45000, categoria: 'MAT', pagado: true },
      { concepto: 'Pantalla LED 4x2m', monto: 35000, categoria: 'MAT', pagado: true },
      { concepto: 'Audio profesional', monto: 18000, categoria: 'SP', pagado: true },
      { concepto: 'Video mapping', monto: 28000, categoria: 'SP', pagado: true },
      { concepto: 'Personal técnico', monto: 12000, categoria: 'RH', pagado: true },
      { concepto: 'Transporte', monto: 4500, categoria: 'COMB', pagado: true }
    ],
    provisiones: []
  },
  
  // PROSPECTO
  {
    clave_evento: 'BODA-2025-002',
    nombre_proyecto: 'Boda Hernández-Martínez',
    descripcion: 'Solicitud de cotización para boda en playa, 200 invitados',
    fecha_evento: '2025-06-28',
    fecha_fin: '2025-06-28',
    lugar: 'Cancún, Quintana Roo',
    numero_invitados: 200,
    prioridad: 'media',
    fase_proyecto: 'prospecto',
    tipo_evento: 'Boda',
    estado: 'Prospecto',
    ingreso_estimado: 650000,
    ingresos: [],
    gastos: [],
    provisiones: []
  },
  
  // EVENTO CANCELADO
  {
    clave_evento: 'SOC-2025-002',
    nombre_proyecto: 'Graduación Escuela Técnica',
    descripcion: 'Evento cancelado por cambio de administración escolar',
    fecha_evento: '2025-07-15',
    fecha_fin: '2025-07-15',
    lugar: 'Auditorio Nacional',
    numero_invitados: 800,
    prioridad: 'baja',
    fase_proyecto: 'cancelado',
    tipo_evento: 'Social',
    estado: 'Cancelado',
    ingreso_estimado: 180000,
    ingresos: [],
    gastos: [],
    provisiones: []
  },
  
  // EVENTO EN PREPARACIÓN COMPLEJO
  {
    clave_evento: 'CORP-2025-002',
    nombre_proyecto: 'Festival Cultural AME 2025',
    descripcion: 'Festival de 2 días con 5000 asistentes, 3 escenarios simultáneos',
    fecha_evento: '2025-09-12',
    fecha_fin: '2025-09-13',
    lugar: 'Parque Bicentenario, CDMX',
    numero_invitados: 5000,
    prioridad: 'alta',
    fase_proyecto: 'preparacion',
    tipo_evento: 'Festival',
    estado: 'En Preparación',
    ingreso_estimado: 3500000,
    ingresos: [
      { concepto: 'Patrocinio Oro - Empresa A', monto: 500000, cobrado: true },
      { concepto: 'Patrocinio Plata - Empresa B', monto: 300000, cobrado: true },
      { concepto: 'Patrocinio Plata - Empresa C', monto: 300000, cobrado: false },
      { concepto: 'Venta de stands', monto: 450000, cobrado: true },
      { concepto: 'Venta de boletos estimada', monto: 1200000, cobrado: false }
    ],
    gastos: [
      { concepto: 'Permiso evento masivo', monto: 85000, categoria: 'SP', pagado: true },
      { concepto: 'Seguro de responsabilidad civil', monto: 120000, categoria: 'SP', pagado: true },
      { concepto: 'Servicios médicos', monto: 45000, categoria: 'SP', pagado: false },
      { concepto: 'Seguridad privada', monto: 180000, categoria: 'RH', pagado: false }
    ],
    provisiones: [
      { concepto: 'Escenario principal 20x15m', monto: 350000, categoria: 'MAT' },
      { concepto: 'Escenario secundario 12x10m', monto: 180000, categoria: 'MAT' },
      { concepto: 'Escenario acústico 8x6m', monto: 95000, categoria: 'MAT' },
      { concepto: 'Sistema de audio Line Array', monto: 280000, categoria: 'MAT' },
      { concepto: 'Pantallas LED (total 80m2)', monto: 480000, categoria: 'MAT' },
      { concepto: 'Iluminación escénica completa', monto: 220000, categoria: 'MAT' },
      { concepto: 'Carpas y estructuras', monto: 350000, categoria: 'MAT' },
      { concepto: 'Sanitarios portátiles', monto: 85000, categoria: 'SP' },
      { concepto: 'Generadores eléctricos', monto: 120000, categoria: 'SP' },
      { concepto: 'Personal operativo 2 días', monto: 280000, categoria: 'RH' },
      { concepto: 'Catering staff', monto: 95000, categoria: 'SP' },
      { concepto: 'Transportación y logística', monto: 150000, categoria: 'COMB' }
    ]
  }
];

// ============================================================================
// FUNCIONES DE CREACIÓN
// ============================================================================

async function crearAlmacenes(companyId) {
  console.log('\n📦 Creando almacenes...');
  const creados = [];
  
  for (const almacen of ALMACENES) {
    const { data, error } = await supabase
      .from('almacenes_erp')
      .insert({ ...almacen, company_id: companyId })
      .select()
      .single();
    
    if (error) {
      if (error.message.includes('duplicate')) {
        console.log(`   ⏭️  ${almacen.nombre} ya existe`);
      } else {
        console.log(`   ❌ Error ${almacen.nombre}:`, error.message);
      }
    } else {
      console.log(`   ✅ ${almacen.nombre}`);
      creados.push(data);
    }
  }
  
  return creados;
}

async function crearProductos(companyId, almacenId) {
  console.log('\n📝 Creando productos...');
  let creados = 0;
  let existentes = 0;
  
  for (const producto of PRODUCTOS) {
    // Verificar si ya existe por clave
    const { data: existe } = await supabase
      .from('productos_erp')
      .select('id')
      .eq('clave', producto.clave)
      .single();
    
    if (existe) {
      existentes++;
      continue;
    }
    
    const { error } = await supabase
      .from('productos_erp')
      .insert({
        ...producto,
        company_id: companyId,
        almacen_id: almacenId,
        stock_minimo: 5,
        stock_maximo: 100,
        activo: true
      });
    
    if (error) {
      console.log(`   ❌ Error ${producto.clave}:`, error.message);
    } else {
      creados++;
    }
  }
  
  console.log(`   ✅ ${creados} productos creados, ${existentes} ya existían`);
  return creados;
}

async function crearClientes(companyId) {
  console.log('\n👥 Creando clientes...');
  const creados = [];
  
  for (const cliente of CLIENTES) {
    // Verificar si ya existe por RFC
    const { data: existe } = await supabase
      .from('evt_clientes_erp')
      .select('id')
      .eq('rfc', cliente.rfc)
      .single();
    
    if (existe) {
      console.log(`   ⏭️  ${cliente.razon_social} ya existe`);
      creados.push(existe);
      continue;
    }
    
    const { data, error } = await supabase
      .from('evt_clientes_erp')
      .insert({ ...cliente, company_id: companyId })
      .select()
      .single();
    
    if (error) {
      console.log(`   ❌ Error ${cliente.razon_social}:`, error.message);
    } else {
      console.log(`   ✅ ${cliente.razon_social}`);
      creados.push(data);
    }
  }
  
  return creados;
}

async function obtenerEstados() {
  const { data } = await supabase
    .from('evt_estados_erp')
    .select('id, nombre');
  return data || [];
}

async function obtenerTiposEvento() {
  const { data } = await supabase
    .from('evt_tipos_evento_erp')
    .select('id, nombre');
  return data || [];
}

async function obtenerCategorias() {
  const { data } = await supabase
    .from('cat_categorias_gasto')
    .select('id, clave');
  return data || [];
}

async function crearEventosConCiclosCompletos(companyId, clientes, estados, tipos, categorias, userId) {
  console.log('\n🎉 Creando eventos con ciclos completos...');
  
  for (const eventoData of EVENTOS) {
    // Obtener IDs necesarios
    const estadoId = estados.find(e => e.nombre === eventoData.estado)?.id;
    const tipoId = tipos.find(t => t.nombre === eventoData.tipo_evento)?.id;
    const clienteId = clientes[Math.floor(Math.random() * clientes.length)]?.id;
    
    // Verificar si el evento ya existe
    const { data: existe } = await supabase
      .from('evt_eventos_erp')
      .select('id')
      .eq('clave_evento', eventoData.clave_evento)
      .single();
    
    if (existe) {
      console.log(`   ⏭️  ${eventoData.clave_evento} ya existe`);
      continue;
    }
    
    // Crear evento
    const { data: evento, error: errorEvento } = await supabase
      .from('evt_eventos_erp')
      .insert({
        clave_evento: eventoData.clave_evento,
        nombre_proyecto: eventoData.nombre_proyecto,
        descripcion: eventoData.descripcion,
        fecha_evento: eventoData.fecha_evento,
        fecha_fin: eventoData.fecha_fin,
        lugar: eventoData.lugar,
        numero_invitados: eventoData.numero_invitados,
        prioridad: eventoData.prioridad,
        fase_proyecto: eventoData.fase_proyecto,
        estado_id: estadoId,
        tipo_evento_id: tipoId,
        cliente_id: clienteId,
        company_id: companyId,
        ingreso_estimado: eventoData.ingreso_estimado,
        creado_por: userId
      })
      .select()
      .single();
    
    if (errorEvento) {
      console.log(`   ❌ Error evento ${eventoData.clave_evento}:`, errorEvento.message);
      continue;
    }
    
    console.log(`   ✅ Evento: ${eventoData.clave_evento} - ${eventoData.nombre_proyecto}`);
    
    // Crear ingresos
    for (const ingreso of eventoData.ingresos) {
      const subtotal = ingreso.monto / 1.16;
      const iva = ingreso.monto - subtotal;
      
      await supabase
        .from('evt_ingresos_erp')
        .insert({
          evento_id: evento.id,
          cliente_id: clienteId,
          company_id: companyId,
          concepto: ingreso.concepto,
          subtotal: subtotal,
          iva: iva,
          total: ingreso.monto,
          cobrado: ingreso.cobrado,
          fecha_ingreso: eventoData.fecha_evento,
          creado_por: userId
        });
    }
    if (eventoData.ingresos.length > 0) {
      console.log(`      💰 ${eventoData.ingresos.length} ingresos creados`);
    }
    
    // Crear gastos
    for (const gasto of eventoData.gastos) {
      const categoriaId = categorias.find(c => c.clave === gasto.categoria)?.id;
      const subtotal = gasto.monto / 1.16;
      const iva = gasto.monto - subtotal;
      
      await supabase
        .from('evt_gastos_erp')
        .insert({
          evento_id: evento.id,
          company_id: companyId,
          categoria_id: categoriaId,
          concepto: gasto.concepto,
          subtotal: subtotal,
          iva: iva,
          total: gasto.monto,
          pagado: gasto.pagado,
          fecha_gasto: eventoData.fecha_evento,
          creado_por: userId
        });
    }
    if (eventoData.gastos.length > 0) {
      console.log(`      💸 ${eventoData.gastos.length} gastos creados`);
    }
    
    // Crear provisiones
    for (const provision of eventoData.provisiones) {
      const categoriaId = categorias.find(c => c.clave === provision.categoria)?.id;
      const subtotal = provision.monto / 1.16;
      const iva = provision.monto - subtotal;
      
      await supabase
        .from('evt_provisiones_erp')
        .insert({
          evento_id: evento.id,
          company_id: companyId,
          categoria_id: categoriaId,
          concepto: provision.concepto,
          subtotal: subtotal,
          iva: iva,
          total: provision.monto,
          activo: true,
          creado_por: userId
        });
    }
    if (eventoData.provisiones.length > 0) {
      console.log(`      📋 ${eventoData.provisiones.length} provisiones creadas`);
    }
  }
}

async function convertirProvisionesAGastos(companyId, userId) {
  console.log('\n🔄 Convirtiendo provisiones a gastos (ciclo completo)...');
  
  // Obtener provisiones activas de eventos confirmados o en ejecución
  const { data: provisiones, error } = await supabase
    .from('evt_provisiones_erp')
    .select(`
      *,
      evt_eventos_erp!inner(estado_id, clave_evento, nombre_proyecto)
    `)
    .eq('activo', true)
    .eq('company_id', companyId)
    .limit(5);  // Solo convertir 5 para demostrar el flujo
  
  if (error) {
    console.log('   ❌ Error obteniendo provisiones:', error.message);
    return;
  }
  
  let convertidas = 0;
  for (const provision of provisiones || []) {
    // Crear gasto desde provisión
    const { error: errorGasto } = await supabase
      .from('evt_gastos_erp')
      .insert({
        evento_id: provision.evento_id,
        company_id: companyId,
        categoria_id: provision.categoria_id,
        concepto: `[Convertido] ${provision.concepto}`,
        subtotal: provision.subtotal,
        iva: provision.iva,
        total: provision.total,
        pagado: false,
        fecha_gasto: new Date().toISOString().split('T')[0],
        provision_id: provision.id,
        creado_por: userId
      });
    
    if (errorGasto) {
      console.log(`   ❌ Error convirtiendo provisión:`, errorGasto.message);
      continue;
    }
    
    // Desactivar provisión
    await supabase
      .from('evt_provisiones_erp')
      .update({ activo: false })
      .eq('id', provision.id);
    
    convertidas++;
    console.log(`   ✅ Provisión → Gasto: ${provision.concepto}`);
  }
  
  console.log(`   📊 ${convertidas} provisiones convertidas a gastos`);
}

async function crearMovimientosInventario(companyId, userId) {
  console.log('\n📦 Creando movimientos de inventario...');
  
  // Obtener productos y almacén
  const { data: productos } = await supabase
    .from('productos_erp')
    .select('id, nombre, clave')
    .eq('company_id', companyId)
    .limit(10);
  
  const { data: almacenes } = await supabase
    .from('almacenes_erp')
    .select('id, nombre')
    .eq('company_id', companyId)
    .limit(3);
  
  if (!productos?.length || !almacenes?.length) {
    console.log('   ⚠️  No hay productos o almacenes para crear movimientos');
    return;
  }
  
  let creados = 0;
  for (const producto of productos) {
    const almacen = almacenes[Math.floor(Math.random() * almacenes.length)];
    
    // Entrada inicial
    await supabase
      .from('movimientos_inventario_erp')
      .insert({
        producto_id: producto.id,
        almacen_id: almacen.id,
        tipo: 'entrada',
        cantidad: Math.floor(Math.random() * 50) + 10,
        concepto: 'Inventario inicial',
        referencia: `INV-INIT-${Date.now()}`,
        user_id: userId
      });
    
    creados++;
  }
  
  console.log(`   ✅ ${creados} movimientos de inventario creados`);
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║         🚀 POBLANDO SISTEMA ERP 777 V2 - DATOS COMPLETOS        ║');
  console.log('║                    Ciclos de Funcionalidad Completos             ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  
  try {
    // Obtener IDs base
    const companyId = await getCompanyId();
    const userId = await getUserId();
    
    if (!companyId) {
      console.log('\n❌ Error: No se encontró company_id');
      return;
    }
    
    console.log(`\n🔑 Company ID: ${companyId}`);
    console.log(`👤 User ID: ${userId || 'null (permitido)'}`);

    
    // Obtener catálogos
    const estados = await obtenerEstados();
    const tipos = await obtenerTiposEvento();
    const categorias = await obtenerCategorias();
    
    console.log(`\n📚 Catálogos cargados:`);
    console.log(`   Estados: ${estados.length}`);
    console.log(`   Tipos de evento: ${tipos.length}`);
    console.log(`   Categorías de gasto: ${categorias.length}`);
    
    // 1. Crear almacenes
    const almacenesCreados = await crearAlmacenes(companyId);
    
    // Obtener almacén principal para productos
    const { data: almacenPrincipal } = await supabase
      .from('almacenes_erp')
      .select('id')
      .eq('company_id', companyId)
      .limit(1)
      .single();
    
    // 2. Crear productos
    await crearProductos(companyId, almacenPrincipal?.id);
    
    // 3. Crear clientes
    const clientesCreados = await crearClientes(companyId);
    
    // 4. Crear eventos con ingresos, gastos y provisiones
    await crearEventosConCiclosCompletos(companyId, clientesCreados, estados, tipos, categorias, userId);
    
    // 5. Ciclo: Convertir provisiones a gastos
    await convertirProvisionesAGastos(companyId, userId);
    
    // 6. Crear movimientos de inventario
    await crearMovimientosInventario(companyId, userId);
    
    // RESUMEN FINAL
    console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                    📊 RESUMEN DE POBLACIÓN                       ║');
    console.log('╠═══════════════════════════════════════════════════════════════════╣');
    
    // Contar totales
    const { count: totalAlmacenes } = await supabase.from('almacenes_erp').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
    const { count: totalProductos } = await supabase.from('productos_erp').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
    const { count: totalClientes } = await supabase.from('evt_clientes_erp').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
    const { count: totalEventos } = await supabase.from('evt_eventos_erp').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
    const { count: totalIngresos } = await supabase.from('evt_ingresos_erp').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
    const { count: totalGastos } = await supabase.from('evt_gastos_erp').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
    const { count: totalProvisiones } = await supabase.from('evt_provisiones_erp').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
    const { count: totalMovimientos } = await supabase.from('movimientos_inventario_erp').select('*', { count: 'exact', head: true });
    
    console.log(`║  📦 Almacenes:      ${String(totalAlmacenes).padStart(5)}                                    ║`);
    console.log(`║  📝 Productos:      ${String(totalProductos).padStart(5)}                                    ║`);
    console.log(`║  👥 Clientes:       ${String(totalClientes).padStart(5)}                                    ║`);
    console.log(`║  🎉 Eventos:        ${String(totalEventos).padStart(5)}                                    ║`);
    console.log(`║  💰 Ingresos:       ${String(totalIngresos).padStart(5)}                                    ║`);
    console.log(`║  💸 Gastos:         ${String(totalGastos).padStart(5)}                                    ║`);
    console.log(`║  📋 Provisiones:    ${String(totalProvisiones).padStart(5)}                                    ║`);
    console.log(`║  📦 Movimientos:    ${String(totalMovimientos).padStart(5)}                                    ║`);
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
    
    console.log('\n✅ Población completada exitosamente');
    
  } catch (error) {
    console.error('\n❌ Error general:', error);
  }
}

main();
