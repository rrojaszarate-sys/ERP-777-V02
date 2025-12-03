/**
 * Gestor de Módulos por Empresa - FASE 6
 */
import { useState } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Switch,
  Chip,
  Button,
  Divider,
  Spinner,
  Tooltip,
  Progress
} from '@nextui-org/react';
import {
  Package,
  Lock,
  Unlock,
  Calendar,
  AlertCircle,
  Check,
  Crown,
  Zap
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useModulosEmpresa, useToggleModulo, useActivarModulosPlan } from '../hooks/useEmpresas';
import type { Empresa, ModuloEmpresaView, ModuloCategoria, PlanTipo } from '../types';
import { CATEGORIAS_MODULOS, PLANES } from '../types';

interface ModulosManagerProps {
  empresa: Empresa;
}

export function ModulosManager({ empresa }: ModulosManagerProps) {
  const { data: modulos, isLoading } = useModulosEmpresa(empresa.id);
  const toggleModulo = useToggleModulo();
  const activarPlan = useActivarModulosPlan();

  const [expandedCategoria, setExpandedCategoria] = useState<ModuloCategoria | null>(null);

  const modulosPorCategoria = modulos?.reduce((acc, modulo) => {
    const cat = modulo.categoria as ModuloCategoria;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(modulo);
    return acc;
  }, {} as Record<ModuloCategoria, ModuloEmpresaView[]>);

  const getIconComponent = (iconName?: string) => {
    if (!iconName) return <Package className="w-5 h-5" />;
    const Icon = (Icons as any)[iconName];
    return Icon ? <Icon className="w-5 h-5" /> : <Package className="w-5 h-5" />;
  };

  const getPlanBadge = (requierePlan: PlanTipo) => {
    const colors: Record<PlanTipo, 'default' | 'primary' | 'success'> = {
      basic: 'default',
      pro: 'primary',
      enterprise: 'success'
    };
    const icons: Record<PlanTipo, React.ReactNode> = {
      basic: null,
      pro: <Zap className="w-3 h-3" />,
      enterprise: <Crown className="w-3 h-3" />
    };

    return (
      <Chip
        size="sm"
        color={colors[requierePlan]}
        variant="flat"
        startContent={icons[requierePlan]}
      >
        {PLANES[requierePlan].nombre}
      </Chip>
    );
  };

  const handleToggle = async (modulo: ModuloEmpresaView) => {
    if (modulo.es_core) return; // No se pueden desactivar módulos core

    // Verificar si el plan permite este módulo
    const planActual = empresa.plan_tipo;
    const planRequerido = modulo.requiere_plan;

    if (!modulo.habilitado) {
      // Intentando activar
      if (
        (planRequerido === 'pro' && planActual === 'basic') ||
        (planRequerido === 'enterprise' && planActual !== 'enterprise')
      ) {
        alert(`Este módulo requiere el plan ${PLANES[planRequerido].nombre}`);
        return;
      }
    }

    await toggleModulo.mutateAsync({
      companyId: empresa.id,
      moduloId: modulo.modulo_id,
      habilitado: !modulo.habilitado
    });
  };

  const handleActivarTodosPlan = async () => {
    await activarPlan.mutateAsync({
      companyId: empresa.id,
      plan: empresa.plan_tipo
    });
  };

  // Calcular estadísticas
  const totalModulos = modulos?.length || 0;
  const modulosActivos = modulos?.filter(m => m.acceso_permitido).length || 0;
  const porcentajeActivos = totalModulos > 0 ? (modulosActivos / totalModulos) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <Card>
        <CardBody>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Módulos Habilitados</h3>
                <p className="text-sm text-gray-500">
                  {modulosActivos} de {totalModulos} módulos activos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-48">
                <Progress
                  value={porcentajeActivos}
                  color="primary"
                  showValueLabel
                  className="max-w-md"
                />
              </div>
              <Chip color="primary" variant="flat">
                Plan: {PLANES[empresa.plan_tipo].nombre}
              </Chip>
              <Button
                color="primary"
                variant="flat"
                size="sm"
                onPress={handleActivarTodosPlan}
                isLoading={activarPlan.isPending}
              >
                Activar todos del plan
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Módulos por categoría */}
      {Object.entries(CATEGORIAS_MODULOS).map(([categoria, catInfo]) => {
        const modulosCat = modulosPorCategoria?.[categoria as ModuloCategoria] || [];
        if (modulosCat.length === 0) return null;

        const activosCat = modulosCat.filter(m => m.acceso_permitido).length;

        return (
          <Card key={categoria}>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedCategoria(
                expandedCategoria === categoria ? null : categoria as ModuloCategoria
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  {getIconComponent(catInfo.icono)}
                  <div>
                    <h3 className="font-semibold">{catInfo.nombre}</h3>
                    <p className="text-xs text-gray-500">{catInfo.descripcion}</p>
                  </div>
                </div>
                <Chip size="sm" variant="flat">
                  {activosCat}/{modulosCat.length}
                </Chip>
              </div>
            </CardHeader>

            {(expandedCategoria === categoria || expandedCategoria === null) && (
              <CardBody className="pt-0">
                <Divider className="mb-4" />
                <div className="grid gap-3">
                  {modulosCat.map((modulo) => (
                    <div
                      key={modulo.modulo_id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        modulo.acceso_permitido
                          ? 'bg-success-50/30 border-success-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          modulo.acceso_permitido ? 'bg-success-100' : 'bg-gray-100'
                        }`}>
                          {getIconComponent(modulo.icono)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{modulo.modulo_nombre}</span>
                            {modulo.es_core && (
                              <Tooltip content="Módulo del sistema (siempre activo)">
                                <Chip size="sm" color="warning" variant="flat">
                                  <Lock className="w-3 h-3" />
                                </Chip>
                              </Tooltip>
                            )}
                            {getPlanBadge(modulo.requiere_plan)}
                          </div>
                          <p className="text-xs text-gray-500">{modulo.descripcion}</p>
                          {modulo.ruta_base && (
                            <p className="text-xs text-gray-400">
                              Ruta: {modulo.ruta_base}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {modulo.fecha_expiracion && (
                          <Tooltip content={`Expira: ${new Date(modulo.fecha_expiracion).toLocaleDateString()}`}>
                            <Chip
                              size="sm"
                              color={new Date(modulo.fecha_expiracion) < new Date() ? 'danger' : 'warning'}
                              variant="flat"
                              startContent={<Calendar className="w-3 h-3" />}
                            >
                              {new Date(modulo.fecha_expiracion).toLocaleDateString()}
                            </Chip>
                          </Tooltip>
                        )}

                        <Switch
                          isSelected={modulo.habilitado}
                          isDisabled={modulo.es_core || toggleModulo.isPending}
                          onValueChange={() => handleToggle(modulo)}
                          size="sm"
                          color="success"
                          thumbIcon={({ isSelected }) =>
                            isSelected ? <Check className="w-3 h-3" /> : <Unlock className="w-3 h-3" />
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            )}
          </Card>
        );
      })}

      {/* Información de plan */}
      <Card className="bg-gradient-to-r from-primary-50 to-secondary-50">
        <CardBody>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-semibold text-primary">Sobre los módulos</h4>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>• Los módulos <strong>Core</strong> siempre están activos y no pueden deshabilitarse.</li>
                <li>• Algunos módulos requieren un plan superior para ser habilitados.</li>
                <li>• Puedes configurar límites individuales para cada módulo.</li>
                <li>• Los módulos deshabilitados no aparecerán en el menú de navegación.</li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default ModulosManager;
