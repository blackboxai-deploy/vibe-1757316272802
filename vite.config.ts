import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [
        react({
          // Enable Fast Refresh for React 19
          fastRefresh: true,
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          '@components': path.resolve(__dirname, './components'),
          '@types': path.resolve(__dirname, './types.ts'),
          '@constants': path.resolve(__dirname, './constants.tsx'),
        }
      },
      // Performance optimizations
      build: {
        target: 'esnext',
        minify: 'esbuild',
        cssMinify: true,
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              supabase: ['@supabase/supabase-js'],
              ui: ['@heroicons/react'],
              charts: ['recharts'],
            }
          }
        },
        // Increase chunk size warning limit for better performance
        chunkSizeWarningLimit: 1000,
        // Enable source maps in production for debugging
        sourcemap: mode === 'development',
      },
      // Development server optimizations
      server: {
        port: 3000,
        open: false,
        strictPort: false,
        // Enable HMR
        hmr: {
          overlay: true,
        },
      },
      // Optimize dependencies
      optimizeDeps: {
        include: [
          'react', 
          'react-dom', 
          '@supabase/supabase-js', 
          '@heroicons/react',
          'recharts'
        ],
      },
      // Enable CSS code splitting
      css: {
        devSourcemap: mode === 'development',
      }
    };
});
