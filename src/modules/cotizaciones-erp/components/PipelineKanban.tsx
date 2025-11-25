/**
 * PIPELINE KANBAN
 * Vista Kanban del pipeline de oportunidades
 */

import React from 'react';
import { Card, CardBody, Chip, Button } from '@nextui-org/react';
import { DollarSign, User, Calendar, Plus } from 'lucide-react';
import { useOportunidades, useMoverOportunidadEtapa } from '../hooks/useCRM';
import type { Oportunidad } from '../types';

const ETAPAS = [
  { key: 'prospecto', name: 'Prospecto', color: 'default' },
  { key: 'calificacion', name: 'CalificaciÛn', color: 'primary' },
  { key: 'propuesta', name: 'Propuesta', color: 'secondary' },
  { key: 'negociacion', name: 'NegociaciÛn', color: 'warning' },
  { key: 'cierre', name: 'Cierre', color: 'success' }
] as const;

interface PipelineKanbanProps {
  onCreateOportunidad?: () => void;
  onEditOportunidad?: (oportunidad: any) => void;
}

export const PipelineKanban: React.FC<PipelineKanbanProps> = ({
  onCreateOportunidad,
  onEditOportunidad
}) => {
  const { data: oportunidades, isLoading } = useOportunidades();
  const moverEtapa = useMoverOportunidadEtapa();

  const oportunidadesPorEtapa = (etapa: string) => {
    return oportunidades?.filter(op => op.etapa === etapa) || [];
  };

  const handleMoverOportunidad = async (
    oportunidadId: number,
    nuevaEtapa: string,
    probabilidad: number
  ) => {
    await moverEtapa.mutateAsync({
      id: oportunidadId,
      nuevaEtapa,
      probabilidad
    });
  };

  const calcularTotalEtapa = (etapa: string) => {
    const ops = oportunidadesPorEtapa(etapa);
    return ops.reduce((sum, op) => sum + (op.valor_estimado || 0), 0);
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando pipeline...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Pipeline de Ventas</h2>
        {onCreateOportunidad && (
          <Button
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={onCreateOportunidad}
          >
            Nueva Oportunidad
          </Button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {ETAPAS.map((etapa) => {
          const ops = oportunidadesPorEtapa(etapa.key);
          const total = calcularTotalEtapa(etapa.key);

          return (
            <div
              key={etapa.key}
              className="flex-shrink-0 w-80 bg-gray-50 rounded-lg p-4"
            >
              {/* Columna Header */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{etapa.name}</h3>
                  <Chip size="sm" color={etapa.color as any} variant="flat">
                    {ops.length}
                  </Chip>
                </div>
                <p className="text-sm text-gray-600">
                  ${total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </p>
              </div>

              {/* Oportunidades */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {ops.map((op) => (
                  <Card
                    key={op.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    isPressable
                    onPress={() => onEditOportunidad?.(op)}
                  >
                    <CardBody className="p-3 space-y-2">
                      {/* TÌtulo */}
                      <p className="font-semibold line-clamp-2">{op.nombre}</p>

                      {/* Cliente */}
                      {op.cliente && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <User className="w-3 h-3" />
                          <span className="line-clamp-1">{op.cliente.razon_social}</span>
                        </div>
                      )}

                      {/* Valor */}
                      {op.valor_estimado && (
                        <div className="flex items-center gap-1 text-sm">
                          <DollarSign className="w-3 h-3" />
                          <span className="font-mono font-semibold text-green-600">
                            ${op.valor_estimado.toLocaleString('es-MX')}
                          </span>
                        </div>
                      )}

                      {/* Fecha cierre estimada */}
                      {op.fecha_cierre_estimada && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(op.fecha_cierre_estimada).toLocaleDateString('es-MX')}
                          </span>
                        </div>
                      )}

                      {/* Probabilidad */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Probabilidad</span>
                        <Chip size="sm" variant="flat">
                          {op.probabilidad}%
                        </Chip>
                      </div>

                      {/* Acciones r·pidas para mover */}
                      <div className="flex gap-1 pt-2">
                        {etapa.key !== 'prospecto' && (
                          <Button
                            size="sm"
                            variant="flat"
                            className="flex-1 text-xs"
                            onPress={(e) => {
                              e.stopPropagation();
                              const etapaAnterior = ETAPAS[ETAPAS.findIndex(e => e.key === etapa.key) - 1];
                              if (etapaAnterior) {
                                handleMoverOportunidad(
                                  op.id,
                                  etapaAnterior.key,
                                  Math.max(op.probabilidad - 20, 0)
                                );
                              }
                            }}
                          >
                            ê
                          </Button>
                        )}
                        {etapa.key !== 'cierre' && (
                          <Button
                            size="sm"
                            variant="flat"
                            color="primary"
                            className="flex-1 text-xs"
                            onPress={(e) => {
                              e.stopPropagation();
                              const etapaSiguiente = ETAPAS[ETAPAS.findIndex(e => e.key === etapa.key) + 1];
                              if (etapaSiguiente) {
                                handleMoverOportunidad(
                                  op.id,
                                  etapaSiguiente.key,
                                  Math.min(op.probabilidad + 20, 100)
                                );
                              }
                            }}
                          >
                            í
                          </Button>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                ))}

                {ops.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No hay oportunidades
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumen ganadas/perdidas */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardBody className="text-center">
            <p className="text-sm text-gray-600">Oportunidades Ganadas</p>
            <p className="text-2xl font-bold text-green-600">
              {oportunidades?.filter(op => op.etapa === 'ganada').length || 0}
            </p>
            <p className="text-sm text-gray-600">
              ${oportunidades?.filter(op => op.etapa === 'ganada')
                .reduce((sum, op) => sum + (op.valor_real || 0), 0)
                .toLocaleString('es-MX')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-sm text-gray-600">Oportunidades Perdidas</p>
            <p className="text-2xl font-bold text-red-600">
              {oportunidades?.filter(op => op.etapa === 'perdida').length || 0}
            </p>
            <p className="text-sm text-gray-600">
              ${oportunidades?.filter(op => op.etapa === 'perdida')
                .reduce((sum, op) => sum + (op.valor_estimado || 0), 0)
                .toLocaleString('es-MX')}
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
