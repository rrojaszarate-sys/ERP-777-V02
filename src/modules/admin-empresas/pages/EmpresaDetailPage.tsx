/**
 * Página de Detalle de Empresa - FASE 6
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardHeader,
  Tabs,
  Tab,
  Button,
  Chip,
  Avatar,
  Spinner,
  Divider
} from '@nextui-org/react';
import {
  Building2,
  ArrowLeft,
  Edit,
  Users,
  Package,
  Image as ImageIcon,
  Settings,
  FileText,
  Crown,
  MapPin,
  Phone,
  Mail,
  Globe,
  Shield
} from 'lucide-react';
import { useEmpresa, useUpdateEmpresa } from '../hooks/useEmpresas';
import { EmpresaForm } from '../components/EmpresaForm';
import { BrandingManager } from '../components/BrandingManager';
import { ModulosManager } from '../components/ModulosManager';
import { UsuariosManager } from '../components/UsuariosManager';
import { RolesManager } from '../components/RolesManager';
import type { EmpresaFormData } from '../types';
import { PLANES } from '../types';

export function EmpresaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('general');
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: empresa, isLoading } = useEmpresa(id!);
  const updateEmpresa = useUpdateEmpresa();

  const handleUpdate = async (data: EmpresaFormData) => {
    await updateEmpresa.mutateAsync({ id: id!, data });
    setIsEditOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="p-6">
        <Card>
          <CardBody className="text-center py-8">
            <p className="text-gray-500">Empresa no encontrada</p>
            <Button
              variant="light"
              onPress={() => navigate('/admin/empresas')}
              className="mt-4"
            >
              Volver a la lista
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            isIconOnly
            variant="light"
            onPress={() => navigate('/admin/empresas')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <Avatar
            src={empresa.logo_principal_url || undefined}
            name={empresa.nombre.charAt(0)}
            className="w-16 h-16"
            isBordered
            color="primary"
          />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{empresa.nombre}</h1>
              <Chip
                size="sm"
                color={empresa.activo ? 'success' : 'default'}
                variant="flat"
              >
                {empresa.activo ? 'Activa' : 'Inactiva'}
              </Chip>
              <Chip
                size="sm"
                color={empresa.plan_tipo === 'enterprise' ? 'success' : empresa.plan_tipo === 'pro' ? 'primary' : 'default'}
                variant="flat"
                startContent={empresa.plan_tipo === 'enterprise' ? <Crown className="w-3 h-3" /> : null}
              >
                {PLANES[empresa.plan_tipo]?.nombre}
              </Chip>
            </div>
            {empresa.nombre_comercial && (
              <p className="text-gray-500">{empresa.nombre_comercial}</p>
            )}
            <p className="text-sm text-gray-400">RFC: {empresa.rfc || 'No registrado'}</p>
          </div>
        </div>

        <Button
          color="primary"
          variant="flat"
          startContent={<Edit className="w-4 h-4" />}
          onPress={() => setIsEditOpen(true)}
        >
          Editar
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(key as string)}
        color="primary"
        variant="underlined"
      >
        <Tab
          key="general"
          title={
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>General</span>
            </div>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Información General */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Información General</h3>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Razón Social</label>
                    <p className="font-medium">{empresa.razon_social || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">RFC</label>
                    <p className="font-medium">{empresa.rfc || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Régimen Fiscal</label>
                    <p className="font-medium">{empresa.regimen_fiscal || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Código Postal</label>
                    <p className="font-medium">{empresa.codigo_postal || '-'}</p>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Contacto */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Contacto</h3>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                {empresa.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{empresa.email}</span>
                  </div>
                )}
                {empresa.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{empresa.telefono}</span>
                  </div>
                )}
                {empresa.sitio_web && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <a href={empresa.sitio_web} target="_blank" rel="noopener noreferrer" className="text-primary">
                      {empresa.sitio_web}
                    </a>
                  </div>
                )}
                {empresa.direccion && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                    <div>
                      <p>{empresa.direccion}</p>
                      {empresa.ciudad && empresa.estado && (
                        <p className="text-sm text-gray-500">
                          {empresa.ciudad}, {empresa.estado}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Plan */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Plan Actual</h3>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{PLANES[empresa.plan_tipo]?.nombre}</p>
                    <p className="text-sm text-gray-500">{PLANES[empresa.plan_tipo]?.descripcion}</p>
                  </div>
                  <p className="text-xl font-bold text-primary">
                    ${PLANES[empresa.plan_tipo]?.precio_mensual}/mes
                  </p>
                </div>
                <Divider />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Usuarios Máximos</label>
                    <p className="font-medium">{empresa.max_usuarios}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Almacenamiento</label>
                    <p className="font-medium">{empresa.max_almacenamiento_gb} GB</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Fecha Inicio</label>
                    <p className="font-medium">
                      {empresa.plan_fecha_inicio ? new Date(empresa.plan_fecha_inicio).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Fecha Fin</label>
                    <p className="font-medium">
                      {empresa.plan_fecha_fin ? new Date(empresa.plan_fecha_fin).toLocaleDateString() : 'Sin límite'}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Colores */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Colores de Marca</h3>
                </div>
              </CardHeader>
              <CardBody>
                <div className="flex gap-4">
                  <div className="text-center">
                    <div
                      className="w-12 h-12 rounded-lg mb-1"
                      style={{ backgroundColor: empresa.color_primario || '#006FEE' }}
                    />
                    <p className="text-xs text-gray-500">Primario</p>
                  </div>
                  <div className="text-center">
                    <div
                      className="w-12 h-12 rounded-lg mb-1"
                      style={{ backgroundColor: empresa.color_secundario || '#17C964' }}
                    />
                    <p className="text-xs text-gray-500">Secundario</p>
                  </div>
                  <div className="text-center">
                    <div
                      className="w-12 h-12 rounded-lg mb-1"
                      style={{ backgroundColor: empresa.color_acento || '#F5A524' }}
                    />
                    <p className="text-xs text-gray-500">Acento</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab
          key="usuarios"
          title={
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Usuarios</span>
            </div>
          }
        >
          <div className="mt-6">
            <UsuariosManager empresa={empresa} />
          </div>
        </Tab>

        <Tab
          key="roles"
          title={
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Roles</span>
            </div>
          }
        >
          <div className="mt-6">
            <RolesManager empresa={empresa} />
          </div>
        </Tab>

        <Tab
          key="modulos"
          title={
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>Módulos</span>
            </div>
          }
        >
          <div className="mt-6">
            <ModulosManager empresa={empresa} />
          </div>
        </Tab>

        <Tab
          key="branding"
          title={
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              <span>Branding</span>
            </div>
          }
        >
          <div className="mt-6">
            <BrandingManager empresa={empresa} />
          </div>
        </Tab>

        <Tab
          key="configuracion"
          title={
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span>Configuración</span>
            </div>
          }
        >
          <div className="mt-6">
            <Card>
              <CardBody className="text-center py-8 text-gray-500">
                Configuración avanzada - Próximamente
              </CardBody>
            </Card>
          </div>
        </Tab>
      </Tabs>

      {/* Modal de Editar */}
      <EmpresaForm
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleUpdate}
        empresa={empresa}
        isLoading={updateEmpresa.isPending}
      />
    </div>
  );
}

export default EmpresaDetailPage;
