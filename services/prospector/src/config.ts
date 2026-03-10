import { validateEnv, prospectorEnvSchema } from '@embedo/config';

export const env = validateEnv(prospectorEnvSchema);
