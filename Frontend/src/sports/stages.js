// The optional tag line a fixture can carry, shared by every sport. Same keys as the server
// (Backend/src/models/fixtureStage.js).
export const STAGE_OPTIONS = [
  ['group', 'Group stage'],
  ['quarter_final', 'Quarter final'],
  ['semi_final', 'Semi final'],
  ['third_place', '3rd place match'],
  ['final', 'Final'],
]

const LABELS = Object.fromEntries(STAGE_OPTIONS)

export const stageLabel = (stage) => LABELS[stage] ?? ''
