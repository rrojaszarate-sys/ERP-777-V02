import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, AlertTriangle, Building2, User, CreditCard } from 'lucide-react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { validateRFC, validateEmail, validatePhone } from '../../../shared/utils/validators';
import { REGIMEN_FISCAL_OPTIONS, USO_CFDI_OPTIONS, METODO_PAGO_OPTIONS, FORMA_PAGO_OPTIONS } from '../../../core/config/constants';
import { Cliente } from '../types/Event';

interface ClienteModalProps {
  cliente?: Cliente | null;
  isLoading?: boolean;
  onClose: () => void;
  onSave: (data: Partial<Cliente>) => void;
}

export const ClienteModal: React.FC<ClienteModalProps> = ({ cliente, isLoading = false, onClose, onSave }) => {
  const [rfcValidation, setRfcValidation] = useState<{ valid: boolean | null; message: string }>({ 
    valid: null, 
    message: '' 
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');
  const [isValidatingRFC, setIsValidatingRFC] = useState(false);
  
  const [formData, setFormData] = useState({
    razon_social: cliente?.razon_social || '',
    nombre_comercial: cliente?.nombre_comercial || '',
    rfc: cliente?.rfc || '',
    sufijo: cliente?.sufijo || '',
    email: cliente?.email || '',
    telefono: cliente?.telefono || '',
    direccion_fiscal: cliente?.direccion_fiscal || '',
    contacto_principal: cliente?.contacto_principal || '',
    telefono_contacto: cliente?.telefono_contacto || '',
    email_contacto: cliente?.email_contacto || '',
    regimen_fiscal: cliente?.regimen_fiscal || '612',
    uso_cfdi: cliente?.uso_cfdi || 'G03',
    metodo_pago: cliente?.metodo_pago || 'PUE',
    forma_pago: cliente?.forma_pago || '03',
    dias_credito: cliente?.dias_credito || 30,
    limite_credito: cliente?.limite_credito || 0,
    notas: cliente?.notas || ''
  });

  // RFC validation effect
  useEffect(() => {
    if (formData.rfc && formData.rfc.length >= 10) {
      setIsValidatingRFC(true);
      validateRFCMexicano(formData.rfc)
        .then(result => {
          setRfcValidation(result);
          if (result.valid && (result as any).datosContribuyente) {
            // Auto-llenar datos desde consulta SAT simulada
            setFormData(prev => ({
              ...prev,
              razon_social: (result as any).datosContribuyente.razonSocial,
              regimen_fiscal: (result as any).datosContribuyente.regimenFiscal
            }));
          }
        })
        .catch(() => {
          setRfcValidation({ valid: false, message: 'Error al validar RFC' });
        })
        .finally(() => {
          setIsValidatingRFC(false);
        });
    } else {
      setRfcValidation({ valid: null, message: '' });
    }
  }, [formData.rfc]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.razon_social.trim()) {
      errors.razon_social = 'La razón social es requerida';
    }

    if (!formData.rfc.trim()) {
      errors.rfc = 'El RFC es requerido';
    } else if (!validateRFC(formData.rfc)) {
      errors.rfc = 'Formato de RFC inválido';
    }

    if (!formData.sufijo.trim()) {
      errors.sufijo = 'El sufijo es requerido';
    } else if (formData.sufijo.length > 3) {
      errors.sufijo = 'El sufijo no puede exceder 3 caracteres';
    }

    if (formData.email && !validateEmail(formData.email)) {
      errors.email = 'Formato de email inválido';
    }

    if (formData.telefono && !validatePhone(formData.telefono)) {
      errors.telefono = 'Formato de teléfono inválido';
    }

    if (formData.email_contacto && !validateEmail(formData.email_contacto)) {
      errors.email_contacto = 'Formato de email de contacto inválido';
    }

    if (formData.telefono_contacto && !validatePhone(formData.telefono_contacto)) {
      errors.telefono_contacto = 'Formato de teléfono de contacto inválido';
    }

    if (formData.dias_credito < 0 || formData.dias_credito > 365) {
      errors.dias_credito = 'Los días de crédito deben estar entre 0 y 365';
    }

    if (formData.limite_credito < 0) {
      errors.limite_credito = 'El límite de crédito no puede ser negativo';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    
    if (!validateForm()) return;
    if (rfcValidation.valid === false) return;
    if (isValidatingRFC) {
      setSubmitError('Esperando validación de RFC...');
      return;
    }
    
    const dataToSave = {
      ...formData,
      rfc: formData.rfc.toUpperCase().trim(),
      dias_credito: parseInt(formData.dias_credito.toString()) || 30,
      limite_credito: parseFloat(formData.limite_credito.toString()) || 0
    };

    try {
      onSave(dataToSave);
    } catch (error) {
      setSubmitError('Error al guardar el cliente. Por favor, intente nuevamente.');
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={cliente ? 'Editar Cliente' : 'Nuevo Cliente'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Mensaje de error general del formulario */}
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4 flex items-center"
            role="alert"
          >
            <AlertTriangle className="w-5 h-5 mr-3" />
            <p>{submitError}</p>
          </motion.div>
        )}

        {/* Sección de Información Fiscal */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-900 mb-4 flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Información Fiscal
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Razón Social *
              </label>
              <input
                type="text"
                value={formData.razon_social}
                onChange={(e) => handleInputChange('razon_social', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent ${
                  validationErrors.razon_social ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ejemplo: MADE Events SA de CV"
              />
              {validationErrors.razon_social && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.razon_social}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Comercial
              </label>
              <input
                type="text"
                value={formData.nombre_comercial}
                onChange={(e) => handleInputChange('nombre_comercial', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
                placeholder="Nombre comercial si es diferente"
              />
            </div>
            
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                RFC *
              </label>
              <input
                type="text"
                value={formData.rfc}
                onChange={(e) => handleInputChange('rfc', e.target.value.toUpperCase())}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent ${
                  rfcValidation.valid === true ? 'border-green-500' : 
                  rfcValidation.valid === false ? 'border-red-500' : 
                  validationErrors.rfc ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="ABCD123456EFG"
                maxLength={13}
              />
              {rfcValidation.valid !== null && !isValidatingRFC && (
                <div className={`absolute right-3 top-8 ${
                  rfcValidation.valid ? 'text-green-500' : 'text-red-500'
                }`}>
                  {rfcValidation.valid ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </div>
              )}
              {isValidatingRFC && (
                <div className="absolute right-3 top-8">
                  <Loader2 className="w-5 h-5 text-mint-500 animate-spin" />
                </div>
              )}
              {rfcValidation.message && (
                <p className={`text-sm mt-1 ${
                  rfcValidation.valid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {rfcValidation.message}
                </p>
              )}
              {validationErrors.rfc && !rfcValidation.message && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.rfc}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sufijo (3 caracteres) *
              </label>
              <input
                type="text"
                value={formData.sufijo}
                onChange={(e) => handleInputChange('sufijo', e.target.value.toUpperCase())}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent ${
                  validationErrors.sufijo ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="ABC"
                maxLength={3}
              />
              {validationErrors.sufijo && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.sufijo}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Régimen Fiscal *
              </label>
              <select
                value={formData.regimen_fiscal}
                onChange={(e) => handleInputChange('regimen_fiscal', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
              >
                {REGIMEN_FISCAL_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Información de contacto */}
        <div className="bg-green-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-green-900 mb-4">
            <User className="w-5 h-5 mr-2" />
            Información de Contacto
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Principal
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent ${
                  validationErrors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="correo@empresa.com"
              />
              {validationErrors.email && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.email}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono Principal
              </label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => handleInputChange('telefono', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent ${
                  validationErrors.telefono ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="55 1234 5678"
              />
              {validationErrors.telefono && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.telefono}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contacto Principal
              </label>
              <input
                type="text"
                value={formData.contacto_principal}
                onChange={(e) => handleInputChange('contacto_principal', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
                placeholder="Nombre del contacto"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono de Contacto
              </label>
              <input
                type="tel"
                value={formData.telefono_contacto}
                onChange={(e) => handleInputChange('telefono_contacto', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent ${
                  validationErrors.telefono_contacto ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="55 9876 5432"
              />
              {validationErrors.telefono_contacto && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.telefono_contacto}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email de Contacto
              </label>
              <input
                type="email"
                value={formData.email_contacto}
                onChange={(e) => handleInputChange('email_contacto', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent ${
                  validationErrors.email_contacto ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="contacto@empresa.com"
              />
              {validationErrors.email_contacto && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.email_contacto}</p>
              )}
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección Fiscal
              </label>
              <textarea
                value={formData.direccion_fiscal}
                onChange={(e) => handleInputChange('direccion_fiscal', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
                placeholder="Calle, número, colonia, CP, ciudad, estado"
              />
            </div>
          </div>
        </div>

        {/* Configuración de facturación */}
        <div className="bg-purple-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-purple-900 mb-4">
            <CreditCard className="w-5 h-5 mr-2" />
            Configuración de Facturación
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Uso de CFDI
              </label>
              <select
                value={formData.uso_cfdi}
                onChange={(e) => handleInputChange('uso_cfdi', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
              >
                {USO_CFDI_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Método de Pago
              </label>
              <select
                value={formData.metodo_pago}
                onChange={(e) => handleInputChange('metodo_pago', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
              >
                {METODO_PAGO_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forma de Pago
              </label>
              <select
                value={formData.forma_pago}
                onChange={(e) => handleInputChange('forma_pago', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
              >
                {FORMA_PAGO_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Días de Crédito
              </label>
              <input
                type="number"
                value={formData.dias_credito}
                onChange={(e) => handleInputChange('dias_credito', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent ${
                  validationErrors.dias_credito ? 'border-red-500' : 'border-gray-300'
                }`}
                min="0"
                max="365"
              />
              {validationErrors.dias_credito && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.dias_credito}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Límite de Crédito ($)
              </label>
              <input
                type="number"
                value={formData.limite_credito}
                onChange={(e) => handleInputChange('limite_credito', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent ${
                  validationErrors.limite_credito ? 'border-red-500' : 'border-gray-300'
                }`}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
              {validationErrors.limite_credito && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.limite_credito}</p>
              )}
            </div>
          </div>
        </div>

        {/* Notas adicionales */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notas Adicionales
          </label>
          <textarea
            value={formData.notas}
            onChange={(e) => handleInputChange('notas', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
            placeholder="Información adicional sobre el cliente..."
          />
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading || isValidatingRFC}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading || isValidatingRFC || rfcValidation.valid === false}
            className="bg-mint-500 hover:bg-mint-600"
          >
            {(isLoading || isValidatingRFC) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {cliente ? 'Actualizar Cliente' : 'Crear Cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Función de validación RFC mexicano con simulación
const validateRFCMexicano = async (rfc: string): Promise<{ 
  valid: boolean; 
  message: string; 
  datosContribuyente?: any 
}> => {
  // Simulación de validación con el SAT
  const isValid = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc);
  
  if (!isValid) {
    return { 
      valid: false, 
      message: 'Formato de RFC inválido' 
    };
  }
  
  // Simulación de consulta al SAT (delay de 1 segundo)
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Datos simulados del SAT para demostración
  const mockSATData: Record<string, any> = {
    'MEV123456ABC': {
      razonSocial: 'MADE Events SA de CV',
      regimenFiscal: '601'
    },
    'GALA850315ABC': {
      razonSocial: 'García López Ana',
      regimenFiscal: '612'
    },
    'CORP870920XYZ': {
      razonSocial: 'Corporativo de Eventos SA de CV',
      regimenFiscal: '601'
    },
    'TCO123456ABC': {
      razonSocial: 'Tech Corp SA de CV',
      regimenFiscal: '601'
    },
    'EXY789012DEF': {
      razonSocial: 'Empresa XYZ SA',
      regimenFiscal: '612'
    }
  };
  
  const contribuyente = mockSATData[rfc];
  
  return {
    valid: true,
    message: contribuyente ? 'RFC válido - Datos obtenidos del SAT' : 'RFC válido',
    datosContribuyente: contribuyente
  };
};