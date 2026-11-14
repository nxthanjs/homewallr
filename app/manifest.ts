import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HomeWallr',
    short_name: 'HomeWallr',
    description: 'Your personal House Passport & renovation logbook.',
    start_url: '/',
    display: 'standalone',
    background_color: '#151815',
    theme_color: '#151815',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}