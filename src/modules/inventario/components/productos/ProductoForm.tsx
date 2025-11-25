import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Switch,
  Tabs,
  Tab
} from '@nextui-org/react';
import { useForm, Controller } from 'react-hook-form';
import type { Producto, ProductoInsert, ProductoUpdate } from '../../types';
import { useCategorias, useUnidadesMedida } from '../../hooks';

interface ProductoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductoInsert | ProductoUpdate) => void;
  producto?: Producto;
  isLoading?: boolean;
}

export const ProductoForm: React.FC<ProductoFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  producto,
  isLoading = false
}) => {
  const isEditing = !!producto;
  const { categorias } = useCategorias();
  const { unidades } = useUnidadesMedida();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<ProductoInsert>({
    defaultValues: producto || {
      codigo: '',
      nombre: '',
      descripcion: '',
      codigo_barras: '',
      es_servicio: false,
      es_compra: true,
      es_venta: true,
      maneja_lote: false,
      maneja_serie: false,
      aplica_iva: true,
      tasa_iva: 16.00,
      aplica_ieps: false,
      tasa_ieps: 0,
      precio_venta: 0,
      costo_actual: 0,
      existencia_minima: 0,
      activo: true
    }
  });

  const esServicio = watch('es_servicio');
  const aplicaIva = watch('aplica_iva');
  const aplicaIeps = watch('aplica_ieps');
  const costoActual = watch('costo_actual');
  const margenUtilidad = watch('margen_utilidad');

  // Calcular precio de venta desde costo y margen
  useEffect(() => {
    if (costoActual && margenUtilidad) {
      const precioCalculado = costoActual * (1 + margenUtilidad / 100);
      setValue('precio_venta', Number(precioCalculado.toFixed(2)));
    }
  }, [costoActual, margenUtilidad, setValue]);

  const handleFormSubmit = (data: ProductoInsert) => {
    if (isEditing) {
      onSubmit({ ...data, id: producto.id } as ProductoUpdate);
    } else {
      onSubmit(data);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <ModalHeader>
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </ModalHeader>
          <ModalBody>
            <Tabs aria-label="Información del producto">
              <Tab key="general" title="General">
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Código"
                      placeholder="Ej: PROD-001"
                      {...register('codigo', { required: 'El código es requerido' })}
                      isInvalid={!!errors.codigo}
                      errorMessage={errors.codigo?.message}
                      isRequired
                    />
                    <Input
                      label="Código de Barras"
                      placeholder="Ej: 7501234567890"
                      {...register('codigo_barras')}
                    />
                  </div>

                  <Input
                    label="Nombre"
                    placeholder="Nombre del producto"
                    {...register('nombre', { required: 'El nombre es requerido' })}
                    isInvalid={!!errors.nombre}
                    errorMessage={errors.nombre?.message}
                    isRequired
                  />

                  <Textarea
                    label="Descripción"
                    placeholder="Descripción detallada del producto"
                    {...register('descripcion')}
                    minRows={3}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="Categoría"
                      placeholder="Seleccionar categoría"
                      {...register('categoria_id')}
                    >
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nombre}
                        </SelectItem>
                      ))}
                    </Select>

                    <Select
                      label="Unidad de Medida"
                      placeholder="Seleccionar unidad"
                      {...register('unidad_medida_id')}
                      isRequired
                    >
                      {unidades.map((unidad) => (
                        <SelectItem key={unidad.id} value={unidad.id}>
                          {unidad.nombre} ({unidad.abreviatura})
                        </SelectItem>
                      ))}
                    </Select>
                  </div>

                  <div className="flex gap-4">
                    <Controller
                      name="es_servicio"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <Switch
                          isSelected={value}
                          onValueChange={onChange}
                        >
                          Es Servicio
                        </Switch>
                      )}
                    />
                    <Controller
                      name="es_compra"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <Switch
                          isSelected={value}
                          onValueChange={onChange}
                        >
                          Se Compra
                        </Switch>
                      )}
                    />
                    <Controller
                      name="es_venta"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <Switch
                          isSelected={value}
                          onValueChange={onChange}
                        >
                          Se Vende
                        </Switch>
                      )}
                    />
                    <Controller
                      name="activo"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <Switch
                          isSelected={value}
                          onValueChange={onChange}
                        >
                          Activo
                        </Switch>
                      )}
                    />
                  </div>
                </div>
              </Tab>

              <Tab key="precios" title="Precios y Costos">
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      label="Costo Actual"
                      placeholder="0.00"
                      startContent={<span className="text-small">$</span>}
                      {...register('costo_actual', { valueAsNumber: true })}
                      step="0.01"
                    />
                    <Input
                      type="number"
                      label="Margen de Utilidad"
                      placeholder="0"
                      endContent={<span className="text-small">%</span>}
                      {...register('margen_utilidad', { valueAsNumber: true })}
                      step="0.01"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      label="Precio de Venta"
                      placeholder="0.00"
                      startContent={<span className="text-small">$</span>}
                      {...register('precio_venta', { valueAsNumber: true })}
                      step="0.01"
                    />
                    <Input
                      type="number"
                      label="Precio Mínimo de Venta"
                      placeholder="0.00"
                      startContent={<span className="text-small">$</span>}
                      {...register('precio_venta_min', { valueAsNumber: true })}
                      step="0.01"
                    />
                  </div>
                </div>
              </Tab>

              {!esServicio && (
                <Tab key="inventario" title="Inventario">
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        type="number"
                        label="Existencia Mínima"
                        placeholder="0"
                        {...register('existencia_minima', { valueAsNumber: true })}
                        step="0.01"
                      />
                      <Input
                        type="number"
                        label="Existencia Máxima"
                        placeholder="0"
                        {...register('existencia_maxima', { valueAsNumber: true })}
                        step="0.01"
                      />
                      <Input
                        type="number"
                        label="Punto de Reorden"
                        placeholder="0"
                        {...register('punto_reorden', { valueAsNumber: true })}
                        step="0.01"
                      />
                    </div>

                    <div className="flex gap-4">
                      <Controller
                        name="maneja_lote"
                        control={control}
                        render={({ field: { value, onChange } }) => (
                          <Switch
                            isSelected={value}
                            onValueChange={onChange}
                          >
                            Maneja Lotes
                          </Switch>
                        )}
                      />
                      <Controller
                        name="maneja_serie"
                        control={control}
                        render={({ field: { value, onChange } }) => (
                          <Switch
                            isSelected={value}
                            onValueChange={onChange}
                          >
                            Maneja Series
                          </Switch>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        type="number"
                        label="Peso (kg)"
                        placeholder="0"
                        {...register('peso', { valueAsNumber: true })}
                        step="0.001"
                      />
                      <Input
                        type="number"
                        label="Volumen (m³)"
                        placeholder="0"
                        {...register('volumen', { valueAsNumber: true })}
                        step="0.001"
                      />
                    </div>
                  </div>
                </Tab>
              )}

              <Tab key="impuestos" title="Impuestos">
                <div className="space-y-4 py-4">
                  <Controller
                    name="aplica_iva"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <Switch
                        isSelected={value}
                        onValueChange={onChange}
                      >
                        Aplica IVA
                      </Switch>
                    )}
                  />

                  {aplicaIva && (
                    <Input
                      type="number"
                      label="Tasa de IVA"
                      placeholder="16"
                      endContent={<span className="text-small">%</span>}
                      {...register('tasa_iva', { valueAsNumber: true })}
                      step="0.01"
                    />
                  )}

                  <Controller
                    name="aplica_ieps"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <Switch
                        isSelected={value}
                        onValueChange={onChange}
                      >
                        Aplica IEPS
                      </Switch>
                    )}
                  />

                  {aplicaIeps && (
                    <Input
                      type="number"
                      label="Tasa de IEPS"
                      placeholder="0"
                      endContent={<span className="text-small">%</span>}
                      {...register('tasa_ieps', { valueAsNumber: true })}
                      step="0.01"
                    />
                  )}

                  <Input
                    label="Clave SAT"
                    placeholder="Clave del producto/servicio SAT"
                    {...register('codigo_sat')}
                  />
                </div>
              </Tab>
            </Tabs>
          </ModalBody>
          <ModalFooter>
            <Button
              color="danger"
              variant="light"
              onPress={onClose}
              isDisabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              color="primary"
              type="submit"
              isLoading={isLoading}
            >
              {isEditing ? 'Actualizar' : 'Crear'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
