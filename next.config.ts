
import type {NextConfig} from 'next';
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
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
    // Menambahkan domains untuk mengatasi masalah gambar lokal
    domains: ['localhost'],
  },
  experimental: {
    // Menambahkan origin cloud workstation untuk menghilangkan peringatan CORS di lingkungan dev
    allowedDevOrigins: ["*.cloudworkstations.dev"],
  },
};

export default withPWA(nextConfig);
