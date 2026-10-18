import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import vm from 'node:vm';

async function worker() {
  const handlers = {};
  const cached = new Map();
  const deleted = [];
  let claimed = false;
  const caches = {
    async open() { return { async addAll(urls) { for (const url of urls) cached.set(url, { url }); }, async match(request) { return cached.get(typeof request === 'string' ? request : request.url); } }; },
    async keys() { return ['vahendustasu-/vahendustasu/-old', 'other-app-cache', 'vahendustasu-/other/-v1', 'vahendustasu-/vahendustasu/-v3']; },
    async delete(key) { deleted.push(key); },
    async match() { assert.fail('Must read from the active version cache only'); }
  };
  const context = {
    URL, caches,
    fetch() { throw new Error('Network is offline'); },
    self: { location: { href: 'https://example.github.io/vahendustasu/sw.js' }, clients: { async claim() { claimed = true; } }, addEventListener(name, handler) { handlers[name] = handler; } }
  };
  vm.runInNewContext(await readFile(new URL('../public/sw.js', import.meta.url), 'utf8'), context);
  return { handlers, cached, deleted, isClaimed: () => claimed };
}

test('offline installation caches every required asset under the repository subpath', async () => {
  const { handlers, cached } = await worker();
  let installation;
  handlers.install({ waitUntil(promise) { installation = promise; } });
  await installation;
  assert.equal(cached.size, 11);
  for (const url of cached.keys()) {
    const pathname = new URL(url).pathname;
    assert.ok(pathname.startsWith('/vahendustasu/'));
    const file = pathname.replace('/vahendustasu/', '') || 'index.html';
    await access(new URL(`../public/${file}`, import.meta.url));
  }
});

test('activation preserves unrelated applications and claims clients', async () => {
  const { handlers, deleted, isClaimed } = await worker();
  let activation;
  handlers.activate({ waitUntil(promise) { activation = promise; } });
  await activation;
  assert.deepEqual(deleted, ['vahendustasu-/vahendustasu/-old']);
  assert.equal(isClaimed(), true);
});

test('cached navigation and scripts work offline without intercepting other sites', async () => {
  const { handlers } = await worker();
  let installation;
  handlers.install({ waitUntil(promise) { installation = promise; } });
  await installation;
  for (const [path, mode, expected] of [['', 'navigate', 'index.html'], ['app.js', 'cors', 'app.js'], ['translations.js', 'cors', 'translations.js']]) {
    let response;
    handlers.fetch({ request: { url: `https://example.github.io/vahendustasu/${path}`, method: 'GET', mode }, respondWith(promise) { response = promise; } });
    assert.equal((await response).url, `https://example.github.io/vahendustasu/${expected}`);
  }
  for (const url of ['https://example.github.io/other/app.js', 'https://elsewhere.example/app.js']) {
    handlers.fetch({ request: { url, method: 'GET' }, respondWith() { assert.fail('Unrelated request intercepted'); } });
  }
});

test('manifest uses portable URLs and valid installation icons', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    const buffer = await readFile(new URL(`../public/${icon.src}`, import.meta.url));
    const size = Number(icon.sizes.split('x')[0]);
    assert.equal(buffer.subarray(1, 4).toString(), 'PNG');
    assert.equal(buffer.readUInt32BE(16), size);
    assert.equal(buffer.readUInt32BE(20), size);
  }
});
