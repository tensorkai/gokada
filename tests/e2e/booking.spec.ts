import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Do not load community tile servers during automated testing.
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
});
async function destination(page: Page, city = 'Taguig') {
  const input = page.getByRole('combobox', { name: 'Drop-off location' });
  await input.waitFor();
  await input.click();
  await input.fill(city);
  await page.locator('.place-option').filter({ hasText: new RegExp(city, 'i') }).first().click();
}
test('ride booking, server quote, refresh persistence, and full journey', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'See ride fare' }).click();
  await expect(page.locator('.form-error')).toContainText('drop-off');
  await destination(page);
  await page.getByRole('button', { name: 'See ride fare' }).click();
  await expect(page.getByRole('heading', { name: 'One last look.' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm demo ride' }).click();
  await expect(page).toHaveURL(/\/bookings\/GK-/);
  await expect(page.getByRole('heading', { name: 'Booking confirmed' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Booking confirmed' })).toBeVisible();
  await page.getByRole('button', { name: 'Simulate driver arrival' }).click();
  await page.getByRole('button', { name: 'Start demo ride' }).click();
  await page.getByRole('button', { name: 'Complete demo ride' }).click();
  await expect(page.getByRole('heading', { name: 'Ride completed' })).toBeVisible();
  await page.goto('/bookings');
  await expect(page.locator('.history-row')).toHaveCount(1);
  await expect(page.locator('.history-row')).toContainText('Ride completed');
});
test('delivery validates contact details, medium parcel, and cancellation', async ({ page }) => {
  await page.goto('/delivery');
  await destination(page, 'Pasig');
  await page.getByLabel('Recipient name').fill('Demo Recipient');
  await page.getByLabel('Recipient mobile number').fill('123');
  await page.getByRole('button', { name: 'See delivery fare' }).click();
  await expect(page.locator('.form-error')).toContainText('Philippine mobile number');
  await page.getByLabel('Recipient mobile number').fill('09123456789');
  await page.getByRole('radio', { name: /Medium/ }).check();
  await page.getByRole('button', { name: 'See delivery fare' }).click();
  await expect(page.locator('.recipient-summary')).toContainText('Medium parcel');
  await page.getByRole('button', { name: 'Confirm demo delivery' }).click();
  await expect(page).toHaveURL(/\/bookings\/GK-/);
  await page.getByRole('button', { name: 'Cancel demo booking' }).click();
  await page.getByRole('button', { name: 'Keep booking' }).click();
  await expect(page.getByRole('heading', { name: 'Booking confirmed' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel demo booking' }).click();
  await page.getByRole('button', { name: 'Yes, cancel booking' }).click();
  await expect(page.getByRole('heading', { name: 'Cancelled', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Cancelled', exact: true })).toBeVisible();
});
test('delivery can be completed and history can be reset', async ({ page }) => {
  await page.goto('/delivery');
  await destination(page, 'Pasay');
  await page.getByLabel('Recipient name').fill('Demo Recipient');
  await page.getByLabel('Recipient mobile number').fill('+639123456789');
  await page.getByRole('button', { name: 'See delivery fare' }).click();
  await page.getByRole('button', { name: 'Confirm demo delivery' }).click();
  await page.getByRole('button', { name: 'Simulate driver arrival' }).click();
  await page.getByRole('button', { name: 'Collect demo parcel' }).click();
  await page.getByRole('button', { name: 'Complete demo delivery' }).click();
  await expect(page.getByRole('heading', { name: 'Delivered', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Guest profile' }).click();
  await page.getByRole('button', { name: 'Reset booking history' }).click();
  await page.getByRole('button', { name: 'Delete bookings' }).click();
  await expect(page.getByRole('status')).toContainText('Demo bookings cleared');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.goto('/bookings');
  await expect(page.getByRole('heading', { name: 'Your first journey starts here.' })).toBeVisible();
});
test('API rejects invalid requests and recalculates client-supplied fares', async ({ request }) => {
  const body = { service: 'ride', pickupId: 'ayala', destinationId: 'bgc', notes: '', recipient: '', phone: '', parcel: 'small', quote: { total: 1 } };
  const same = await request.post('/api/bookings', { data: { ...body, destinationId: 'ayala' } });
  expect(same.status()).toBe(400);
  const invalid = await request.post('/api/bookings', { data: { ...body, service: 'plane' } });
  expect(invalid.status()).toBe(400);
  const valid = await request.post('/api/bookings', { data: body });
  expect(valid.status()).toBe(201);
  const { booking } = await valid.json();
  expect(booking.quote.total).toBeGreaterThan(40);
  expect(booking.demo).toBe(true);
  expect(booking.status).toBe('confirmed');
});
test('keyboard location search, same-location error and location denial', async ({ page, context }) => {
  await context.clearPermissions();
  await page.addInitScript(() => { Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition: (_success: unknown, failure: (error: { code: number }) => void) => failure({ code: 1 }) } }); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Use my current location' }).click();
  await expect(page.locator('.form-error')).toContainText('location');
  const input = page.getByRole('combobox', { name: 'Drop-off location' });
  await input.fill('Ayala Triangle');
  await input.press('Enter');
  await page.getByRole('button', { name: 'See ride fare' }).click();
  await expect(page.locator('.form-error')).toContainText('different');
  await input.fill('not-a-landmark');
  await expect(page.getByText('No matching demo landmark.', { exact: false })).toBeVisible();
  await input.press('Escape');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
});
test('invalid stored data and missing bookings recover safely', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('gokada.bookings.v1', JSON.stringify([{ id: 'broken', status: 'arriving' }])));
  await page.goto('/bookings');
  await expect(page.getByRole('heading', { name: 'Your first journey starts here.' })).toBeVisible();
  await page.goto('/bookings/GK-missing');
  await expect(page.getByRole('heading', { name: 'Booking not found' })).toBeVisible();
});
test('responsive layouts, dialogs, and screenshots', async ({ page }) => {
  for (const width of [375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Where are we going?' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Metro Manila', exact: false }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    if (width === 375 || width === 1440) await page.screenshot({ path: `test-results/gokada-${width}.png`, fullPage: true });
  }
});
