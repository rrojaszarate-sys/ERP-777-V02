import React from 'react';
import { ThemePalettePicker } from '../theme/ThemePalettePicker';

export const ThemeTestComponent: React.FC = () => {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Test del Selector de Paletas</h1>
      
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-600">Selector:</span>
        <ThemePalettePicker />
      </div>

      {/* Elementos de prueba */}
      <div className="space-y-4">
        <div className="p-4 bg-mint-50 border border-mint-200 rounded-lg">
          <p className="text-mint-700">Elemento con colores mint que debería cambiar</p>
        </div>

        <button className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white rounded-lg">
          Botón con colores mint
        </button>

        <div className="p-4 border-l-4 border-mint-500 bg-mint-50">
          <p className="text-mint-800 font-medium">Alerta con colores mint</p>
        </div>
      </div>
    </div>
  );
};