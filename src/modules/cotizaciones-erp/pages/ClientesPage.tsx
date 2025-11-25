/**
 * PÁGINA DE CLIENTES
 * Gestión completa de clientes y prospectos
 */

import React, { useState } from 'react';
import { useDisclosure } from '@nextui-org/react';
import { ClientesTable } from '../components/ClientesTable';
import type { Cliente } from '../types';

export const ClientesPage: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  const handleEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    onOpen();
  };

  const handleCreate = () => {
    setSelectedCliente(null);
    onOpen();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clientes</h1>
        <p className="text-gray-500 mt-1">
          Gestión de clientes y prospectos
        </p>
      </div>

      <ClientesTable
        onCreate={handleCreate}
        onEdit={handleEdit}
      />
    </div>
  );
};
