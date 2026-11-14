import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#151815',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="320"
          height="320"
          viewBox="0 0 36 36"
          fill="none"
          stroke="#8FA680"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 16L18 6l13 10" />
          <path d="M24 10.5V7h3v5.8" />
          <path d="M8 14.5v13l4.5-3.2c1.7.7 3.6 1.1 5.5 1.1 6.1 0 11-4.1 11-9.2v-1.7" />
          <path d="M15.2 24.3v-6.5h5.6v6.5" />
        </svg>
      </div>
    ),
    { ...size }
  )
}