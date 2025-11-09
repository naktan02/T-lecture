// Example schema for validation (e.g., using Joi or Zod)
exports.createUserSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 3 },
    email: { type: 'string', format: 'email' },
  },
  required: ['name', 'email'],
  additionalProperties: false,
};
