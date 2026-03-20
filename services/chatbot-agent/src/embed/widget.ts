import type { WidgetConfig } from '@embedo/types';
import { env } from '../config.js';

/**
 * Generate the embeddable JavaScript widget snippet for a business's website.
 * Returns a <script> tag that loads the chatbot widget.
 */
export function generateWidgetSnippet(config: WidgetConfig): string {
  const configJson = JSON.stringify({
    businessId: config.businessId,
    primaryColor: config.primaryColor,
    businessName: config.businessName,
    welcomeMessage: config.welcomeMessage,
    logoUrl: config.logoUrl,
    position: config.position ?? 'bottom-right',
    apiUrl: config.apiUrl,
  });

  return `<!-- Embedo AI Chat Widget -->
<script>
  (function() {
    window.EmbledoChatConfig = ${configJson};
    var script = document.createElement('script');
    script.src = '${env.CHATBOT_API_URL}/widget.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  })();
</script>
<!-- End Embedo AI Chat Widget -->`;
}

/**
 * Generate the default widget config for a business.
 */
export function buildWidgetConfig(params: {
  businessId: string;
  businessName: string;
  primaryColor?: string;
  logoUrl?: string;
  welcomeMessage?: string;
}): WidgetConfig {
  return {
    businessId: params.businessId,
    apiUrl: env.CHATBOT_API_URL,
    primaryColor: params.primaryColor ?? '#000000',
    businessName: params.businessName,
    welcomeMessage:
      params.welcomeMessage ??
      `Hi! Welcome to ${params.businessName}. How can I help you today?`,
    ...(params.logoUrl ? { logoUrl: params.logoUrl } : {}),
    position: 'bottom-right',
  };
}
