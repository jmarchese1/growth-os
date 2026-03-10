import { validateEnv, surveyEnvSchema } from '@embedo/config';

export const env = validateEnv(surveyEnvSchema);
