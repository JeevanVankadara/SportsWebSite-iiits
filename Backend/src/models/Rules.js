import mongoose from 'mongoose';
import { schemaOptions } from './schemaOptions.js';

export const MAX_RULES = 100;
export const MAX_RULE_LENGTH = 500;

// rules: rule_id (_id), set_of_rules
const rulesSchema = new mongoose.Schema(
  {
    set_of_rules: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: [MAX_RULE_LENGTH, `Each rule must be ${MAX_RULE_LENGTH} characters or fewer`],
        },
      ],
      default: [],
      validate: {
        validator: (rules) => rules.length <= MAX_RULES,
        message: `A game can have at most ${MAX_RULES} rules`,
      },
    },
  },
  schemaOptions,
);

export const Rules = mongoose.model('Rules', rulesSchema, 'rules');
