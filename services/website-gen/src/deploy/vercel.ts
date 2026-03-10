import axios from 'axios';
import { createLogger, ExternalApiError } from '@embedo/utils';
import { env } from '../config.js';
import type { DeployedWebsite } from '@embedo/types';

const log = createLogger('website-gen:vercel');

const VERCEL_API = 'https://api.vercel.com';

/**
 * Deploy a generated HTML site to Vercel as a new project.
 * Creates a project and deploys the HTML file.
 */
export async function deployToVercel(params: {
  projectName: string;
  html: string;
  businessId: string;
}): Promise<DeployedWebsite> {
  const { projectName, html, businessId } = params;

  const headers = {
    Authorization: `Bearer ${env.VERCEL_API_TOKEN}`,
    'Content-Type': 'application/json',
  };

  const teamQuery = env.VERCEL_TEAM_ID ? `?teamId=${env.VERCEL_TEAM_ID}` : '';

  try {
    // Create deployment directly
    const deployRes = await axios.post(
      `${VERCEL_API}/v13/deployments${teamQuery}`,
      {
        name: `embedo-${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`,
        files: [
          {
            file: 'index.html',
            data: html,
            encoding: 'utf-8',
          },
          {
            file: 'vercel.json',
            data: JSON.stringify({
              rewrites: [{ source: '/(.*)', destination: '/index.html' }],
            }),
            encoding: 'utf-8',
          },
        ],
        project: `embedo-${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`,
        projectSettings: {
          framework: null,
          outputDirectory: '.',
        },
        meta: { businessId },
      },
      { headers },
    );

    const { id: deploymentId, url } = deployRes.data as { id: string; url: string };

    log.info({ deploymentId, url, businessId }, 'Vercel deployment created');

    return {
      url: `https://${url}`,
      deploymentId,
      projectId: deploymentId, // Vercel auto-creates project on first deploy
    };
  } catch (err) {
    const message = axios.isAxiosError(err) ? JSON.stringify(err.response?.data) : String(err);
    throw new ExternalApiError('Vercel', `Deployment failed: ${message}`, err);
  }
}
