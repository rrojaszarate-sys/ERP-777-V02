/**
 * Página de Solicitud de Acceso
 * Formulario para que nuevos usuarios soliciten acceso al sistema
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, User, Briefcase, Phone, FileText,
  Send, Loader2, CheckCircle, ArrowLeft, AlertCircle
} from 'lucide-react';
import { supabase } from '../../core/config/supabase';
import { createAccessRequest } from '../../core/auth/services/authService';
import toast from 'react-hot-toast';

export const RequestAccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [userData, setUserData] = useState<{
    email: string;
    name: string;
    given_name: string;
    family_name: string;
    avatar: string;
    google_id: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    empresa_solicitada: '',
    puesto_solicitado: '',
    telefono: '',
    motivo: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate('/login');
        return;
      }

      const metadata = session.user.user_metadata;
      setUserData({
        email: session.user.email!,
        name: metadata?.full_name || metadata?.name || '',
        given_name: metadata?.given_name || metadata?.name?.split(' ')[0] || '',
        family_name: metadata?.family_name || metadata?.name?.split(' ').slice(1).join(' ') || '',
        avatar: metadata?.avatar_url || metadata?.picture || '',
        google_id: metadata?.provider_id || session.user.id,
      });
    } catch (err) {
      console.error('Error cargando datos:', err);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.puesto_solicitado.trim()) {
      newErrors.puesto_solicitado = 'El puesto es requerido';
    }

    if (!formData.motivo.trim()) {
      newErrors.motivo = 'Por favor indica el motivo de tu solicitud';
    } else if (formData.motivo.length < 20) {
      newErrors.motivo = 'El motivo debe tener al menos 20 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !userData) return;

    setSubmitting(true);

    try {
      await createAccessRequest({
        google_id: userData.google_id,
        email: userData.email,
        nombre: userData.given_name,
        apellido: userData.family_name,
        avatar_url: userData.avatar,
        empresa_solicitada: formData.empresa_solicitada,
        puesto_solicitado: formData.puesto_solicitado,
        motivo: formData.motivo,
        telefono: formData.telefono,
      });

      setSubmitted(true);
      toast.success('Solicitud enviada correctamente');

    } catch (err: any) {
      console.error('Error enviando solicitud:', err);
      toast.error(err.message || 'Error al enviar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Solicitud Enviada</h2>
            <p className="text-gray-500 mt-3">
              Tu solicitud de acceso ha sido enviada correctamente.
              Un administrador la revisará y recibirás una notificación por correo.
            </p>

            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-800">
                <strong>Correo de notificación:</strong><br />
                {userData?.email}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="mt-6 w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitud de Acceso</h1>
          <p className="text-gray-500 mt-2">Completa el formulario para solicitar acceso al ERP</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* User info header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <div className="flex items-center gap-4">
              {userData?.avatar ? (
                <img
                  src={userData.avatar}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full border-2 border-white/50"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <User className="w-8 h-8" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-lg">{userData?.name}</h3>
                <p className="text-blue-100">{userData?.email}</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Empresa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-2" />
                Empresa / Departamento
              </label>
              <input
                type="text"
                value={formData.empresa_solicitada}
                onChange={(e) => handleChange('empresa_solicitada', e.target.value)}
                placeholder="Ej: MADE Events, GNI Producción..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Puesto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Briefcase className="w-4 h-4 inline mr-2" />
                Puesto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.puesto_solicitado}
                onChange={(e) => handleChange('puesto_solicitado', e.target.value)}
                placeholder="Ej: Ejecutivo de Eventos, Coordinador..."
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all ${
                  errors.puesto_solicitado ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              />
              {errors.puesto_solicitado && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.puesto_solicitado}
                </p>
              )}
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Teléfono de contacto
              </label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                placeholder="Ej: 55 1234 5678"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-2" />
                Motivo de la solicitud <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.motivo}
                onChange={(e) => handleChange('motivo', e.target.value)}
                placeholder="Explica brevemente por qué necesitas acceso al sistema y qué funcionalidades utilizarás..."
                rows={4}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all resize-none ${
                  errors.motivo ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              />
              {errors.motivo && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.motivo}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Mínimo 20 caracteres ({formData.motivo.length}/20)
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar Solicitud
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Tu solicitud será revisada por un administrador.
            <br />
            Recibirás una notificación por correo cuando sea procesada.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RequestAccessPage;
