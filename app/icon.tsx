import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

export const sizes = [
  { width: 192, height: 192 },
  { width: 512, height: 512 },
]
export const contentType = 'image/png'

function ParmIcon({ size }: { size: number }) {
  const logoData = readFileSync(join(process.cwd(), 'public/logo.png'))
  const logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111113',
        }}
      >
        {/* Logo at 60% — fits within maskable safe zone (inner 80% circle) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoBase64}
          alt=""
          style={{ width: '60%', height: '60%', objectFit: 'contain' }}
        />
      </div>
    ),
    { width: size, height: size }
  )
}

export function generateImageMetadata() {
  return sizes.map((s) => ({ id: `${s.width}`, ...s, contentType }))
}

export default function Icon({ id }: { id: string }) {
  const size = id === '192' ? 192 : 512
  return ParmIcon({ size })
}
