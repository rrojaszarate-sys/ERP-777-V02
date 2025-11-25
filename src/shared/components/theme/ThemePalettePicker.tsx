import React, { useState, useEffect, useRef } from 'react';
import { Palette, Moon, Sun, Check } from 'lucide-react';
import { THEME_CONFIG, migrateFromLegacyTheme } from './themeConfig';

// Definición de las 6 paletas predefinidas
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

  console.log('🎨 ThemePalettePicker rendering...', { isOpen, currentPalette, themeMode });

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

  // Aplicar paleta de colores al documento
  const applyPalette = (paletteKey: PaletteKey, mode: ThemeMode) => {
    try {
      const palette = THEME_PALETTES[paletteKey];
      const root = document.documentElement;

      // Aplicar CSS custom properties principales
      root.style.setProperty('--theme-primary', palette.primary);
      root.style.setProperty('--theme-secondary', palette.secondary);
      root.style.setProperty('--theme-accent', palette.accent);

      // Aplicar todos los tonos de la paleta
      Object.entries(palette.shades).forEach(([shade, color]) => {
        root.style.setProperty(`--theme-primary-${shade}`, color);
      });

      // Aplicar colores de iconos específicos para cada paleta
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

      // Aplicar colores específicos según el modo
      if (mode === 'dark') {
        root.style.setProperty('--theme-bg-primary', '#0F172A');
        root.style.setProperty('--theme-bg-secondary', '#1E293B');
        root.style.setProperty('--theme-text-primary', '#F8FAFC');
        root.style.setProperty('--theme-text-secondary', '#CBD5E1');
        
        // Aplicar modo oscuro al documento completo
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        
        // Forzar estilos oscuros en el body
        document.body.style.backgroundColor = '#0F172A';
        document.body.style.color = '#F8FAFC';
      } else {
        root.style.setProperty('--theme-bg-primary', '#FFFFFF');
        root.style.setProperty('--theme-bg-secondary', '#F8FAFC');
        root.style.setProperty('--theme-text-primary', '#1E293B');
        root.style.setProperty('--theme-text-secondary', '#64748B');
        
        // Aplicar modo claro al documento completo
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
        
        // Forzar estilos claros en el body
        document.body.style.backgroundColor = '#FFFFFF';
        document.body.style.color = '#1E293B';
      }

      // Actualizar meta theme-color para móviles
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', palette.primary);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = palette.primary;
        document.getElementsByTagName('head')[0].appendChild(meta);
      }

      // Forzar recalculo de estilos y refresh visual
      setTimeout(() => {
        const elements = document.querySelectorAll('*');
        elements.forEach(el => {
          if (el instanceof HTMLElement) {
            // Trigger repaint
            el.offsetHeight;
          }
        });
      }, 50);

      // Guardar en localStorage
      localStorage.setItem(THEME_CONFIG.storageKeys.palette, paletteKey);
      localStorage.setItem(THEME_CONFIG.storageKeys.mode, mode);

      console.log(`🎨 Tema aplicado: ${palette.name} (${mode}) - Modo ${mode} activado`);
    } catch (error) {
      console.error('Error applying theme:', error);
    }
  };

  // Cambiar paleta
  const handlePaletteChange = (paletteKey: PaletteKey) => {
    setCurrentPalette(paletteKey);
    applyPalette(paletteKey, themeMode);
    
    // Dispatch event para notificar cambios
    window.dispatchEvent(new CustomEvent('theme-changed', {
      detail: { palette: paletteKey, mode: themeMode }
    }));
  };

  // Alternar modo oscuro/claro
  const toggleThemeMode = () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    
    console.log(`🌙 Cambiando modo de ${themeMode} a ${newMode}`);
    
    // Aplicar cambios inmediatamente ANTES de actualizar el state
    const root = document.documentElement;
    const body = document.body;
    
    if (newMode === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      body.classList.add('dark');
      body.style.backgroundColor = '#0F172A';
      body.style.color = '#F8FAFC';
      console.log('🌙 Modo oscuro aplicado al DOM');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      body.classList.remove('dark');
      body.style.backgroundColor = '#FFFFFF';
      body.style.color = '#1E293B';
      console.log('☀️ Modo claro aplicado al DOM');
    }
    
    // Ahora actualizar el state y aplicar paleta completa
    setThemeMode(newMode);
    applyPalette(currentPalette, newMode);

    // Dispatch event para notificar cambios
    window.dispatchEvent(new CustomEvent('theme-changed', {
      detail: { palette: currentPalette, mode: newMode }
    }));
  };

  // Aplicar paleta inicial
  useEffect(() => {
    console.log('🎨 Aplicando tema inicial:', currentPalette, themeMode);
    applyPalette(currentPalette, themeMode);
  }, [currentPalette, themeMode]); // Reaplica cuando cambien los valores

  const currentPaletteConfig = THEME_PALETTES[currentPalette];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Botón principal */}
      <button
        onClick={() => {
          console.log('🎨 Botón clickeado!');
          setIsOpen(!isOpen);
        }}
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
                    ? 'theme-bg-secondary theme-warning-text theme-border-secondary hover:theme-active-bg' 
                    : 'theme-bg-card theme-text-primary theme-border-primary theme-hover'
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
            <div className="mt-2 text-xs theme-text-tertiary">
              Debug: {document.documentElement.getAttribute('data-theme') || 'none'} | 
              Dark class: {document.documentElement.classList.contains('dark') ? 'yes' : 'no'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Hook personalizado para usar el tema actual
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