import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
});

async function addJob(page: Page, service: 'ride' | 'delivery') {
  await page.getByRole('button', { name: `Add demo ${service}`, exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText(`Demo ${service} request added`);
}

for (const service of ['ride', 'delivery'] as const) {
  test(`driver accepts, refreshes, and completes ${service} with customer sync`, async ({ page, context }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/driver');
    await addJob(page, service);
    await expect(page.getByRole('button', { name: `Accept ${service}`, exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Go online', exact: true }).click();
    await page.getByRole('button', { name: `Accept ${service}`, exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your active job' })).toBeVisible();
    const customerPath = await page.getByRole('link', { name: 'View customer booking' }).getAttribute('href');
    const customer = await context.newPage();
    await customer.route('https://tile.openstreetmap.org/**', route => route.abort());
    await customer.goto(customerPath!);
    await expect(customer.getByRole('heading', { name: 'Driver on the way' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Your active job' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go online', exact: true })).toBeVisible();
    // Active jobs remain actionable while offline; accepting a second job is unavailable.
    await addJob(page, service === 'ride' ? 'delivery' : 'ride');
    await expect(page.getByRole('button', { name: /^Accept / })).toHaveCount(0);
    await page.getByRole('button', { name: service === 'ride' ? 'Pick up passenger' : 'Collect parcel', exact: true }).click();
    await expect(customer.getByRole('heading', { name: service === 'ride' ? 'On your way' : 'Parcel on the way', exact: true })).toBeVisible();
    await page.getByRole('button', { name: `Complete ${service}`, exact: true }).click();
    await expect(customer.getByRole('heading', { name: service === 'ride' ? 'Ride completed' : 'Delivered', exact: true })).toBeVisible();
    await expect(page.locator('.driver-completed-row')).toHaveCount(1);
    await expect(page.locator('.driver-summary > div').first()).toContainText('1');
    const fare = await page.locator('.driver-completed-row b').innerText();
    await expect(page.locator('.driver-summary')).toContainText(fare);
    await page.reload();
    await expect(page.locator('.driver-completed-row')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await customer.close();
  });

  test(`driver can cancel an active ${service} without adding completed fares`, async ({ page }) => {
    await page.goto('/driver');
    await addJob(page, service);
    await page.getByRole('button', { name: 'Go online', exact: true }).click();
    await page.getByRole('button', { name: `Accept ${service}`, exact: true }).click();
    await page.getByRole('button', { name: 'Cancel active job' }).click();
    await page.getByRole('button', { name: 'Keep active job' }).click();
    await expect(page.getByRole('heading', { name: 'Your active job' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel active job' }).click();
    await page.getByRole('button', { name: 'Cancel demo job', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your active job' })).toHaveCount(0);
    await expect(page.locator('.driver-completed-row')).toHaveCount(0);
    await page.goto('/bookings');
    await expect(page.locator('.history-row')).toContainText('Cancelled');
  });
}

test('driver filters, keyboard availability, skipped requests and responsive layouts', async ({ page }) => {
  await page.goto('/driver');
  await addJob(page, 'ride');
  await addJob(page, 'delivery');
  await page.getByRole('button', { name: 'Rides', exact: true }).click();
  await expect(page.locator('.driver-request')).toHaveCount(1);
  const online = page.getByRole('button', { name: 'Go online', exact: true });
  await online.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Accept ride', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Skip this request' }).click();
  await expect(page.getByRole('heading', { name: 'No requests to show' })).toBeVisible();
  await page.getByRole('button', { name: 'Show skipped requests' }).click();
  await expect(page.locator('.driver-request')).toHaveCount(1);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('link', { name: 'Driver view', exact: true })).toBeVisible();
    if (width === 375 || width === 1440) await page.screenshot({ path: `test-results/driver-${width}.png`, fullPage: true });
  }
  await page.goto('/bookings');
  await expect(page.locator('.history-row')).toHaveCount(2);
  await expect(page.locator('.history-row').first()).toContainText('Booking confirmed');
});

test('driver errors recover and customer cancellation removes the active job', async ({ page, context }) => {
  await page.goto('/driver');
  await page.route('**/api/bookings', route => route.fulfill({ status: 503, json: { error: 'Sample jobs unavailable. Try again.' } }));
  await page.getByRole('button', { name: 'Add demo ride', exact: true }).click();
  await expect(page.locator('.form-error')).toContainText('Try again');
  await page.unroute('**/api/bookings');
  await addJob(page, 'ride');
  await page.getByRole('button', { name: 'Go online', exact: true }).click();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage unavailable', 'QuotaExceededError'); };
  });
  await page.getByRole('button', { name: 'Accept ride', exact: true }).click();
  await expect(page.locator('.form-error')).toContainText('Enable browser storage');
  await expect(page.getByRole('heading', { name: 'Your active job' })).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Go online', exact: true }).click();
  await page.getByRole('button', { name: 'Accept ride', exact: true }).click();
  const path = await page.getByRole('link', { name: 'View customer booking' }).getAttribute('href');
  const customer = await context.newPage();
  await customer.route('https://tile.openstreetmap.org/**', route => route.abort());
  await customer.goto(path!);
  await customer.getByRole('button', { name: 'Cancel demo booking' }).click();
  await customer.getByRole('button', { name: 'Yes, cancel booking' }).click();
  await expect(page.getByRole('heading', { name: 'Your active job' })).toHaveCount(0);
  await expect(page.locator('.driver-completed-row')).toHaveCount(0);
  await customer.close();
});
