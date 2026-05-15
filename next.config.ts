import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.0.64'],
  turbopack: {
    resolveAlias: {
      canvas: './empty-module.ts',
    },
  },
}

export default nextConfig
