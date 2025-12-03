import React, { useState, useMemo } from 'react';
import {
  Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Button, Input, Select, SelectItem, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Textarea, Spinner
} from '@nextui-org/react';
import {
  Plus, Calendar, Clock, DollarSign, CheckCircle, XCircle, Download,
  ChevronLeft, ChevronRight, Edit2, Trash2
} from 'lucide-react';
import { useProyectos, useTareas, useRegistrosTiempo, useCreateRegistroTiempo, useDeleteRegistroTiempo, useApproveRegistroTiempo } from '../hooks/useProyectos';
import toast from 'react-hot-toast';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

export const TimesheetPage: React.FC = () => {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filtroProyecto, setFiltroProyecto] = useState('');
  const [filtroAprobado, setFiltroAprobado] = useState('');
  const [viewMode, setViewMode] = useState<'week' | 'list'>('list');

  const [formData, setFormData] = useState({
    proyecto_id: '', tarea_id: '', fecha: format(new Date(), 'yyyy-MM-dd'),
    horas: '', descripcion: '', facturable: true
  });

  const { data: proyectos } = useProyectos();
  const { data: tareasData } = useTareas(formData.proyecto_id ? { proyecto_id: Number(formData.proyecto_id) } : undefined);
  const { data: registrosData, isLoading } = useRegistrosTiempo({
    proyecto_id: filtroProyecto ? Number(filtroProyecto) : undefined
  });
  const createRegistro = useCreateRegistroTiempo();
  const deleteRegistro = useDeleteRegistroTiempo();
  const approveRegistro = useApproveRegistroTiempo();

  const registros = registrosData || [];
  const tareas = tareasData || [];

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const registrosFiltrados = useMemo(() => {
    let filtered = registros;
    if (filtroAprobado === 'aprobado') filtered = filtered.filter(r => r.aprobado);
    else if (filtroAprobado === 'pendiente') filtered = filtered.filter(r => !r.aprobado);
    return filtered;
  }, [registros, filtroAprobado]);

  const stats = useMemo(() => {
    const totalHoras = registrosFiltrados.reduce((sum, r) => sum + r.horas, 0);
    const horasFacturables = registrosFiltrados.filter(r => r.facturable).reduce((sum, r) => sum + r.horas, 0);
    const horasAprobadas = registrosFiltrados.filter(r => r.aprobado).reduce((sum, r) => sum + r.horas, 0);
    const ingresoEstimado = registrosFiltrados.reduce((sum, r) => sum + (r.horas * r.precio_hora), 0);
    const costoTotal = registrosFiltrados.reduce((sum, r) => sum + (r.horas * r.costo_hora), 0);
    return { totalHoras, horasFacturables, horasAprobadas, ingresoEstimado, costoTotal };
  }, [registrosFiltrados]);

  const handlePrevWeek = () => setSelectedWeek(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setSelectedWeek(prev => addWeeks(prev, 1));
  const handleToday = () => setSelectedWeek(new Date());

  const handleCreate = () => {
    setFormData({ proyecto_id: '', tarea_id: '', fecha: format(new Date(), 'yyyy-MM-dd'), horas: '', descripcion: '', facturable: true });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar este registro?')) {
      try {
        await deleteRegistro.mutateAsync(id);
        toast.success('Registro eliminado');
      } catch (error) {
        toast.error('Error al eliminar');
      }
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await approveRegistro.mutateAsync(id);
      toast.success('Registro aprobado');
    } catch (error) {
      toast.error('Error al aprobar');
    }
  };

  const handleSave = async () => {
    if (!formData.proyecto_id || !formData.fecha || !formData.horas) {
      toast.error('Complete los campos requeridos');
      return;
    }
    const horas = parseFloat(formData.horas);
    if (isNaN(horas) || horas <= 0 || horas > 24) {
      toast.error('Horas debe ser entre 0 y 24');
      return;
    }
    try {
      await createRegistro.mutateAsync({
        proyecto_id: Number(formData.proyecto_id),
        tarea_id: formData.tarea_id ? Number(formData.tarea_id) : null,
        fecha: formData.fecha,
        horas: horas,
        descripcion: formData.descripcion,
        facturable: formData.facturable,
        costo_hora: 100,
        precio_hora: formData.facturable ? 150 : 0
      });
      toast.success('Registro creado');
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Error al guardar');
    }
  };

  const exportToCSV = () => {
    const headers = ['Fecha', 'Proyecto', 'Tarea', 'Horas', 'Descripción', 'Facturable', 'Aprobado'];
    const rows = registrosFiltrados.map(r => [
      r.fecha,
      proyectos?.find(p => p.id === r.proyecto_id)?.nombre || '',
      tareas.find(t => t.id === r.tarea_id)?.nombre || '-',
      r.horas, r.descripcion || '', r.facturable ? 'Sí' : 'No', r.aprobado ? 'Sí' : 'No'
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Spinner size="lg" /><span className="ml-3">Cargando...</span></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Registro de Tiempo</h1>
          <p className="text-gray-500 mt-1">Control de horas trabajadas</p>
        </div>
        <Button color="primary" onPress={handleCreate} startContent={<Plus className="w-4 h-4" />}>
          Registrar Horas
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardBody className="flex flex-row items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-100"><Clock className="w-6 h-6 text-blue-600" /></div>
          <div><p className="text-sm text-gray-500">Total Horas</p><p className="text-2xl font-bold">{stats.totalHoras}h</p></div>
        </CardBody></Card>
        <Card><CardBody className="flex flex-row items-center gap-4">
          <div className="p-3 rounded-lg bg-green-100"><DollarSign className="w-6 h-6 text-green-600" /></div>
          <div><p className="text-sm text-gray-500">Facturables</p><p className="text-2xl font-bold">{stats.horasFacturables}h</p></div>
        </CardBody></Card>
        <Card><CardBody className="flex flex-row items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-100"><CheckCircle className="w-6 h-6 text-purple-600" /></div>
          <div><p className="text-sm text-gray-500">Aprobadas</p><p className="text-2xl font-bold">{stats.horasAprobadas}h</p></div>
        </CardBody></Card>
        <Card><CardBody className="flex flex-row items-center gap-4">
          <div className="p-3 rounded-lg bg-yellow-100"><DollarSign className="w-6 h-6 text-yellow-600" /></div>
          <div><p className="text-sm text-gray-500">Ingreso Est.</p><p className="text-2xl font-bold">${stats.ingresoEstimado.toLocaleString()}</p></div>
        </CardBody></Card>
        <Card><CardBody className="flex flex-row items-center gap-4">
          <div className="p-3 rounded-lg bg-red-100"><DollarSign className="w-6 h-6 text-red-600" /></div>
          <div><p className="text-sm text-gray-500">Costo Total</p><p className="text-2xl font-bold">${stats.costoTotal.toLocaleString()}</p></div>
        </CardBody></Card>
      </div>

      {/* Filters */}
      <Card><CardBody>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <Select label="Proyecto" selectedKeys={filtroProyecto ? [filtroProyecto] : []} onSelectionChange={(keys) => setFiltroProyecto(Array.from(keys)[0] as string || '')} className="md:w-48">
            {(proyectos || []).map(p => <SelectItem key={p.id.toString()} value={p.id.toString()}>{p.nombre}</SelectItem>)}
          </Select>
          <Select label="Estado" selectedKeys={filtroAprobado ? [filtroAprobado] : []} onSelectionChange={(keys) => setFiltroAprobado(Array.from(keys)[0] as string || '')} className="md:w-40">
            <SelectItem key="aprobado" value="aprobado">Aprobados</SelectItem>
            <SelectItem key="pendiente" value="pendiente">Pendientes</SelectItem>
          </Select>
          <Button variant="bordered" onPress={exportToCSV} startContent={<Download className="w-4 h-4" />}>Exportar CSV</Button>
        </div>
      </CardBody></Card>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow p-4">
        <Button variant="light" onPress={handlePrevWeek} startContent={<ChevronLeft className="w-4 h-4" />}>Anterior</Button>
        <div className="text-center">
          <p className="font-semibold">{format(weekStart, 'dd MMM', { locale: es })} - {format(weekEnd, 'dd MMM yyyy', { locale: es })}</p>
          <Button size="sm" variant="light" onPress={handleToday}>Hoy</Button>
        </div>
        <Button variant="light" onPress={handleNextWeek} endContent={<ChevronRight className="w-4 h-4" />}>Siguiente</Button>
      </div>

      {/* Table */}
      <Card><CardBody>
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
          <TableBody emptyContent="No hay registros">
            {registrosFiltrados.map(registro => (
              <TableRow key={registro.id}>
                <TableCell>{format(new Date(registro.fecha), 'dd/MM/yyyy')}</TableCell>
                <TableCell>{proyectos?.find(p => p.id === registro.proyecto_id)?.nombre || '-'}</TableCell>
                <TableCell>{registro.tarea_id ? (tareas.find(t => t.id === registro.tarea_id)?.nombre || '-') : '-'}</TableCell>
                <TableCell><span className="font-semibold">{registro.horas}h</span></TableCell>
                <TableCell><span className="text-sm text-gray-600 truncate max-w-xs block">{registro.descripcion || '-'}</span></TableCell>
                <TableCell>{registro.facturable ? <Chip size="sm" color="success">Sí</Chip> : <Chip size="sm" color="default">No</Chip>}</TableCell>
                <TableCell>{registro.aprobado ? <Chip size="sm" color="success" startContent={<CheckCircle className="w-3 h-3" />}>Aprobado</Chip> : <Chip size="sm" color="warning">Pendiente</Chip>}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {!registro.aprobado && <Button size="sm" color="success" variant="flat" onPress={() => handleApprove(registro.id)}>Aprobar</Button>}
                    <Button size="sm" color="danger" variant="flat" isIconOnly onPress={() => handleDelete(registro.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardBody></Card>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg">
        <ModalContent>
          <ModalHeader>Registrar Horas</ModalHeader>
          <ModalBody>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Proyecto *" selectedKeys={formData.proyecto_id ? [formData.proyecto_id] : []} onSelectionChange={(keys) => setFormData(prev => ({ ...prev, proyecto_id: Array.from(keys)[0] as string || '', tarea_id: '' }))}>
                {(proyectos || []).map(p => <SelectItem key={p.id.toString()} value={p.id.toString()}>{p.nombre}</SelectItem>)}
              </Select>
              <Select label="Tarea (opcional)" selectedKeys={formData.tarea_id ? [formData.tarea_id] : []} onSelectionChange={(keys) => setFormData(prev => ({ ...prev, tarea_id: Array.from(keys)[0] as string || '' }))} isDisabled={!formData.proyecto_id}>
                {tareas.map(t => <SelectItem key={t.id.toString()} value={t.id.toString()}>{t.nombre}</SelectItem>)}
              </Select>
              <Input type="date" label="Fecha *" value={formData.fecha} onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))} />
              <Input type="number" label="Horas *" value={formData.horas} onChange={(e) => setFormData(prev => ({ ...prev, horas: e.target.value }))} min="0.5" max="24" step="0.5" />
            </div>
            <Textarea label="Descripción" value={formData.descripcion} onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.facturable} onChange={(e) => setFormData(prev => ({ ...prev, facturable: e.target.checked }))} className="w-4 h-4" />
              <span>Facturable</span>
            </label>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button color="primary" onPress={handleSave} isLoading={createRegistro.isPending}>Guardar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
