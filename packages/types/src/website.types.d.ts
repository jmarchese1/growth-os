export type WebsiteTemplate = 'restaurant-minimal' | 'restaurant-premium' | 'restaurant-landing';
export interface WebsiteConfig {
    template: WebsiteTemplate;
    businessName: string;
    tagline?: string;
    description?: string;
    primaryColor: string;
    accentColor?: string;
    fontFamily?: string;
    logoUrl?: string;
    heroHeading?: string;
    heroSubheading?: string;
    sections: WebsiteSection[];
    chatbotEnabled: boolean;
    chatbotBusinessId?: string;
    bookingEnabled: boolean;
    calendlyUrl?: string;
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
//# sourceMappingURL=website.types.d.ts.map