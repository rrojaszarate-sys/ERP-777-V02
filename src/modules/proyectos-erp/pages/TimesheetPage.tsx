import React, { useState, useMemo } from 'react';
import {
  Card,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Input,
  Select,
  SelectItem,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea
} from '@nextui-org/react';
import {
  Plus,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2
} from 'lucide-react';
import type { RegistroTiempo, Proyecto, Tarea, Usuario } from '../types';
import toast from 'react-hot-toast';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

export const TimesheetPage: React.FC = () => {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<RegistroTiempo | null>(null);
  const [filtroProyecto, setFiltroProyecto] = useState('');
  const [filtroAprobado, setFiltroAprobado] = useState('');
  const [viewMode, setViewMode] = useState<'week' | 'list'>('week');

  // Form state
  const [formData, setFormData] = useState({
    proyecto_id: '',
    tarea_id: '',
    fecha: format(new Date(), 'yyyy-MM-DD'),
    horas: '',
    descripcion: '',
    facturable: true
  });

  // Mock data - en producción vendría de hooks
  const [registros] = useState<RegistroTiempo[]>([
    {
      id: 1,
      company_id: '1',
      proyecto_id: 1,
      tarea_id: 1,
      usuario_id: 'user-1',
      fecha: '2025-01-15',
      horas: 8,
      descripcion: 'Desarrollo de funcionalidad de autenticación',
      facturable: true,
      facturado: false,
      costo_hora: 100,
      precio_hora: 150,
      aprobado: true,
      aprobado_por: 'manager-1',
      aprobado_en: '2025-01-16T10:00:00',
      created_at: '',
      updated_at: ''
    },
    {
      id: 2,
      company_id: '1',
      proyecto_id: 1,
      tarea_id: 2,
      usuario_id: 'user-1',
      fecha: '2025-01-16',
      horas: 6,
      descripcion: 'Reunión de planificación y diseño de UI',
      facturable: true,
      facturado: false,
      costo_hora: 100,
      precio_hora: 150,
      aprobado: false,
      aprobado_por: null,
      aprobado_en: null,
      created_at: '',
      updated_at: ''
    },
    {
      id: 3,
      company_id: '1',
      proyecto_id: 1,
      tarea_id: null,
      usuario_id: 'user-1',
      fecha: '2025-01-17',
      horas: 4,
      descripcion: 'Capacitación interna - No facturable',
      facturable: false,
      facturado: false,
      costo_hora: 100,
      precio_hora: 0,
      aprobado: true,
      aprobado_por: 'manager-1',
      aprobado_en: '2025-01-18T09:00:00',
      created_at: '',
      updated_at: ''
    }
  ]);

  const proyectos: Proyecto[] = [
    {
      id: 1,
      company_id: '1',
      nombre: 'Proyecto Demo',
      descripcion: 'Proyecto de demostración',
      codigo: 'DEMO-001',
      cliente_id: null,
      fecha_inicio: '2025-01-01',
      fecha_fin_estimada: '2025-12-31',
      fecha_fin_real: null,
      presupuesto: 100000,
      costo_real: 0,
      ingreso_estimado: 150000,
      ingreso_real: 0,
      progreso: 0,
      etapa_id: null,
      status: 'en_progreso',
      prioridad: 'alta',
      responsable_id: null,
      tipo_facturacion: 'tiempo_material',
      privado: false,
      favorito: false,
      color: null,
      created_at: '',
      updated_at: ''
    }
  ];

  const tareas = [
    { id: 1, nombre: 'Implementar autenticación', proyecto_id: 1 },
    { id: 2, nombre: 'Diseñar interfaz de usuario', proyecto_id: 1 },
    { id: 3, nombre: 'Testing y QA', proyecto_id: 1 }
  ];

  // Calcular rango de la semana
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 }); // Lunes
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 }); // Domingo
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Filtrar registros
  const registrosFiltrados = useMemo(() => {
    let filtered = registros;

    if (filtroProyecto) {
      filtered = filtered.filter(r => r.proyecto_id === Number(filtroProyecto));
    }

    if (filtroAprobado === 'aprobado') {
      filtered = filtered.filter(r => r.aprobado);
    } else if (filtroAprobado === 'pendiente') {
      filtered = filtered.filter(r => !r.aprobado);
    }

    return filtered;
  }, [registros, filtroProyecto, filtroAprobado]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    const totalHoras = registrosFiltrados.reduce((sum, r) => sum + r.horas, 0);
    const horasFacturables = registrosFiltrados.filter(r => r.facturable).reduce((sum, r) => sum + r.horas, 0);
    const horasNoFacturables = totalHoras - horasFacturables;
    const horasAprobadas = registrosFiltrados.filter(r => r.aprobado).reduce((sum, r) => sum + r.horas, 0);
    const horasPendientes = totalHoras - horasAprobadas;
    const ingresoEstimado = registrosFiltrados.reduce((sum, r) => sum + (r.horas * r.precio_hora), 0);
    const costoTotal = registrosFiltrados.reduce((sum, r) => sum + (r.horas * r.costo_hora), 0);

    return {
      totalHoras,
      horasFacturables,
      horasNoFacturables,
      horasAprobadas,
      horasPendientes,
      ingresoEstimado,
      costoTotal,
      margen: ingresoEstimado > 0 ? ((ingresoEstimado - costoTotal) / ingresoEstimado * 100).toFixed(1) : '0.0'
    };
  }, [registrosFiltrados]);

  const handlePrevWeek = () => {
    setSelectedWeek(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setSelectedWeek(prev => addWeeks(prev, 1));
  };

  const handleToday = () => {
    setSelectedWeek(new Date());
  };

  const handleCreate = () => {
    setSelectedEntry(null);
    setFormData({
      proyecto_id: '',
      tarea_id: '',
      fecha: format(new Date(), 'yyyy-MM-DD'),
      horas: '',
      descripcion: '',
      facturable: true
    });
    setIsModalOpen(true);
  };

  const handleEdit = (entry: RegistroTiempo) => {
    setSelectedEntry(entry);
    setFormData({
      proyecto_id: entry.proyecto_id.toString(),
      tarea_id: entry.tarea_id?.toString() || '',
      fecha: entry.fecha,
      horas: entry.horas.toString(),
      descripcion: entry.descripcion || '',
      facturable: entry.facturable
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Está seguro de eliminar este registro?')) {
      try {
        // await deleteRegistro.mutateAsync(id);
        toast.success('Registro eliminado correctamente');
      } catch (error) {
        toast.error('Error al eliminar registro');
        console.error(error);
      }
    }
  };

  const handleSave = async () => {
    if (!formData.proyecto_id || !formData.fecha || !formData.horas) {
      toast.error('Por favor complete los campos requeridos');
      return;
    }

    const horas = parseFloat(formData.horas);
    if (isNaN(horas) || horas <= 0 || horas > 24) {
      toast.error('Las horas deben ser un número válido entre 0 y 24');
      return;
    }

    try {
      const data = {
        proyecto_id: Number(formData.proyecto_id),
        tarea_id: formData.tarea_id ? Number(formData.tarea_id) : null,
        fecha: formData.fecha,
        horas: horas,
        descripcion: formData.descripcion,
        facturable: formData.facturable,
        costo_hora: 100, // En producción vendría del usuario/configuración
        precio_hora: formData.facturable ? 150 : 0
      };

      if (selectedEntry) {
        // await updateRegistro.mutateAsync({ id: selectedEntry.id, data });
        toast.success('Registro actualizado correctamente');
      } else {
        // await createRegistro.mutateAsync(data);
        toast.success('Registro creado correctamente');
      }

      setIsModalOpen(false);
      setSelectedEntry(null);
    } catch (error) {
      toast.error('Error al guardar registro');
      console.error(error);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      // await approveRegistro.mutateAsync(id);
      toast.success('Registro aprobado correctamente');
    } catch (error) {
      toast.error('Error al aprobar registro');
      console.error(error);
    }
  };

  const exportToCSV = () => {
    const headers = ['Fecha', 'Proyecto', 'Tarea', 'Horas', 'Descripción', 'Facturable', 'Aprobado'];
    const rows = registrosFiltrados.map(r => [
      r.fecha,
      proyectos.find(p => p.id === r.proyecto_id)?.nombre || '',
      tareas.find(t => t.id === r.tarea_id)?.nombre || '-',
      r.horas,
      r.descripcion || '',
      r.facturable ? 'Sí' : 'No',
      r.aprobado ? 'Sí' : 'No'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Renderizar vista de semana
  const renderWeekView = () => {
    return (
      <Card>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left p-3 font-semibold">Proyecto / Tarea</th>
                  {weekDays.map(day => (
                    <th key={day.toString()} className="text-center p-3 font-semibold min-w-[100px]">
                      <div>{format(day, 'EEE', { locale: es })}</div>
                      <div className="text-xs text-gray-500">{format(day, 'dd/MM')}</div>
                    </th>
                  ))}
                  <th className="text-center p-3 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {proyectos.map(proyecto => {
                  const tareasProy = tareas.filter(t => t.proyecto_id === proyecto.id);
                  const registrosProy = registrosFiltrados.filter(r => r.proyecto_id === proyecto.id);

                  return (
                    <React.Fragment key={proyecto.id}>
                      {/* Proyecto header */}
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <td className="p-3 font-semibold" colSpan={9}>
                          {proyecto.nombre}
                        </td>
                      </tr>
                      {/* Tareas */}
                      {tareasProy.map(tarea => {
                        const registrosTarea = registrosProy.filter(r => r.tarea_id === tarea.id);
                        const totalHoras = registrosTarea.reduce((sum, r) => sum + r.horas, 0);

                        return (
                          <tr key={tarea.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3 pl-8 text-sm">{tarea.nombre}</td>
                            {weekDays.map(day => {
                              const dayStr = format(day, 'yyyy-MM-dd');
                              const registro = registrosTarea.find(r => r.fecha === dayStr);

                              return (
                                <td
                                  key={dayStr}
                                  className="p-2 text-center cursor-pointer hover:bg-blue-50"
                                  onClick={() => registro && handleEdit(registro)}
                                >
                                  {registro && (
                                    <div className="flex flex-col items-center">
                                      <span className="font-medium">{registro.horas}h</span>
                                      {registro.aprobado ? (
                                        <CheckCircle className="w-3 h-3 text-green-600" />
                                      ) : (
                                        <Clock className="w-3 h-3 text-orange-500" />
                                      )}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            <td className="p-3 text-center font-semibold">{totalHoras}h</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    );
  };

  // Renderizar vista de lista
  const renderListView = () => {
    return (
      <Card>
        <CardBody>
          <Table aria-label="Registros de tiempo">
            <TableHeader>
              <TableColumn>FECHA</TableColumn>
              <TableColumn>PROYECTO</TableColumn>
              <TableColumn>TAREA</TableColumn>
              <TableColumn>HORAS</TableColumn>
              <TableColumn>DESCRIPCIÓN</TableColumn>
              <TableColumn>FACTURABLE</TableColumn>
              <TableColumn>ESTADO</TableColumn>
              <TableColumn>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No hay registros de tiempo">
              {registrosFiltrados.map(registro => {
                const proyecto = proyectos.find(p => p.id === registro.proyecto_id);
                const tarea = tareas.find(t => t.id === registro.tarea_id);

                return (
                  <TableRow key={registro.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {format(new Date(registro.fecha), 'dd/MM/yyyy', { locale: es })}
                      </div>
                    </TableCell>
                    <TableCell>{proyecto?.nombre}</TableCell>
                    <TableCell>{tarea?.nombre || '-'}</TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat">{registro.horas}h</Chip>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">{registro.descripcion || '-'}</div>
                    </TableCell>
                    <TableCell>
                      {registro.facturable ? (
                        <Chip size="sm" color="success" variant="flat">
                          Sí (${registro.precio_hora}/h)
                        </Chip>
                      ) : (
                        <Chip size="sm" color="default" variant="flat">No</Chip>
                      )}
                    </TableCell>
                    <TableCell>
                      {registro.aprobado ? (
                        <Chip size="sm" color="success" startContent={<CheckCircle className="w-3 h-3" />}>
                          Aprobado
                        </Chip>
                      ) : (
                        <Chip size="sm" color="warning" startContent={<Clock className="w-3 h-3" />}>
                          Pendiente
                        </Chip>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => handleEdit(registro)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {!registro.aprobado && (
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="success"
                            onPress={() => handleApprove(registro.id)}
                            title="Aprobar"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => handleDelete(registro.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Timesheet</h1>
          <p className="text-gray-500 mt-1">Registro y seguimiento de tiempo</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="bordered"
            startContent={<Download className="w-4 h-4" />}
            onPress={exportToCSV}
          >
            Exportar
          </Button>
          <Button
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={handleCreate}
          >
            Nuevo Registro
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Horas</p>
              <p className="text-2xl font-bold">{stats.totalHoras}h</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Facturables</p>
              <p className="text-2xl font-bold">{stats.horasFacturables}h</p>
              <p className="text-xs text-gray-500">${stats.ingresoEstimado.toLocaleString()}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-orange-100">
              <CheckCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Aprobadas</p>
              <p className="text-2xl font-bold">{stats.horasAprobadas}h</p>
              <p className="text-xs text-gray-500">{stats.horasPendientes}h pendientes</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Margen</p>
              <p className="text-2xl font-bold">{stats.margen}%</p>
              <p className="text-xs text-gray-500">
                ${(stats.ingresoEstimado - stats.costoTotal).toLocaleString()}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filtros y navegación */}
      <Card>
        <CardBody>
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Navegación de semana */}
            <div className="flex items-center gap-3">
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                onPress={handlePrevWeek}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center min-w-[200px]">
                <div className="font-semibold">
                  {format(weekStart, 'dd MMM', { locale: es })} - {format(weekEnd, 'dd MMM yyyy', { locale: es })}
                </div>
                <button
                  onClick={handleToday}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Hoy
                </button>
              </div>
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                onPress={handleNextWeek}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-3">
              <Select
                label="Proyecto"
                selectedKeys={filtroProyecto ? [filtroProyecto] : []}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as string;
                  setFiltroProyecto(value);
                }}
                className="w-48"
                size="sm"
              >
                <SelectItem key="" value="">Todos</SelectItem>
                {proyectos.map(p => (
                  <SelectItem key={p.id.toString()} value={p.id.toString()}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </Select>

              <Select
                label="Estado"
                selectedKeys={filtroAprobado ? [filtroAprobado] : []}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as string;
                  setFiltroAprobado(value);
                }}
                className="w-40"
                size="sm"
              >
                <SelectItem key="" value="">Todos</SelectItem>
                <SelectItem key="aprobado" value="aprobado">Aprobados</SelectItem>
                <SelectItem key="pendiente" value="pendiente">Pendientes</SelectItem>
              </Select>

              {/* Toggle vista */}
              <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    viewMode === 'week'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Lista
                </button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tabla de registros */}
      {viewMode === 'week' ? renderWeekView() : renderListView()}

      {/* Modal de registro */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="2xl">
        <ModalContent>
          <ModalHeader>
            {selectedEntry ? 'Editar Registro' : 'Nuevo Registro de Tiempo'}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Proyecto *"
                  selectedKeys={formData.proyecto_id ? [formData.proyecto_id] : []}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as string;
                    setFormData(prev => ({ ...prev, proyecto_id: value, tarea_id: '' }));
                  }}
                  isRequired
                >
                  {proyectos.map(p => (
                    <SelectItem key={p.id.toString()} value={p.id.toString()}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  label="Tarea"
                  selectedKeys={formData.tarea_id ? [formData.tarea_id] : []}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as string;
                    setFormData(prev => ({ ...prev, tarea_id: value }));
                  }}
                  isDisabled={!formData.proyecto_id}
                >
                  <SelectItem key="" value="">Sin tarea específica</SelectItem>
                  {tareas
                    .filter(t => t.proyecto_id === Number(formData.proyecto_id))
                    .map(t => (
                      <SelectItem key={t.id.toString()} value={t.id.toString()}>
                        {t.nombre}
                      </SelectItem>
                    ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="date"
                  label="Fecha *"
                  value={formData.fecha}
                  onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                  isRequired
                />

                <Input
                  type="number"
                  label="Horas *"
                  value={formData.horas}
                  onChange={(e) => setFormData(prev => ({ ...prev, horas: e.target.value }))}
                  min="0"
                  max="24"
                  step="0.25"
                  placeholder="8.0"
                  isRequired
                />
              </div>

              <Textarea
                label="Descripción"
                value={formData.descripcion}
                onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Describe el trabajo realizado..."
                rows={3}
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="facturable"
                  checked={formData.facturable}
                  onChange={(e) => setFormData(prev => ({ ...prev, facturable: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="facturable" className="text-sm cursor-pointer">
                  Tiempo facturable al cliente
                </label>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              color="primary"
              onPress={handleSave}
            >
              {selectedEntry ? 'Actualizar' : 'Guardar'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
