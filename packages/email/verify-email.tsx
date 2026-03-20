import { Html, Head, Body, Container, Text, Heading, Link, Hr } from '@react-email/components'

interface VerifyEmailProps {
  verifyUrl: string
  userName: string
}

export default function VerifyEmail({ verifyUrl = 'https://app.kidspark.com/auth/verify?token=example', userName = 'there' }: VerifyEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>Verify your email address</Heading>
          <Text style={textStyle}>
            Hi {userName},
          </Text>
          <Text style={textStyle}>
            Please verify your email address to complete your KidSpark account setup.
            Click the button below to confirm your email.
          </Text>
          <Link href={verifyUrl} style={buttonStyle}>
            Verify Email Address
          </Link>
          <Text style={textStyle}>
            This link will expire in 24 hours. If the button above doesn&apos;t work,
            copy and paste the following URL into your browser:
          </Text>
          <Text style={linkTextStyle}>
            {verifyUrl}
          </Text>
          <Text style={textStyle}>
            If you did not create a KidSpark account, you can safely ignore this email.
          </Text>
          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            KidSpark — Activities &amp; education for kids
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const bodyStyle = { backgroundColor: '#f6f9fc', fontFamily: 'system-ui, -apple-system, sans-serif' }
const containerStyle = { backgroundColor: '#ffffff', margin: '0 auto', padding: '40px 20px', maxWidth: '560px', borderRadius: '8px' }
const headingStyle = { color: '#1B2D6B', fontSize: '24px', fontWeight: '700' as const, marginBottom: '24px' }
const textStyle = { color: '#374151', fontSize: '16px', lineHeight: '24px', marginBottom: '16px' }
const linkTextStyle = { color: '#1B2D6B', fontSize: '14px', lineHeight: '24px', marginBottom: '16px', wordBreak: 'break-all' as const }
const buttonStyle = { backgroundColor: '#1B2D6B', borderRadius: '6px', color: '#ffffff', display: 'inline-block', fontSize: '16px', fontWeight: '600' as const, padding: '12px 24px', textDecoration: 'none', marginBottom: '24px' }
const hrStyle = { borderColor: '#e5e7eb', margin: '32px 0 16px' }
const footerStyle = { color: '#9ca3af', fontSize: '12px' }
