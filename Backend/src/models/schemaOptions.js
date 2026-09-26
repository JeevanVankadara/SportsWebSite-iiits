// Shared by every model so field names stay snake_case end to end
// and the internal __v version key never reaches API responses.
export const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { versionKey: false },
};

// Makes names unique regardless of case ("Cricket" and "cricket" clash).
export const caseInsensitive = { locale: 'en', strength: 2 };
