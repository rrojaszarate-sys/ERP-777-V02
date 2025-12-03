/**
 * Gestor de Usuarios por Empresa - FASE 6
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
  User,
  Chip,
  Button,
  Input,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
  Spinner,
  Badge,
  Tooltip,
  Divider
} from '@nextui-org/react';
import {
  Users,
  Search,
  Plus,
  MoreVertical,
  Edit,
  UserMinus,
  UserCheck,
  Shield,
  Mail,
  Clock,
  Send
} from 'lucide-react';
import {
  useUsuariosEmpresa,
  useRolesEmpresa,
  useToggleUsuario,
  useAsignarRoles,
  useInvitaciones,
  useCreateInvitacion,
  useCancelarInvitacion,
  useReenviarInvitacion
} from '../hooks/useEmpresas';
import type { Empresa, UsuarioEmpresa, RolEmpresa, Invitacion, InvitacionFormData } from '../types';

interface UsuariosManagerProps {
  empresa: Empresa;
}

export function UsuariosManager({ empresa }: UsuariosManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsuario, setSelectedUsuario] = useState<UsuarioEmpresa | null>(null);
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [inviteForm, setInviteForm] = useState<InvitacionFormData>({
    email: '',
    nombre: ''
  });

  const { data: usuarios, isLoading: loadingUsuarios } = useUsuariosEmpresa(empresa.id);
  const { data: roles } = useRolesEmpresa(empresa.id);
  const { data: invitaciones } = useInvitaciones(empresa.id, 'pendiente');

  const toggleUsuario = useToggleUsuario();
  const asignarRoles = useAsignarRoles();
  const createInvitacion = useCreateInvitacion();
  const cancelarInvitacion = useCancelarInvitacion();
  const reenviarInvitacion = useReenviarInvitacion();

  const usuariosFiltrados = usuarios?.filter(u =>
    u.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleUsuario = async (usuario: UsuarioEmpresa) => {
    await toggleUsuario.mutateAsync({
      id: usuario.id,
      activo: !usuario.activo
    });
  };

  const handleOpenRolesModal = (usuario: UsuarioEmpresa) => {
    setSelectedUsuario(usuario);
    setSelectedRoles(usuario.roles.map(r => r.id));
    setIsRolesModalOpen(true);
  };

  const handleSaveRoles = async () => {
    if (!selectedUsuario) return;

    await asignarRoles.mutateAsync({
      userId: selectedUsuario.id,
      roleIds: selectedRoles
    });

    setIsRolesModalOpen(false);
    setSelectedUsuario(null);
  };

  const handleInvitar = async () => {
    await createInvitacion.mutateAsync(inviteForm);
    setIsInviteModalOpen(false);
    setInviteForm({ email: '', nombre: '' });
  };

  const formatLastLogin = (date?: string) => {
    if (!date) return 'Nunca';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return d.toLocaleDateString();
  };

  // Estadísticas
  const totalUsuarios = usuarios?.length || 0;
  const usuariosActivos = usuarios?.filter(u => u.activo).length || 0;
  const invitacionesPendientes = invitaciones?.length || 0;
  const limiteUsuarios = empresa.max_usuarios;

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="flex flex-row items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalUsuarios}</p>
              <p className="text-xs text-gray-500">Total Usuarios</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-3">
            <div className="p-2 bg-success-100 rounded-lg">
              <UserCheck className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{usuariosActivos}</p>
              <p className="text-xs text-gray-500">Activos</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-3">
            <div className="p-2 bg-warning-100 rounded-lg">
              <Mail className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{invitacionesPendientes}</p>
              <p className="text-xs text-gray-500">Invitaciones Pendientes</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-3">
            <div className="p-2 bg-default-100 rounded-lg">
              <Shield className="w-5 h-5 text-default-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalUsuarios}/{limiteUsuarios}</p>
              <p className="text-xs text-gray-500">Límite del Plan</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Lista de Usuarios */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Usuarios de la Empresa</h3>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Buscar usuario..."
              startContent={<Search className="w-4 h-4 text-gray-400" />}
              size="sm"
              className="w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button
              color="primary"
              startContent={<Plus className="w-4 h-4" />}
              size="sm"
              onPress={() => setIsInviteModalOpen(true)}
              isDisabled={totalUsuarios >= limiteUsuarios}
            >
              Invitar Usuario
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {loadingUsuarios ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <Table aria-label="Usuarios de la empresa">
              <TableHeader>
                <TableColumn>USUARIO</TableColumn>
                <TableColumn>PUESTO</TableColumn>
                <TableColumn>ROLES</TableColumn>
                <TableColumn>ÚLTIMO ACCESO</TableColumn>
                <TableColumn>ESTADO</TableColumn>
                <TableColumn>ACCIONES</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No hay usuarios">
                {(usuariosFiltrados || []).map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell>
                      <User
                        name={usuario.nombre_completo}
                        description={usuario.email}
                        avatarProps={{
                          src: usuario.avatar_url || undefined,
                          name: usuario.nombre_completo.charAt(0)
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{usuario.puesto || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {usuario.roles.map(rol => (
                          <Chip
                            key={rol.id}
                            size="sm"
                            color={rol.es_admin ? 'danger' : 'default'}
                            variant="flat"
                          >
                            {rol.nombre}
                          </Chip>
                        ))}
                        {usuario.roles.length === 0 && (
                          <span className="text-xs text-gray-400">Sin roles</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatLastLogin(usuario.ultimo_login)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={usuario.activo ? 'success' : 'default'}
                        variant="flat"
                      >
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <Dropdown>
                        <DropdownTrigger>
                          <Button isIconOnly size="sm" variant="light">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu aria-label="Acciones">
                          <DropdownItem
                            key="roles"
                            startContent={<Shield className="w-4 h-4" />}
                            onPress={() => handleOpenRolesModal(usuario)}
                          >
                            Asignar Roles
                          </DropdownItem>
                          <DropdownItem
                            key="toggle"
                            startContent={usuario.activo ?
                              <UserMinus className="w-4 h-4" /> :
                              <UserCheck className="w-4 h-4" />
                            }
                            onPress={() => handleToggleUsuario(usuario)}
                            color={usuario.activo ? 'danger' : 'success'}
                          >
                            {usuario.activo ? 'Desactivar' : 'Activar'}
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

      {/* Invitaciones Pendientes */}
      {invitaciones && invitaciones.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-warning" />
              <h3 className="text-lg font-semibold">Invitaciones Pendientes</h3>
              <Badge content={invitaciones.length} color="warning" size="sm" />
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {invitaciones.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 bg-warning-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-warning" />
                    <div>
                      <p className="font-medium">{inv.nombre || inv.email}</p>
                      <p className="text-xs text-gray-500">{inv.email}</p>
                      {inv.rol_nombre && (
                        <Chip size="sm" variant="flat" className="mt-1">
                          {inv.rol_nombre}
                        </Chip>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      Expira: {new Date(inv.fecha_expiracion).toLocaleDateString()}
                    </span>
                    <Tooltip content="Reenviar">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        onPress={() => reenviarInvitacion.mutate(inv.id)}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Cancelar">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        color="danger"
                        onPress={() => cancelarInvitacion.mutate(inv.id)}
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Modal de Roles */}
      <Modal isOpen={isRolesModalOpen} onClose={() => setIsRolesModalOpen(false)}>
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Asignar Roles a {selectedUsuario?.nombre_completo}
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-3">
              {roles?.map(rol => (
                <div
                  key={rol.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRoles.includes(rol.id)
                      ? 'border-primary bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    if (selectedRoles.includes(rol.id)) {
                      setSelectedRoles(selectedRoles.filter(id => id !== rol.id));
                    } else {
                      setSelectedRoles([...selectedRoles, rol.id]);
                    }
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{rol.nombre}</span>
                      {rol.es_admin && (
                        <Chip size="sm" color="danger" variant="flat">Admin</Chip>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{rol.descripcion}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(rol.id)}
                    readOnly
                    className="w-4 h-4"
                  />
                </div>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setIsRolesModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              color="primary"
              onPress={handleSaveRoles}
              isLoading={asignarRoles.isPending}
            >
              Guardar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de Invitación */}
      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)}>
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Invitar Nuevo Usuario
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Email"
                placeholder="usuario@ejemplo.com"
                type="email"
                isRequired
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
              <Input
                label="Nombre (opcional)"
                placeholder="Nombre del usuario"
                value={inviteForm.nombre || ''}
                onChange={(e) => setInviteForm({ ...inviteForm, nombre: e.target.value })}
              />
              <Select
                label="Rol inicial (opcional)"
                placeholder="Seleccionar rol"
                selectedKeys={inviteForm.role_id ? [String(inviteForm.role_id)] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0];
                  setInviteForm({ ...inviteForm, role_id: selected ? Number(selected) : undefined });
                }}
              >
                {(roles || []).map(rol => (
                  <SelectItem key={rol.id} value={rol.id}>
                    {rol.nombre}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setIsInviteModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              color="primary"
              onPress={handleInvitar}
              isLoading={createInvitacion.isPending}
              isDisabled={!inviteForm.email}
            >
              Enviar Invitación
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

export default UsuariosManager;
