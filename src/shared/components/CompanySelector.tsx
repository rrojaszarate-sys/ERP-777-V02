/**
 * SELECTOR DE EMPRESA
 * Permite cambiar la empresa activa en el contexto de desarrollo
 */

import React, { useState, useEffect } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { supabase } from '../../core/config/supabase';

interface Company {
  id: string;
  name: string;
}

interface CompanySelectorProps {
  currentCompanyId: string;
  onCompanyChange: (companyId: string) => void;
}

// Empresa default para desarrollo
const DEFAULT_COMPANY: Company = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'MADE Events SA de CV'
};

export const CompanySelector: React.FC<CompanySelectorProps> = ({
  currentCompanyId,
  onCompanyChange
}) => {
  const [companies, setCompanies] = useState<Company[]>([DEFAULT_COMPANY]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const { data, error } = await supabase
          .from('companies_erp')
          .select('id, name')
          .order('name');

        if (!error && data && data.length > 0) {
          setCompanies(data);
        }
      } catch (err) {
        console.error('Error loading companies:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCompanies();
  }, []);

  const currentCompany = companies.find(c => c.id === currentCompanyId) || DEFAULT_COMPANY;

  // Si solo hay una empresa, mostrar solo el nombre (no el selector)
  if (companies.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
        <Building2 className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700 truncate max-w-[140px]">
          {currentCompany.name}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition-colors"
      >
        <Building2 className="w-4 h-4 text-violet-600" />
        <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
          {loading ? '...' : currentCompany.name}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            <div className="px-3 py-2 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Seleccionar Empresa
              </span>
            </div>
            {companies.map(company => (
              <button
                key={company.id}
                onClick={() => {
                  onCompanyChange(company.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                  company.id === currentCompanyId
                    ? 'bg-violet-50 text-violet-700 font-medium'
                    : 'text-gray-700'
                }`}
              >
                <Building2 className={`w-4 h-4 ${
                  company.id === currentCompanyId ? 'text-violet-600' : 'text-gray-400'
                }`} />
                {company.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CompanySelector;
