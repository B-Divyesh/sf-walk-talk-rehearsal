import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('creates a scenario deck and starts a text-only rehearsal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Dismiss safety reminder' }).click();
  await page.getByRole('button', { name: 'Build your first deck' }).click();
  await page.getByLabel('Deck name').fill('Café order');
  await page.getByLabel('Context').fill('Saturday breakfast');
  await page.getByLabel('Language').fill('French');
  await page.getByLabel(/Prompts/).fill('Ask for a table by the window.\nOrder coffee without sugar.');
  await page.getByRole('button', { name: 'Save deck' }).click();
  await expect(page.getByRole('heading', { name: 'Café order' })).toBeVisible();

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Text-only mode').check();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ask for a table by the window.' })).toBeVisible();
  await page.getByRole('button', { name: 'Start speaking' }).click();
  await expect(page.getByText('No recording · speak freely')).toBeVisible();
  await page.getByRole('button', { name: 'Finish answer' }).click();
  await page.getByRole('button', { name: 'Tomorrow' }).click();
  await expect(page.getByRole('heading', { name: 'Order coffee without sugar.' })).toBeVisible();
});

test('keeps a deck editor open with its values when prompts contain only whitespace', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Build your first deck' }).click();
  await page.getByLabel('Deck name').fill('Hotel check-in');
  const prompts = page.getByLabel(/Prompts/);
  await prompts.fill('  \n\t  ');
  await page.getByRole('button', { name: 'Save deck' }).click();

  await expect(page.locator('#deck-dialog')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Add at least one prompt.');
  await expect(page.getByLabel('Deck name')).toHaveValue('Hotel check-in');
  await expect(prompts).toHaveValue('  \n\t  ');
  await expect(prompts).toHaveAttribute('aria-invalid', 'true');
  await expect(prompts).toBeFocused();
});

test('explains a denied microphone permission throughout an unrecorded session', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')) },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Build your first deck' }).click();
  await page.getByLabel('Deck name').fill('Train platform');
  await page.getByLabel(/Prompts/).fill('Ask whether this train stops downtown.');
  await page.getByRole('button', { name: 'Save deck' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Text-only mode').check();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.getByRole('button', { name: 'Record', exact: true }).click();

  const notice = page.getByRole('status').filter({ hasText: 'Microphone access was not granted.' });
  await expect(notice).toContainText('This session will not save a recording.');
  await expect(page.locator('.toast')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start speaking' }).click();
  await expect(notice).toBeVisible();
  await expect(page.getByText('No recording · speak freely')).toBeVisible();
});

test('runs session controls from the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Build your first deck' }).click();
  await page.getByLabel('Deck name').fill('Work introduction');
  await page.getByLabel(/Prompts/).fill('Introduce yourself to the new team.');
  await page.getByRole('button', { name: 'Save deck' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Text-only mode').check();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  const startSpeaking = page.getByRole('button', { name: 'Start speaking' });
  await startSpeaking.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
});

test('home and privacy pages have no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  const home = await new AxeBuilder({ page }).analyze();
  expect(home.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  const privacy = await new AxeBuilder({ page }).analyze();
  expect(privacy.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
});

test('installed app shell reloads offline', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Speak before');
  await expect(page.getByText('OFFLINE / all local')).toBeVisible();
});

test('keeps a forged URL license locked when verification is unavailable', async ({ page }) => {
  await page.route('https://api.sociobot.in/**', (route) => route.abort());
  await page.goto('/?license=forged-token');

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Keep every take' })).toBeVisible();
  await expect(page.getByText('Could not verify the license yet.')).toBeVisible();
  await expect(page.locator('.license-active')).toHaveCount(0);

  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('walk-talk-rehearsal');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const now = Date.now();
    const deck = {
      id: 'license-cap-deck', name: 'Free take limit', context: 'Regression coverage', language: 'French', createdAt: now, updatedAt: now,
      prompts: [{ id: 'license-cap-prompt', text: 'Ask for the station.', createdAt: now, repetitions: 0 }],
    };
    const transaction = database.transaction(['decks', 'takes'], 'readwrite');
    transaction.objectStore('decks').put(deck);
    for (let index = 0; index < 5; index += 1) {
      transaction.objectStore('takes').put({
        id: `license-cap-take-${index}`, promptId: deck.prompts[0].id, deckId: deck.id, promptText: deck.prompts[0].text,
        createdAt: now, durationMs: 1_000, nextReplayAt: now + 86_400_000, mimeType: 'audio/webm', audio: new Blob(['take']),
      });
    }
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Free take limit' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Keep every take' })).toBeVisible();
  await page.getByRole('button', { name: 'Record', exact: true }).click();
  await expect(page.getByText('Your five free takes are full.')).toBeVisible();
});
