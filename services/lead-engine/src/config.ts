import { validateEnv, leadEnvSchema } from '@embedo/config';

export const env = validateEnv(leadEnvSchema);
