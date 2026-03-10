import { validateEnv, voiceEnvSchema } from '@embedo/config';

export const env = validateEnv(voiceEnvSchema);
