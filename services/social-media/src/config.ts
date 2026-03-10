import { validateEnv, socialEnvSchema } from '@embedo/config';

export const env = validateEnv(socialEnvSchema);
