/**
 * Panel de Administración de Solicitudes de Acceso
 * Permite a los admins aprobar o rechazar solicitudes de nuevos usuarios
 */

import React, { useState, useEffect } from 'react';
import {
  Users, Clock, CheckCircle, XCircle, Search,
  Filter, ChevronDown, Mail, Phone, Building2,
  Briefcase, Calendar, Eye, UserPlus, AlertCircle,
  Loader2, Shield, MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  getAllRequests,
  getRoles,
  getCompanies,
  approveAccessRequest,
  rejectAccessRequest,
  getAccessRequestStats,
  AccessRequest
} from '../../../core/auth/services/authService';
import { useAuth } from '../../../core/auth/AuthProvider';
import { Modal } from '../../../shared/components/ui/Modal';
import toast from 'react-hot-toast';

type FilterStatus = 'todas' | 'pendiente' | 'aprobada' | 'rechazada';

export const AccessRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pendientes: 0, aprobadas: 0, rechazadas: 0, total: 0 });
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pendiente');
  const [searchTerm, setSearchTerm] = useState('');
  const [roles, setRoles] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Form states
  const [approveForm, setApproveForm] = useState({ roleId: 0, companyId: '', notas: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [requestsData, rolesData, companiesData, statsData] = await Promise.all([
        getAllRequests(filterStatus),
        getRoles(),
        getCompanies(),
        getAccessRequestStats(),
      ]);

      setRequests(requestsData);
      setRoles(rolesData);
      setCompanies(companiesData);
      setStats(statsData);

      // Set default values for approve form
      if (rolesData.length > 0 && !approveForm.roleId) {
        setApproveForm(prev => ({ ...prev, roleId: rolesData[1]?.id || rolesData[0]?.id }));
      }
      if (companiesData.length > 0 && !approveForm.companyId) {
        setApproveForm(prev => ({ ...prev, companyId: companiesData[0]?.id }));
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      req.email.toLowerCase().includes(search) ||
      req.nombre.toLowerCase().includes(search) ||
      req.apellido?.toLowerCase().includes(search) ||
      req.puesto_solicitado?.toLowerCase().includes(search)
    );
  });

  const handleApprove = async () => {
    if (!selectedRequest || !user) return;
    if (!approveForm.roleId || !approveForm.companyId) {
      toast.error('Selecciona un rol y una empresa');
      return;
    }

    setProcessing(true);
    try {
      await approveAccessRequest(
        selectedRequest.id,
        approveForm.roleId,
        approveForm.companyId,
        user.id,
        approveForm.notas
      );

      toast.success(`Usuario ${selectedRequest.nombre} aprobado correctamente`);
      setShowApproveModal(false);
      setSelectedRequest(null);
      setApproveForm({ roleId: roles[1]?.id || roles[0]?.id, companyId: companies[0]?.id, notas: '' });
      loadData();
    } catch (error: any) {
      console.error('Error aprobando solicitud:', error);
      toast.error(error.message || 'Error al aprobar la solicitud');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !user) return;
    if (!rejectReason.trim()) {
      toast.error('Indica el motivo del rechazo');
      return;
    }

    setProcessing(true);
    try {
      await rejectAccessRequest(selectedRequest.id, user.id, rejectReason);

      toast.success('Solicitud rechazada');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectReason('');
      loadData();
    } catch (error: any) {
      console.error('Error rechazando solicitud:', error);
      toast.error(error.message || 'Error al rechazar la solicitud');
    } finally {
      setProcessing(false);
    }
  };

  const openApproveModal = (request: AccessRequest) => {
    setSelectedRequest(request);
    setShowApproveModal(true);
  };

  const openRejectModal = (request: AccessRequest) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const openDetailModal = (request: AccessRequest) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" />
            Pendiente
          </span>
        );
      case 'aprobada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Aprobada
          </span>
        );
      case 'rechazada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" />
            Rechazada
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-7 h-7 text-blue-600" />
            Solicitudes de Acceso
          </h1>
          <p className="text-gray-500 mt-1">
            Gestiona las solicitudes de acceso de nuevos usuarios
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pendientes</p>
              <p className="text-2xl font-bold text-amber-600">{stats.pendientes}</p>
            </div>
            <Clock className="w-10 h-10 text-amber-200" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Aprobadas</p>
              <p className="text-2xl font-bold text-green-600">{stats.aprobadas}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-200" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Rechazadas</p>
              <p className="text-2xl font-bold text-red-600">{stats.rechazadas}</p>
            </div>
            <XCircle className="w-10 h-10 text-red-200" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-700">{stats.total}</p>
            </div>
            <Users className="w-10 h-10 text-gray-200" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o puesto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status filter */}
          <div className="flex gap-2">
            {(['todas', 'pendiente', 'aprobada', 'rechazada'] as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-gray-500 mt-2">Cargando solicitudes...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-gray-500 mt-2">No hay solicitudes {filterStatus !== 'todas' ? filterStatus + 's' : ''}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Puesto
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {request.avatar_url ? (
                          <img
                            src={request.avatar_url}
                            alt=""
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {request.nombre} {request.apellido}
                          </p>
                          <p className="text-sm text-gray-500">{request.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{request.puesto_solicitado || '-'}</p>
                      <p className="text-sm text-gray-500">{request.empresa_solicitada || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">
                        {format(new Date(request.created_at), "d MMM yyyy", { locale: es })}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(request.created_at), "HH:mm", { locale: es })}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetailModal(request)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {request.status === 'pendiente' && (
                          <>
                            <button
                              onClick={() => openApproveModal(request)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Aprobar"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => openRejectModal(request)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Rechazar"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Aprobar Solicitud"
      >
        <div className="p-6 space-y-6">
          {/* User info */}
          {selectedRequest && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              {selectedRequest.avatar_url && (
                <img src={selectedRequest.avatar_url} alt="" className="w-12 h-12 rounded-full" />
              )}
              <div>
                <p className="font-semibold text-gray-900">
                  {selectedRequest.nombre} {selectedRequest.apellido}
                </p>
                <p className="text-sm text-gray-500">{selectedRequest.email}</p>
              </div>
            </div>
          )}

          {/* Role selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Shield className="w-4 h-4 inline mr-2" />
              Rol a asignar <span className="text-red-500">*</span>
            </label>
            <select
              value={approveForm.roleId}
              onChange={(e) => setApproveForm(prev => ({ ...prev, roleId: parseInt(e.target.value) }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.nombre} - {role.descripcion}
                </option>
              ))}
            </select>
          </div>

          {/* Company selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building2 className="w-4 h-4 inline mr-2" />
              Empresa <span className="text-red-500">*</span>
            </label>
            <select
              value={approveForm.companyId}
              onChange={(e) => setApproveForm(prev => ({ ...prev, companyId: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Notas (opcional)
            </label>
            <textarea
              value={approveForm.notas}
              onChange={(e) => setApproveForm(prev => ({ ...prev, notas: e.target.value }))}
              placeholder="Notas internas sobre la aprobación..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => setShowApproveModal(false)}
              className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleApprove}
              disabled={processing}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Aprobar y Crear Usuario
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Rechazar Solicitud"
      >
        <div className="p-6 space-y-6">
          {/* User info */}
          {selectedRequest && (
            <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl">
              {selectedRequest.avatar_url && (
                <img src={selectedRequest.avatar_url} alt="" className="w-12 h-12 rounded-full" />
              )}
              <div>
                <p className="font-semibold text-gray-900">
                  {selectedRequest.nombre} {selectedRequest.apellido}
                </p>
                <p className="text-sm text-gray-500">{selectedRequest.email}</p>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Motivo del rechazo <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explica el motivo del rechazo. Este mensaje será visible para el usuario."
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => setShowRejectModal(false)}
              className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleReject}
              disabled={processing || !rejectReason.trim()}
              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  Rechazar Solicitud
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Detalles de Solicitud"
      >
        {selectedRequest && (
          <div className="p-6 space-y-6">
            {/* User header */}
            <div className="flex items-center gap-4">
              {selectedRequest.avatar_url ? (
                <img src={selectedRequest.avatar_url} alt="" className="w-16 h-16 rounded-full" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedRequest.nombre} {selectedRequest.apellido}
                </h3>
                <p className="text-gray-500">{selectedRequest.email}</p>
                <div className="mt-2">{getStatusBadge(selectedRequest.status)}</div>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Briefcase className="w-4 h-4" />
                  Puesto
                </div>
                <p className="font-medium text-gray-900">{selectedRequest.puesto_solicitado || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Building2 className="w-4 h-4" />
                  Empresa
                </div>
                <p className="font-medium text-gray-900">{selectedRequest.empresa_solicitada || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Phone className="w-4 h-4" />
                  Teléfono
                </div>
                <p className="font-medium text-gray-900">{selectedRequest.telefono || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Calendar className="w-4 h-4" />
                  Fecha de solicitud
                </div>
                <p className="font-medium text-gray-900">
                  {format(new Date(selectedRequest.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                </p>
              </div>
            </div>

            {/* Motivo */}
            {selectedRequest.motivo && (
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-sm font-medium text-blue-800 mb-2">Motivo de la solicitud:</p>
                <p className="text-blue-700">{selectedRequest.motivo}</p>
              </div>
            )}

            {/* Rejection reason */}
            {selectedRequest.status === 'rechazada' && selectedRequest.motivo_rechazo && (
              <div className="p-4 bg-red-50 rounded-xl">
                <p className="text-sm font-medium text-red-800 mb-2">Motivo del rechazo:</p>
                <p className="text-red-700">{selectedRequest.motivo_rechazo}</p>
              </div>
            )}

            {/* Admin notes */}
            {selectedRequest.notas_admin && (
              <div className="p-4 bg-gray-100 rounded-xl">
                <p className="text-sm font-medium text-gray-600 mb-2">Notas del administrador:</p>
                <p className="text-gray-700">{selectedRequest.notas_admin}</p>
              </div>
            )}

            {/* Actions for pending */}
            {selectedRequest.status === 'pendiente' && (
              <div className="flex gap-4 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openApproveModal(selectedRequest);
                  }}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Aprobar
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openRejectModal(selectedRequest);
                  }}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Rechazar
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AccessRequestsPage;
