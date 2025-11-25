// Obtener variables de entorno de forma segura
const getEnvVar = (key: string, defaultValue: string = '') => {
  try {
    return (import.meta as any).env?.[key] || defaultValue;
  } catch {
    return defaultValue;
  }
};

// Configuración del sistema de temas
export const THEME_CONFIG = {
  // Feature flags
  enableThemePicker: getEnvVar('VITE_ENABLE_THEME_PICKER', 'true') !== 'false',
  enableDarkMode: getEnvVar('VITE_ENABLE_DARK_MODE', 'true') !== 'false',
  enableCustomThemes: getEnvVar('VITE_ENABLE_CUSTOM_THEMES', 'false') === 'true',
  
  // Configuración de persistencia
  storageKeys: {
    palette: 'theme-palette',
    mode: 'theme-mode',
    customThemes: 'custom-themes'
  },
  
  // Configuración de transiciones
  transitionDuration: 150,
  enableTransitions: getEnvVar('VITE_DISABLE_THEME_TRANSITIONS', 'false') !== 'true',
  
  // Configuración por defecto
  defaultPalette: getEnvVar('VITE_DEFAULT_THEME_PALETTE', 'mint'),
  defaultMode: getEnvVar('VITE_DEFAULT_THEME_MODE', 'light'),
  
  // Configuración de retrocompatibilidad
  fallbackToMint: true,
  preserveLegacyColors: true
};

// Validación de configuración
export const isValidThemeConfig = (config: any): boolean => {
  try {
    return (
      typeof config.enableThemePicker === 'boolean' &&
      typeof config.enableDarkMode === 'boolean' &&
      typeof config.storageKeys === 'object' &&
      typeof config.defaultPalette === 'string' &&
      typeof config.defaultMode === 'string'
    );
  } catch {
    return false;
  }
};

// Funciones de compatibilidad
export const migrateFromLegacyTheme = () => {
  // Migrar desde configuraciones antiguas si existen
  const legacyTheme = localStorage.getItem('legacy-theme');
  const legacyMode = localStorage.getItem('legacy-mode');
  
  if (legacyTheme && !localStorage.getItem(THEME_CONFIG.storageKeys.palette)) {
    localStorage.setItem(THEME_CONFIG.storageKeys.palette, legacyTheme);
  }
  
  if (legacyMode && !localStorage.getItem(THEME_CONFIG.storageKeys.mode)) {
    localStorage.setItem(THEME_CONFIG.storageKeys.mode, legacyMode);
  }
};

// Función para resetear tema a valores por defecto
export const resetThemeToDefault = () => {
  localStorage.setItem(THEME_CONFIG.storageKeys.palette, THEME_CONFIG.defaultPalette);
  localStorage.setItem(THEME_CONFIG.storageKeys.mode, THEME_CONFIG.defaultMode);
  
  // Dispatch evento de cambio
  window.dispatchEvent(new CustomEvent('theme-reset', {
    detail: { 
      palette: THEME_CONFIG.defaultPalette, 
      mode: THEME_CONFIG.defaultMode 
    }
  }));
};