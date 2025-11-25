/**
 * PÁGINA DE PIPELINE
 * Vista Kanban del pipeline de oportunidades
 */

import React from 'react';
import { PipelineKanban } from '../components/PipelineKanban';

export const PipelinePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PipelineKanban />
    </div>
  );
};
