import { ImageResponse } from 'next/og'
import { SITE_NAME, SITE_TITLE } from '@/shared/lib/seo'

export const alt = SITE_TITLE
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0f1e',
          color: '#f9fafb',
          fontFamily: 'sans-serif',
          backgroundImage:
            'radial-gradient(circle at 20% 10%, rgba(52, 211, 153, 0.16), transparent 45%), radial-gradient(circle at 85% 90%, rgba(129, 140, 248, 0.14), transparent 45%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 22px',
            borderRadius: 9999,
            border: '1px solid rgba(52, 211, 153, 0.4)',
            color: '#34d399',
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: 3,
            textTransform: 'uppercase',
          }}
        >
          Premium Expense Tracker
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 28,
            fontSize: 92,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1,
          }}
        >
          {SITE_NAME}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 20,
            fontSize: 30,
            color: '#94a3b8',
            letterSpacing: -0.5,
          }}
        >
          Intelligence for your personal capital
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 36,
            gap: 28,
            color: '#64748b',
            fontSize: 18,
            fontWeight: 500,
          }}
        >
          <span style={{ display: 'flex' }}>40+ currencies</span>
          <span style={{ display: 'flex' }}>AI insights</span>
          <span style={{ display: 'flex' }}>Bank-grade security</span>
        </div>
      </div>
    ),
    size,
  )
}
