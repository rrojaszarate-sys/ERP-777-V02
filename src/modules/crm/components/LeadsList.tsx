import React, { useState } from 'react';
import { useLeads } from '../hooks';
import { Users, Plus, Edit, UserCheck, Search, TrendingUp } from 'lucide-react';
import { LeadFormModal } from './LeadFormModal';
import type { CalificacionLead, Lead } from '../types';

export const LeadsList: React.FC = () => {
  const { leads, isLoading, calificarLead } = useLeads();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | undefined>();

  const filteredLeads = leads.filter(l =>
    l.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.empresa && l.empresa.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (l.email && l.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  const getCalificacionColor = (calificacion?: CalificacionLead) => {
    switch (calificacion) {
      case 'CALIENTE': return 'bg-red-100 text-red-800';
      case 'TIBIO': return 'bg-yellow-100 text-yellow-800';
      case 'FRIO': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstatusColor = (estatus: string) => {
    switch (estatus) {
      case 'NUEVO': return 'bg-blue-100 text-blue-800';
      case 'CONTACTADO': return 'bg-purple-100 text-purple-800';
      case 'CALIFICADO': return 'bg-green-100 text-green-800';
      case 'CONVERTIDO': return 'bg-teal-100 text-teal-800';
      case 'PERDIDO': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leads</h2>
          <p className="text-gray-600 mt-1">Prospectos y oportunidades de venta</p>
        </div>
        <button
          onClick={() => {
            setSelectedLead(undefined);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Lead</span>
        </button>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, empresa o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Leads</div>
          <div className="text-2xl font-bold text-pink-600">{leads.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Nuevos</div>
          <div className="text-2xl font-bold text-blue-600">
            {leads.filter(l => l.estatus === 'NUEVO').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Calificados</div>
          <div className="text-2xl font-bold text-green-600">
            {leads.filter(l => l.estatus === 'CALIFICADO').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Convertidos</div>
          <div className="text-2xl font-bold text-teal-600">
            {leads.filter(l => l.estatus === 'CONVERTIDO').length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origen</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Calificación</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Puntuación</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estatus</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No hay leads registrados</p>
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {lead.codigo}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{lead.nombre}</div>
                    {lead.email && (
                      <div className="text-sm text-gray-500">{lead.email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lead.empresa || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lead.origen.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {lead.calificacion ? (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getCalificacionColor(lead.calificacion)}`}>
                        {lead.calificacion}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-gray-900">{lead.puntuacion || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstatusColor(lead.estatus)}`}>
                      {lead.estatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {lead.estatus === 'NUEVO' && (
                        <button
                          onClick={() => calificarLead({ id: lead.id, calificacion: 'CALIENTE' })}
                          className="text-green-600 hover:text-green-900"
                          title="Calificar"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <LeadFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedLead(undefined);
        }}
        lead={selectedLead}
      />
    </div>
  );
};
