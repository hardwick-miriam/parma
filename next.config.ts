import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {},
  serverExternalPackages: ['@resvg/resvg-js'],
}

export default nextConfig
