import { Html, Head, Body, Container, Text, Heading, Link, Hr } from '@react-email/components'

interface WelcomeParentProps {
  parentName: string
  exploreUrl: string
}

export default function WelcomeParent({ parentName = 'there', exploreUrl = 'https://app.kidspark.com/explore' }: WelcomeParentProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>Welcome to KidSpark!</Heading>
          <Text style={textStyle}>
            Hi {parentName},
          </Text>
          <Text style={textStyle}>
            Start exploring activities for your family. KidSpark connects you with
            trusted local providers offering classes, camps, and enrichment programs
            for kids of all ages.
          </Text>
          <Text style={textStyle}>
            Here&apos;s what you can do:
          </Text>
          <Text style={textStyle}>
            1. Browse activities by age, interest, or location{'\n'}
            2. Save your favorites for later{'\n'}
            3. Book and manage enrollments in one place{'\n'}
            4. Get recommendations tailored to your family
          </Text>
          <Link href={exploreUrl} style={buttonStyle}>
            Explore Activities
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
