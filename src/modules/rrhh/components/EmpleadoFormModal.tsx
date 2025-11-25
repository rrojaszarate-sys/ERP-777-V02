import React, { useState, useEffect } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { useEmpleados } from '../hooks';
import type { Empleado, TipoEmpleado, TipoContrato, EstatusEmpleado } from '../types';

interface EmpleadoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  empleado?: Empleado;
}

export const EmpleadoFormModal: React.FC<EmpleadoFormModalProps> = ({
  isOpen,
  onClose,
  empleado,
}) => {
  const { createEmpleado, updateEmpleado, isCreating, isUpdating } = useEmpleados();
  const [formData, setFormData] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    fecha_nacimiento: '',
    lugar_nacimiento: '',
    genero: '' as 'M' | 'F' | 'OTRO' | '',
    estado_civil: '' as 'SOLTERO' | 'CASADO' | 'UNION_LIBRE' | 'DIVORCIADO' | 'VIUDO' | '',
    curp: '',
    rfc: '',
    nss: '',
    email: '',
    telefono: '',
    celular: '',
    calle: '',
    numero_exterior: '',
    numero_interior: '',
    colonia: '',
    ciudad: '',
    estado: '',
    codigo_postal: '',
    pais: 'México',
    departamento_id: '',
    puesto_id: '',
    tipo_empleado: 'PLANTA' as TipoEmpleado,
    tipo_contrato: 'INDEFINIDO' as TipoContrato,
    fecha_ingreso: '',
    estatus: 'ACTIVO' as EstatusEmpleado,
    salario_base: 0,
    salario_diario: 0,
    salario_diario_integrado: 0,
    periodicidad_pago: 'QUINCENAL' as 'SEMANAL' | 'QUINCENAL' | 'MENSUAL',
    banco: '',
    cuenta_bancaria: '',
    clabe: '',
    contacto_emergencia_nombre: '',
    contacto_emergencia_telefono: '',
    contacto_emergencia_relacion: '',
  });

  useEffect(() => {
    if (empleado) {
      setFormData({
        nombre: empleado.nombre,
        apellido_paterno: empleado.apellido_paterno,
        apellido_materno: empleado.apellido_materno || '',
        fecha_nacimiento: empleado.fecha_nacimiento,
        lugar_nacimiento: empleado.lugar_nacimiento || '',
        genero: empleado.genero || '',
        estado_civil: empleado.estado_civil || '',
        curp: empleado.curp || '',
        rfc: empleado.rfc || '',
        nss: empleado.nss || '',
        email: empleado.email || '',
        telefono: empleado.telefono || '',
        celular: empleado.celular || '',
        calle: empleado.calle || '',
        numero_exterior: empleado.numero_exterior || '',
        numero_interior: empleado.numero_interior || '',
        colonia: empleado.colonia || '',
        ciudad: empleado.ciudad || '',
        estado: empleado.estado || '',
        codigo_postal: empleado.codigo_postal || '',
        pais: empleado.pais || 'México',
        departamento_id: empleado.departamento_id || '',
        puesto_id: empleado.puesto_id || '',
        tipo_empleado: empleado.tipo_empleado,
        tipo_contrato: empleado.tipo_contrato,
        fecha_ingreso: empleado.fecha_ingreso,
        estatus: empleado.estatus,
        salario_base: empleado.salario_base,
        salario_diario: empleado.salario_diario,
        salario_diario_integrado: empleado.salario_diario_integrado,
        periodicidad_pago: empleado.periodicidad_pago,
        banco: empleado.banco || '',
        cuenta_bancaria: empleado.cuenta_bancaria || '',
        clabe: empleado.clabe || '',
        contacto_emergencia_nombre: empleado.contacto_emergencia_nombre || '',
        contacto_emergencia_telefono: empleado.contacto_emergencia_telefono || '',
        contacto_emergencia_relacion: empleado.contacto_emergencia_relacion || '',
      });
    }
  }, [empleado]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (empleado) {
      updateEmpleado({ id: empleado.id, data: formData });
    } else {
      createEmpleado(formData);
    }

    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Calcular salario diario cuando cambia salario_base o periodicidad_pago
  useEffect(() => {
    if (formData.salario_base > 0) {
      let salarioDiario = 0;
      switch (formData.periodicidad_pago) {
        case 'SEMANAL':
          salarioDiario = formData.salario_base / 7;
          break;
        case 'QUINCENAL':
          salarioDiario = formData.salario_base / 15;
          break;
        case 'MENSUAL':
          salarioDiario = formData.salario_base / 30;
          break;
      }
      const salarioDiarioIntegrado = salarioDiario * 1.0493; // Factor de integración aproximado
      setFormData(prev => ({
        ...prev,
        salario_diario: Math.round(salarioDiario * 100) / 100,
        salario_diario_integrado: Math.round(salarioDiarioIntegrado * 100) / 100,
      }));
    }
  }, [formData.salario_base, formData.periodicidad_pago]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={empleado ? 'Editar Empleado' : 'Nuevo Empleado'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Datos Personales */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Datos Personales</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido Paterno <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="apellido_paterno"
                value={formData.apellido_paterno}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido Materno
              </label>
              <input
                type="text"
                name="apellido_materno"
                value={formData.apellido_materno}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Nacimiento <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="fecha_nacimiento"
                value={formData.fecha_nacimiento}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Género
              </label>
              <select
                name="genero"
                value={formData.genero}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Seleccionar...</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado Civil
              </label>
              <select
                name="estado_civil"
                value={formData.estado_civil}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Seleccionar...</option>
                <option value="SOLTERO">Soltero</option>
                <option value="CASADO">Casado</option>
                <option value="UNION_LIBRE">Unión Libre</option>
                <option value="DIVORCIADO">Divorciado</option>
                <option value="VIUDO">Viudo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Identificación */}
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Identificación y Contacto</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CURP
              </label>
              <input
                type="text"
                name="curp"
                value={formData.curp}
                onChange={handleChange}
                maxLength={18}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                RFC
              </label>
              <input
                type="text"
                name="rfc"
                value={formData.rfc}
                onChange={handleChange}
                maxLength={13}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NSS (Número Seguro Social)
              </label>
              <input
                type="text"
                name="nss"
                value={formData.nss}
                onChange={handleChange}
                maxLength={11}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Celular
              </label>
              <input
                type="tel"
                name="celular"
                value={formData.celular}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Dirección */}
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Dirección</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calle
              </label>
              <input
                type="text"
                name="calle"
                value={formData.calle}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número Ext.
              </label>
              <input
                type="text"
                name="numero_exterior"
                value={formData.numero_exterior}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Colonia
              </label>
              <input
                type="text"
                name="colonia"
                value={formData.colonia}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ciudad
              </label>
              <input
                type="text"
                name="ciudad"
                value={formData.ciudad}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CP
              </label>
              <input
                type="text"
                name="codigo_postal"
                value={formData.codigo_postal}
                onChange={handleChange}
                maxLength={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Datos Laborales */}
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Datos Laborales</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Empleado <span className="text-red-500">*</span>
              </label>
              <select
                name="tipo_empleado"
                value={formData.tipo_empleado}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="PLANTA">Planta</option>
                <option value="EVENTUAL">Eventual</option>
                <option value="HONORARIOS">Honorarios</option>
                <option value="BECARIO">Becario</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Contrato <span className="text-red-500">*</span>
              </label>
              <select
                name="tipo_contrato"
                value={formData.tipo_contrato}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="INDEFINIDO">Indefinido</option>
                <option value="TEMPORAL">Temporal</option>
                <option value="PROYECTO">Por Proyecto</option>
                <option value="HONORARIOS">Honorarios</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Ingreso <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="fecha_ingreso"
                value={formData.fecha_ingreso}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estatus <span className="text-red-500">*</span>
              </label>
              <select
                name="estatus"
                value={formData.estatus}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="ACTIVO">Activo</option>
                <option value="BAJA">Baja</option>
                <option value="SUSPENDIDO">Suspendido</option>
                <option value="VACACIONES">Vacaciones</option>
              </select>
            </div>
          </div>
        </div>

        {/* Salario */}
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Información Salarial</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Periodicidad de Pago <span className="text-red-500">*</span>
              </label>
              <select
                name="periodicidad_pago"
                value={formData.periodicidad_pago}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="SEMANAL">Semanal</option>
                <option value="QUINCENAL">Quincenal</option>
                <option value="MENSUAL">Mensual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salario Base <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="salario_base"
                value={formData.salario_base}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salario Diario
              </label>
              <input
                type="number"
                name="salario_diario"
                value={formData.salario_diario}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salario Diario Integrado
              </label>
              <input
                type="number"
                name="salario_diario_integrado"
                value={formData.salario_diario_integrado}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* Datos Bancarios */}
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Datos Bancarios</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banco
              </label>
              <input
                type="text"
                name="banco"
                value={formData.banco}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cuenta Bancaria
              </label>
              <input
                type="text"
                name="cuenta_bancaria"
                value={formData.cuenta_bancaria}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CLABE
              </label>
              <input
                type="text"
                name="clabe"
                value={formData.clabe}
                onChange={handleChange}
                maxLength={18}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Contacto de Emergencia */}
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Contacto de Emergencia</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                name="contacto_emergencia_nombre"
                value={formData.contacto_emergencia_nombre}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                name="contacto_emergencia_telefono"
                value={formData.contacto_emergencia_telefono}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relación
              </label>
              <input
                type="text"
                name="contacto_emergencia_relacion"
                value={formData.contacto_emergencia_relacion}
                onChange={handleChange}
                placeholder="Ej: Esposa, Padre, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isCreating || isUpdating}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isCreating || isUpdating ? 'Guardando...' : empleado ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
