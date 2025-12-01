import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['pdfjs-dist'], // Asegurar que pdfjs-dist se optimice correctamente
  },
  resolve: {
    alias: {
      // Alias @ para imports absolutos
      '@': path.resolve(__dirname, './src'),
      // Alias para el worker de PDF.js
      'pdfjs-dist/build/pdf.worker.min.mjs': 'pdfjs-dist/build/pdf.worker.min.mjs',
    },
  },
  worker: {
    format: 'es', // Usar ES modules para workers
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - librerías grandes
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'chart-vendor': ['recharts'],
          'ui-vendor': ['framer-motion', 'react-hot-toast', 'lucide-react'],

          // Feature chunks - módulos de la aplicación
          'eventos-module': [
            './src/modules/eventos-erp/pages/EventsDashboard',
            './src/modules/eventos-erp/pages/EventsListPage',
          ],
          'admin-module': [
            './src/modules/admin/DatabaseAdminPage',
          ],
          'accounting-module': [
            './src/modules/eventos-erp/components/accounting/AccountingStateDashboard',
            './src/services/accountingStateService.ts',
          ],
          'workflow-module': [
            './src/modules/eventos-erp/components/workflow/WorkflowVisualizationPage',
            './src/modules/eventos-erp/services/workflowService.ts',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Aumentar el límite de advertencia a 1000kb
    sourcemap: false, // Deshabilitar sourcemaps en producción para reducir tamaño
  },
});
