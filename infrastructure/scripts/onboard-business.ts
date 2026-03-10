#!/usr/bin/env tsx
/**
 * CLI tool to onboard a new business via the CRM API.
 * Usage: tsx infrastructure/scripts/onboard-business.ts
 */

import * as readline from 'readline';

const CRM_URL = process.env['CRM_URL'] ?? 'http://localhost:3001';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  console.log('\n🚀 Embedo — Business Onboarding\n');
  console.log('This will create a new business and start provisioning AI services.\n');

  const name = await ask('Business name: ');
  const type = await ask('Business type (RESTAURANT/SALON/FITNESS/OTHER) [RESTAURANT]: ') || 'RESTAURANT';
  const email = await ask('Business email: ');
  const phone = await ask('Business phone (e.g. +15551234567): ');
  const city = await ask('City: ');
  const state = await ask('State (e.g. TX): ');
  const timezone = await ask('Timezone [America/New_York]: ') || 'America/New_York';

  rl.close();

  const payload = {
    name,
    type,
    email,
    phone,
    timezone,
    address: { city, state, country: 'US', street: '', zip: '' },
  };

  console.log('\n📡 Sending onboarding request...');

  try {
    const response = await fetch(`${CRM_URL}/onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Onboarding failed:', error);
      process.exit(1);
    }

    const result = (await response.json()) as { businessId: string; status: string; message: string };

    console.log('\n✅ Business onboarding started!');
    console.log(`   Business ID: ${result.businessId}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Message: ${result.message}`);
    console.log('\nServices being provisioned:');
    console.log('  🎙️  AI Voice Agent (ElevenLabs + Twilio)');
    console.log('  💬  AI Chatbot Widget');
    console.log('  🌐  Business Website (Vercel)');
    console.log('  📱  Social Media Content Calendar');
    console.log('\nCheck the admin dashboard for provisioning status.');
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main().catch(console.error);
