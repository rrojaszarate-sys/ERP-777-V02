import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle, X, ChevronRight, ChevronDown, BookOpen,
  CheckCircle, AlertCircle, Lightbulb, ArrowRight
} from 'lucide-react';

export interface GuideStep {
  titulo: string;
  descripcion: string;
  icono?: React.ReactNode;
  tips?: string[];
  advertencias?: string[];
}

export interface GuideSection {
  id: string;
  titulo: string;
  descripcion: string;
  icono?: React.ReactNode;
  pasos: GuideStep[];
}

interface HelpGuideProps {
  titulo: string;
  descripcion: string;
  secciones: GuideSection[];
  onClose?: () => void;
}

export const HelpGuide: React.FC<HelpGuideProps> = ({
  titulo,
  descripcion,
  secciones,
  onClose
}) => {
  const [seccionActiva, setSeccionActiva] = useState<string | null>(secciones[0]?.id || null);
  const [pasoActivo, setPasoActivo] = useState<number>(0);

  const seccionSeleccionada = secciones.find(s => s.id === seccionActiva);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{titulo}</h2>
                <p className="text-white/80 text-sm">{descripcion}</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar de secciones */}
          <div className="w-64 bg-gray-50 border-r p-4 overflow-y-auto">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Secciones
            </h3>
            <nav className="space-y-1">
              {secciones.map((seccion, index) => (
                <button
                  key={seccion.id}
                  onClick={() => {
                    setSeccionActiva(seccion.id);
                    setPasoActivo(0);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-2 ${
                    seccionActiva === seccion.id
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    seccionActiva === seccion.id ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="truncate">{seccion.titulo}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Contenido principal */}
          <div className="flex-1 overflow-y-auto p-6">
            {seccionSeleccionada && (
              <div>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {seccionSeleccionada.titulo}
                  </h3>
                  <p className="text-gray-600">{seccionSeleccionada.descripcion}</p>
                </div>

                {/* Indicador de pasos */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                  {seccionSeleccionada.pasos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setPasoActivo(index)}
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                        pasoActivo === index
                          ? 'bg-indigo-600 text-white scale-110'
                          : pasoActivo > index
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {pasoActivo > index ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        index + 1
                      )}
                    </button>
                  ))}
                </div>

                {/* Paso actual */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={pasoActivo}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-gray-50 rounded-xl p-6"
                  >
                    {seccionSeleccionada.pasos[pasoActivo] && (
                      <>
                        <div className="flex items-start gap-4 mb-4">
                          <div className="p-3 bg-indigo-100 rounded-lg">
                            {seccionSeleccionada.pasos[pasoActivo].icono || (
                              <CheckCircle className="w-6 h-6 text-indigo-600" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-gray-900">
                              Paso {pasoActivo + 1}: {seccionSeleccionada.pasos[pasoActivo].titulo}
                            </h4>
                            <p className="text-gray-600 mt-1">
                              {seccionSeleccionada.pasos[pasoActivo].descripcion}
                            </p>
                          </div>
                        </div>

                        {/* Tips */}
                        {seccionSeleccionada.pasos[pasoActivo].tips && seccionSeleccionada.pasos[pasoActivo].tips!.length > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                              <Lightbulb className="w-5 h-5" />
                              <span>Consejos útiles</span>
                            </div>
                            <ul className="space-y-1">
                              {seccionSeleccionada.pasos[pasoActivo].tips!.map((tip, i) => (
                                <li key={i} className="flex items-start gap-2 text-green-700 text-sm">
                                  <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Advertencias */}
                        {seccionSeleccionada.pasos[pasoActivo].advertencias && seccionSeleccionada.pasos[pasoActivo].advertencias!.length > 0 && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                              <AlertCircle className="w-5 h-5" />
                              <span>Ten en cuenta</span>
                            </div>
                            <ul className="space-y-1">
                              {seccionSeleccionada.pasos[pasoActivo].advertencias!.map((adv, i) => (
                                <li key={i} className="flex items-start gap-2 text-amber-700 text-sm">
                                  <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                  <span>{adv}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Navegación de pasos */}
                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={() => setPasoActivo(prev => Math.max(0, prev - 1))}
                    disabled={pasoActivo === 0}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-500">
                    Paso {pasoActivo + 1} de {seccionSeleccionada.pasos.length}
                  </span>
                  <button
                    onClick={() => setPasoActivo(prev => Math.min(seccionSeleccionada.pasos.length - 1, prev + 1))}
                    disabled={pasoActivo === seccionSeleccionada.pasos.length - 1}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Botón flotante de ayuda
interface HelpButtonProps {
  onClick: () => void;
  label?: string;
}

export const HelpButton: React.FC<HelpButtonProps> = ({ onClick, label = 'Ayuda' }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 bg-indigo-600 text-white px-4 py-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 z-40"
    >
      <HelpCircle className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </motion.button>
  );
};

// Tooltip de ayuda contextual
interface ContextualHelpProps {
  children: React.ReactNode;
  ayuda: string;
  posicion?: 'top' | 'bottom' | 'left' | 'right';
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({
  children,
  ayuda,
  posicion = 'top'
}) => {
  const [showHelp, setShowHelp] = useState(false);

  const posicionClases = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShowHelp(true)}
        onMouseLeave={() => setShowHelp(false)}
      >
        {children}
      </div>
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`absolute ${posicionClases[posicion]} z-50 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg max-w-xs whitespace-normal`}
          >
            {ayuda}
            <div className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
              posicion === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
              posicion === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
              posicion === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
              'right-full top-1/2 -translate-y-1/2 -mr-1'
            }`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HelpGuide;
