import { validateEnv, apiEnvSchema } from '@embedo/config';

export const env = validateEnv(apiEnvSchema);
