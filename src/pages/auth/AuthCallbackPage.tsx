/**
 * Página de Callback de Autenticación
 * Maneja el flujo después del login con Google:
 * - Usuario registrado -> Dashboard
 * - Usuario pendiente -> Página de espera
 * - Usuario nuevo -> Formulario de solicitud
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, CheckCircle, Clock, XCircle, UserPlus,
  AlertCircle, Building2, ArrowRight
} from 'lucide-react';
import { supabase } from '../../core/config/supabase';
import {
  getUserStatus,
  isValidDomain,
  updateLastLogin,
  linkAuthUser
} from '../../core/auth/services/authService';

type AuthStatus = 'loading' | 'registered' | 'pending' | 'rejected' | 'new' | 'invalid_domain' | 'error';

export const AuthCallbackPage: React.FC = () => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Obtener sesión actual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.user) {
        // No hay sesión, redirigir a login
        navigate('/login');
        return;
      }

      const email = session.user.email!;
      const userMetadata = session.user.user_metadata;

      setUserData({
        email,
        name: userMetadata?.full_name || userMetadata?.name || email.split('@')[0],
        avatar: userMetadata?.avatar_url || userMetadata?.picture,
        google_id: userMetadata?.provider_id || session.user.id,
      });

      // Verificar dominio
      if (!isValidDomain(email)) {
        setStatus('invalid_domain');
        return;
      }

      // Verificar estado del usuario
      const userStatus = await getUserStatus(email);

      switch (userStatus.status) {
        case 'registered':
          // Usuario ya registrado, actualizar login y vincular auth_user_id si es necesario
          if (userStatus.user) {
            await updateLastLogin(userStatus.user.id);
            if (!userStatus.user.auth_user_id) {
              await linkAuthUser(userStatus.user.id, session.user.id);
            }
          }
          setStatus('registered');
          // Redirigir al dashboard después de 2 segundos
          setTimeout(() => navigate('/'), 2000);
          break;

        case 'pending':
          setStatus('pending');
          setUserData(prev => ({ ...prev, request: userStatus.request }));
          break;

        case 'rejected':
          setStatus('rejected');
          setUserData(prev => ({ ...prev, request: userStatus.request }));
          break;

        case 'new':
          setStatus('new');
          break;
      }

    } catch (err: any) {
      console.error('Error en callback de auth:', err);
      setError(err.message);
      setStatus('error');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center">
            <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800">Verificando acceso...</h2>
            <p className="text-gray-500 mt-2">Un momento por favor</p>
          </div>
        );

      case 'registered':
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Bienvenido de nuevo</h2>
            <p className="text-gray-500 mt-2">{userData?.name}</p>
            <p className="text-sm text-gray-400 mt-1">{userData?.email}</p>
            <div className="mt-6 flex items-center justify-center gap-2 text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Redirigiendo al dashboard...</span>
            </div>
          </div>
        );

      case 'pending':
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Solicitud en Revisión</h2>
            <p className="text-gray-500 mt-2">
              Tu solicitud de acceso está siendo revisada por un administrador
            </p>
            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>Fecha de solicitud:</strong>{' '}
                {new Date(userData?.request?.created_at).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-amber-700 mt-2">
                Te notificaremos por correo cuando tu acceso sea aprobado.
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="mt-6 text-sm text-gray-500 hover:text-gray-700"
            >
              Cerrar sesión
            </button>
          </div>
        );

      case 'rejected':
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Solicitud Rechazada</h2>
            <p className="text-gray-500 mt-2">
              Tu solicitud de acceso no fue aprobada
            </p>
            {userData?.request?.motivo_rechazo && (
              <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200 text-left">
                <p className="text-sm font-medium text-red-800">Motivo:</p>
                <p className="text-sm text-red-700 mt-1">{userData.request.motivo_rechazo}</p>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-4">
              Si crees que esto es un error, contacta a tu administrador.
            </p>
            <button
              onClick={handleLogout}
              className="mt-6 text-sm text-gray-500 hover:text-gray-700"
            >
              Cerrar sesión
            </button>
          </div>
        );

      case 'new':
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Solicitar Acceso</h2>
            <p className="text-gray-500 mt-2">
              Es tu primera vez. Completa el formulario para solicitar acceso al sistema.
            </p>

            {userData?.avatar && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <img
                  src={userData.avatar}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full border-2 border-gray-200"
                />
                <div className="text-left">
                  <p className="font-medium text-gray-800">{userData.name}</p>
                  <p className="text-sm text-gray-500">{userData.email}</p>
                </div>
              </div>
            )}

            <button
              onClick={() => navigate('/auth/request-access')}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Completar Solicitud
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleLogout}
              className="mt-4 block w-full text-sm text-gray-500 hover:text-gray-700"
            >
              Usar otra cuenta
            </button>
          </div>
        );

      case 'invalid_domain':
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Dominio No Autorizado</h2>
            <p className="text-gray-500 mt-2">
              Solo se permite el acceso con cuentas de <strong>@madegroup.mx</strong>
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">
                Cuenta utilizada: <strong>{userData?.email}</strong>
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="mt-6 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Intentar con otra cuenta
            </button>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Error de Autenticación</h2>
            <p className="text-red-600 mt-2">{error || 'Ocurrió un error inesperado'}</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Volver a intentar
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full opacity-20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-3">
            <Building2 className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
