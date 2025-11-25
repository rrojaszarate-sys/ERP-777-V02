import React from 'react';
import { LeadsList } from '../components/LeadsList';

export const CRMDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <LeadsList />
    </div>
  );
};
