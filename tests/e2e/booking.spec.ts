import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Do not load community tile servers during automated testing.
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
});

test('route previews are illustrative and validate landmarks', async ({ request }) => {
  for (const query of ['', '?from=ayala&to=ayala', '?from=unknown&to=bgc']) {
    expect((await request.get(`/api/route-preview${query}`)).status()).toBe(400);
  }
  const response = await request.get('/api/route-preview?from=ayala&to=bgc');
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ mode: 'illustrative', coordinates: [[121.0238, 14.5573], [121.051, 14.5508]] });
});

test('street map renders, recovers after tile failure, and restores trip markers', async ({ page }) => {
  await page.goto('/ride');
  await destination(page);
  await expect(page.getByRole('button', { name: 'Retry street map' })).toBeVisible({ timeout: 25000 });
  // Tiny fixture tile exercises the real MapLibre worker and canvas without network access.
  const tileData = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#edf0eb';
    context.fillRect(0, 0, 256, 256);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const tile = Buffer.from(tileData, 'base64');
  await page.route('https://tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/png', body: tile }));
  await page.getByRole('button', { name: 'Retry street map' }).click();
  await expect(page.locator('.map-fallback')).toHaveCount(0);
  await expectMapFillsPanel(page);
  await expect(page.locator('.map-pin')).toHaveCount(2);
  await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText('OpenStreetMap');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.getByRole('button', { name: 'Fit trip on map' }).click();
  await page.getByRole('button', { name: 'See ride fare' }).click();
  await expectMapFillsPanel(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await expectMapFillsPanel(page);
  await page.screenshot({ path: 'test-results/street-map-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Confirm demo ride' }).click();
  await page.getByRole('button', { name: 'Simulate driver arrival' }).click();
  await expect(page.locator('.map-driver')).toHaveCount(1);
  const position = await page.locator('.map-driver').getAttribute('style');
  await page.getByRole('button', { name: 'Start demo ride' }).click();
  await expect(page.locator('.map-driver')).not.toHaveAttribute('style', position!);
  await expectMapFillsPanel(page);
});

async function expectMapFillsPanel(page: Page) {
  // A loaded map with markers can still have a collapsed, invisible canvas.
  await expect.poll(() => page.locator('.metro-map').evaluate(panel => {
    const host = panel.querySelector('.map-canvas')!;
    const canvas = host.querySelector('canvas')!;
    return {
      position: getComputedStyle(host).position,
      hostHeight: host.clientHeight === panel.clientHeight,
      canvasHeight: canvas.clientHeight === panel.clientHeight,
      canvasWidth: canvas.clientWidth === panel.clientWidth,
      visible: canvas.clientHeight >= 300,
    };
  })).toEqual({ position: 'absolute', hostHeight: true, canvasHeight: true, canvasWidth: true, visible: true });
}
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
  await page.setViewportSize({ width: 375, height: 812 });
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

for (const service of ['ride', 'delivery']) {
  test(`${service} unavailable drivers and failed requests can be retried`, async ({ page }) => {
    await page.goto(`/${service}`);
    await destination(page);
    if (service === 'delivery') {
      await page.getByLabel('Recipient name').fill('Demo Recipient');
      await page.getByLabel('Recipient mobile number').fill('09123456789');
    }
    await page.getByLabel('Simulate unavailable drivers').check();
    await page.getByRole('button', { name: `See ${service} fare` }).click();
    await expect(page.locator('form').getByRole('alert')).toContainText('No demo drivers available');
    await page.getByLabel('Simulate unavailable drivers').uncheck();
    await page.getByRole('button', { name: `See ${service} fare` }).click();
    await page.route('**/api/bookings', route => route.fulfill({ status: 503, json: { error: 'Demo booking service unavailable. Try again.' } }));
    await page.getByRole('button', { name: `Confirm demo ${service}` }).click();
    await expect(page.locator('form').getByRole('alert')).toContainText('Try again');
    await page.unroute('**/api/bookings');
    await page.getByRole('button', { name: `Confirm demo ${service}` }).click();
    await expect(page).toHaveURL(/\/bookings\/GK-/);
  });
}

test('malformed storage never resurrects cached bookings', async ({ page }) => {
  await page.goto('/ride');
  await destination(page);
  await page.getByRole('button', { name: 'See ride fare' }).click();
  await page.getByRole('button', { name: 'Confirm demo ride' }).click();
  await expect(page).toHaveURL(/\/bookings\/GK-/);
  await page.evaluate(() => {
    localStorage.setItem('gokada.bookings.v1', '{broken');
    window.dispatchEvent(new Event('gokada:bookings'));
  });
  await expect(page.getByRole('heading', { name: 'Booking not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to my bookings' }).click();
  await expect(page.locator('.history-row')).toHaveCount(0);
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
