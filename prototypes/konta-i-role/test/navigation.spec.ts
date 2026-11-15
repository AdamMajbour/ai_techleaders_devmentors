import { expect, test } from 'playwright/test';

test('sign-in path and role navigation reach the expected screens', async ({ page }) => {
  await page.goto('');
  await expect(page).toHaveURL(/#s01$/);

  await page.getByRole('button', { name: 'Send sign-in link' }).click();
  await page.getByRole('button', { name: 'Open simulated sign-in link' }).click();
  await expect(page).toHaveURL(/#s05$/);
  await expect(page.getByRole('heading', { name: 'Mentors' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mentors' })).toBeFocused();
  await expect(page.locator('#s05 [aria-label="s05 prototype notes"]')).toContainText('E01-S01 / #11');

  await page.getByLabel('Demo account').selectOption('alex');
  await page.getByRole('link', { name: /s06 Mentor home/ }).click();
  await expect(page).toHaveURL(/#s06$/);
  await page.getByRole('button', { name: '← Back' }).click();
  await expect(page).toHaveURL(/#s05$/);

  await page.getByLabel('Demo account').selectOption('maja');
  await page.getByRole('link', { name: /s06 Mentor home/ }).click();
  await expect(page).toHaveURL(/#s08$/);
  await expect(page.getByText('This page requires the mentor role.')).toBeVisible();
  await expect(page.getByRole('button', { name: '← Back' })).toBeDisabled();

  await page.getByLabel('Demo account').selectOption('ada');
  await expect(page.getByText('The selected demo account can open this page.')).toBeVisible();
  await page.getByRole('link', { name: 'Continue to requested page' }).click();
  await expect(page).toHaveURL(/#s06$/);
  await expect(page.getByRole('heading', { name: 'Your bookings' })).toBeVisible();

  await page.getByRole('link', { name: /s07 Operator home/ }).click();
  await expect(page).toHaveURL(/#s08$/);
  await page.getByLabel('Demo account').selectOption('ola');
  await expect(page.getByText('The selected demo account can open this page.')).toBeVisible();
  await page.getByRole('link', { name: 'Continue to requested page' }).click();
  await expect(page).toHaveURL(/#s07$/);
  await expect(page.getByRole('heading', { name: 'Approvals' })).toBeVisible();
});

test('a sign-in request for an allowed screen returns to that screen', async ({ page }) => {
  await page.goto('#s05');
  await expect(page).toHaveURL(/#s01$/);
  await expect(page.getByText('Sign in to continue to the page you requested.')).toBeVisible();

  await page.getByRole('button', { name: 'Send sign-in link' }).click();
  await page.getByRole('button', { name: 'Open simulated sign-in link' }).click();
  await expect(page).toHaveURL(/#s05$/);
  await expect(page.getByRole('heading', { name: 'Mentors' })).toBeVisible();
});

test('scenario controls preserve recovery paths and the review controls respond', async ({ page }) => {
  await page.goto('');

  await page.getByRole('button', { name: 'Sign-in layout B' }).click();
  await expect(page.getByRole('button', { name: 'Sign-in layout B' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Sign-in layout C' }).click();
  await expect(page.getByRole('button', { name: 'Sign-in layout C' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Sign-in layout A' }).click();

  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.getByLabel('Demo account').selectOption('ada');
  await expect(page.getByRole('textbox', { name: 'Email (required)' })).toHaveValue('ada.mentor@demo.test');
  await page.getByLabel('Demo account').selectOption('ola');
  await expect(page.getByRole('textbox', { name: 'Email (required)' })).toHaveValue('ola.operator@demo.test');
  await page.getByLabel('Demo account').selectOption('alex');
  await expect(page.getByRole('textbox', { name: 'Email (required)' })).toHaveValue('alex.dual@demo.test');
  await page.getByLabel('Demo account').selectOption('maja');

  await page.getByLabel('Session').selectOption('expired');
  await page.getByRole('link', { name: /s05 Seeker home/ }).click();
  await expect(
    page.getByRole('region', { name: 's01: Entry / sign in with an email link' })
      .getByText('Your session expired. Sign in again to continue.')
  ).toBeVisible();
  await page.getByLabel('Session').selectOption('active');

  await page.getByLabel('Email input').selectOption('invalid');
  await page.getByRole('button', { name: 'Send sign-in link' }).click();
  await expect(page.getByText('Enter a valid email address. This is a fixed example for the prototype.')).toBeVisible();
  await page.getByLabel('Email input').selectOption('valid');

  await page.getByLabel('Email response').selectOption('rate-limit');
  await page.getByRole('button', { name: 'Send sign-in link' }).click();
  await expect(page.getByText('Too many requests. Wait a few minutes and try again.')).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Too many requests. Wait a few minutes and try again.')).toBeVisible();

  await page.getByLabel('Email response').selectOption('send-error');
  await page.getByRole('button', { name: 'Send sign-in link' }).click();
  await expect(page.getByText('The link could not be sent. Check your connection and try again.')).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('The link could not be sent. Check your connection and try again.')).toBeVisible();

  await page.getByLabel('Email response').selectOption('invited');
  await page.getByRole('button', { name: 'Send sign-in link' }).click();
  const invitedMessage = await page.getByText('If this address is invited, we sent a sign-in link. In this prototype, no email was sent.').textContent();
  await page.getByLabel('Email response').selectOption('not-invited');
  await page.getByRole('button', { name: 'Send sign-in link' }).click();
  await expect(page.getByText(invitedMessage ?? '')).toBeVisible();

  await page.getByLabel('Link result').selectOption('expired');
  await page.getByRole('button', { name: 'Open simulated sign-in link' }).click();
  await expect(page.getByText('This link has expired. Request a new one.')).toBeVisible();
  await page.getByRole('button', { name: 'Request a new link' }).click();

  await page.getByLabel('Email response').selectOption('invited');
  await page.getByRole('button', { name: 'Send sign-in link' }).click();
  await page.getByLabel('Link result').selectOption('used');
  await page.getByRole('button', { name: 'Open simulated sign-in link' }).click();
  await expect(page.getByText('This link was already used. Request a new one.')).toBeVisible();
  await page.getByRole('button', { name: 'Request a new link' }).click();

  await page.getByRole('button', { name: 'Send sign-in link' }).click();
  await page.getByLabel('Link result').selectOption('server-error');
  await page.getByRole('button', { name: 'Open simulated sign-in link' }).click();
  await expect(page.getByText('We could not check this link. Check your connection and try again.')).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page).toHaveURL(/#s05$/);

  await page.getByLabel('Page data').selectOption('loading');
  await expect(page.getByText('Loading mentors…')).toBeVisible();
  await page.getByLabel('Page data').selectOption('empty');
  await expect(page.getByText('No mentors in this demo state')).toBeVisible();
  await page.getByLabel('Page data').selectOption('error');
  await expect(page.getByText('Mentors could not be loaded. Check your connection and try again.')).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('The list loaded, but this prototype has no source-backed mentor profile to display.')).toBeVisible();

  await page.getByRole('button', { name: 'Comment' }).click();
  await expect(page.getByRole('button', { name: 'Comment' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Prototype comments')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Clickable' }).click();
  await expect(page.getByRole('button', { name: 'Clickable' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Show hotspots' }).click();
  await expect(page.getByRole('button', { name: 'Hide hotspots' })).toBeVisible();
  await page.getByRole('button', { name: 'Hide hotspots' }).click();
  await page.getByRole('button', { name: 'Presentation' }).click();
  await expect(page.getByRole('button', { name: 'Presentation' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Presentation' }).click();
  await page.getByRole('button', { name: 'Threads' }).click();
  await expect(page.getByRole('button', { name: 'Threads' })).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Threads' }).click();
  await expect(page.getByRole('button', { name: 'Threads' })).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: 'Hide pins' }).click();
  await expect(page.getByRole('button', { name: 'Show pins' })).toBeVisible();
  await page.getByRole('button', { name: 'Show pins' }).click();
  await expect(page.getByRole('button', { name: 'Hide pins' })).toBeVisible();
});

test('layout remains within the viewport and keyboard focus is visible', async ({ page }) => {
  await page.goto('');
  for (const screenId of ['s01', 's04', 's05', 's06', 's07', 's08']) {
    await expect(page.locator(`#${screenId} [aria-label="${screenId} prototype notes"]`)).toContainText('Stories:');
    await expect(page.locator(`#${screenId} [aria-label="${screenId} prototype notes"]`)).toContainText('Simulation:');
    await expect(page.locator(`#${screenId} [aria-label="${screenId} prototype notes"]`)).toContainText('Not decided:');
  }

  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['dark', 'light']) {
      const currentTheme = await page.locator('html').getAttribute('data-theme');
      if (currentTheme !== theme) {
        await page.getByRole('button', {
          name: theme === 'light' ? 'Switch to light theme' : 'Switch to dark theme',
        }).click();
      }
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const documentWidth = await page.locator('html').evaluate((element) => element.scrollWidth);
      expect(documentWidth).toBeLessThanOrEqual(width);
    }
  }

  await page.keyboard.press('Tab');
  const focusStyle = await page.locator(':focus-visible').evaluate((element) => {
    const style = getComputedStyle(element);
    return { outline: style.outlineStyle, boxShadow: style.boxShadow };
  });
  expect(focusStyle.outline !== 'none' || focusStyle.boxShadow !== 'none').toBe(true);

  let submitButtonReached = false;
  for (let tabCount = 0; tabCount < 32; tabCount += 1) {
    const focusedName = await page.locator(':focus-visible').evaluate((element) => (
      element.getAttribute('aria-label') || element.textContent?.trim() || element.tagName
    ));
    if (focusedName === 'Send sign-in link') {
      submitButtonReached = true;
      break;
    }
    await page.keyboard.press('Tab');
  }
  expect(submitButtonReached).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Open simulated sign-in link' })).toBeVisible();
});

test('review comments can be created, replied to, re-anchored, resolved, deleted, and exported', async ({ page }) => {
  await page.goto('');

  await page.getByRole('button', { name: 'Threads' }).click();
  await expect(page.getByRole('button', { name: 'Threads' })).toHaveAttribute('aria-expanded', 'true');
  const [repositoryExport] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export for repository' }).click(),
  ]);
  expect(repositoryExport.suggestedFilename()).toBe('comments.js');
  const [markdownExport] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export Markdown' }).click(),
  ]);
  expect(markdownExport.suggestedFilename()).toBe('prototype-feedback.md');
  await page.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: 'Comment' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('heading', { name: 'Sign in' }).click();
  await page.getByRole('textbox', { name: 'New review comment' }).fill('Prototype interaction smoke test');
  await page.getByRole('button', { name: 'Add comment' }).click();
  await expect(page.getByText('Prototype interaction smoke test')).toBeVisible();

  await page.getByLabel('Reply to this review comment').fill('Reply interaction smoke test');
  await page.getByRole('button', { name: 'Reply' }).click();
  await expect(page.getByText('Reply interaction smoke test')).toBeVisible();
  await page.getByRole('button', { name: 'Resolve' }).click();
  await page.getByRole('button', { name: 'Reopen' }).click();
  await page.getByRole('button', { name: 'Re-anchor' }).click();
  await page.getByRole('heading', { name: 'Sign in' }).click();
  await expect(page.getByText('Prototype interaction smoke test')).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Prototype interaction smoke test')).toHaveCount(0);
});
