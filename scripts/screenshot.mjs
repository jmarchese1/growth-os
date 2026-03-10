#!/usr/bin/env node
/**
 * Screenshot the landing page for design review.
 * Usage: node scripts/screenshot.mjs [output-path]
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const url = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://localhost:3010';
const outPath = resolve(process.argv[3] ?? process.argv[2] ?? 'screenshot.png');
const finalOut = outPath.endsWith('.png') ? outPath : resolve(process.argv[2] ?? '.', 'screenshot.png');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(1000); // let animations settle

const screenshotPath = process.argv[3] ?? 'screenshot.png';
await page.screenshot({ path: screenshotPath, fullPage: true });
await browser.close();

console.log(`Screenshot saved: ${screenshotPath}`);
