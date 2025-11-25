import React from 'react';
import { ProductosList } from '../components/ProductosList';

export const InventarioDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <ProductosList />
    </div>
  );
};
