/**
 * CompanyContext - Stub para compatibilidad
 * 
 * Proporciona contexto de empresa por defecto.
 * TODO: Implementar selección de empresa multi-tenant
 */
import React, { createContext, useContext, ReactNode } from 'react';

interface Company {
  id: string;
  name: string;
}

interface CompanyContextType {
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
}

const CompanyContext = createContext<CompanyContextType>({
  selectedCompany: { id: '1', name: 'Empresa Default' },
  setSelectedCompany: () => {},
});

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Por ahora retorna empresa por defecto
  const value: CompanyContextType = {
    selectedCompany: { id: '1', name: 'Empresa Default' },
    setSelectedCompany: () => {},
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => useContext(CompanyContext);
