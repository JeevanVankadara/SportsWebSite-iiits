# Frontend security and live scoring

## Delivery

`npm run build` minifies the application, emits no source maps, and adds a production CSP to HTML. Executable scripts are restricted to this origin; inline scripts, eval, plugins and base URL changes are blocked. Inline styles remain allowed for React and GSAP. API connections are restricted to this origin and the configured `VITE_API_URL` origin. Non-local production APIs must use HTTPS.

`dist/_headers` contains CSP, frame protection, MIME sniffing protection, referrer and permissions policies. Netlify/Cloudflare Pages support this file. Other hosts must configure those response headers themselves; Vite preview applies them for verification. The HTML CSP cannot enforce frame protection. Configure HTTPS and HSTS at the production host and serve index.html for app routes. Never deploy the Vite development server publicly.

Browser-delivered HTML, CSS, JavaScript, SVGs and animations remain inspectable and copyable. DevTools blockers and disabled right-click do not create a security boundary. Public scores remain public. Scraping limits, bot controls and rate limits belong at the API/CDN. Authorization and sensitive field filtering must be enforced on the backend, including every admin/coordinator mutation. Client route guards and an unlisted admin path do not replace authorization.

Authenticated bearer tokens are now tab-scoped in sessionStorage instead of persistent localStorage. Existing localStorage credentials are removed: users with an old saved login must sign in again. Reloading the same tab preserves login. This reduces persistence, but scripts running on the origin can still read the token. HttpOnly Secure SameSite cookies require a future coordinated backend authentication change. Public reads omit credentials and never inherit signed-in tokens. Requests reject redirects and malformed responses and time out after 15 seconds. Scoring writes are never automatically retried; after an ambiguous connection failure, check the current scorecard first.

## Scorer → viewer animation contract

The coordinator scores through the existing API; the viewer polls published fixture snapshots every 10 seconds while visible. There is no client broadcast granting scoring authority.

| API delivery/state | Animation |
| --- | --- |
| `4` | FOUR |
| `6` | SIX |
| `W`, or a delivery ending in ` W` | OUT |
| `wd`, `wd+N` | WIDE |
| `nb`, `nb+N`, including bye suffixes | NO BALL |
| Batter crosses 50, 100, 150 or 200 | Milestone |
| Football score increases | GOAL |
| Badminton matches-won increases | Match celebration |

Multiple received events are queued, capped at 12 to avoid an indefinitely delayed replay. Boundary and milestone celebrations play separately. Initial page load seeds commentary without replaying old animations. Duplicate snapshots do not repeat events. Undo/correction resets derived commentary without celebrating. Reduced motion skips visual celebrations. The final cricket snapshot is processed even after the innings completes.

The current API only includes current-over labels, not a durable full delivery-event stream. Missing deliveries across overs cannot be reconstructed exactly: the viewer shows a sync notice when it can detect a gap, updates the actual score, and animates only supplied labels and crossed milestones. Exact recovery of every scoring event, with batter/bowler identity, requires an ordered event API (event ID, innings ID, revision/sequence, kind, participants and timestamp); SSE/WebSocket can transport that later. No backend changes are included here.

## Recovery

Public reads retain the last successful snapshot on network/server failure, label it stale, back off up to 30 seconds and refresh on reconnect/return to the tab. Scheduled live-enabled pages continue polling so a match can start without a reload. Permanent 4xx errors stop automatic retries and clear inaccessible data. No scores are persisted as an offline source of truth. A reload with no connection still requires previously delivered app assets; no offline scoring or service worker is supplied. A render/chunk-loading failure shows a reload/home recovery screen without exposing stack traces.

## Checks

Run `npm run lint`, `npm run build`, `npm run verify:viewer`, `node scripts/verify-hardening.mjs`, and `npm audit --omit=dev`. Test the built preview to verify CSP does not break animations. Live scorer-to-viewer acceptance additionally requires the backend, database, and a valid coordinator account.

CSP reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
