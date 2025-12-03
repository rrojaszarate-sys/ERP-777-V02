/**
 * Gestión de Roles por Empresa - FASE 6
 */
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Textarea,
  Spinner,
  Tooltip,
  useDisclosure
} from '@nextui-org/react';
import {
  Plus,
  Edit2,
  Trash2,
  Shield,
  ShieldCheck,
  Users,
  Lock
} from 'lucide-react';
import { useRolesEmpresa, useCreateRol, useUpdateRol, useDeleteRol } from '../hooks/useEmpresas';
import type { Empresa, RolEmpresa, RolEmpresaFormData } from '../types';

interface RolesManagerProps {
  empresa: Empresa;
}

const COLORES_ROL = [
  { value: '#006FEE', label: 'Azul' },
  { value: '#17C964', label: 'Verde' },
  { value: '#F5A524', label: 'Naranja' },
  { value: '#F31260', label: 'Rojo' },
  { value: '#7828C8', label: 'Morado' },
  { value: '#0070F0', label: 'Celeste' },
  { value: '#71717A', label: 'Gris' }
];

const PERMISOS_DISPONIBLES = [
  { codigo: '*.*.*.*', nombre: 'Acceso Total', descripcion: 'Todos los permisos del sistema' },
  { codigo: 'eventos.*.*.*', nombre: 'Eventos - Todo', descripcion: 'Acceso completo a eventos' },
  { codigo: 'eventos.read.*.*', nombre: 'Eventos - Lectura', descripcion: 'Solo ver eventos' },
  { codigo: 'eventos.create.*.*', nombre: 'Eventos - Crear', descripcion: 'Crear nuevos eventos' },
  { codigo: 'eventos.update.*.*', nombre: 'Eventos - Editar', descripcion: 'Editar eventos existentes' },
  { codigo: 'clientes.*.*.*', nombre: 'Clientes - Todo', descripcion: 'Acceso completo a clientes' },
  { codigo: 'inventario.*.*.*', nombre: 'Inventario - Todo', descripcion: 'Acceso completo a inventario' },
  { codigo: 'gastos.*.*.*', nombre: 'Gastos - Todo', descripcion: 'Acceso completo a gastos' },
  { codigo: 'gastos.create.*.*', nombre: 'Gastos - Crear', descripcion: 'Registrar gastos' },
  { codigo: 'gastos.read.*.*', nombre: 'Gastos - Lectura', descripcion: 'Solo ver gastos' },
  { codigo: 'ingresos.*.*.*', nombre: 'Ingresos - Todo', descripcion: 'Acceso completo a ingresos' },
  { codigo: 'contabilidad.*.*.*', nombre: 'Contabilidad - Todo', descripcion: 'Acceso completo a contabilidad' },
  { codigo: 'facturacion.*.*.*', nombre: 'Facturación - Todo', descripcion: 'Acceso completo a facturación' },
  { codigo: 'reportes.*.*.*', nombre: 'Reportes - Todo', descripcion: 'Acceso a todos los reportes' },
  { codigo: 'reportes.read.*.*', nombre: 'Reportes - Lectura', descripcion: 'Solo ver reportes' },
  { codigo: '*.read.*.*', nombre: 'Solo Lectura', descripcion: 'Lectura en todos los módulos' }
];

