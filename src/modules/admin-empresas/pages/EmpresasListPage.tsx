/**
 * Página de Lista de Empresas - FASE 6
 */
import { useState } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Button,
  Input,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Spinner,
  Avatar,
  Progress
} from '@nextui-org/react';
import {
  Building2,
  Search,
  Plus,
  MoreVertical,
  Edit,
  Eye,
  Settings,
  Users,
  Package,
  Image as ImageIcon,
  Power,
  Crown,
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEmpresas, useCreateEmpresa, useToggleEmpresa } from '../hooks/useEmpresas';
import { EmpresaForm } from '../components/EmpresaForm';
import type { EmpresaStats, EmpresaFormData } from '../types';
import { PLANES } from '../types';

export function EmpresasListPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: empresas, isLoading } = useEmpresas();
  const createEmpresa = useCreateEmpresa();
  const toggleEmpresa = useToggleEmpresa();

  const empresasFiltradas = empresas?.filter(e =>
    e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.rfc?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async (data: EmpresaFormData) => {
    await createEmpresa.mutateAsync(data);
    setIsFormOpen(false);
  };

  const getPlanChip = (plan: string) => {
    const colors: Record<string, 'default' | 'primary' | 'success'> = {
      basic: 'default',
      pro: 'primary',
      enterprise: 'success'
    };
    return (
      <Chip
        size="sm"
        color={colors[plan] || 'default'}
        variant="flat"
        startContent={plan === 'enterprise' ? <Crown className="w-3 h-3" /> : null}
      >
        {PLANES[plan as keyof typeof PLANES]?.nombre || plan}
      </Chip>
    );
  };

  const getEstadoPlanChip = (estado: string) => {
    const config: Record<string, { color: 'success' | 'warning' | 'danger' | 'default'; label: string }> = {
      activo: { color: 'success', label: 'Activo' },
      por_expirar: { color: 'warning', label: 'Por expirar' },
      expirado: { color: 'danger', label: 'Expirado' },
      sin_expiracion: { color: 'default', label: 'Sin límite' }
    };
    const { color, label } = config[estado] || { color: 'default', label: estado };
    return (
      <Chip size="sm" color={color} variant="flat">
        {label}
      </Chip>
    );
  };

  // Estadísticas generales
  const totalEmpresas = empresas?.length || 0;
  const empresasActivas = empresas?.filter(e => e.activo).length || 0;
  const empresasPorExpirar = empresas?.filter(e => e.estado_plan === 'por_expirar').length || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-7 h-7 text-primary" />
            Administración de Empresas
          </h1>
          <p className="text-gray-500">Gestiona las empresas del sistema</p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={() => setIsFormOpen(true)}
        >
          Nueva Empresa
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="flex flex-row items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalEmpresas}</p>
              <p className="text-xs text-gray-500">Total Empresas</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-3">
            <div className="p-2 bg-success-100 rounded-lg">
              <Power className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{empresasActivas}</p>
              <p className="text-xs text-gray-500">Activas</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-3">
            <div className="p-2 bg-warning-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{empresasPorExpirar}</p>
              <p className="text-xs text-gray-500">Por Expirar</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-3">
            <div className="p-2 bg-secondary-100 rounded-lg">
              <Users className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {empresas?.reduce((sum, e) => sum + (e.total_usuarios || 0), 0) || 0}
              </p>
              <p className="text-xs text-gray-500">Total Usuarios</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Lista de Empresas */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Empresas Registradas</h3>
          <Input
            placeholder="Buscar empresa..."
            startContent={<Search className="w-4 h-4 text-gray-400" />}
            size="sm"
            className="w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <Table aria-label="Lista de empresas">
              <TableHeader>
                <TableColumn>EMPRESA</TableColumn>
                <TableColumn>PLAN</TableColumn>
                <TableColumn>USUARIOS</TableColumn>
                <TableColumn>MÓDULOS</TableColumn>
                <TableColumn>ESTADO PLAN</TableColumn>
                <TableColumn>ESTADO</TableColumn>
                <TableColumn>ACCIONES</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No hay empresas registradas">
                {(empresasFiltradas || []).map((empresa) => (
                  <TableRow key={empresa.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={empresa.logo_principal_url || undefined}
                          name={empresa.nombre.charAt(0)}
                          size="sm"
                          className="bg-primary-100"
                        />
                        <div>
                          <p className="font-medium">{empresa.nombre}</p>
                          <p className="text-xs text-gray-500">{empresa.rfc || 'Sin RFC'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getPlanChip(empresa.plan_tipo)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{empresa.total_usuarios}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-gray-500">{empresa.max_usuarios}</span>
                      </div>
                      <Progress
                        value={(empresa.total_usuarios / empresa.max_usuarios) * 100}
                        size="sm"
                        color={empresa.total_usuarios >= empresa.max_usuarios ? 'danger' : 'primary'}
                        className="max-w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat">
                        {empresa.modulos_activos} activos
                      </Chip>
                    </TableCell>
                    <TableCell>{getEstadoPlanChip(empresa.estado_plan)}</TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={empresa.activo ? 'success' : 'default'}
                        variant="flat"
                      >
                        {empresa.activo ? 'Activa' : 'Inactiva'}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <Dropdown>
                        <DropdownTrigger>
                          <Button isIconOnly size="sm" variant="light">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu aria-label="Acciones de empresa">
                          <DropdownItem
                            key="ver"
                            startContent={<Eye className="w-4 h-4" />}
                            onPress={() => navigate(`/admin/empresas/${empresa.id}`)}
                          >
                            Ver Detalles
                          </DropdownItem>
                          <DropdownItem
                            key="usuarios"
                            startContent={<Users className="w-4 h-4" />}
                            onPress={() => navigate(`/admin/empresas/${empresa.id}/usuarios`)}
                          >
                            Usuarios
                          </DropdownItem>
                          <DropdownItem
                            key="modulos"
                            startContent={<Package className="w-4 h-4" />}
                            onPress={() => navigate(`/admin/empresas/${empresa.id}/modulos`)}
                          >
                            Módulos
                          </DropdownItem>
                          <DropdownItem
                            key="branding"
                            startContent={<ImageIcon className="w-4 h-4" />}
                            onPress={() => navigate(`/admin/empresas/${empresa.id}/branding`)}
                          >
                            Branding
                          </DropdownItem>
                          <DropdownItem
                            key="config"
                            startContent={<Settings className="w-4 h-4" />}
                            onPress={() => navigate(`/admin/empresas/${empresa.id}/configuracion`)}
                          >
                            Configuración
                          </DropdownItem>
                          <DropdownItem
                            key="toggle"
                            startContent={<Power className="w-4 h-4" />}
                            color={empresa.activo ? 'danger' : 'success'}
                            onPress={() => toggleEmpresa.mutate({ id: empresa.id, activo: !empresa.activo })}
                          >
                            {empresa.activo ? 'Desactivar' : 'Activar'}
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Modal de Crear */}
      <EmpresaForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreate}
        isLoading={createEmpresa.isPending}
      />
    </div>
  );
}

export default EmpresasListPage;
