/**
 * 🔧 Hook useConfiguracionERP
 *
 * Maneja la configuración de visualización del módulo Eventos-ERP.
 * Guarda preferencias en localStorage para persistencia entre sesiones.
 *
 * Configuraciones disponibles:
 * - Dashboard: mostrar gauge, mostrar desglose, formato números
 * - Tabla: columnas visibles, gauge inline, filas por página
 * - Semáforo: umbrales de colores personalizables
 */

import { useState, useEffect, useCallback } from 'react';

// Clave para localStorage
const STORAGE_KEY = 'eventos-erp-config';

/**
 * Estructura de configuración del módulo Eventos-ERP
 */
export interface ConfiguracionEventosERP {
  // Configuración del Dashboard
  dashboard: {
    mostrarGauge: boolean;
    mostrarDesglose: boolean;
    formatoNumeros: 'normal' | 'miles' | 'millones';
    mostrarCentavos: boolean;
  };

  // Configuración de la Tabla
  tabla: {
    columnasVisibles: string[];
    mostrarGaugeInline: boolean;
    filasPorPagina: number;
    expandirAutomatico: boolean;
  };

  // Configuración del Semáforo de Utilidad
  semaforo: {
    verde: number;     // Default: 35%
    amarillo: number;  // Default: 25%
    rojo: number;      // Default: 1%
  };

  // Configuración general
  general: {
    animacionesActivas: boolean;
    temaOscuro: boolean;
  };
}

/**
 * Configuración por defecto
 */
const defaultConfig: ConfiguracionEventosERP = {
  dashboard: {
    mostrarGauge: true,
    mostrarDesglose: false,
    formatoNumeros: 'miles',
    mostrarCentavos: false
  },
  tabla: {
    columnasVisibles: [
      'clave_evento',
      'nombre_proyecto',
      'cliente',
      'estado',
      'ingresos',
      'gastos',
      'provisiones',
      'utilidad'
    ],
    mostrarGaugeInline: true,
    filasPorPagina: 20,
    expandirAutomatico: false
  },
  semaforo: {
    verde: 35,
    amarillo: 25,
    rojo: 1
  },
  general: {
    animacionesActivas: true,
    temaOscuro: false
  }
};

/**
 * Cargar configuración desde localStorage
 */
function loadConfig(): ConfiguracionEventosERP {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge con defaults para asegurar todas las propiedades
      return {
        dashboard: { ...defaultConfig.dashboard, ...parsed.dashboard },
        tabla: { ...defaultConfig.tabla, ...parsed.tabla },
        semaforo: { ...defaultConfig.semaforo, ...parsed.semaforo },
        general: { ...defaultConfig.general, ...parsed.general }
      };
    }
  } catch (error) {
    console.error('Error loading config from localStorage:', error);
  }
  return defaultConfig;
}

/**
 * Guardar configuración en localStorage
 */
function saveConfig(config: ConfiguracionEventosERP): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving config to localStorage:', error);
  }
}

/**
 * Hook para manejar configuración de Eventos-ERP
 */
export function useConfiguracionERP() {
  const [config, setConfigState] = useState<ConfiguracionEventosERP>(loadConfig);

  // Sincronizar cambios entre tabs/ventanas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setConfigState(JSON.parse(e.newValue));
        } catch (error) {
          console.error('Error parsing storage change:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  /**
   * Actualizar configuración (parcial)
   */
  const setConfig = useCallback((updates: Partial<ConfiguracionEventosERP>) => {
    setConfigState(prev => {
      const newConfig = {
        dashboard: { ...prev.dashboard, ...updates.dashboard },
        tabla: { ...prev.tabla, ...updates.tabla },
        semaforo: { ...prev.semaforo, ...updates.semaforo },
        general: { ...prev.general, ...updates.general }
      };
      saveConfig(newConfig);
      return newConfig;
    });
  }, []);

  /**
   * Restablecer configuración a valores por defecto
   */
  const resetConfig = useCallback(() => {
    setConfigState(defaultConfig);
    saveConfig(defaultConfig);
  }, []);

  /**
   * Actualizar una sección específica
   */
  const updateDashboard = useCallback((updates: Partial<ConfiguracionEventosERP['dashboard']>) => {
    setConfig({ dashboard: updates });
  }, [setConfig]);

  const updateTabla = useCallback((updates: Partial<ConfiguracionEventosERP['tabla']>) => {
    setConfig({ tabla: updates });
  }, [setConfig]);

  const updateSemaforo = useCallback((updates: Partial<ConfiguracionEventosERP['semaforo']>) => {
    setConfig({ semaforo: updates });
  }, [setConfig]);

  const updateGeneral = useCallback((updates: Partial<ConfiguracionEventosERP['general']>) => {
    setConfig({ general: updates });
  }, [setConfig]);

  /**
   * Toggle para valores booleanos
   */
  const toggleMostrarGauge = useCallback(() => {
    updateDashboard({ mostrarGauge: !config.dashboard.mostrarGauge });
  }, [config.dashboard.mostrarGauge, updateDashboard]);

  const toggleMostrarDesglose = useCallback(() => {
    updateDashboard({ mostrarDesglose: !config.dashboard.mostrarDesglose });
  }, [config.dashboard.mostrarDesglose, updateDashboard]);

  const toggleGaugeInline = useCallback(() => {
    updateTabla({ mostrarGaugeInline: !config.tabla.mostrarGaugeInline });
  }, [config.tabla.mostrarGaugeInline, updateTabla]);

  const toggleCentavos = useCallback(() => {
    updateDashboard({ mostrarCentavos: !config.dashboard.mostrarCentavos });
  }, [config.dashboard.mostrarCentavos, updateDashboard]);

  /**
   * Cambiar formato de números
   */
  const setFormatoNumeros = useCallback((formato: 'normal' | 'miles' | 'millones') => {
    updateDashboard({ formatoNumeros: formato });
  }, [updateDashboard]);

  /**
   * Obtener color del semáforo según margen
   */
  const getSemaforoColor = useCallback((margen: number): 'verde' | 'amarillo' | 'rojo' | 'gris' => {
    if (margen >= config.semaforo.verde) return 'verde';
    if (margen >= config.semaforo.amarillo) return 'amarillo';
    if (margen >= config.semaforo.rojo) return 'rojo';
    return 'gris';
  }, [config.semaforo]);

  /**
   * Obtener etiqueta del semáforo
   */
  const getSemaforoEtiqueta = useCallback((margen: number): string => {
    const color = getSemaforoColor(margen);
    switch (color) {
      case 'verde': return 'Excelente';
      case 'amarillo': return 'Regular';
      case 'rojo': return 'Bajo';
      default: return 'Ninguno';
    }
  }, [getSemaforoColor]);

  return {
    // Estado
    config,

    // Acciones generales
    setConfig,
    resetConfig,

    // Acciones por sección
    updateDashboard,
    updateTabla,
    updateSemaforo,
    updateGeneral,

    // Toggles rápidos
    toggleMostrarGauge,
    toggleMostrarDesglose,
    toggleGaugeInline,
    toggleCentavos,

    // Utilidades
    setFormatoNumeros,
    getSemaforoColor,
    getSemaforoEtiqueta,

    // Valores por defecto (para referencia)
    defaultConfig
  };
}

export default useConfiguracionERP;
