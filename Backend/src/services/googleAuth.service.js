import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

// Only college Google accounts can register or sign in.
export const COLLEGE_DOMAIN = 'iiits.in';

const client = new OAuth2Client();

/**
 * Checks the ID token ("credential") that Google's sign-in button hands the page, and returns the
 * college account it belongs to: { googleId, email, firstName, lastName, fullName }.
 * The token is signed by Google, so none of this can be made up by the browser.
 */
export async function verifyCollegeAccount(credential) {
  if (!env.googleClientId) {
    throw new HttpError(503, 'Google sign-in is not set up yet. Please contact the sports admin.');
  }
  if (typeof credential !== 'string' || !credential || credential.length > 4096) {
    throw new HttpError(400, 'Sign in with your college Google account');
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: env.googleClientId });
    payload = ticket.getPayload();
  } catch {
    throw new HttpError(401, 'Google sign-in failed or expired. Please try again.');
  }

  const email = String(payload?.email ?? '').toLowerCase();
  // hd ("hosted domain") is set only for accounts managed by the college's Google Workspace.
  if (!payload?.email_verified || payload.hd !== COLLEGE_DOMAIN || !email.endsWith(`@${COLLEGE_DOMAIN}`)) {
    throw new HttpError(403, `Use your college Google account (@${COLLEGE_DOMAIN})`);
  }

  return {
    googleId: payload.sub,
    email,
    firstName: payload.given_name?.trim() ?? '',
    lastName: payload.family_name?.trim() ?? '',
    fullName: payload.name?.trim() ?? '',
  };
}
