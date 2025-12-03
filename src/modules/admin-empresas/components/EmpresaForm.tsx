/**
 * Formulario de Empresa - FASE 6
 */
import { useForm, Controller } from 'react-hook-form';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  Textarea,
  Divider
} from '@nextui-org/react';
import { Building2, FileText, MapPin, Phone, Globe } from 'lucide-react';
import type { Empresa, EmpresaFormData, PlanTipo } from '../types';
import { PLANES } from '../types';

interface EmpresaFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EmpresaFormData) => void;
  empresa?: Empresa | null;
  isLoading?: boolean;
}

const REGIMENES_FISCALES = [
  { value: '601', label: '601 - General de Ley Personas Morales' },
  { value: '603', label: '603 - Personas Morales con Fines no Lucrativos' },
  { value: '605', label: '605 - Sueldos y Salarios' },
  { value: '606', label: '606 - Arrendamiento' },
  { value: '607', label: '607 - Régimen de Enajenación o Adquisición de Bienes' },
  { value: '608', label: '608 - Demás ingresos' },
  { value: '610', label: '610 - Residentes en el Extranjero' },
  { value: '612', label: '612 - Personas Físicas con Actividades Empresariales' },
  { value: '614', label: '614 - Ingresos por Intereses' },
  { value: '616', label: '616 - Sin obligaciones fiscales' },
  { value: '620', label: '620 - Sociedades Cooperativas de Producción' },
  { value: '621', label: '621 - Incorporación Fiscal' },
  { value: '622', label: '622 - Actividades Agrícolas, Ganaderas, Silvícolas' },
  { value: '623', label: '623 - Opcional para Grupos de Sociedades' },
  { value: '624', label: '624 - Coordinados' },
  { value: '625', label: '625 - Régimen de las Actividades Empresariales' },
  { value: '626', label: '626 - Régimen Simplificado de Confianza' }
];

