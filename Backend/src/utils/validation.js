import { HttpError } from './httpError.js';

const OBJECT_ID = /^[a-f\d]{24}$/i;

export function isObjectId(value) {
  return typeof value === 'string' && OBJECT_ID.test(value);
}

export async function findByIdOr404(Model, id, notFoundMessage) {
  const doc = isObjectId(id) ? await Model.findById(id) : null;
  if (!doc) throw new HttpError(404, notFoundMessage);
  return doc;
}

export function requireText(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${label} is required`);
  }
  return value.trim();
}

// undefined = field not sent, null = clear the date, otherwise a Date.
export function optionalDate(value, label) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const date = typeof value === 'string' ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw new HttpError(400, `${label} is not a valid date`);
  }
  return date;
}

// Returns de-duplicated ids, or undefined when the field was not sent.
export function optionalIdList(value, label) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every(isObjectId)) {
    throw new HttpError(400, `${label} must be a list of ids`);
  }
  return [...new Set(value)];
}

export async function ensureAllExist(Model, ids, label) {
  const found = await Model.countDocuments({ _id: { $in: ids } });
  if (found !== ids.length) {
    throw new HttpError(400, `Some of the selected ${label} no longer exist. Refresh the page and try again.`);
  }
}

// Saves a document whose name has a unique index, turning a clash into a 409.
export async function saveUnique(doc, conflictMessage) {
  try {
    return await doc.save();
  } catch (err) {
    if (err?.code === 11000) throw new HttpError(409, conflictMessage);
    throw err;
  }
}
