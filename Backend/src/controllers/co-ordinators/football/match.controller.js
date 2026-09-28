import {
  addMatchEvent,
  controlClock,
  deleteMatchEvent,
  finishMatch,
  updateMatchEvent,
} from '../../../services/football/scoring.service.js';
import { parseClockAction, parseMatchEvent } from '../../../services/football/validators.js';
import { ensureOpen, refereeDetail, refereeFixture } from './access.js';

export async function clockControl(req, res) {
  const fixture = await refereeFixture(req.params.id, req.player);
  ensureOpen(fixture);

  const actionData = parseClockAction(req.body);
  await controlClock(fixture, actionData);

  res.json(await refereeDetail(req.params.id));
}

export async function endMatch(req, res) {
  const fixture = await refereeFixture(req.params.id, req.player);
  ensureOpen(fixture);

  await finishMatch(fixture);
  res.json(await refereeDetail(req.params.id));
}

export async function createEvent(req, res) {
  const fixture = await refereeFixture(req.params.id, req.player);
  ensureOpen(fixture);

  const eventData = parseMatchEvent(req.body);
  await addMatchEvent(fixture, eventData);

  res.json(await refereeDetail(req.params.id));
}

export async function editEvent(req, res) {
  const fixture = await refereeFixture(req.params.id, req.player);
  ensureOpen(fixture);

  const eventData = parseMatchEvent(req.body);
  await updateMatchEvent(fixture, req.params.eventId, eventData);

  res.json(await refereeDetail(req.params.id));
}

export async function removeEvent(req, res) {
  const fixture = await refereeFixture(req.params.id, req.player);
  ensureOpen(fixture);

  await deleteMatchEvent(fixture, req.params.eventId);

  res.json(await refereeDetail(req.params.id));
}
