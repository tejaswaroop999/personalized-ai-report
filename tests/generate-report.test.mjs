import test from 'node:test';
import assert from 'node:assert/strict';
import { generateReport } from '../lib/generate-report.mjs';

const profile = { name: 'Teja', role: 'Engineer', experience: 0, goal: 'Build AI products', strengths: 'Python and APIs', challenge: 'Evaluation' };
const request = (body = profile) => new Request('http://localhost/api/generate', { method: 'POST', body: JSON.stringify(body) });

// Provider calls are mocked: no credentials, paid calls, or network are needed.
test('report API contract and failure handling', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.ANTHROPIC_API_KEY;
  const originalModel = process.env.CLAUDE_MODEL;
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.CLAUDE_MODEL;
    else process.env.CLAUDE_MODEL = originalModel;
  });
  delete process.env.ANTHROPIC_API_KEY;
  globalThis.fetch = async () => { throw new Error('Unexpected provider call'); };

  await t.test('zero experience is valid and fallback is deterministic', async () => {
    const first = await generateReport(request());
    assert.equal(first.status, 200);
    const result = await first.json();
    assert.equal(result.provider, 'Local demo fallback');
    assert.deepEqual(result, await (await generateReport(request())).json());
    for (const section of ['Snapshot', 'Strongest Advantages', 'Gaps To Close', '30-Day Plan', 'Next Move']) assert.ok(result.report.includes(`## ${section}`));
  });
  await t.test('malformed JSON and non-object bodies return 400', async () => {
    const broken = new Request('http://localhost', { method: 'POST', body: '{' });
    assert.equal((await generateReport(broken)).status, 400);
    for (const body of [null, [], 'text']) assert.equal((await generateReport(request(body))).status, 400);
  });
  await t.test('missing fields, wrong types, and invalid experience are rejected', async () => {
    for (const field of Object.keys(profile)) {
      const body = { ...profile }; delete body[field];
      assert.equal((await generateReport(request(body))).status, 400);
    }
    for (const experience of [-1, 71, 'NaN', '', true, {}]) assert.equal((await generateReport(request({ ...profile, experience }))).status, 400);
    assert.equal((await generateReport(request({ ...profile, name: {} }))).status, 400);
    assert.equal((await generateReport(request({ ...profile, name: '  ' }))).status, 400);
  });
  await t.test('input is trimmed and bounded', async () => {
    const result = await (await generateReport(request({ ...profile, name: ' Teja ', goal: 'x'.repeat(701) }))).json();
    assert.equal(result.title, "Teja's Career Growth Plan");
    assert.ok(!result.report.includes('x'.repeat(701)));
  });

  process.env.ANTHROPIC_API_KEY = 'test-only-key';
  process.env.CLAUDE_MODEL = 'test-model';
  await t.test('server calls provider with bounded generation and normalizes text blocks', async () => {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://api.anthropic.com/v1/messages');
      assert.equal(options.headers['x-api-key'], 'test-only-key');
      assert.ok(options.signal instanceof AbortSignal);
      const payload = JSON.parse(options.body);
      assert.equal(payload.model, 'test-model');
      assert.equal(payload.max_tokens, 900);
      assert.ok(payload.messages[0].content.includes('Experience: 0 years'));
      return Response.json({ content: [{ type: 'text', text: ' Report ' }, { type: 'tool_use' }, { type: 'text', text: 'Next' }] });
    };
    const response = await generateReport(request());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { title: "Teja's Career Growth Plan", provider: 'Claude', report: 'Report \nNext' });
  });
  await t.test('provider errors never silently select fallback', async () => {
    globalThis.fetch = async () => new Response('not JSON', { status: 429 });
    const response = await generateReport(request());
    assert.equal(response.status, 502);
    assert.equal((await response.json()).provider, undefined);
  });
  await t.test('malformed and empty provider outputs return 502', async () => {
    for (const payload of [{ content: [] }, {}, { content: {} }, { content: [{ type: 'text', text: '  ' }] }]) {
      globalThis.fetch = async () => Response.json(payload);
      assert.equal((await generateReport(request())).status, 502);
    }
    globalThis.fetch = async () => new Response('not JSON');
    assert.equal((await generateReport(request())).status, 502);
  });
  await t.test('timeout and network failures return explicit errors', async () => {
    for (const name of ['TimeoutError', 'AbortError']) {
      globalThis.fetch = async () => { throw new DOMException('timed out', name); };
      assert.equal((await generateReport(request())).status, 504);
    }
    globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
    assert.equal((await generateReport(request())).status, 502);
  });
});
