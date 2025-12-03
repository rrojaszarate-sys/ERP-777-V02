/**
 * Página de Login del Portal de Clientes - FASE 5.2
 */
import { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Button,
  Divider,
  Link
} from '@nextui-org/react';
import { Mail, Lock, Building2, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useClienteAuth } from '../context/ClienteAuthContext';

export function ClienteLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { cliente, loading, error, loginWithToken, loginWithEmail, requestAccess } = useClienteAuth();

  const [mode, setMode] = useState<'login' | 'request'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verificar token en URL
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      handleTokenLogin(token);
    }
  }, [searchParams]);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (cliente) {
      navigate('/portal-cliente');
    }
  }, [cliente, navigate]);

  const handleTokenLogin = async (token: string) => {
    const success = await loginWithToken(token);
    if (success) {
      navigate('/portal-cliente');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsSubmitting(true);

    try {
      const success = await loginWithEmail(email, password);
      if (success) {
        navigate('/portal-cliente');
      }
    } catch (err: any) {
      setLocalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const success = await requestAccess(email);
      if (success) {
        setSuccess('Se ha enviado un enlace de acceso a su correo electrónico.');
        setEmail('');
      }
    } catch (err: any) {
      setLocalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl shadow-lg mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Portal de Clientes</h1>
          <p className="text-gray-600 mt-1">Acceda a sus facturas, eventos y documentos</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="flex flex-col gap-1 px-6 pt-6">
            <h2 className="text-xl font-semibold">
              {mode === 'login' ? 'Iniciar Sesión' : 'Solicitar Acceso'}
            </h2>
            <p className="text-sm text-gray-500">
              {mode === 'login'
                ? 'Ingrese sus credenciales para acceder'
                : 'Ingrese su correo para recibir un enlace de acceso'}
            </p>
          </CardHeader>

          <CardBody className="px-6 pb-6">
            {/* Mensajes de error o éxito */}
            {(error || localError) && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-danger-50 text-danger-700 rounded-lg">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error || localError}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-success-50 text-success-700 rounded-lg">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{success}</p>
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <Input
                  label="Correo Electrónico"
                  placeholder="cliente@empresa.com"
                  type="email"
                  value={email}
                  onValueChange={setEmail}
                  startContent={<Mail className="w-4 h-4 text-gray-400" />}
                  isRequired
                />

                <Input
                  label="Contraseña"
                  placeholder="Ingrese su contraseña"
                  type="password"
                  value={password}
                  onValueChange={setPassword}
                  startContent={<Lock className="w-4 h-4 text-gray-400" />}
                  isRequired
                />

                <Button
                  type="submit"
                  color="primary"
                  className="w-full"
                  size="lg"
                  isLoading={isSubmitting || loading}
                >
                  Iniciar Sesión
                </Button>

                <div className="text-center">
                  <Link
                    as="button"
                    type="button"
                    className="text-sm text-primary cursor-pointer"
                    onPress={() => {
                      setMode('request');
                      setLocalError(null);
                    }}
                  >
                    ¿No tiene contraseña? Solicite acceso
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRequestAccess} className="space-y-4">
                <Input
                  label="Correo Electrónico"
                  placeholder="cliente@empresa.com"
                  type="email"
                  value={email}
                  onValueChange={setEmail}
                  startContent={<Mail className="w-4 h-4 text-gray-400" />}
                  description="Ingrese el correo registrado con su empresa"
                  isRequired
                />

                <Button
                  type="submit"
                  color="primary"
                  className="w-full"
                  size="lg"
                  isLoading={isSubmitting}
                >
                  Solicitar Enlace de Acceso
                </Button>

                <div className="text-center">
                  <Link
                    as="button"
                    type="button"
                    className="text-sm text-primary cursor-pointer"
                    onPress={() => {
                      setMode('login');
                      setLocalError(null);
                      setSuccess(null);
                    }}
                  >
                    Volver a inicio de sesión
                  </Link>
                </div>
              </form>
            )}

            <Divider className="my-6" />

            {/* Información adicional */}
            <div className="text-center text-sm text-gray-500">
              <p>¿Tiene problemas para acceder?</p>
              <p>Contacte a su ejecutivo de cuenta</p>
            </div>
          </CardBody>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>MADE ERP - Portal de Clientes</p>
          <p className="mt-1">&copy; {new Date().getFullYear()} Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  );
}

export default ClienteLoginPage;
