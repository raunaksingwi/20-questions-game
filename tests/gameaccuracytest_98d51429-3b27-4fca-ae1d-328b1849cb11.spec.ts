
import { test } from '@playwright/test';
import { expect } from '@playwright/test';

test('GameAccuracyTest_2025-08-09', async ({ page, context }) => {
  
    // Navigate to URL
    await page.goto('http://localhost:8081');

    // Take screenshot
    await page.screenshot({ path: 'expo_home_screen.png' });

    // Click element
    await page.click('[data-testid="cricketers-category-button"]');

    // Click element
    await page.click('text=Cricketers');

    // Take screenshot
    await page.screenshot({ path: 'cricketers_game_started.png' });

    // Fill input field
    await page.fill('[placeholder="Type your question..."]', 'Is it Virat?');

    // Fill input field
    await page.fill('input[placeholder*="Ask a yes/no question"]', 'Is it Virat?');

    // Take screenshot
    await page.screenshot({ path: 'virat_question_response.png' });

    // Click element
    await page.click('text=Play Again');

    // Click element
    await page.click('text=Cricketers');

    // Fill input field
    await page.fill('input[placeholder*="Ask a yes/no question"]', 'Is this player from India?');

    // Fill input field
    await page.fill('input[placeholder*="Ask a yes/no question"]', 'Is it AB de Villiers?');
});