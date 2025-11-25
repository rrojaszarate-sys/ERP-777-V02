export const APP_CONFIG = {
  name: 'MADE ERP',
  version: 'v2.0',
  description: 'Sistema Empresarial para Gestión de Eventos',
  company: 'MADE Events SA de CV',
  primaryColor: '#74F1C8',
  isDevelopment: import.meta.env.VITE_APP_ENV === 'development',
  isProduction: import.meta.env.VITE_APP_ENV === 'production',
};

export const MEXICAN_CONFIG = {
  ivaRate: parseFloat(import.meta.env.VITE_IVA_RATE) || 16,
  currency: import.meta.env.VITE_CURRENCY || 'MXN',
  defaultCreditDays: parseInt(import.meta.env.VITE_DEFAULT_CREDIT_DAYS) || 30,
  locale: 'es-MX',
  timezone: 'America/Mexico_City',
};

export const UI_CONFIG = {
  dashboardRefreshInterval: parseInt(import.meta.env.VITE_DASHBOARD_REFRESH_INTERVAL) * 1000 || 30000,
  debounceDelay: 300,
  animationDuration: 0.3,
  pageSize: 25,
  maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE) || 10485760, // 10MB default
  allowedFileTypes: ['.pdf', '.jpg', '.jpeg', '.png'],
  expenseFileTypes: ['.pdf', '.jpg', '.jpeg', '.png'],
  incomeFileTypes: ['.pdf'], // Only PDF for invoices
  maxFileSizeExpense: 5242880, // 5MB for expense receipts
  maxFileSizeIncome: 10485760, // 10MB for invoice PDFs
};

export const BUSINESS_RULES = {
  // Control de cuentas bancarias por tipo de transacción
  limitBankAccountsForExpenses: import.meta.env.VITE_LIMIT_BANK_ACCOUNTS_FOR_EXPENSES === 'true',
  limitBankAccountsForIncomes: import.meta.env.VITE_LIMIT_BANK_ACCOUNTS_FOR_INCOMES === 'true',
  // Límites de IDs de cuentas bancarias
  maxBankAccountIdForExpenses: 23, // Solo cuentas con id <= 23 para gastos
  minBankAccountIdForIncomes: 24, // Solo cuentas con id >= 24 para ingresos
};

export const PERMISSION_MATRIX = {
  'Administrador': [
    '*.*.*.*',
    'usuarios.create.*.*',
    'usuarios.delete.*.*',
    'system.config.*.*',
    'system.admin.database.*',
    'gastos.delete.hard.*',
    'reportes.schedule.*.*'
  ],
  'Ejecutivo': [
    'dashboard.read.*.*',
    'eventos.create.*.*',
    'eventos.update.*.*',
    'eventos.read.*.*',
    'clientes.create.*.*',
    'clientes.update.*.*',
    'gastos.create.*.*',
    'gastos.update.*.*',
    'gastos.delete.soft.*',
    'ingresos.create.*.*',
    'ingresos.update.*.*',
    'facturacion.update.*.*',
    'reportes.export.*.*'
  ],
  'Visualizador': [
    'dashboard.read.*.*',
    'eventos.read.*.*',
    'clientes.read.*.*',
    'gastos.read.*.*',
    'ingresos.read.*.*',
    'facturacion.read.*.*',
    'reportes.read.*.*'
  ]
};

export const REGIMEN_FISCAL_OPTIONS = [
  { value: '601', label: '601 - General de Ley Personas Morales' },
  { value: '612', label: '612 - Persona Física con Actividades Empresariales' },
  { value: '621', label: '621 - Persona Física con Actividades Profesionales' },
  { value: '622', label: '622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
  { value: '623', label: '623 - Optativo para Grupos de Sociedades' },
  { value: '624', label: '624 - Coordinados' },
  { value: '628', label: '628 - Hidrocarburos' }
];

export const USO_CFDI_OPTIONS = [
  { value: 'G01', label: 'G01 - Adquisición de mercancías' },
  { value: 'G02', label: 'G02 - Devoluciones, descuentos o bonificaciones' },
  { value: 'G03', label: 'G03 - Gastos en general' },
  { value: 'I01', label: 'I01 - Construcciones' },
  { value: 'I02', label: 'I02 - Mobiliario y equipo de oficina por inversiones' },
  { value: 'P01', label: 'P01 - Por definir' }
];

export const METODO_PAGO_OPTIONS = [
  { value: 'PUE', label: 'PUE - Pago en una sola exhibición' },
  { value: 'PPD', label: 'PPD - Pago en parcialidades o diferido' }
];

export const FORMA_PAGO_OPTIONS = [
  { value: '01', label: '01 - Efectivo' },
  { value: '02', label: '02 - Cheque nominativo' },
  { value: '03', label: '03 - Transferencia electrónica de fondos' },
  { value: '04', label: '04 - Tarjeta de crédito' },
  { value: '28', label: '28 - Tarjeta de débito' }
];