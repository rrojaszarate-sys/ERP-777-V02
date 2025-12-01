import React from 'react';
import { ProyectosList } from '../components/ProyectosList';

export const ProyectosDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <ProyectosList />
    </div>
  );
};
