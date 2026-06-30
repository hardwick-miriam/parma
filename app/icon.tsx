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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111113',
          borderRadius: '115px',
        }}
      >
        <div
          style={{
            width: '360px',
            height: '360px',
            background: '#8b5cf6',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              color: 'white',
              fontSize: '230px',
              fontWeight: '800',
              lineHeight: '1',
              fontFamily: 'system-ui, sans-serif',
              marginBottom: '-12px',
            }}
          >
            P
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
