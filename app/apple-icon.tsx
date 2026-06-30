import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#8b5cf6',
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize: '110px',
            fontWeight: '800',
            lineHeight: '1',
            fontFamily: 'system-ui, sans-serif',
            marginBottom: '-6px',
          }}
        >
          P
        </span>
      </div>
    ),
    { ...size }
  )
}
