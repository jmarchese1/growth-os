export interface BusinessAddress {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}
export interface BusinessHours {
    monday?: DayHours;
    tuesday?: DayHours;
    wednesday?: DayHours;
    thursday?: DayHours;
    friday?: DayHours;
    saturday?: DayHours;
    sunday?: DayHours;
}
export interface DayHours {
    open: string;
    close: string;
    closed?: boolean;
}
export interface BusinessSettings {
    hours?: BusinessHours;
    cuisine?: string;
    maxPartySize?: number;
    chatbotPersona?: string;
    socialPostingSchedule?: SocialPostingSchedule;
    [key: string]: unknown;
}
export interface SocialPostingSchedule {
    postsPerWeek: number;
    preferredDays: string[];
    preferredTimes: string[];
}
export interface OnboardingRequest {
    name: string;
    type: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: BusinessAddress;
    timezone?: string;
    settings?: BusinessSettings;
}
export interface ContactTimeline {
    contactId: string;
    activities: TimelineItem[];
}
export interface TimelineItem {
    id: string;
    type: string;
    title: string;
    description?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}
//# sourceMappingURL=crm.types.d.ts.map