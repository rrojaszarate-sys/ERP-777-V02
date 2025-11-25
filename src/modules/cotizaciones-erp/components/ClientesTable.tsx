/**
 * TABLA DE CLIENTES CRM
 * Componente para listar y gestionar clientes
 */

import React, { useState } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Input,
  Chip,
  Select,
  SelectItem,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from '@nextui-org/react';
import { Search, Plus, Edit, Trash2, MoreVertical, Phone, Mail, MapPin } from 'lucide-react';
import { useClientes } from '../hooks/useCRM';
import type { Cliente } from '../types';

interface ClientesTableProps {
  onEdit?: (cliente: Cliente) => void;
  onDelete?: (cliente: Cliente) => void;
  onCreate?: () => void;
  onSelect?: (cliente: Cliente) => void;
}

export const ClientesTable: React.FC<ClientesTableProps> = ({
  onEdit,
  onDelete,
  onCreate,
  onSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');

  const { data: clientes, isLoading } = useClientes({
    tipo: tipoFilter,
    busqueda: searchTerm
  });

  return (
    <div className="space-y-4">
      {/* Header y Filtros */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          startContent={<Search className="w-4 h-4 text-gray-400" />}
          className="max-w-md"
          isClearable
          onClear={() => setSearchTerm('')}
        />
        <Select
          placeholder="Todos"
          className="max-w-xs"
          selectedKeys={tipoFilter ? [tipoFilter] : []}
          onChange={(e) => setTipoFilter(e.target.value)}
        >
          <SelectItem key="prospecto">Prospectos</SelectItem>
          <SelectItem key="cliente">Clientes</SelectItem>
          <SelectItem key="inactivo">Inactivos</SelectItem>
        </Select>
        {onCreate && (
          <Button
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={onCreate}
          >
            Nuevo Cliente
          </Button>
        )}
      </div>

      {/* Tabla */}
      <Table aria-label="Clientes" isStriped>
        <TableHeader>
          <TableColumn>EMPRESA</TableColumn>
          <TableColumn>RFC</TableColumn>
          <TableColumn>CONTACTO</TableColumn>
          <TableColumn>UBICACIÓN</TableColumn>
          <TableColumn>TIPO</TableColumn>
          <TableColumn>CALIFICACIÓN</TableColumn>
          <TableColumn>ACCIONES</TableColumn>
        </TableHeader>
        <TableBody
          isLoading={isLoading}
          emptyContent="No se encontraron clientes"
        >
          {(clientes || []).map((cliente) => (
            <TableRow
              key={cliente.id}
              className={onSelect ? 'cursor-pointer hover:bg-gray-50' : ''}
              onClick={() => onSelect?.(cliente)}
            >
              <TableCell>
                <div>
                  <p className="font-semibold">{cliente.razon_social}</p>
                  {cliente.nombre_comercial && (
                    <p className="text-sm text-gray-500">{cliente.nombre_comercial}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm">{cliente.rfc || '-'}</span>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {cliente.email && (
                    <div className="flex items-center gap-1 text-sm">
                      <Mail className="w-3 h-3" />
                      <span>{cliente.email}</span>
                    </div>
                  )}
                  {cliente.telefono && (
                    <div className="flex items-center gap-1 text-sm">
                      <Phone className="w-3 h-3" />
                      <span>{cliente.telefono}</span>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {cliente.ciudad && cliente.estado ? (
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="w-3 h-3" />
                    <span>{cliente.ciudad}, {cliente.estado}</span>
                  </div>
                ) : '-'}
              </TableCell>
              <TableCell>
                <Chip
                  size="sm"
                  color={
                    cliente.tipo === 'cliente' ? 'success' :
                    cliente.tipo === 'prospecto' ? 'warning' :
                    'default'
                  }
                  variant="flat"
                >
                  {cliente.tipo.toUpperCase()}
                </Chip>
              </TableCell>
              <TableCell>
                {cliente.calificacion ? (
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={i < cliente.calificacion! ? 'text-yellow-500' : 'text-gray-300'}
                      >
                        
                      </span>
                    ))}
                  </div>
                ) : '-'}
              </TableCell>
              <TableCell>
                <Dropdown>
                  <DropdownTrigger>
                    <Button isIconOnly size="sm" variant="light">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="Acciones">
                    <DropdownItem
                      key="edit"
                      startContent={<Edit className="w-4 h-4" />}
                      onPress={() => onEdit?.(cliente)}
                    >
                      Editar
                    </DropdownItem>
                    <DropdownItem
                      key="delete"
                      className="text-danger"
                      color="danger"
                      startContent={<Trash2 className="w-4 h-4" />}
                      onPress={() => onDelete?.(cliente)}
                    >
                      Eliminar
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
