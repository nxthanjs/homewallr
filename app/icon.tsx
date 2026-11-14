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
          background: '#111111',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '110px',
        }}
      >
        <div
          style={{
            width: '420px',
            height: '420px',
            borderRadius: '90px',
            background: 'linear-gradient(to top right, #06b6d4, #a855f7, #ec4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: '#181818',
              borderRadius: '82px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="240"
              height="240"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 10L12 3l9 7v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10z" />
              <circle cx="12" cy="14" r="3" />
            </svg>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}