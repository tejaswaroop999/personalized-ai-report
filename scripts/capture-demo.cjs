const { chromium } = require('playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const assert = require('node:assert/strict');

const baseURL = process.env.DEMO_BASE_URL || 'http://127.0.0.1:3000';
const output = 'demo-evidence';

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await fetch(baseURL)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Production server did not become ready');
}

async function checkNoOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  assert.ok(dimensions.content <= dimensions.viewport, `Horizontal overflow: ${JSON.stringify(dimensions)}`);
}

async function fillProfile(page) {
  for (const [label, value] of [
    ['Name', 'Teja'], ['Current role', 'Software Engineer'],
    ['Years of experience', '0'], ['Career goal', 'Build reliable AI products'],
    ['Main strengths', 'Python, APIs, and full-stack engineering'],
    ['Biggest challenge', 'Evaluating model output quality'],
  ]) await page.getByLabel(label, { exact: true }).fill(value);
}

async function capture(browser, name, viewport, recordVideo) {
  const context = await browser.newContext({ viewport,
    ...(recordVideo ? { recordVideo: { dir: `${output}/video`, size: viewport } } : {}) });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Your profile', exact: true }).waitFor();
    await checkNoOverflow(page);
    await page.screenshot({ path: `${output}/${name}-form.png`, fullPage: true });
    await fillProfile(page);
    const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/generate') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Generate my report', exact: true }).click();
    const response = await responsePromise;
    assert.equal(response.status(), 200);
    const result = await response.json();
    assert.equal(result.provider, 'Local demo fallback', 'Evidence must not imply a live Claude call');
    await page.getByRole('heading', { name: "Teja's Career Growth Plan", exact: true }).waitFor();
    for (const section of ['Snapshot', 'Strongest Advantages', 'Gaps To Close', '30-Day Plan', 'Next Move']) {
      assert.ok(await page.getByRole('heading', { name: section, exact: true }).isVisible());
    }
    await checkNoOverflow(page);
    await page.screenshot({ path: `${output}/${name}-report.png`, fullPage: true });
    if (recordVideo) {
      await page.getByRole('heading', { name: '30-Day Plan', exact: true }).scrollIntoViewIfNeeded();
      await page.getByRole('heading', { name: 'Next Move', exact: true }).scrollIntoViewIfNeeded();
    }
    await page.getByRole('button', { name: 'Start over', exact: true }).click();
    await page.getByRole('heading', { name: 'Your report appears here', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Name', { exact: true }).inputValue(), '');
    assert.deepEqual(errors, [], 'Browser console must not contain page errors');
    const video = page.video();
    await context.close();
    if (video) await video.saveAs(`${output}/desktop-demo.webm`);
  } finally {
    await context.close();
  }
}

(async () => {
  await mkdir(output, { recursive: true });
  await waitForServer();
  const browser = await chromium.launch();
  try {
    await capture(browser, 'desktop', { width: 1440, height: 1000 }, true);
    await capture(browser, 'mobile', { width: 390, height: 844 }, false);
    await writeFile(`${output}/README.txt`, 'Actual production-build browser captures. Sample profile: Teja, zero years of experience. Provider: Local demo fallback; no live Claude call. Desktop/mobile form and report screenshots plus desktop interaction recording. Checked API success, required sections, reset behavior, page errors, and horizontal overflow.\n');
    console.log('Desktop/mobile smoke checks passed; demo evidence captured.');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
