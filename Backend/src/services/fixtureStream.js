import { HttpError } from '../utils/httpError.js';
import { isObjectId } from '../utils/validation.js';
import { liveBus, liveChannel } from './liveBus.js';

const HEARTBEAT_MS = 25_000;

// One hub per watched fixture: its open viewer connections and the bus listener feeding them.
// A change is rebuilt once per hub (not once per viewer), and changes that land while a
// rebuild is running are folded into one more rebuild, so a burst of referee taps stays cheap.
const hubs = new Map();

const frame = (event, payload) => `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
const isOver = (payload) => payload?.fixture?.status === 'completed';

function openHub(channel, build) {
  const hub = { clients: new Set(), building: false, again: false };

  hub.onChange = async () => {
    if (hub.building) {
      hub.again = true;
      return;
    }
    hub.building = true;
    try {
      do {
        hub.again = false;
        let payload;
        try {
          payload = await build();
        } catch (err) {
          // The fixture was deleted: end the streams. Any other error keeps them open, and the
          // next change (or the viewer's reconnect) sends the correct state.
          if (err.status === 404) for (const client of [...hub.clients]) client.close();
          else console.error(`Live update for ${channel} failed: ${err.message}`);
          return;
        }
        const update = frame('score_update', payload);
        const over = isOver(payload);
        for (const client of [...hub.clients]) {
          client.res.write(update);
          if (over) {
            client.res.write(frame('match_complete', payload));
            client.close();
          }
        }
      } while (hub.again && hub.clients.size);
    } finally {
      hub.building = false;
    }
  };

  liveBus.on(channel, hub.onChange);
  hubs.set(channel, hub);
  return hub;
}

/**
 * GET /api/<sport>/fixtures/:id/stream — live scores over Server-Sent Events.
 * `buildPublic(id)` must return exactly what the public GET /fixtures/:id returns (plus the
 * tournament's name and houses), and throw a 404 HttpError when the fixture does not exist.
 * The full state is sent on connect and after every change, so a reconnect is always correct.
 */
export function fixtureStreamHandler(sport, buildPublic) {
  return async function streamFixture(req, res) {
    const { id } = req.params;
    if (!isObjectId(id)) throw new HttpError(404, 'Fixture not found');
    const initial = await buildPublic(id);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // stops nginx-style proxies buffering the stream
    });
    res.write(frame('score_update', initial));
    if (isOver(initial)) {
      res.write(frame('match_complete', initial));
      res.end();
      return;
    }

    const channel = liveChannel(sport, id);
    const hub = hubs.get(channel) ?? openHub(channel, () => buildPublic(id));
    const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
    let closed = false;
    const client = {
      res,
      close() {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        hub.clients.delete(client);
        if (!hub.clients.size && hubs.get(channel) === hub) {
          liveBus.off(channel, hub.onChange);
          hubs.delete(channel);
        }
        res.end();
      },
    };
    hub.clients.add(client);
    req.on('close', client.close);
  };
}
