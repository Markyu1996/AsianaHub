const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src')
    return config
  },
  // Force HTTPS redirects handled at Render level
  // Output standalone for Docker/Render deployment
  output: 'standalone',

  // In standalone mode the next/image optimizer requires the native `sharp`
  // package at runtime; without it the /_next/image endpoint 500s and images
  // render as broken. The logo is a fixed-size asset that does not need
  // on-the-fly optimization, so serve images directly from /public instead.
  images: {
    unoptimized: true,
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob:",
              "connect-src 'self'",
            ].join('; ')
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