export function EmpresaForm({ isOpen, onClose, onSubmit, empresa, isLoading }: EmpresaFormProps) {
  const isEditing = !!empresa;
  const { control, handleSubmit, formState: { errors }, watch } = useForm<EmpresaFormData>({
    defaultValues: {
      codigo: empresa?.codigo || '',
      nombre: empresa?.nombre || '',
      razon_social: empresa?.razon_social || '',
      nombre_comercial: empresa?.nombre_comercial || '',
      rfc: empresa?.rfc || '',
      regimen_fiscal: empresa?.regimen_fiscal || '',
      email: empresa?.email || '',
      telefono: empresa?.telefono || '',
      direccion: empresa?.direccion || '',
      codigo_postal: empresa?.codigo_postal || '',
      estado: empresa?.estado || '',
      ciudad: empresa?.ciudad || '',
      plan_tipo: empresa?.plan_tipo || 'basic',
      max_usuarios: empresa?.max_usuarios || 5
    }
  });

  const codigoValue = watch('codigo');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader className="flex gap-2">
            <Building2 className="w-5 h-5" />
            {empresa ? 'Editar Empresa' : 'Nueva Empresa'}
          </ModalHeader>

          <ModalBody className="gap-4">
            {/* Código de Empresa (solo al crear) */}
            {!isEditing && (
              <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-primary mb-2">
                  Código de Empresa (Identificador Único)
                </h4>
                <p className="text-xs text-gray-500 mb-3">
                  Este código se usará para identificar la empresa en el sistema y crear su espacio de almacenamiento.
                  No podrá modificarse después.
                </p>
                <Controller
                  name="codigo"
                  control={control}
                  rules={{
                    required: 'El código es requerido',
                    pattern: {
                      value: /^[a-z0-9-]+$/,
                      message: 'Solo letras minúsculas, números y guiones'
                    },
                    minLength: { value: 3, message: 'Mínimo 3 caracteres' },
                    maxLength: { value: 30, message: 'Máximo 30 caracteres' }
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Código"
                      placeholder="mi-empresa"
                      description={codigoValue ? `Bucket: erp-${codigoValue}` : 'Ejemplo: madregroup, acme-corp'}
                      isRequired
                      isInvalid={!!errors.codigo}
                      errorMessage={errors.codigo?.message}
                      className="max-w-sm"
                      onChange={(e) => {
                        // Sanitizar: solo minúsculas, números y guiones
                        const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                        field.onChange(value);
                      }}
                    />
                  )}
                />
              </div>
            )}

            <Divider />

            {/* Datos Generales */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Datos Generales
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="nombre"
                  control={control}
                  rules={{ required: 'El nombre es requerido' }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Nombre de la Empresa"
                      placeholder="Mi Empresa SA de CV"
                      isRequired
                      isInvalid={!!errors.nombre}
                      errorMessage={errors.nombre?.message}
                    />
                  )}
                />

                <Controller
                  name="nombre_comercial"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Nombre Comercial"
                      placeholder="Mi Empresa"
                    />
                  )}
                />

                <Controller
                  name="razon_social"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Razón Social"
                      placeholder="Razón social para facturación"
                    />
                  )}
                />

                <Controller
                  name="rfc"
                  control={control}
                  rules={{
                    pattern: {
                      value: /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/,
                      message: 'RFC inválido'
                    }
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="RFC"
                      placeholder="XAXX010101000"
                      maxLength={13}
                      className="uppercase"
                      isInvalid={!!errors.rfc}
                      errorMessage={errors.rfc?.message}
                    />
                  )}
                />
              </div>
            </div>

            <Divider />

            {/* Datos Fiscales */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Datos Fiscales
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="regimen_fiscal"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Régimen Fiscal"
                      placeholder="Seleccionar régimen"
                      selectedKeys={field.value ? [field.value] : []}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as string;
                        field.onChange(selected);
                      }}
                    >
                      {REGIMENES_FISCALES.map(reg => (
                        <SelectItem key={reg.value} value={reg.value}>
                          {reg.label}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                />

                <Controller
                  name="codigo_postal"
                  control={control}
                  rules={{
                    pattern: {
                      value: /^\d{5}$/,
                      message: 'Código postal debe tener 5 dígitos'
                    }
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Código Postal"
                      placeholder="12345"
                      maxLength={5}
                      isInvalid={!!errors.codigo_postal}
                      errorMessage={errors.codigo_postal?.message}
                    />
                  )}
                />
              </div>
            </div>

            <Divider />

            {/* Dirección */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Dirección
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="estado"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Estado"
                      placeholder="Ciudad de México"
                    />
                  )}
                />

                <Controller
                  name="ciudad"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Ciudad/Municipio"
                      placeholder="Benito Juárez"
                    />
                  )}
                />

                <Controller
                  name="direccion"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      label="Dirección Completa"
                      placeholder="Calle, número, colonia..."
                      className="col-span-full"
                    />
                  )}
                />
              </div>
            </div>

            <Divider />

            {/* Contacto */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Contacto
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="email"
                  control={control}
                  rules={{
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Email inválido'
                    }
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="email"
                      label="Email Principal"
                      placeholder="contacto@empresa.com"
                      isInvalid={!!errors.email}
                      errorMessage={errors.email?.message}
                    />
                  )}
                />

                <Controller
                  name="telefono"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Teléfono"
                      placeholder="55 1234 5678"
                    />
                  )}
                />
              </div>
            </div>

            <Divider />

            {/* Plan */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Plan y Límites
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="plan_tipo"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Tipo de Plan"
                      selectedKeys={field.value ? [field.value] : []}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as PlanTipo;
                        field.onChange(selected);
                      }}
                    >
                      {Object.entries(PLANES).map(([key, plan]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex justify-between items-center w-full">
                            <span>{plan.nombre}</span>
                            <span className="text-xs text-gray-500">${plan.precio_mensual}/mes</span>
                          </div>
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                />

                <Controller
                  name="max_usuarios"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="number"
                      label="Máximo de Usuarios"
                      value={String(field.value)}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                    />
                  )}
                />
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              Cancelar
            </Button>
            <Button color="primary" type="submit" isLoading={isLoading}>
              {empresa ? 'Guardar Cambios' : 'Crear Empresa'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

export default EmpresaForm;
