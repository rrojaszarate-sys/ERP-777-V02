import { MEXICAN_CONFIG } from '../../core/config/constants';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat(MEXICAN_CONFIG.locale, {
    style: 'currency',
    currency: MEXICAN_CONFIG.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

export const formatDate = (date: string | Date, includeTime: boolean = false): string => {
  if (!date) return '';
  
  const d = new Date(date);
  
  if (includeTime) {
    return d.toLocaleString(MEXICAN_CONFIG.locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return d.toLocaleDateString(MEXICAN_CONFIG.locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${(value || 0).toFixed(decimals)}%`;
};

export const formatNumber = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat(MEXICAN_CONFIG.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value || 0);
};

export const getMonthName = (month: number): string => {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[month - 1] || '';
};

export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export const getFileTypeIcon = (mimeType: string): string => {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  return '📎';
};

export const isValidFileType = (fileName: string, allowedTypes: string[]): boolean => {
  const fileExtension = '.' + (fileName.split('.').pop()?.toLowerCase() || '');
  return allowedTypes.includes(fileExtension);
};

// Convierte una fecha en formato DD/MM/YYYY a YYYY-MM-DD para inputs de tipo date
export const formatDateForInput = (dateString: string): string => {
  if (!dateString) return '';
  
  // Si ya está en formato YYYY-MM-DD, devolverlo tal como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Si está en formato DD/MM/YYYY o similar, convertirlo
  const datePattern = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/;
  const match = dateString.match(datePattern);
  
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Intentar parsearlo como fecha normal
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Ignorar errores de parsing
  }
  
  return '';
};