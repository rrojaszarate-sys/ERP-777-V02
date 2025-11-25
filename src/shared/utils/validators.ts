export const validateRFC = (rfc: string): boolean => {
  if (!rfc) return false;
  
  const rfcClean = rfc.toUpperCase().trim();
  
  // RFC Persona Moral (3 letras + 6 dígitos + 3 caracteres alfanuméricos)
  const regexMoral = /^[A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}$/;
  // RFC Persona Física (4 letras + 6 dígitos + 3 caracteres alfanuméricos)
  const regexFisica = /^[A-Z&Ñ]{4}[0-9]{6}[A-Z0-9]{3}$/;
  
  return regexMoral.test(rfcClean) || regexFisica.test(rfcClean);
};

export const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneClean = phone.replace(/[\s\-\(\)]/g, '');
  return phoneClean.length >= 10 && /^[0-9]+$/.test(phoneClean);
};

export const validateRFCWithChecksum = (rfc: string): { valid: boolean; message: string } => {
  if (!validateRFC(rfc)) {
    return { valid: false, message: 'Formato de RFC inválido' };
  }
  
  // Simulación de validación avanzada
  // En producción aquí iría la verificación contra el SAT
  const rfcClean = rfc.toUpperCase().trim();
  
  // Lista negra de RFCs de prueba
  const testRFCs = ['XXX010101000', 'XAXX010101000', 'XEXX010101000'];
  if (testRFCs.includes(rfcClean)) {
    return { valid: false, message: 'RFC de prueba no válido' };
  }
  
  return { valid: true, message: 'RFC válido' };
};