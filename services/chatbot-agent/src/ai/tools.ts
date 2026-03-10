import type Anthropic from '@anthropic-ai/sdk';

/**
 * Claude tool definitions for the chatbot agent.
 * These enable the AI to take structured actions during a conversation.
 */
export const chatbotTools: Anthropic.Tool[] = [
  {
    name: 'capture_lead',
    description:
      'Capture lead information from the conversation when a user provides their contact details or expresses interest.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Full name of the customer' },
        email: { type: 'string', description: 'Email address' },
        phone: { type: 'string', description: 'Phone number' },
        interest: { type: 'string', description: 'What they are interested in or asking about' },
      },
      required: [],
    },
  },
  {
    name: 'book_appointment',
    description:
      'Initiate the appointment booking flow when a user wants to schedule a visit, reservation, or call.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Customer name' },
        email: { type: 'string', description: 'Customer email' },
        phone: { type: 'string', description: 'Customer phone' },
        preferredDate: { type: 'string', description: 'Preferred date (YYYY-MM-DD)' },
        preferredTime: { type: 'string', description: 'Preferred time (HH:MM)' },
        partySize: { type: 'number', description: 'Number of people (for restaurants)' },
        notes: { type: 'string', description: 'Any special requests or notes' },
      },
      required: ['name'],
    },
  },
  {
    name: 'trigger_proposal',
    description:
      'Trigger a custom proposal generation when the user is a potential business client interested in Embedo services.',
    input_schema: {
      type: 'object',
      properties: {
        businessName: { type: 'string', description: 'Name of their business' },
        contactEmail: { type: 'string', description: 'Their email address' },
        industry: { type: 'string', description: 'Their business industry' },
        interest: { type: 'string', description: 'What they are interested in' },
      },
      required: ['contactEmail'],
    },
  },
  {
    name: 'get_business_info',
    description: 'Retrieve specific information about the business to answer customer questions.',
    input_schema: {
      type: 'object',
      properties: {
        infoType: {
          type: 'string',
          enum: ['hours', 'location', 'menu', 'contact', 'specials'],
          description: 'Type of information to retrieve',
        },
      },
      required: ['infoType'],
    },
  },
];
