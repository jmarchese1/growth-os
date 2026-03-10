import { validateEnv, proposalEnvSchema } from '@embedo/config';

export const env = validateEnv(proposalEnvSchema);
