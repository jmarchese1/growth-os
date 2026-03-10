// Website generation domain types

export type WebsiteTemplate =
  | 'restaurant-minimal'
  | 'restaurant-premium'
  | 'restaurant-landing';

export interface WebsiteConfig {
  template: WebsiteTemplate;
  businessName: string;
  tagline?: string;
  description?: string;

  // Branding
  primaryColor: string;
  accentColor?: string;
  fontFamily?: string;
  logoUrl?: string;

  // Content
  heroHeading?: string;
  heroSubheading?: string;
  sections: WebsiteSection[];

  // Integrations
  chatbotEnabled: boolean;
  chatbotBusinessId?: string;
  bookingEnabled: boolean;
  calendlyUrl?: string;

  // Media
  heroImageUrl?: string;
  galleryImages?: string[];
}

export interface WebsiteSection {
  type: 'hero' | 'about' | 'menu' | 'gallery' | 'testimonials' | 'contact' | 'booking';
  enabled: boolean;
  content?: Record<string, unknown>;
}

export interface GenerateWebsiteRequest {
  businessId: string;
  template: WebsiteTemplate;
  config: Partial<WebsiteConfig>;
  customDomain?: string;
}

export interface DeployedWebsite {
  url: string;
  deploymentId: string;
  projectId: string;
}
