// Social media automation domain types

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
  imagePrompt?: string;    // prompt to generate an image
  imageUrl?: string;       // if image was generated
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
