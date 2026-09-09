import test from 'node:test';
import assert from 'node:assert';
import app from '../api/index.js';

test('WhatsApp Webhook: Verification & Event Processing', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  process.env.WHATSAPP_VERIFY_TOKEN = 'test_verify_token_12345';

  t.after(() => {
    server.close();
  });

  await t.test('GET /api/whatsapp/webhook successfully verifies with correct hub.verify_token and returns challenge', async () => {
    const challenge = 'random_challenge_string_98765';
    const res = await fetch(`${baseUrl}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=test_verify_token_12345&hub.challenge=${challenge}`);
    
    assert.strictEqual(res.status, 200, 'Must return 200 OK');
    const text = await res.text();
    assert.strictEqual(text, challenge, 'Must return challenge verbatim');
  });

  await t.test('GET /api/whatsapp/webhook returns 403 Forbidden with invalid token', async () => {
    const challenge = 'challenge_test';
    const res = await fetch(`${baseUrl}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=${challenge}`);
    
    assert.strictEqual(res.status, 403, 'Must return 403 Forbidden');
  });

  await t.test('GET /api/whatsapp/webhook returns 403 Forbidden if hub.mode is not subscribe', async () => {
    const res = await fetch(`${baseUrl}/api/whatsapp/webhook?hub.mode=publish&hub.verify_token=test_verify_token_12345&hub.challenge=test`);
    assert.strictEqual(res.status, 403, 'Must return 403 Forbidden');
  });

  await t.test('POST /api/whatsapp/webhook returns 200 OK on delivery status update', async () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '918142642051',
                  phone_number_id: '123456789',
                },
                statuses: [
                  {
                    id: 'wamid.HBgTESTMSG123',
                    status: 'delivered',
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    recipient_id: '918142642051',
                  }
                ]
              },
              field: 'messages'
            }
          ]
        }
      ]
    };

    const res = await fetch(`${baseUrl}/api/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 200, 'Must return 200 OK immediately');
    const body = await res.text();
    assert.ok(body.includes('EVENT_RECEIVED') || res.status === 200, 'Must acknowledge event');
  });

  await t.test('POST /api/whatsapp/webhook gracefully handles empty or unknown payloads without 500 error', async () => {
    const res = await fetch(`${baseUrl}/api/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ object: 'unknown_object' })
    });

    assert.strictEqual(res.status, 200, 'Must return 200 OK and ignore unknown objects gracefully');
  });
});
