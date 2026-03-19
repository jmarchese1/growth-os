import axios from 'axios';
import { createLogger, ExternalApiError } from '@embedo/utils';
import { env } from '../config.js';
import type { DeployedWebsite } from '@embedo/types';

const log = createLogger('website-gen:vercel');

const VERCEL_API = 'https://api.vercel.com';

/**
 * Add a custom domain to an existing Vercel project.
 * Returns DNS instructions for the user.
 */
export async function addCustomDomain(params: {
  projectId: string;
  domain: string;
}): Promise<{ domain: string; configured: boolean; dnsRecords: Array<{ type: string; name: string; value: string }> }> {
  const { projectId, domain } = params;
  const headers = {
    Authorization: `Bearer ${env.VERCEL_API_TOKEN}`,
    'Content-Type': 'application/json',
  };
  const teamQuery = env.VERCEL_TEAM_ID ? `?teamId=${env.VERCEL_TEAM_ID}` : '';

  try {
    const res = await axios.post(
      `${VERCEL_API}/v10/projects/${projectId}/domains${teamQuery}`,
      { name: domain },
      { headers },
    );

    const data = res.data as { name: string; verified: boolean; apexName?: string };
    log.info({ domain, projectId, verified: data.verified }, 'Custom domain added');

    // Provide DNS instructions
    const isApex = !domain.includes('.') || domain.split('.').length === 2;
    const dnsRecords = isApex
      ? [{ type: 'A', name: '@', value: '76.76.21.21' }]
      : [{ type: 'CNAME', name: domain.split('.')[0] ?? 'www', value: 'cname.vercel-dns.com' }];

    return { domain: data.name, configured: data.verified, dnsRecords };
  } catch (err) {
    const message = axios.isAxiosError(err) ? JSON.stringify(err.response?.data) : String(err);
    throw new ExternalApiError('Vercel', `Custom domain failed: ${message}`, err);
  }
}

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
    // Generate SEO files
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.vercel.app/</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod><priority>1.0</priority></url>
</urlset>`;
    const robotsTxt = `User-agent: *\nAllow: /\nSitemap: https://${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.vercel.app/sitemap.xml`;

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
            file: 'sitemap.xml',
            data: sitemapXml,
            encoding: 'utf-8',
          },
          {
            file: 'robots.txt',
            data: robotsTxt,
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
