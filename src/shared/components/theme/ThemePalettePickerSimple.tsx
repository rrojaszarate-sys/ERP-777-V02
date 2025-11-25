import React from 'react';
import { Palette } from 'lucide-react';

// Versión simplificada para debugging
export const ThemePalettePickerSimple: React.FC = () => {
  return (
    <div className="relative">
      <button 
        className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors bg-white hover:bg-gray-50"
        onClick={() => alert('Selector de paletas funcionando!')}
      >
        <Palette className="w-4 h-4 text-gray-600" />
        <span className="text-sm text-gray-700">Paletas</span>
        <div className="flex space-x-1">
          <div className="w-3 h-3 rounded-full bg-emerald-400 border border-gray-300" />
          <div className="w-3 h-3 rounded-full bg-emerald-600 border border-gray-300" />
          <div className="w-3 h-3 rounded-full bg-emerald-800 border border-gray-300" />
        </div>
      </button>
    </div>
  );
};