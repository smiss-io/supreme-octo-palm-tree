import { router } from '../trpc'
import { authRouter } from './auth'
import { organizationRouter } from './organization'
import { activityRouter } from './activity'
import { sessionRouter } from './session'
import { bookingRouter } from './booking'
import { paymentRouter } from './payment'
import { parentRouter } from './parent'
import { childRouter } from './child'
import { attendanceRouter } from './attendance'
import { progressRouter } from './progress'
import { automationRouter } from './automation'
import { reportingRouter } from './reporting'
import { locationRouter } from './location'

export const appRouter = router({
  auth: authRouter,
  organization: organizationRouter,
  activity: activityRouter,
  session: sessionRouter,
  booking: bookingRouter,
  payment: paymentRouter,
  parent: parentRouter,
  child: childRouter,
  attendance: attendanceRouter,
  progress: progressRouter,
  automation: automationRouter,
  reporting: reportingRouter,
  location: locationRouter,
})

export type AppRouter = typeof appRouter
