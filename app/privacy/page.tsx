export const dynamic = 'force-static'

export const metadata = {
  title: 'Privacy Policy — Parma',
}

export default function PrivacyPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#111113',
        color: '#e2e2e6',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '4rem 1.5rem 5rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <a href="/" style={{ display: 'inline-block' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Parma"
              width={32}
              height={32}
              style={{ mixBlendMode: 'screen', borderRadius: 4, display: 'block' }}
            />
          </a>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '1.25rem', marginBottom: '0.5rem', color: '#fff' }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: 13, color: '#71717a' }}>Last updated: 3 July 2026</p>
        </div>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>What Parma is</h2>
          <p style={textStyle}>
            Parma is a personal health dashboard. You log food, sleep, steps, mood, workouts, and habits. We store that data so you can see trends over time. That&apos;s the whole thing.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Your health data</h2>
          <p style={textStyle}>
            Everything you log — calories, sleep, weight, mood, supplements, workouts — is stored privately in your account on Supabase, a managed Postgres database with row-level security. Only you can read your own data. We cannot read it without bypassing security controls we don&apos;t use in practice.
          </p>
          <p style={textStyle}>
            We never sell your health data. We never share it with advertisers, data brokers, or third parties for any purpose other than operating the app.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>WHOOP integration</h2>
          <p style={textStyle}>
            If you choose to connect your WHOOP device, we access your recovery scores, HRV, resting heart rate, strain, sleep performance, and workout data via the official WHOOP API v2 — with your explicit consent during the OAuth authorisation flow.
          </p>
          <p style={textStyle}>
            Your WHOOP access token is stored encrypted server-side and is never exposed in the browser or client-side code. We only request the scopes needed to show you your own data: <code style={codeStyle}>read:recovery read:sleep read:workout read:cycles read:profile</code>.
          </p>
          <p style={textStyle}>
            You can revoke this connection at any time from Settings → WHOOP Integration → Disconnect. Disconnecting immediately revokes our access token with WHOOP and deletes all stored WHOOP credentials from our database.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>AI parsing</h2>
          <p style={textStyle}>
            When you submit a log entry (e.g. &quot;had chicken and rice, 8 hours sleep, went for a run&quot;), that text is sent to Anthropic&apos;s Claude API to extract structured data (calories, sleep hours, workout type, etc.). The text is transmitted solely for this parsing purpose. Anthropic&apos;s data handling is governed by their{' '}
            <a href="https://www.anthropic.com/legal/privacy" style={linkStyle}>Privacy Policy</a>.
            We do not send any identifying information alongside log text — only the raw log string.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Data export and deletion</h2>
          <p style={textStyle}>
            You can request a full export or deletion of your data by emailing{' '}
            <a href="mailto:hardwickars@gmail.com" style={linkStyle}>hardwickars@gmail.com</a>.
            We will fulfil deletion requests within 30 days. Deleting your account removes all rows associated with your user ID from every table, including WHOOP metrics, log entries, health status, and preferences.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Cookies and tracking</h2>
          <p style={textStyle}>
            We use one first-party cookie (<code style={codeStyle}>parma-theme</code>) to remember your UI theme preference across sessions. We use Supabase auth cookies for session management. We do not use any third-party analytics, advertising cookies, or tracking pixels.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Contact</h2>
          <p style={textStyle}>
            Questions about this policy?{' '}
            <a href="mailto:hardwickars@gmail.com" style={linkStyle}>hardwickars@gmail.com</a>
          </p>
        </section>

        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <a href="/" style={{ ...linkStyle, fontSize: 13 }}>← Back to Parma</a>
        </div>
      </div>
    </div>
  )
}

const sectionStyle: React.CSSProperties = {
  marginBottom: '2rem',
}

const headingStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 600,
  color: '#fff',
  marginBottom: '0.75rem',
}

const textStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  lineHeight: 1.75,
  color: '#a1a1aa',
  marginBottom: '0.75rem',
}

const codeStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  background: 'rgba(139,92,246,0.12)',
  color: '#a78bfa',
  padding: '0.1em 0.35em',
  borderRadius: 4,
  fontSize: '0.85em',
}

const linkStyle: React.CSSProperties = {
  color: '#8b5cf6',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
}
