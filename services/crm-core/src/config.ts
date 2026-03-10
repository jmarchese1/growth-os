import { validateEnv, crmEnvSchema } from '@embedo/config';

export const env = validateEnv(crmEnvSchema);
