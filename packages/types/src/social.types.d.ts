export interface ContentGenerationRequest {
    businessId: string;
    businessName: string;
    businessType: string;
    platform: 'INSTAGRAM' | 'FACEBOOK' | 'GOOGLE_MY_BUSINESS';
    topic?: string;
    tone?: 'casual' | 'professional' | 'enthusiastic';
    includeEmoji?: boolean;
    includeHashtags?: boolean;
}
export interface GeneratedContent {
    caption: string;
    hashtags: string[];
    imagePrompt?: string;
    imageUrl?: string;
    scheduledAt?: string;
}
export interface CommentEvent {
    businessId: string;
    platform: string;
    postId: string;
    commentId: string;
    commentText: string;
    authorId: string;
    authorName?: string;
}
export interface AutoDmTrigger {
    businessId: string;
    platform: string;
    recipientId: string;
    recipientName?: string;
    triggerType: 'comment' | 'mention' | 'story_reply';
    originalContent?: string;
}
export interface SchedulePostJob {
    businessId: string;
    postId: string;
    platform: string;
    scheduledAt: string;
}
//# sourceMappingURL=social.types.d.ts.map