import { useAuth } from '../auth/AuthProvider';
import { PERMISSION_MATRIX } from '../config/constants';

export const usePermissions = () => {
  const { user } = useAuth();
  
  const hasPermission = (module: string, action: string, resource: string = '*', scope: string = '*'): boolean => {
    // Bypass en desarrollo sin permisos habilitados
    if (import.meta.env.VITE_ENABLE_PERMISSIONS === 'false') {
      return true;
    }
    
    if (!user) return false;
    
    const userPermissions = PERMISSION_MATRIX[user.role as keyof typeof PERMISSION_MATRIX] || [];
    const requiredPermission = `${module}.${action}.${resource}.${scope}`;
    
    return userPermissions.some(permission => {
      if (permission === '*.*.*.*') return true;
      
      const [pModule, pAction, pResource, pScope] = permission.split('.');
      
      return (pModule === '*' || pModule === module) &&
             (pAction === '*' || pAction === action) &&
             (pResource === '*' || pResource === resource) &&
             (pScope === '*' || pScope === scope);
    });
  };

  const canCreate = (module: string) => hasPermission(module, 'create');
  const canRead = (module: string) => hasPermission(module, 'read');
  const canUpdate = (module: string) => hasPermission(module, 'update');
  const canDelete = (module: string) => hasPermission(module, 'delete');
  const canDeleteHard = (module: string) => hasPermission(module, 'delete', 'hard');
  const canAdminDatabase = () => hasPermission('system', 'admin', 'database');

  return { 
    hasPermission, 
    canCreate, 
    canRead, 
    canUpdate, 
    canDelete, 
    canDeleteHard,
    canAdminDatabase
  };
};