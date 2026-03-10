import { validateEnv, chatbotEnvSchema } from '@embedo/config';

export const env = validateEnv(chatbotEnvSchema);
