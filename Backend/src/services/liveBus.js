import { EventEmitter } from 'node:events';

// In-process fan-out for live score updates. One Node process runs the whole API, so an
// EventEmitter is all the pub/sub we need. If the API ever runs on more than one instance,
// swap this module for a Redis-backed bus; nothing else has to change.
export const liveBus = new EventEmitter();

// Each fixture can have many viewers watching at once; don't warn past the default 10.
liveBus.setMaxListeners(0);

// Channel key per sport + fixture, so a stream only hears its own fixture's updates.
export const liveChannel = (sport, fixtureId) => `${sport}:${String(fixtureId)}`;

// Called after anything that changes a fixture (referee action, admin edit or decision).
// It only signals "this fixture changed"; the stream layer rebuilds the public payload once
// and sends it to every viewer, so viewers never see referee-only data.
export function publishFixture(sport, fixtureId) {
  liveBus.emit(liveChannel(sport, fixtureId));
}
