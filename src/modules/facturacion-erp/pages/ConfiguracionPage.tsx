import React, { useState, useEffect, useRef } from 'react';
import { Card, CardBody, Input, Select, SelectItem, Button, Switch } from '@nextui-org/react';
import { Save, Upload, AlertCircle, CheckCircle, FileKey, Shield } from 'lucide-react';
import {
  useConfiguracion,
  useCreateConfiguracion,
  useUpdateConfiguracion
} from '../hooks/useFacturacion';
import { supabase } from '../../../core/config/supabase';
import { useAuth } from '../../../core/auth/AuthProvider';
import toast from 'react-hot-toast';

export const ConfiguracionPage: React.FC = () => {
  const { data: configuracion } = useConfiguracion();
  const createConfiguracion = useCreateConfiguracion();
  const updateConfiguracion = useUpdateConfiguracion();
  const { user } = useAuth();

  // Referencias para inputs de archivo
  const cerInputRef = useRef<HTMLInputElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  // Estados para archivos de certificados
  const [uploadingCer, setUploadingCer] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(false);
  const [cerFileName, setCerFileName] = useState<string | null>(null);
  const [keyFileName, setKeyFileName] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    regimen_fiscal: '',
    pac_proveedor: '',
    pac_usuario: '',
    pac_password: '',
    serie_facturas: 'A',
    serie_notas_credito: 'NC',
    serie_notas_debito: 'ND',
    modo_pruebas: true
  });

  // Función para subir certificado .cer
  const handleCerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.company_id) return;

    if (!file.name.toLowerCase().endsWith('.cer')) {
      toast.error('El archivo debe ser un certificado .cer');
      return;
    }

    setUploadingCer(true);
    try {
      const fileName = `${user.company_id}/certificados/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('facturacion')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Actualizar configuración con la ruta del certificado
      if (configuracion) {
        await updateConfiguracion.mutateAsync({
          id: configuracion.id,
          config: { certificado_cer: fileName }
        });
      }

      setCerFileName(file.name);
      toast.success('Certificado .cer cargado correctamente');
    } catch (error: any) {
      toast.error(`Error al subir certificado: ${error.message}`);
    } finally {
      setUploadingCer(false);
    }
  };

  // Función para subir llave privada .key
  const handleKeyUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.company_id) return;

    if (!file.name.toLowerCase().endsWith('.key')) {
      toast.error('El archivo debe ser una llave privada .key');
      return;
    }

    setUploadingKey(true);
    try {
      const fileName = `${user.company_id}/certificados/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('facturacion')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Actualizar configuración con la ruta de la llave
      if (configuracion) {
        await updateConfiguracion.mutateAsync({
          id: configuracion.id,
          config: { certificado_key: fileName }
        });
      }

      setKeyFileName(file.name);
      toast.success('Llave privada .key cargada correctamente');
    } catch (error: any) {
      toast.error(`Error al subir llave: ${error.message}`);
    } finally {
      setUploadingKey(false);
    }
  };

  useEffect(() => {
    if (configuracion) {
      setFormData({
        regimen_fiscal: configuracion.regimen_fiscal || '',
        pac_proveedor: configuracion.pac_proveedor || '',
        pac_usuario: configuracion.pac_usuario || '',
        pac_password: configuracion.pac_password || '',
        serie_facturas: configuracion.serie_facturas || 'A',
        serie_notas_credito: configuracion.serie_notas_credito || 'NC',
        serie_notas_debito: configuracion.serie_notas_debito || 'ND',
        modo_pruebas: configuracion.modo_pruebas ?? true
      });
    }
  }, [configuracion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (configuracion) {
      await updateConfiguracion.mutateAsync({
        id: configuracion.id,
        config: formData
      });
    } else {
      await createConfiguracion.mutateAsync(formData);
    }
  };

  const regimenesFiscales = [
    { codigo: '601', descripcion: '601 - General de Ley Personas Morales' },
    { codigo: '603', descripcion: '603 - Personas Morales con Fines no Lucrativos' },
    { codigo: '605', descripcion: '605 - Sueldos y Salarios e Ingresos Asimilados a Salarios' },
    { codigo: '606', descripcion: '606 - Arrendamiento' },
    { codigo: '607', descripcion: '607 - Régimen de Enajenación o Adquisición de Bienes' },
    { codigo: '608', descripcion: '608 - Demás ingresos' },
    { codigo: '610', descripcion: '610 - Residentes en el Extranjero sin Establecimiento Permanente en México' },
    { codigo: '611', descripcion: '611 - Ingresos por Dividendos (socios y accionistas)' },
    { codigo: '612', descripcion: '612 - Personas Físicas con Actividades Empresariales y Profesionales' },
    { codigo: '614', descripcion: '614 - Ingresos por intereses' },
    { codigo: '615', descripcion: '615 - Régimen de los ingresos por obtención de premios' },
    { codigo: '616', descripcion: '616 - Sin obligaciones fiscales' },
    { codigo: '620', descripcion: '620 - Sociedades Cooperativas de Producción que optan por diferir sus ingresos' },
    { codigo: '621', descripcion: '621 - Incorporación Fiscal' },
    { codigo: '622', descripcion: '622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
    { codigo: '623', descripcion: '623 - Opcional para Grupos de Sociedades' },
    { codigo: '624', descripcion: '624 - Coordinados' },
    { codigo: '625', descripcion: '625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
    { codigo: '626', descripcion: '626 - Régimen Simplificado de Confianza' }
  ];

  const proveedoresPAC = [
    { codigo: 'finkok', nombre: 'Finkok' },
    { codigo: 'sw', nombre: 'SW Sapien' },
    { codigo: 'diverza', nombre: 'Diverza' },
    { codigo: 'cfdi', nombre: 'CFDI MX' },
    { codigo: 'edicom', nombre: 'Edicom' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración de Facturación</h1>
        <p className="text-gray-500 mt-1">
          Configura tu régimen fiscal, certificados digitales y proveedor de certificación
        </p>
      </div>

      {/* Estado de Configuración */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-3">
            {configuracion ? (
              <>
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900">
                    Configuración Guardada
                  </h3>
                  <p className="text-sm text-green-700">
                    Tu configuración de facturación está lista
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-6 h-6 text-yellow-600" />
                <div>
                  <h3 className="font-semibold text-yellow-900">
                    Configuración Pendiente
                  </h3>
                  <p className="text-sm text-yellow-700">
                    Completa la configuración para comenzar a facturar
                  </p>
                </div>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos Fiscales */}
        <Card>
          <CardBody className="space-y-4">
            <h3 className="text-lg font-semibold">Datos Fiscales</h3>

            <Select
              label="Régimen Fiscal"
              placeholder="Selecciona tu régimen fiscal"
              isRequired
              selectedKeys={formData.regimen_fiscal ? [formData.regimen_fiscal] : []}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                setFormData({ ...formData, regimen_fiscal: value });
              }}
            >
              {regimenesFiscales.map((regimen) => (
                <SelectItem key={regimen.codigo} value={regimen.codigo}>
                  {regimen.descripcion}
                </SelectItem>
              ))}
            </Select>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Serie Facturas"
                placeholder="A"
                value={formData.serie_facturas}
                onValueChange={(value) =>
                  setFormData({ ...formData, serie_facturas: value })
                }
              />

              <Input
                label="Serie Notas de Crédito"
                placeholder="NC"
                value={formData.serie_notas_credito}
                onValueChange={(value) =>
                  setFormData({ ...formData, serie_notas_credito: value })
                }
              />

              <Input
                label="Serie Notas de Débito"
                placeholder="ND"
                value={formData.serie_notas_debito}
                onValueChange={(value) =>
                  setFormData({ ...formData, serie_notas_debito: value })
                }
              />
            </div>
          </CardBody>
        </Card>

        {/* Certificados Digitales */}
        <Card>
          <CardBody className="space-y-4">
            <h3 className="text-lg font-semibold">Certificados Digitales (CSD)</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Certificado (.cer)
                </label>
                <input
                  type="file"
                  ref={cerInputRef}
                  accept=".cer"
                  onChange={handleCerUpload}
                  className="hidden"
                />
                <Button
                  variant="flat"
                  startContent={uploadingCer ? null : <Shield className="w-4 h-4" />}
                  className="w-full"
                  isLoading={uploadingCer}
                  onPress={() => cerInputRef.current?.click()}
                >
                  {uploadingCer ? 'Subiendo...' : 'Subir Archivo .cer'}
                </Button>
                {(configuracion?.certificado_cer || cerFileName) && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {cerFileName || 'Certificado cargado'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Llave Privada (.key)
                </label>
                <input
                  type="file"
                  ref={keyInputRef}
                  accept=".key"
                  onChange={handleKeyUpload}
                  className="hidden"
                />
                <Button
                  variant="flat"
                  startContent={uploadingKey ? null : <FileKey className="w-4 h-4" />}
                  className="w-full"
                  isLoading={uploadingKey}
                  onPress={() => keyInputRef.current?.click()}
                >
                  {uploadingKey ? 'Subiendo...' : 'Subir Archivo .key'}
                </Button>
                {(configuracion?.certificado_key || keyFileName) && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {keyFileName || 'Llave cargada'}
                  </p>
                )}
              </div>
            </div>

            <Input
              label="Contraseña de la Llave Privada"
              type="password"
              placeholder="Contraseña"
              value={formData.pac_password}
              onValueChange={(value) =>
                setFormData({ ...formData, pac_password: value })
              }
            />
          </CardBody>
        </Card>

        {/* Proveedor de Certificación (PAC) */}
        <Card>
          <CardBody className="space-y-4">
            <h3 className="text-lg font-semibold">
              Proveedor de Certificación (PAC)
            </h3>

            <Select
              label="Proveedor PAC"
              placeholder="Selecciona tu proveedor de timbrado"
              isRequired
              selectedKeys={formData.pac_proveedor ? [formData.pac_proveedor] : []}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                setFormData({ ...formData, pac_proveedor: value });
              }}
            >
              {proveedoresPAC.map((pac) => (
                <SelectItem key={pac.codigo} value={pac.codigo}>
                  {pac.nombre}
                </SelectItem>
              ))}
            </Select>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Usuario PAC"
                placeholder="usuario@correo.com"
                value={formData.pac_usuario}
                onValueChange={(value) =>
                  setFormData({ ...formData, pac_usuario: value })
                }
              />

              <Input
                label="Contraseña PAC"
                type="password"
                placeholder="Contraseña"
                value={formData.pac_password}
                onValueChange={(value) =>
                  setFormData({ ...formData, pac_password: value })
                }
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                isSelected={formData.modo_pruebas}
                onValueChange={(checked) =>
                  setFormData({ ...formData, modo_pruebas: checked })
                }
              >
                Modo Pruebas
              </Switch>
              <p className="text-sm text-gray-500">
                Activa el modo pruebas para timbrar facturas de prueba
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Botones */}
        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            color="primary"
            startContent={<Save className="w-4 h-4" />}
            isLoading={createConfiguracion.isPending || updateConfiguracion.isPending}
          >
            Guardar Configuración
          </Button>
        </div>
      </form>
    </div>
  );
};
