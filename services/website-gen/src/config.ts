import { validateEnv, websiteGenEnvSchema } from '@embedo/config';

export const env = validateEnv(websiteGenEnvSchema);
