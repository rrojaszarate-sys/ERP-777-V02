/**
 * TABLA DEL PLAN DE CUENTAS
 * Muestra el catálogo de cuentas contables en formato jerárquico
 */

import React, { useState, useMemo } from 'react';
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
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from '@nextui-org/react';
import { Search, Plus, Edit, Trash2, MoreVertical, ChevronRight, ChevronDown } from 'lucide-react';
import { usePlanCuentas } from '../hooks/useContabilidad';
import type { PlanCuentas } from '../types';

interface PlanCuentasTableProps {
  onEdit?: (cuenta: PlanCuentas) => void;
  onDelete?: (cuenta: PlanCuentas) => void;
  onCreate?: () => void;
}

export const PlanCuentasTable: React.FC<PlanCuentasTableProps> = ({
  onEdit,
  onDelete,
  onCreate
}) => {
  const { data: cuentas, isLoading } = usePlanCuentas();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  // Construir árbol jerárquico
  const cuentasTree = useMemo(() => {
    if (!cuentas) return [];

    const cuentasMap = new Map(cuentas.map(c => [c.id, { ...c, children: [] as any[] }]));
    const roots: any[] = [];

    cuentas.forEach(cuenta => {
      const node = cuentasMap.get(cuenta.id)!;
      if (cuenta.cuenta_padre_id) {
        const parent = cuentasMap.get(cuenta.cuenta_padre_id);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [cuentas]);

  // Filtrar por búsqueda
  const filteredCuentas = useMemo(() => {
    if (!searchTerm) return cuentasTree;

    const filterNode = (node: any): any => {
      const matchesCodigo = node.codigo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesNombre = node.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const filteredChildren = node.children.map(filterNode).filter(Boolean);

      if (matchesCodigo || matchesNombre || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    };

    return cuentasTree.map(filterNode).filter(Boolean);
  }, [cuentasTree, searchTerm]);

  const toggleExpand = (id: number) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const renderRows = (nodes: any[], level = 0): React.ReactNode[] => {
    const rows: React.ReactNode[] = [];

    nodes.forEach(node => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedNodes.has(node.id);
      const paddingLeft = level * 24;

      rows.push(
        <TableRow key={node.id}>
          <TableCell>
            <div className="flex items-center" style={{ paddingLeft: `${paddingLeft}px` }}>
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(node.id)}
                  className="mr-2 text-gray-500 hover:text-gray-700"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}
              <span className="font-mono font-medium">{node.codigo}</span>
            </div>
          </TableCell>
          <TableCell>
            <span className={level > 0 ? 'text-gray-700' : 'font-semibold'}>
              {node.nombre}
            </span>
          </TableCell>
          <TableCell>
            <Chip
              size="sm"
              color={
                node.tipo === 'activo' ? 'success' :
                node.tipo === 'pasivo' ? 'danger' :
                node.tipo === 'capital' ? 'primary' :
                node.tipo === 'ingreso' ? 'secondary' :
                'warning'
              }
              variant="flat"
            >
              {node.tipo.toUpperCase()}
            </Chip>
          </TableCell>
          <TableCell>
            <Chip
              size="sm"
              color={node.naturaleza === 'deudora' ? 'primary' : 'secondary'}
              variant="flat"
            >
              {node.naturaleza === 'deudora' ? 'Deudora' : 'Acreedora'}
            </Chip>
          </TableCell>
          <TableCell>
            <Chip
              size="sm"
              color={node.acepta_movimientos ? 'success' : 'default'}
              variant="flat"
            >
              {node.acepta_movimientos ? 'Sí' : 'No'}
            </Chip>
          </TableCell>
          <TableCell>
            <span className={`font-mono ${node.saldo_actual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${node.saldo_actual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
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
                    onPress={() => onEdit?.(node)}
                  >
                    Editar
                  </DropdownItem>
                  <DropdownItem
                    key="delete"
                    className="text-danger"
                    color="danger"
                    startContent={<Trash2 className="w-4 h-4" />}
                    onPress={() => onDelete?.(node)}
                  >
                    Eliminar
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </TableCell>
        </TableRow>
      );

      if (isExpanded && hasChildren) {
        rows.push(...renderRows(node.children, level + 1));
      }
    });

    return rows;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar por código o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            startContent={<Search className="w-4 h-4 text-gray-400" />}
            isClearable
            onClear={() => setSearchTerm('')}
          />
        </div>
        {onCreate && (
          <Button
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={onCreate}
          >
            Nueva Cuenta
          </Button>
        )}
      </div>

      {/* Table */}
      <Table aria-label="Plan de Cuentas" isStriped>
        <TableHeader>
          <TableColumn>CÓDIGO</TableColumn>
          <TableColumn>NOMBRE</TableColumn>
          <TableColumn>TIPO</TableColumn>
          <TableColumn>NATURALEZA</TableColumn>
          <TableColumn>MOVIMIENTOS</TableColumn>
          <TableColumn>SALDO ACTUAL</TableColumn>
          <TableColumn>ACCIONES</TableColumn>
        </TableHeader>
        <TableBody
          isLoading={isLoading}
          emptyContent="No se encontraron cuentas"
        >
          {renderRows(filteredCuentas) as any}
        </TableBody>
      </Table>
    </div>
  );
};
