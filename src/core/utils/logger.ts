/**
 * Sistema de logging condicional basado en variables de entorno
 * En producción, los logs se deshabilitan automáticamente
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  prefix?: string;
}

class Logger {
  private config: LoggerConfig;
  private levels: Record<LogLevel, number> = {
    debug: 0,
    log: 1,
    info: 2,
    warn: 3,
    error: 4,
  };

  constructor(config?: Partial<LoggerConfig>) {
    // En producción, los logs están deshabilitados por defecto
    const isDevelopment = import.meta.env.VITE_APP_ENV === 'development';
    const consoleLogsEnabled = import.meta.env.VITE_ENABLE_CONSOLE_LOGS === 'true';

    this.config = {
      enabled: isDevelopment && consoleLogsEnabled,
      minLevel: isDevelopment ? 'debug' : 'error',
      prefix: '[MADE ERP]',
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return this.levels[level] >= this.levels[this.config.minLevel];
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): any[] {
    const timestamp = new Date().toISOString();
    const prefix = this.config.prefix || '';
    const levelTag = `[${level.toUpperCase()}]`;

    return [`${prefix} ${levelTag} ${timestamp}:`, message, ...args];
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(...this.formatMessage('debug', message, ...args));
    }
  }

  log(message: string, ...args: any[]): void {
    if (this.shouldLog('log')) {
      console.log(...this.formatMessage('log', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(...this.formatMessage('info', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...this.formatMessage('warn', message, ...args));
    }
  }

  error(message: string, error?: Error | unknown, ...args: any[]): void {
    if (this.shouldLog('error')) {
      const errorDetails = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error;
      console.error(...this.formatMessage('error', message, errorDetails, ...args));
    }
  }

  /**
   * Crea un logger con un contexto específico
   * Útil para identificar de qué módulo provienen los logs
   */
  createContextLogger(context: string): Logger {
    return new Logger({
      ...this.config,
      prefix: `${this.config.prefix} [${context}]`,
    });
  }

  /**
   * Registra el tiempo de ejecución de una función
   */
  time(label: string): void {
    if (this.config.enabled) {
      console.time(`${this.config.prefix} ${label}`);
    }
  }

  timeEnd(label: string): void {
    if (this.config.enabled) {
      console.timeEnd(`${this.config.prefix} ${label}`);
    }
  }

  /**
   * Agrupa logs relacionados
   */
  group(label: string): void {
    if (this.config.enabled) {
      console.group(`${this.config.prefix} ${label}`);
    }
  }

  groupEnd(): void {
    if (this.config.enabled) {
      console.groupEnd();
    }
  }

  /**
   * Registra una tabla de datos (útil para debugging)
   */
  table(data: any): void {
    if (this.config.enabled && this.shouldLog('debug')) {
      console.table(data);
    }
  }
}

// Exportar instancia global
export const logger = new Logger();

// Exportar clase para crear loggers personalizados
export { Logger };

// Helpers para módulos específicos
export const workflowLogger = logger.createContextLogger('Workflow');
export const authLogger = logger.createContextLogger('Auth');
export const fileLogger = logger.createContextLogger('FileUpload');
export const dbLogger = logger.createContextLogger('Database');
export const apiLogger = logger.createContextLogger('API');
