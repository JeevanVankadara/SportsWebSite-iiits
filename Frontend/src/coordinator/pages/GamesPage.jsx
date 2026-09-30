import { useAuth } from '../../auth/authContext.js'
import { Eyebrow } from '../components/ui.jsx'
import BadmintonAssignments from '../sports/badminton/BadmintonAssignments.jsx'
import CricketAssignments from '../sports/cricket/CricketAssignments.jsx'

// Everything assigned to the co-ordinator, one section per sport.
// A new sport adds its own <XAssignments /> section here.
export default function GamesPage() {
  const { user } = useAuth()
  const firstName = user?.name.split(' ')[0] ?? ''

  return (
    <>
      <section className="co-hero">
        <Eyebrow>§ 01 — Assigned games</Eyebrow>
        <h1 className="co-display co-display-xl">
          Welcome, <span className="co-accent">{firstName}.</span>
        </h1>
        <p className="co-lead">The fixtures you referee, sport by sport. Open one to run it.</p>
      </section>

      <BadmintonAssignments sectionNumber="02" />
      <CricketAssignments sectionNumber="03" />
    </>
  )
}
