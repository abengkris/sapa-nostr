import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tell it!',
    short_name: 'Tell it!',
    description: 'Whatever it is, just Tell It. A decentralized microblogging platform on Nostr.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/next.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable'
      }
    ],
    orientation: 'portrait',
    scope: '/',
    categories: ['social', 'news'],
    shortcuts: [
      {
        name: 'New Post',
        url: '/',
        icons: [{ src: '/next.svg', sizes: '192x192' }]
      },
      {
        name: 'Messages',
        url: '/messages',
        icons: [{ src: '/next.svg', sizes: '192x192' }]
      }
    ]
  }
}
