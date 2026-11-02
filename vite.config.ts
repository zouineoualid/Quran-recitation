import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base relative : l'application fonctionne aussi bien à la racine d'un domaine
// que dans un sous-dossier (GitHub Pages : /Quran-recitation/).
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    include: ['test/**/*.test.ts'],
  },
});
