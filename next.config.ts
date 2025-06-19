
import type {NextConfig} from 'next';
// @ts-ignore TODO: Add type definition for next-pwa
import withPWA from '@ducanh2912/next-pwa';

const nextConfigBase: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  output: 'standalone', // Ajouté pour optimiser le build pour les déploiements conteneurisés
};

const nextConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // TODO: add a custom worker and fallbacks to allow offline functionality
  // fallbacks: {
  //   document: '/_offline', // exemple de fallback pour les pages
  //   image: '/images/offline-placeholder.png',  // exemple de fallback pour les images
  //   // font: '/static/fonts/fallback.woff2',
  // },
})(nextConfigBase);


export default nextConfig;
