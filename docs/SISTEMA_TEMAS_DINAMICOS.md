# Sistema de Temas Dinámicos

Documentación técnica completa para implementar un sistema de temas dinámicos con soporte para múltiples paletas de colores y modo oscuro/claro.

## Tabla de Contenidos

1. [Arquitectura](#arquitectura)
2. [Instalación](#instalación)
3. [Archivos del Sistema](#archivos-del-sistema)
4. [Configuración](#configuración)
5. [Paletas de Colores](#paletas-de-colores)
6. [CSS Custom Properties](#css-custom-properties)
7. [Clases Utilitarias](#clases-utilitarias)
8. [Componentes React](#componentes-react)
9. [Hook useTheme](#hook-usetheme)
10. [Eventos del Sistema](#eventos-del-sistema)
11. [Agregar Nuevas Paletas](#agregar-nuevas-paletas)
12. [Modo Oscuro](#modo-oscuro)
13. [Variables de Entorno](#variables-de-entorno)
14. [Ejemplos de Uso](#ejemplos-de-uso)

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE TEMAS DINÁMICOS                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ themeConfig  │───▶│ ThemePicker  │───▶│  applyPalette │       │
│  │    .ts       │    │    .tsx      │    │   (función)   │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  localStorage │    │  useTheme    │    │  CSS Custom  │       │
│  │  (persistir)  │    │   (hook)     │    │  Properties  │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                             │                   │                │
│                             ▼                   ▼                │
│                      ┌──────────────┐    ┌──────────────┐       │
│                      │  Componentes │◀───│  index.css   │       │
│                      │    React     │    │  (estilos)   │       │
│                      └──────────────┘    └──────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Instalación

### Dependencias

```bash
npm install lucide-react
# o
yarn add lucide-react
```

### Estructura de Archivos

```
src/
├── index.css                              # CSS Custom Properties
└── shared/
    └── components/
        └── theme/
            ├── index.ts                   # Exportaciones
            ├── themeConfig.ts             # Configuración
            ├── ThemePalettePicker.tsx     # Componente principal
            └── ThemePalettePickerSimple.tsx # Debug (opcional)
```

---

## Archivos del Sistema

### 1. themeConfig.ts

```typescript
// src/shared/components/theme/themeConfig.ts

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

  window.dispatchEvent(new CustomEvent('theme-reset', {
    detail: {
      palette: THEME_CONFIG.defaultPalette,
      mode: THEME_CONFIG.defaultMode
    }
  }));
};
```

### 2. ThemePalettePicker.tsx

```typescript
// src/shared/components/theme/ThemePalettePicker.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Palette, Moon, Sun, Check } from 'lucide-react';
import { THEME_CONFIG, migrateFromLegacyTheme } from './themeConfig';

// ============================================================
// DEFINICIÓN DE PALETAS
// ============================================================

export const THEME_PALETTES = {
  mint: {
    name: 'Mint (Actual)',
    primary: '#74F1C8',
    secondary: '#0d9488',
    accent: '#5eead4',
    colors: ['#f0fdf9', '#74F1C8', '#0d9488', '#0f766e'],
    description: 'Verde menta empresarial',
    shades: {
      50: '#f0fdf9',
      100: '#ccfbef',
      200: '#99f6e0',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#74F1C8',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a'
    }
  },
  blue: {
    name: 'Azul Corporativo',
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA',
    colors: ['#EFF6FF', '#3B82F6', '#1E40AF', '#1E3A8A'],
    description: 'Azul profesional clásico',
    shades: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A'
    }
  },
  purple: {
    name: 'Morado Elegante',
    primary: '#8B5CF6',
    secondary: '#7C3AED',
    accent: '#A78BFA',
    colors: ['#F5F3FF', '#8B5CF6', '#7C3AED', '#6D28D9'],
    description: 'Violeta sofisticado',
    shades: {
      50: '#F5F3FF',
      100: '#EDE9FE',
      200: '#DDD6FE',
      300: '#C4B5FD',
      400: '#A78BFA',
      500: '#8B5CF6',
      600: '#7C3AED',
      700: '#6D28D9',
      800: '#5B21B6',
      900: '#4C1D95'
    }
  },
  red: {
    name: 'Rojo Energético',
    primary: '#EF4444',
    secondary: '#DC2626',
    accent: '#F87171',
    colors: ['#FEF2F2', '#EF4444', '#DC2626', '#B91C1C'],
    description: 'Rojo vibrante y potente',
    shades: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
      900: '#7F1D1D'
    }
  },
  orange: {
    name: 'Naranja Cálido',
    primary: '#F97316',
    secondary: '#EA580C',
    accent: '#FB923C',
    colors: ['#FFF7ED', '#F97316', '#EA580C', '#C2410C'],
    description: 'Naranja energizante',
    shades: {
      50: '#FFF7ED',
      100: '#FFEDD5',
      200: '#FED7AA',
      300: '#FDBA74',
      400: '#FB923C',
      500: '#F97316',
      600: '#EA580C',
      700: '#C2410C',
      800: '#9A3412',
      900: '#7C2D12'
    }
  },
  midnight: {
    name: 'Azul Nocturno',
    primary: '#1E293B',
    secondary: '#0F172A',
    accent: '#475569',
    colors: ['#F8FAFC', '#1E293B', '#0F172A', '#020617'],
    description: 'Azul oscuro premium',
    shades: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A'
    }
  }
} as const;

export type PaletteKey = keyof typeof THEME_PALETTES;
export type ThemeMode = 'light' | 'dark';

// ============================================================
// FUNCIÓN PRINCIPAL: APLICAR PALETA
// ============================================================

const applyPalette = (paletteKey: PaletteKey, mode: ThemeMode) => {
  try {
    const palette = THEME_PALETTES[paletteKey];
    const root = document.documentElement;

    // 1. Aplicar CSS custom properties principales
    root.style.setProperty('--theme-primary', palette.primary);
    root.style.setProperty('--theme-secondary', palette.secondary);
    root.style.setProperty('--theme-accent', palette.accent);

    // 2. Aplicar todos los tonos de la paleta (50-900)
    Object.entries(palette.shades).forEach(([shade, color]) => {
      root.style.setProperty(`--theme-primary-${shade}`, color);
    });

    // 3. Aplicar colores de iconos específicos para cada modo
    if (mode === 'dark') {
      root.style.setProperty('--theme-icon-primary', palette.shades[400]);
      root.style.setProperty('--theme-icon-interactive', palette.shades[300]);
      root.style.setProperty('--theme-icon-hover', palette.shades[200]);
      root.style.setProperty('--theme-text-accent', palette.shades[400]);
      root.style.setProperty('--theme-border-accent', palette.shades[500]);
    } else {
      root.style.setProperty('--theme-icon-primary', palette.shades[600]);
      root.style.setProperty('--theme-icon-interactive', palette.shades[500]);
      root.style.setProperty('--theme-icon-hover', palette.shades[700]);
      root.style.setProperty('--theme-text-accent', palette.shades[600]);
      root.style.setProperty('--theme-border-accent', palette.shades[300]);
    }

    // 4. Aplicar colores de fondo y texto según el modo
    if (mode === 'dark') {
      root.style.setProperty('--theme-bg-primary', '#0F172A');
      root.style.setProperty('--theme-bg-secondary', '#1E293B');
      root.style.setProperty('--theme-text-primary', '#F8FAFC');
      root.style.setProperty('--theme-text-secondary', '#CBD5E1');

      // Aplicar modo oscuro al documento
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      document.body.style.backgroundColor = '#0F172A';
      document.body.style.color = '#F8FAFC';
    } else {
      root.style.setProperty('--theme-bg-primary', '#FFFFFF');
      root.style.setProperty('--theme-bg-secondary', '#F8FAFC');
      root.style.setProperty('--theme-text-primary', '#1E293B');
      root.style.setProperty('--theme-text-secondary', '#64748B');

      // Aplicar modo claro al documento
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      document.body.style.backgroundColor = '#FFFFFF';
      document.body.style.color = '#1E293B';
    }

    // 5. Actualizar meta theme-color para móviles
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', palette.primary);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = palette.primary;
      document.getElementsByTagName('head')[0].appendChild(meta);
    }

    // 6. Forzar recalculo de estilos
    setTimeout(() => {
      document.body.offsetHeight; // Trigger repaint
    }, 50);

    // 7. Guardar en localStorage
    localStorage.setItem(THEME_CONFIG.storageKeys.palette, paletteKey);
    localStorage.setItem(THEME_CONFIG.storageKeys.mode, mode);

    console.log(`🎨 Tema aplicado: ${palette.name} (${mode})`);
  } catch (error) {
    console.error('Error applying theme:', error);
  }
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

interface ThemePalettePickerProps {
  className?: string;
}

export const ThemePalettePicker: React.FC<ThemePalettePickerProps> = ({
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPalette, setCurrentPalette] = useState<PaletteKey>('mint');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cargar configuración desde localStorage
  useEffect(() => {
    try {
      migrateFromLegacyTheme();

      const savedPalette = localStorage.getItem(THEME_CONFIG.storageKeys.palette) as PaletteKey;
      const savedMode = localStorage.getItem(THEME_CONFIG.storageKeys.mode) as ThemeMode;

      if (savedPalette && THEME_PALETTES[savedPalette]) {
        setCurrentPalette(savedPalette);
      } else {
        setCurrentPalette(THEME_CONFIG.defaultPalette as PaletteKey);
      }

      if (savedMode && ['light', 'dark'].includes(savedMode)) {
        setThemeMode(savedMode);
      } else {
        setThemeMode(THEME_CONFIG.defaultMode as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme config:', error);
    }
  }, []);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Aplicar paleta inicial y cuando cambien los valores
  useEffect(() => {
    applyPalette(currentPalette, themeMode);
  }, [currentPalette, themeMode]);

  // Cambiar paleta
  const handlePaletteChange = (paletteKey: PaletteKey) => {
    setCurrentPalette(paletteKey);
    applyPalette(paletteKey, themeMode);

    window.dispatchEvent(new CustomEvent('theme-changed', {
      detail: { palette: paletteKey, mode: themeMode }
    }));
  };

  // Alternar modo oscuro/claro
  const toggleThemeMode = () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';

    // Aplicar cambios inmediatamente
    if (newMode === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark');
      document.body.style.backgroundColor = '#0F172A';
      document.body.style.color = '#F8FAFC';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.classList.remove('dark');
      document.body.style.backgroundColor = '#FFFFFF';
      document.body.style.color = '#1E293B';
    }

    setThemeMode(newMode);
    applyPalette(currentPalette, newMode);

    window.dispatchEvent(new CustomEvent('theme-changed', {
      detail: { palette: currentPalette, mode: newMode }
    }));
  };

  const currentPaletteConfig = THEME_PALETTES[currentPalette];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Botón principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg theme-border-primary hover:theme-border-accent transition-colors theme-bg-card theme-hover"
        title="Cambiar paleta de colores"
      >
        <Palette className="w-4 h-4 theme-icon-interactive" />
        <div className="flex space-x-1">
          {currentPaletteConfig.colors.slice(1, 4).map((color, index) => (
            <div
              key={index}
              className="w-3 h-3 rounded-full border theme-border-primary"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 theme-bg-card rounded-lg shadow-lg theme-border-primary z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b theme-border-primary theme-bg-secondary">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold theme-text-primary">Paleta de Colores</h3>
              <button
                onClick={toggleThemeMode}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md border text-xs transition-all duration-300 ${
                  themeMode === 'dark'
                    ? 'theme-bg-secondary theme-warning-text theme-border-secondary'
                    : 'theme-bg-card theme-text-primary theme-border-primary'
                }`}
                title={`Cambiar a modo ${themeMode === 'light' ? 'oscuro' : 'claro'}`}
              >
                {themeMode === 'light' ? (
                  <>
                    <Moon className="w-4 h-4 theme-icon-secondary" />
                    <span className="font-medium">Activar Oscuro</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-4 h-4" style={{ color: '#FBBF24' }} />
                    <span className="font-medium" style={{ color: '#FBBF24' }}>Activar Claro</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs theme-text-secondary mt-1">
              Selecciona la paleta que más te guste
            </p>
          </div>

          {/* Lista de paletas */}
          <div className="p-2 max-h-64 overflow-y-auto">
            {(Object.entries(THEME_PALETTES) as [PaletteKey, typeof THEME_PALETTES[PaletteKey]][]).map(([key, palette]) => (
              <button
                key={key}
                onClick={() => handlePaletteChange(key)}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg theme-hover transition-colors ${
                  currentPalette === key ? 'theme-primary-soft theme-border-accent border' : ''
                }`}
              >
                {/* Muestra de colores */}
                <div className="flex space-x-1">
                  {palette.colors.map((color, index) => (
                    <div
                      key={index}
                      className="w-4 h-4 rounded-full border theme-border-primary shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                {/* Información */}
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium theme-text-primary flex items-center">
                    {palette.name}
                    {currentPalette === key && (
                      <Check className="w-3 h-3 ml-2 theme-icon-primary" />
                    )}
                  </div>
                  <div className="text-xs theme-text-secondary">{palette.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t theme-border-primary theme-bg-secondary">
            <div className="flex items-center justify-between text-xs theme-text-secondary">
              <span>Modo: <strong className="theme-text-primary">{themeMode === 'light' ? 'Claro' : 'Oscuro'}</strong></span>
              <span>Actual: <strong className="theme-text-accent">{currentPaletteConfig.name}</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// HOOK: useTheme
// ============================================================

export const useTheme = () => {
  const [palette, setPalette] = useState<PaletteKey>('mint');
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    const handleThemeChange = (event: CustomEvent) => {
      setPalette(event.detail.palette);
      setMode(event.detail.mode);
    };

    // Cargar estado inicial
    const savedPalette = localStorage.getItem(THEME_CONFIG.storageKeys.palette) as PaletteKey;
    const savedMode = localStorage.getItem(THEME_CONFIG.storageKeys.mode) as ThemeMode;

    if (savedPalette) setPalette(savedPalette);
    if (savedMode) setMode(savedMode);

    window.addEventListener('theme-changed', handleThemeChange as EventListener);
    return () => window.removeEventListener('theme-changed', handleThemeChange as EventListener);
  }, []);

  return {
    palette,
    mode,
    paletteConfig: THEME_PALETTES[palette],
    isLight: mode === 'light',
    isDark: mode === 'dark'
  };
};
```

### 3. index.ts (Exportaciones)

```typescript
// src/shared/components/theme/index.ts

export {
  ThemePalettePicker,
  useTheme,
  THEME_PALETTES,
  type PaletteKey,
  type ThemeMode
} from './ThemePalettePicker';

export {
  THEME_CONFIG,
  isValidThemeConfig,
  migrateFromLegacyTheme,
  resetThemeToDefault
} from './themeConfig';
```

---

## CSS Custom Properties

### index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ============================================================
   CSS CUSTOM PROPERTIES PARA TEMAS DINÁMICOS
   ============================================================ */

:root {
  /* Paleta actual (mint por defecto) */
  --theme-primary: #74F1C8;
  --theme-primary-50: #f0fdf9;
  --theme-primary-100: #ccfbef;
  --theme-primary-200: #99f6e0;
  --theme-primary-300: #5eead4;
  --theme-primary-400: #2dd4bf;
  --theme-primary-500: #74F1C8;
  --theme-primary-600: #0d9488;
  --theme-primary-700: #0f766e;
  --theme-primary-800: #115e59;
  --theme-primary-900: #134e4a;

  --theme-secondary: #0d9488;
  --theme-accent: #5eead4;

  /* Colores de fondo */
  --theme-bg-primary: #FFFFFF;
  --theme-bg-secondary: #F8FAFC;
  --theme-bg-tertiary: #F1F5F9;
  --theme-bg-card: #FFFFFF;

  /* Colores de texto */
  --theme-text-primary: #1E293B;
  --theme-text-secondary: #64748B;
  --theme-text-tertiary: #94A3B8;
  --theme-text-accent: var(--theme-primary-600);

  /* Colores de iconos */
  --theme-icon-primary: var(--theme-primary-600);
  --theme-icon-secondary: #64748B;
  --theme-icon-tertiary: #94A3B8;
  --theme-icon-interactive: var(--theme-primary-500);
  --theme-icon-hover: var(--theme-primary-700);

  /* Colores de bordes */
  --theme-border-primary: #E2E8F0;
  --theme-border-secondary: #CBD5E1;
  --theme-border-accent: var(--theme-primary-300);

  /* Colores interactivos */
  --theme-hover-bg: var(--theme-primary-50);
  --theme-hover-text: var(--theme-primary-700);
  --theme-active-bg: var(--theme-primary-100);
  --theme-active-text: var(--theme-primary-800);

  /* Estados */
  --theme-success: #10B981;
  --theme-success-bg: #DCFCE7;
  --theme-success-text: #166534;
  --theme-warning: #F59E0B;
  --theme-warning-bg: #FEF3C7;
  --theme-warning-text: #92400E;
  --theme-error: #EF4444;
  --theme-error-bg: #FEE2E2;
  --theme-error-text: #991B1B;
  --theme-info: #3B82F6;
  --theme-info-bg: #DBEAFE;
  --theme-info-text: #1E40AF;
}

/* ============================================================
   MODO OSCURO
   ============================================================ */

[data-theme="dark"] {
  /* Fondos oscuros */
  --theme-bg-primary: #0F172A;
  --theme-bg-secondary: #1E293B;
  --theme-bg-tertiary: #334155;
  --theme-bg-card: #1E293B;

  /* Textos con mejor contraste */
  --theme-text-primary: #F8FAFC;
  --theme-text-secondary: #CBD5E1;
  --theme-text-tertiary: #94A3B8;
  --theme-text-accent: var(--theme-primary-400);

  /* Iconos adaptados para modo oscuro */
  --theme-icon-primary: var(--theme-primary-400);
  --theme-icon-secondary: #CBD5E1;
  --theme-icon-tertiary: #94A3B8;
  --theme-icon-interactive: var(--theme-primary-300);
  --theme-icon-hover: var(--theme-primary-200);

  /* Bordes oscuros */
  --theme-border-primary: #475569;
  --theme-border-secondary: #64748B;
  --theme-border-accent: var(--theme-primary-500);

  /* Interacciones en modo oscuro */
  --theme-hover-bg: rgba(116, 241, 200, 0.1);
  --theme-hover-text: var(--theme-primary-300);
  --theme-active-bg: rgba(116, 241, 200, 0.2);
  --theme-active-text: var(--theme-primary-200);

  /* Estados en modo oscuro */
  --theme-success-bg: rgba(16, 185, 129, 0.2);
  --theme-success-text: #34D399;
  --theme-warning-bg: rgba(245, 158, 11, 0.2);
  --theme-warning-text: #FBBF24;
  --theme-error-bg: rgba(239, 68, 68, 0.2);
  --theme-error-text: #F87171;
  --theme-info-bg: rgba(59, 130, 246, 0.2);
  --theme-info-text: #60A5FA;
}

/* ============================================================
   ESTILOS BASE
   ============================================================ */

body {
  background-color: var(--theme-bg-primary);
  color: var(--theme-text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* ============================================================
   CLASES UTILITARIAS
   ============================================================ */

/* Fondos */
.theme-bg-primary { background-color: var(--theme-bg-primary); }
.theme-bg-secondary { background-color: var(--theme-bg-secondary); }
.theme-bg-tertiary { background-color: var(--theme-bg-tertiary); }
.theme-bg-card { background-color: var(--theme-bg-card); }

/* Textos */
.theme-text-primary { color: var(--theme-text-primary); }
.theme-text-secondary { color: var(--theme-text-secondary); }
.theme-text-tertiary { color: var(--theme-text-tertiary); }
.theme-text-accent { color: var(--theme-text-accent); }

/* Iconos */
.theme-icon-primary { color: var(--theme-icon-primary); }
.theme-icon-secondary { color: var(--theme-icon-secondary); }
.theme-icon-tertiary { color: var(--theme-icon-tertiary); }
.theme-icon-interactive { color: var(--theme-icon-interactive); }

/* Bordes */
.theme-border-primary { border-color: var(--theme-border-primary); }
.theme-border-secondary { border-color: var(--theme-border-secondary); }
.theme-border-accent { border-color: var(--theme-border-accent); }

/* Primarios */
.theme-primary { background-color: var(--theme-primary); }
.theme-primary-soft { background-color: var(--theme-primary-50); }

/* Estados interactivos */
.theme-hover:hover {
  background-color: var(--theme-hover-bg);
  color: var(--theme-hover-text);
}

/* Botones */
.theme-button-primary {
  background-color: var(--theme-primary);
  color: white;
}

.theme-button-primary:hover {
  filter: brightness(0.9);
}

.theme-button-secondary {
  background-color: var(--theme-bg-secondary);
  color: var(--theme-text-primary);
  border: 1px solid var(--theme-border-primary);
}

/* Estados de UI */
.theme-success {
  background-color: var(--theme-success-bg);
  color: var(--theme-success-text);
}

.theme-warning {
  background-color: var(--theme-warning-bg);
  color: var(--theme-warning-text);
}

.theme-error {
  background-color: var(--theme-error-bg);
  color: var(--theme-error-text);
}

.theme-info {
  background-color: var(--theme-info-bg);
  color: var(--theme-info-text);
}

/* ============================================================
   OVERRIDES PARA MODO OSCURO
   ============================================================ */

[data-theme="dark"] .bg-white {
  background-color: var(--theme-bg-secondary) !important;
}

[data-theme="dark"] .bg-gray-50 {
  background-color: #1E293B !important;
}

[data-theme="dark"] .bg-gray-100 {
  background-color: #334155 !important;
}

[data-theme="dark"] .text-gray-900 {
  color: var(--theme-text-primary) !important;
}

[data-theme="dark"] .text-gray-700 {
  color: var(--theme-text-secondary) !important;
}

[data-theme="dark"] .border-gray-200 {
  border-color: #475569 !important;
}

[data-theme="dark"] input,
[data-theme="dark"] select,
[data-theme="dark"] textarea {
  background-color: var(--theme-bg-secondary) !important;
  border-color: #475569 !important;
  color: var(--theme-text-primary) !important;
}

/* ============================================================
   TRANSICIONES SUAVES
   ============================================================ */

* {
  transition-property: background-color, border-color, color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

/* Deshabilitar transiciones si es necesario */
.no-theme-transitions * {
  transition: none !important;
}
```

---

## Ejemplos de Uso

### Uso Básico en Header/Navbar

```tsx
import { ThemePalettePicker } from '@/shared/components/theme';

function Header() {
  return (
    <header className="flex items-center justify-between p-4 theme-bg-card theme-border-primary border-b">
      <h1 className="theme-text-primary font-bold">Mi App</h1>
      <ThemePalettePicker />
    </header>
  );
}
```

### Uso del Hook useTheme

```tsx
import { useTheme, THEME_PALETTES } from '@/shared/components/theme';

function Dashboard() {
  const { palette, mode, paletteConfig, isDark } = useTheme();

  return (
    <div className="theme-bg-primary min-h-screen">
      <div
        className="p-4 rounded-lg"
        style={{ backgroundColor: paletteConfig.shades[100] }}
      >
        <h2 style={{ color: paletteConfig.primary }}>
          Tema actual: {paletteConfig.name}
        </h2>
        <p className="theme-text-secondary">
          Modo: {isDark ? 'Oscuro' : 'Claro'}
        </p>
      </div>
    </div>
  );
}
```

### Escuchar Cambios de Tema

```tsx
useEffect(() => {
  const handleThemeChange = (event: CustomEvent) => {
    console.log('Tema cambiado:', event.detail);
    // { palette: 'blue', mode: 'dark' }
  };

  window.addEventListener('theme-changed', handleThemeChange as EventListener);
  return () => window.removeEventListener('theme-changed', handleThemeChange as EventListener);
}, []);
```

### Cambiar Tema Programáticamente

```typescript
import { resetThemeToDefault } from '@/shared/components/theme';

// Resetear a valores por defecto
resetThemeToDefault();

// O disparar cambio manual
window.dispatchEvent(new CustomEvent('theme-changed', {
  detail: { palette: 'purple', mode: 'dark' }
}));
```

---

## Agregar Nuevas Paletas

Para agregar una nueva paleta, edita `THEME_PALETTES` en `ThemePalettePicker.tsx`:

```typescript
export const THEME_PALETTES = {
  // ... paletas existentes ...

  gold: {
    name: 'Dorado Premium',
    primary: '#D4AF37',
    secondary: '#B8860B',
    accent: '#FFD700',
    colors: ['#FFFBEB', '#D4AF37', '#B8860B', '#8B6914'],
    description: 'Elegante dorado ejecutivo',
    shades: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#D4AF37',
      600: '#B8860B',
      700: '#92700C',
      800: '#78350F',
      900: '#451A03'
    }
  }
};
```

---

## Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Habilitar/deshabilitar selector de temas
VITE_ENABLE_THEME_PICKER=true

# Habilitar/deshabilitar modo oscuro
VITE_ENABLE_DARK_MODE=true

# Habilitar temas personalizados (guardar en BD)
VITE_ENABLE_CUSTOM_THEMES=false

# Paleta por defecto: mint, blue, purple, red, orange, midnight
VITE_DEFAULT_THEME_PALETTE=mint

# Modo por defecto: light, dark
VITE_DEFAULT_THEME_MODE=light

# Deshabilitar transiciones (para tests)
VITE_DISABLE_THEME_TRANSITIONS=false
```

---

## Notas Importantes

1. **Persistencia**: Los temas se guardan automáticamente en `localStorage`
2. **SSR**: Compatible con Next.js/SSR usando `useEffect` para cargar el tema
3. **Accesibilidad**: Los colores están diseñados para cumplir con WCAG 2.1
4. **Performance**: Las transiciones usan GPU acceleration con `transition`
5. **Mobile**: Actualiza `meta[name="theme-color"]` para la barra de estado

---

## Licencia

MIT - Libre para uso comercial y personal.
