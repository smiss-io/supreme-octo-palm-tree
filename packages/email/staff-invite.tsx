import { Html, Head, Body, Container, Text, Heading, Link, Hr } from '@react-email/components'

interface StaffInviteProps {
  organizationName: string
  inviterName: string
  role: string
  acceptUrl: string
}

export default function StaffInvite({ organizationName = 'Acme Kids Academy', inviterName = 'Jane Smith', role = 'instructor', acceptUrl = 'https://app.kidspark.com/invite/accept?token=example' }: StaffInviteProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>You&apos;ve been invited to join {organizationName}</Heading>
          <Text style={textStyle}>
            {inviterName} has invited you to join <strong>{organizationName}</strong> as
            a <strong>{role}</strong> on KidSpark.
          </Text>
          <Text style={textStyle}>
            KidSpark is a children&apos;s activity marketplace where providers manage
            classes, camps, and enrichment programs. As a {role}, you&apos;ll be able
            to help manage activities and connect with families.
          </Text>
          <Text style={textStyle}>
            Click the button below to accept the invitation and set up your account.
          </Text>
          <Link href={acceptUrl} style={buttonStyle}>
            Accept Invite
          </Link>
          <Text style={textStyle}>
            If the button above doesn&apos;t work, copy and paste the following URL
            into your browser:
          </Text>
          <Text style={linkTextStyle}>
            {acceptUrl}
          </Text>
          <Text style={textStyle}>
            If you weren&apos;t expecting this invitation, you can safely ignore this email.
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
