import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, FileText, Database, TestTube, Code,
  ChevronRight, ExternalLink, Download, Clock,
  CheckCircle, AlertCircle, Zap, ArrowRight
} from 'lucide-react';

interface Documento {
  id: string;
  titulo: string;
  descripcion: string;
  url: string;
  categoria: 'guia' | 'tecnico' | 'sql' | 'pruebas' | 'datos' | 'scripts';
  fecha: string;
  version: string;
  estado: 'nuevo' | 'actualizado' | 'estable';
  icono: React.ReactNode;
}

export const DocumentacionPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null);

  const documentos: Documento[] = [
    // Guías Principales
    {
      id: 'guia-pruebas',
      titulo: 'Guía de Pruebas Automatizadas',
      descripcion: 'Documentación completa del sistema de pruebas con Cypress, fixtures, reportes y scripts de ejecución.',
      url: 'https://github.com/rrojaszarate-sys/ERP-777-V01/blob/claude/fix-code-execution-error-01Rp5sWsxwqt1KdNKLB3fiCS/PRUEBAS_AUTOMATIZADAS_README.md',
      categoria: 'guia',
      fecha: '2025-11-19',
      version: '1.0.0',
      estado: 'nuevo',
      icono: <TestTube className="w-5 h-5" />
    },
    {
      id: 'manual-qa',
      titulo: 'Manual de Pruebas QA',
      descripcion: '6 casos de prueba manuales detallados, paso a paso, para el equipo de QA con criterios de aceptación.',
      url: 'https://github.com/rrojaszarate-sys/ERP-777-V01/blob/claude/fix-code-execution-error-01Rp5sWsxwqt1KdNKLB3fiCS/MANUAL_PRUEBAS_QA_EVENTOS_ERP.md',
      categoria: 'guia',
      fecha: '2025-11-19',
      version: '1.0.0',
      estado: 'nuevo',
      icono: <BookOpen className="w-5 h-5" />
    },
    {
      id: 'analisis-escritorio',
      titulo: 'Análisis de Escritorio de Módulos',
      descripcion: 'Inventario de 27 módulos, dependencias, puntos críticos, 5 casos de prueba y análisis de riesgos.',
      url: 'https://github.com/rrojaszarate-sys/ERP-777-V01/blob/claude/fix-code-execution-error-01Rp5sWsxwqt1KdNKLB3fiCS/ANALISIS_ESCRITORIO_MODULOS.md',
      categoria: 'guia',
      fecha: '2025-11-19',
      version: '1.0.0',
      estado: 'nuevo',
      icono: <FileText className="w-5 h-5" />
    },

    // Documentos Técnicos
    {
      id: 'correcciones-sql',
      titulo: 'Correcciones al Script SQL',
      descripcion: 'Documentación de todos los problemas corregidos, columnas agregadas e instrucciones de ejecución.',
      url: 'https://github.com/rrojaszarate-sys/ERP-777-V01/blob/claude/fix-code-execution-error-01Rp5sWsxwqt1KdNKLB3fiCS/CORRECCIONES_SCRIPT_SQL.md',
      categoria: 'tecnico',
      fecha: '2025-11-19',
      version: '4.2.2',
      estado: 'actualizado',
      icono: <FileText className="w-5 h-5" />
    },
    {
      id: 'resumen-aislamiento',
      titulo: 'Resumen de Aislamiento Completo',
      descripcion: 'Estado del aislamiento eventos-erp vs producción, 60+ tablas, columnas en español.',
      url: 'https://github.com/rrojaszarate-sys/ERP-777-V01/blob/claude/fix-code-execution-error-01Rp5sWsxwqt1KdNKLB3fiCS/RESUMEN_AISLAMIENTO_COMPLETO.md',
      categoria: 'tecnico',
      fecha: '2025-11-19',
      version: '1.0.0',
      estado: 'estable',
      icono: <FileText className="w-5 h-5" />
    },
    {
      id: 'analisis-tablas',
      titulo: 'Análisis de Tablas Eventos-ERP',
      descripcion: 'Análisis detallado de tablas utilizadas, dependencias y métricas de aislamiento.',
      url: 'https://github.com/rrojaszarate-sys/ERP-777-V01/blob/claude/fix-code-execution-error-01Rp5sWsxwqt1KdNKLB3fiCS/ANALISIS_TABLAS_EVENTOS_ERP.md',
      categoria: 'tecnico',
      fecha: '2025-11-19',
      version: '1.0.0',
      estado: 'estable',
      icono: <Database className="w-5 h-5" />
    },

    // Scripts SQL
    {
      id: 'base-datos-completo',
      titulo: 'BASE_DATOS_ERP_COMPLETO.sql',
      descripcion: 'Script SQL completo con 56 tablas _erp, 5 vistas SQL, triggers, índices y políticas RLS.',
      url: 'https://github.com/rrojaszarate-sys/ERP-777-V01/blob/claude/fix-code-execution-error-01Rp5sWsxwqt1KdNKLB3fiCS/BASE_DATOS_ERP_COMPLETO.sql',
      categoria: 'sql',
      fecha: '2025-11-19',
      version: '4.2.2',
      estado: 'actualizado',
      icono: <Database className="w-5 h-5" />
    },
    {
      id: 'parche-columnas',
      titulo: 'PARCHE_COLUMNAS_EVENTOS_ERP.sql',
      descripcion: 'Script de parche para agregar columnas faltantes a tablas existentes.',
      url: 'https://github.com/rrojaszarate-sys/ERP-777-V01/blob/claude/fix-code-execution-error-01Rp5sWsxwqt1KdNKLB3fiCS/PARCHE_COLUMNAS_EVENTOS_ERP.sql',
      categoria: 'sql',
      fecha: '2025-11-19',
      version: '1.0.0',
      estado: 'estable',
      icono: <Database className="w-5 h-5" />
    },

    // Pruebas Automatizadas
    {
      id: 'test-happy-path',
      titulo: 'Suite 1: Flujo Completo (Happy Path)',
      descripcion: 'Prueba de flujo completo desde creación hasta finalización con 11 pasos de verificación.',
      url: 'https://github.com/rrojaszarate-sys/ERP-777-V01/blob/claude/fix-code-execution-error-01Rp5sWsxwqt1KdNKLB3fiCS/cypress/e2e/eventos-erp/01-flujo-completo-happy-path.cy.js',
      categoria: 'pruebas',
      fecha: '2025-11-19',
      version: '1.0.0',
      estado: 'nuevo',
      icono: <Code className="w-5 h-5" />
    },
    {
      id: 'test-integridad',
      titulo: 'Suite 2: Integridad Referencial',
      descripcion: 'Validación de Foreign Key constraints y prevención de eliminación con dependencias.',
      url: 'https://github.com/rrojaszarate-sys/ERP-777-V01/blob/claude/fix-code-execution-error-01Rp5sWsxwqt1KdNKLB3fiCS/cypress/e2e/eventos-erp/02-integridad-referencial.cy.js',
      categoria: 'pruebas',
      fecha: '2025-11-19',
      version: '1.0.0',
      estado: 'nuevo',
      icono: <Code className="w-5 h-5" />
    },
    {
      id: 'test-soft-delete',
      titulo: 'Suite 3: Soft Delete',
      descripcion: 'Verificación de deleted_at y que solo registros activos se cuentan en cálculos.',
      url: 'https://github.com/rrojaszarate-sys/ERP-777-V01/blob/claude/fix-code-execution-error-01Rp5sWsxwqt1KdNKLB3fiCS/cypress/e2e/eventos-erp/03-soft-delete.cy.js',
      categoria: 'pruebas',
      fecha: '2025-11-19',
      version: '1.0.0',
      estado: 'nuevo',
      icono: <Code className="w-5 h-5" />
    },
    {
      id: 'test-margenes',
      titulo: 'Suite 4: Cálculo de Márgenes',
      descripcion: 'Verificación de fórmulas de margen estimado y real, cálculos de negocio.',
      url: 'https://github.com/rrojaszarate-sys/ERP-777-V01/blob/claude/fix-code-execution-error-01Rp5sWsxwqt1KdNKLB3fiCS/cypress/e2e/eventos-erp/04-calculo-margenes.cy.js',
      categoria: 'pruebas',
      fecha: '2025-11-19',
      version: '1.0.0',
      estado: 'nuevo',
      icono: <Code className="w-5 h-5" />
    },
    {
      id: 'test-provisiones',
      titulo: 'Suite 5: Provisiones por Categoría',
      descripcion: 'Control de presupuesto por categoría, cálculo de disponibles y alertas de exceso.',
      url: 'https://github.com/rrojaszarate-sys/ERP-777-V01/blob/claude/fix-code-execution-error-01Rp5sWsxwqt1KdNKLB3fiCS/cypress/e2e/eventos-erp/05-provisiones-categoria.cy.js',
      categoria: 'pruebas',
      fecha: '2025-11-19',
      version: '1.0.0',
      estado: 'nuevo',
      icono: <Code className="w-5 h-5" />
    },
  ];

  const categorias = {
    guia: { nombre: 'Guías Principales', color: 'bg-blue-500', icon: BookOpen },
    tecnico: { nombre: 'Documentos Técnicos', color: 'bg-green-500', icon: FileText },
    sql: { nombre: 'Scripts SQL', color: 'bg-purple-500', icon: Database },
    pruebas: { nombre: 'Pruebas Automatizadas', color: 'bg-orange-500', icon: TestTube },
    datos: { nombre: 'Datos de Prueba', color: 'bg-cyan-500', icon: FileText },
    scripts: { nombre: 'Scripts de Ejecución', color: 'bg-pink-500', icon: Code },
  };

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'nuevo':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">NUEVO</span>;
      case 'actualizado':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">ACTUALIZADO</span>;
      case 'estable':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">ESTABLE</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold theme-text-primary mb-2">📚 Documentación de Desarrollo</h1>
            <p className="theme-text-secondary">
              Acceso centralizado a toda la documentación técnica, guías de pruebas y scripts del sistema
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm theme-text-secondary">
              <Clock className="w-4 h-4" />
              <span>Última actualización: 19/11/2025</span>
            </div>
            <div className="text-sm font-semibold theme-text-primary mt-1">
              Versión: 1.0.0
            </div>
          </div>
        </div>
      </div>

      {/* Data Seeder - Tarjeta Destacada */}
      <div className="mb-8">
        <div
          onClick={() => navigate('/admin/data-seeder')}
          className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-6 cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Zap className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">🌱 Generador de Datos de Prueba</h2>
                <p className="text-green-50 text-sm">
                  Herramienta modular para poblar la base de datos con información de prueba consistente y realista
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-xs font-semibold">
                    8 Módulos Disponibles
                  </span>
                  <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-xs font-semibold">
                    ~300 Registros
                  </span>
                  <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-xs font-semibold">
                    Solo Desarrollo
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xl font-bold">
              <span>Abrir Herramienta</span>
              <ArrowRight className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="theme-bg-card rounded-lg p-4 border theme-border-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm theme-text-secondary">Total Documentos</p>
              <p className="text-2xl font-bold theme-text-primary">{documentos.length}</p>
            </div>
            <BookOpen className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="theme-bg-card rounded-lg p-4 border theme-border-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm theme-text-secondary">Suites de Pruebas</p>
              <p className="text-2xl font-bold theme-text-primary">5</p>
            </div>
            <TestTube className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        <div className="theme-bg-card rounded-lg p-4 border theme-border-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm theme-text-secondary">Scripts SQL</p>
              <p className="text-2xl font-bold theme-text-primary">2</p>
            </div>
            <Database className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="theme-bg-card rounded-lg p-4 border theme-border-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm theme-text-secondary">Documentos Nuevos</p>
              <p className="text-2xl font-bold theme-text-primary">
                {documentos.filter(d => d.estado === 'nuevo').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Documentos por Categoría */}
      {Object.entries(categorias).map(([key, cat]) => {
        const docs = documentos.filter(d => d.categoria === key);
        if (docs.length === 0) return null;

        const IconComponent = cat.icon;

        return (
          <div key={key} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 ${cat.color} rounded-lg flex items-center justify-center`}>
                <IconComponent className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold theme-text-primary">{cat.nombre}</h2>
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-semibold rounded-full">
                {docs.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {docs.map(doc => (
                <div
                  key={doc.id}
                  className="theme-bg-card rounded-lg p-5 border theme-border-primary hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => window.open(doc.url, '_blank')}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${cat.color} bg-opacity-10 rounded-lg flex items-center justify-center`}>
                        {doc.icono}
                      </div>
                      <div>
                        <h3 className="font-semibold theme-text-primary group-hover:text-blue-600 transition-colors">
                          {doc.titulo}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs theme-text-secondary">{doc.fecha}</span>
                          <span className="text-xs theme-text-secondary">•</span>
                          <span className="text-xs theme-text-secondary">v{doc.version}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {estadoBadge(doc.estado)}
                      <ExternalLink className="w-4 h-4 theme-text-secondary group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                  <p className="text-sm theme-text-secondary mb-3">
                    {doc.descripcion}
                  </p>
                  <button
                    className="w-full px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(doc.url, '_blank');
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir en GitHub
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Footer Info */}
      <div className="mt-12 theme-bg-card rounded-lg p-6 border theme-border-primary">
        <div className="flex items-start gap-4">
          <CheckCircle className="w-6 h-6 text-green-500 mt-1" />
          <div>
            <h3 className="font-semibold theme-text-primary mb-2">Acceso Rápido</h3>
            <p className="text-sm theme-text-secondary mb-4">
              Todos los documentos están alojados en GitHub en la rama <code className="px-2 py-1 bg-gray-100 rounded text-xs">claude/fix-code-execution-error-01Rp5sWsxwqt1KdNKLB3fiCS</code>
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://github.com/rrojaszarate-sys/ERP-777-V01/tree/claude/fix-code-execution-error-01Rp5sWsxwqt1KdNKLB3fiCS"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Ver Repositorio Completo
              </a>
              <a
                href="https://github.com/rrojaszarate-sys/ERP-777-V01/tree/claude/fix-code-execution-error-01Rp5sWsxwqt1KdNKLB3fiCS/cypress/e2e/eventos-erp"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <TestTube className="w-4 h-4" />
                Ver Pruebas Automatizadas
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