export function RolesManager({ empresa }: RolesManagerProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingRol, setEditingRol] = useState<RolEmpresa | null>(null);
  const [selectedPermisos, setSelectedPermisos] = useState<string[]>([]);

  const { data: roles, isLoading } = useRolesEmpresa(empresa.id);
  const createRol = useCreateRol();
  const updateRol = useUpdateRol();
  const deleteRol = useDeleteRol();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<RolEmpresaFormData>({
    defaultValues: {
      nombre: '',
      descripcion: '',
      permisos: [],
      color: '#006FEE',
      es_predeterminado: false
    }
  });

  const handleOpenCreate = () => {
    setEditingRol(null);
    setSelectedPermisos([]);
    reset({
      nombre: '',
      descripcion: '',
      permisos: [],
      color: '#006FEE',
      es_predeterminado: false
    });
    onOpen();
  };

  const handleOpenEdit = (rol: RolEmpresa) => {
    setEditingRol(rol);
    setSelectedPermisos(rol.permisos);
    reset({
      nombre: rol.nombre,
      descripcion: rol.descripcion || '',
      permisos: rol.permisos,
      color: rol.color || '#006FEE',
      es_predeterminado: rol.es_predeterminado
    });
    onOpen();
  };

  const handleClose = () => {
    setEditingRol(null);
    setSelectedPermisos([]);
    reset();
    onClose();
  };

  const togglePermiso = (codigo: string) => {
    setSelectedPermisos(prev =>
      prev.includes(codigo)
        ? prev.filter(p => p !== codigo)
        : [...prev, codigo]
    );
  };

  const handleSubmitForm = async (data: RolEmpresaFormData) => {
    const formData = {
      ...data,
      permisos: selectedPermisos
    };

    if (editingRol) {
      await updateRol.mutateAsync({ id: editingRol.id, data: formData });
    } else {
      await createRol.mutateAsync(formData);
    }
    handleClose();
  };

  const handleDelete = async (rol: RolEmpresa) => {
    if (!rol.puede_eliminar) return;
    if (confirm(`¿Eliminar el rol "${rol.nombre}"?`)) {
      await deleteRol.mutateAsync(rol.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Roles de la Empresa</h3>
            <Chip size="sm" variant="flat">{roles?.length || 0} roles</Chip>
          </div>
          <Button
            color="primary"
            size="sm"
            startContent={<Plus className="w-4 h-4" />}
            onPress={handleOpenCreate}
          >
            Nuevo Rol
          </Button>
        </CardHeader>

        <CardBody>
          <Table aria-label="Roles de la empresa" removeWrapper>
            <TableHeader>
              <TableColumn>ROL</TableColumn>
              <TableColumn>DESCRIPCIÓN</TableColumn>
              <TableColumn>PERMISOS</TableColumn>
              <TableColumn>TIPO</TableColumn>
              <TableColumn width={100}>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No hay roles configurados">
              {(roles || []).map((rol) => (
                <TableRow key={rol.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: rol.color || '#006FEE' }}
                      />
                      <span className="font-medium">{rol.nombre}</span>
                      {rol.es_admin && (
                        <ShieldCheck className="w-4 h-4 text-warning" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500">
                      {rol.descripcion || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {rol.permisos.slice(0, 3).map((permiso, idx) => (
                        <Chip key={idx} size="sm" variant="flat" className="text-xs">
                          {permiso.split('.')[0]}
                        </Chip>
                      ))}
                      {rol.permisos.length > 3 && (
                        <Chip size="sm" variant="flat" className="text-xs">
                          +{rol.permisos.length - 3}
                        </Chip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {rol.es_admin ? (
                      <Chip color="warning" size="sm" variant="flat">
                        Administrador
                      </Chip>
                    ) : rol.es_predeterminado ? (
                      <Chip color="primary" size="sm" variant="flat">
                        Predeterminado
                      </Chip>
                    ) : (
                      <Chip color="default" size="sm" variant="flat">
                        Personalizado
                      </Chip>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Tooltip content="Editar">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => handleOpenEdit(rol)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                      {rol.puede_eliminar ? (
                        <Tooltip content="Eliminar">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            onPress={() => handleDelete(rol)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </Tooltip>
                      ) : (
                        <Tooltip content="Rol del sistema - No se puede eliminar">
                          <Button isIconOnly size="sm" variant="light" isDisabled>
                            <Lock className="w-4 h-4 text-gray-400" />
                          </Button>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Modal de Crear/Editar Rol */}
      <Modal isOpen={isOpen} onClose={handleClose} size="2xl">
        <ModalContent>
          <form onSubmit={handleSubmit(handleSubmitForm)}>
            <ModalHeader className="flex gap-2">
              <Shield className="w-5 h-5" />
              {editingRol ? 'Editar Rol' : 'Nuevo Rol'}
            </ModalHeader>

            <ModalBody className="gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="nombre"
                  control={control}
                  rules={{ required: 'El nombre es requerido' }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Nombre del Rol"
                      placeholder="Ej: Supervisor"
                      isRequired
                      isInvalid={!!errors.nombre}
                      errorMessage={errors.nombre?.message}
                    />
                  )}
                />

                <Controller
                  name="color"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="text-sm text-gray-600 mb-2 block">Color</label>
                      <div className="flex gap-2">
                        {COLORES_ROL.map(color => (
                          <button
                            key={color.value}
                            type="button"
                            className={`w-8 h-8 rounded-full transition-all ${
                              field.value === color.value
                                ? 'ring-2 ring-offset-2 ring-primary scale-110'
                                : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: color.value }}
                            onClick={() => field.onChange(color.value)}
                            title={color.label}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                />
              </div>

              <Controller
                name="descripcion"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    label="Descripción"
                    placeholder="Describe las responsabilidades de este rol..."
                    minRows={2}
                  />
                )}
              />

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Permisos
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border rounded-lg">
                  {PERMISOS_DISPONIBLES.map(permiso => (
                    <div
                      key={permiso.codigo}
                      className={`p-2 rounded-lg cursor-pointer transition-all ${
                        selectedPermisos.includes(permiso.codigo)
                          ? 'bg-primary-100 border-primary border-2'
                          : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => togglePermiso(permiso.codigo)}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedPermisos.includes(permiso.codigo)}
                          onChange={() => {}}
                          className="rounded"
                        />
                        <div>
                          <p className="text-sm font-medium">{permiso.nombre}</p>
                          <p className="text-xs text-gray-500">{permiso.descripcion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedPermisos.length} permisos seleccionados
                </p>
              </div>
            </ModalBody>

            <ModalFooter>
              <Button variant="light" onPress={handleClose}>
                Cancelar
              </Button>
              <Button
                color="primary"
                type="submit"
                isLoading={createRol.isPending || updateRol.isPending}
              >
                {editingRol ? 'Guardar Cambios' : 'Crear Rol'}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
}

export default RolesManager;
