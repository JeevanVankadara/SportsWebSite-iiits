import { useState } from 'react'
import InningsStart from './InningsStart.jsx'
import LiveInnings from './LiveInnings.jsx'
import Scorecard from './Scorecard.jsx'
import SetupPanel from './SetupPanel.jsx'
import TossPanel from './TossPanel.jsx'

const TABS = [
  { key: 'live', label: 'Live' },
  { key: 'scorecard', label: 'Scorecard' },
]

// Step 3: the live scoring screen and the full scorecard, as two tabs.
export default function PlayPanel(panel) {
  const { fixture, innings } = panel
  const [tab, setTab] = useState('live')
  const current = innings.find((item) => item.status === 'live')

  return (
    <>
      <div className="co-tabs" role="tablist" aria-label="Match">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            className="co-tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'scorecard' && <Scorecard {...panel} />}
      {tab === 'live' && (current ? <LiveInnings key={current._id} {...panel} inn={current} /> : <InningsStart {...panel} />)}
      {tab === 'live' && fixture.status === 'scheduled' && (
        <>
          <TossPanel {...panel} collapsible />
          <SetupPanel {...panel} collapsible />
        </>
      )}
    </>
  )
}
