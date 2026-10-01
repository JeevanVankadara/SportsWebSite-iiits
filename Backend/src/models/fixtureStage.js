import { HttpError } from '../utils/httpError.js';

// The optional tag line a fixture can carry (e.g. "Semi final"), shared by every sport.
// The labels people see live in the frontend (Frontend/src/sports/stages.js).
export const FIXTURE_STAGES = ['group', 'quarter_final', 'semi_final', 'third_place', 'final'];

export const stageField = {
  type: String,
  enum: { values: FIXTURE_STAGES, message: 'Pick a stage from the list' },
  default: null,
};

// For admin create/edit bodies: undefined leaves the stage as it is, '' or null clears it.
export function parseStage(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (!FIXTURE_STAGES.includes(value)) throw new HttpError(400, 'Pick a stage from the list');
  return value;
}
