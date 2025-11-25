import React from 'react';
import { VentasPOSList } from '../components/VentasPOSList';

export const POSDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <VentasPOSList />
    </div>
  );
};
