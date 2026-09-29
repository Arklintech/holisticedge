import test from 'node:test';
import assert from 'node:assert';
import {
  loginWithServer,
  restoreServerSession,
  getAdminAuthHeaders,
  ADMIN_TOKEN_KEY,
  ADMIN_USER_KEY,
} from '../src/admin/services/adminSession.ts';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const adminUser = { id: 'usr_admin_01', email: 'admin@holisticedge.in', role: 'SUPER_ADMIN' };

test('login rejected by server does not create a session without a token', async () => {
  const storage = memoryStorage();
  const fetchFn = async () => jsonResponse(401, { error: 'Invalid email or password.' });

  const result = await loginWithServer(fetchFn, storage, 'admin@holisticedge.in', 'admin123');

  assert.strictEqual(result.user, null);
  assert.strictEqual(result.error, 'Invalid email or password.');
  assert.strictEqual(storage.getItem(ADMIN_TOKEN_KEY), null);
});

test('login network failure does not create a session without a token', async () => {
  const storage = memoryStorage();
  const fetchFn = async () => { throw new TypeError('Failed to fetch'); };

  const result = await loginWithServer(fetchFn, storage, 'admin@holisticedge.in', 'HolisticEdge@2025');

  assert.strictEqual(result.user, null);
  assert.match(result.error, /reach the server/i);
  assert.strictEqual(storage.getItem(ADMIN_TOKEN_KEY), null);
});

test('login success without a token is treated as a failure', async () => {
  const storage = memoryStorage();
  const fetchFn = async () => jsonResponse(200, { success: true, user: adminUser });

  const result = await loginWithServer(fetchFn, storage, 'admin@holisticedge.in', 'x');

  assert.strictEqual(result.user, null);
  assert.strictEqual(storage.getItem(ADMIN_TOKEN_KEY), null);
});

test('login success stores the server token and user', async () => {
  const storage = memoryStorage();
  const fetchFn = async () => jsonResponse(200, { success: true, user: adminUser, token: 'server-issued-token' });

  const result = await loginWithServer(fetchFn, storage, 'admin@holisticedge.in', 'x');

  assert.deepStrictEqual(result.user, adminUser);
  assert.strictEqual(result.error, '');
  assert.strictEqual(storage.getItem(ADMIN_TOKEN_KEY), 'server-issued-token');
  assert.deepStrictEqual(JSON.parse(storage.getItem(ADMIN_USER_KEY)), adminUser);
});

test('restore without a stored token returns no user and makes no request', async () => {
  const storage = memoryStorage();
  let called = false;
  const fetchFn = async () => { called = true; return jsonResponse(200, {}); };

  const user = await restoreServerSession(fetchFn, storage);

  assert.strictEqual(user, null);
  assert.strictEqual(called, false);
});

test('restore sends only the bearer token, never an impersonation header', async () => {
  const storage = memoryStorage({ [ADMIN_TOKEN_KEY]: 'server-issued-token' });
  let sentHeaders = null;
  const fetchFn = async (_url, init) => {
    sentHeaders = init.headers;
    return jsonResponse(200, { success: true, user: adminUser });
  };

  const user = await restoreServerSession(fetchFn, storage);

  assert.deepStrictEqual(user, adminUser);
  assert.deepStrictEqual(sentHeaders, { Authorization: 'Bearer server-issued-token' });
});

test('restore with a rejected token clears the stored session', async () => {
  const storage = memoryStorage({ [ADMIN_TOKEN_KEY]: 'expired', [ADMIN_USER_KEY]: JSON.stringify(adminUser) });
  const fetchFn = async () => jsonResponse(401, { error: 'Unauthorized' });

  const user = await restoreServerSession(fetchFn, storage);

  assert.strictEqual(user, null);
  assert.strictEqual(storage.getItem(ADMIN_TOKEN_KEY), null);
  assert.strictEqual(storage.getItem(ADMIN_USER_KEY), null);
});

test('auth headers carry only the stored bearer token', () => {
  assert.deepStrictEqual(getAdminAuthHeaders(memoryStorage()), {});
  assert.deepStrictEqual(
    getAdminAuthHeaders(memoryStorage({ [ADMIN_TOKEN_KEY]: 'server-issued-token', [ADMIN_USER_KEY]: JSON.stringify(adminUser) })),
    { Authorization: 'Bearer server-issued-token' },
  );
});
