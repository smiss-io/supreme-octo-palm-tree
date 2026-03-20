import { Html, Head, Body, Container, Text, Heading, Link, Hr } from '@react-email/components'

interface WelcomeProviderProps {
  organizationName: string
  loginUrl: string
}

export default function WelcomeProvider({ organizationName = 'Your Business', loginUrl = 'https://app.kidspark.com/auth/login' }: WelcomeProviderProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>Welcome to KidSpark!</Heading>
          <Text style={textStyle}>
            Thank you for registering <strong>{organizationName}</strong> on KidSpark.
          </Text>
          <Text style={textStyle}>
            You&apos;re now ready to set up your activities, connect your payment processing,
            and start accepting bookings from families in your area.
          </Text>
          <Text style={textStyle}>
            Here&apos;s what to do next:
          </Text>
          <Text style={textStyle}>
            1. Complete your organization profile{'\n'}
            2. Connect Stripe for payments{'\n'}
            3. Add your first location{'\n'}
            4. Create your first activity
          </Text>
          <Link href={loginUrl} style={buttonStyle}>
            Go to Dashboard
          </Link>
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
const buttonStyle = { backgroundColor: '#1B2D6B', borderRadius: '6px', color: '#ffffff', display: 'inline-block', fontSize: '16px', fontWeight: '600' as const, padding: '12px 24px', textDecoration: 'none' }
const hrStyle = { borderColor: '#e5e7eb', margin: '32px 0 16px' }
const footerStyle = { color: '#9ca3af', fontSize: '12px' }
