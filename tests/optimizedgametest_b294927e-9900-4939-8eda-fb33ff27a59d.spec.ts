
import { test } from '@playwright/test';
import { expect } from '@playwright/test';

test('OptimizedGameTest_2025-08-09', async ({ page, context }) => {
  
    // Navigate to URL
    await page.goto('http://localhost:8081');

    // Take screenshot
    await page.screenshot({ path: 'home_screen.png' });

    // Click element
    await page.click('text=Cricketers');

    // Take screenshot
    await page.screenshot({ path: 'cricketers_game_started.png' });

    // Fill input field
    await page.fill('input[placeholder*="Ask a yes/no question"]', 'Are they from India?');

    // Fill input field
    await page.fill('input[placeholder*="Ask a yes/no question"]', 'Is it Virat Kohli?');

    // Fill input field
    await page.fill('input[placeholder*="Ask a yes/no question"]', 'Are they a batsman?');

    // Fill input field
    await page.fill('input[placeholder*="Ask a yes/no question"]', 'Is it AB de Villiers?');

    // Click element
    await page.click('text=Quit');

    // Click element
    await page.click('text=Animals');
});