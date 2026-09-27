import test from 'node:test';
import assert from 'node:assert';
import app from '../api/index.js';
import { db } from '../server/db.js';
import { WatiWhatsAppProvider, setWhatsAppProviderForTest, resetWhatsAppProviderForTest } from '../server/providers/whatsAppProvider.js';
import { notificationService } from '../server/services/notificationService.js';
import { sendAppointmentConfirmationEmail } from '../server/services/emailService.js';
import { SMTPEmailProvider } from '../server/providers/emailProvider.js';

test('WATI WhatsApp Integration: Comprehensive Production Test Suite (15 Test Requirements)', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    resetWhatsAppProviderForTest();
    server.close();
  });

  if (!db.find('users', u => u.email === 'admin@holisticedge.in')) {
    db.insert('users', {
      id: 'admin_test_001',
      name: 'Admin',
      email: 'admin@holisticedge.in',
      role: 'SUPER_ADMIN',
    });
  }

  // Mock server to simulate WATI responses
  const originalFetch = globalThis.fetch;


  // 1. WATI successful confirmation
  await t.test('1. WATI successful confirmation sends approved template and variables', async () => {
    let capturedRequest = null;

    globalThis.fetch = async (url, options = {}) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/sendTemplateMessage')) {
        capturedRequest = {
          url: urlStr,
          headers: options.headers,
          body: JSON.parse(options.body),
        };
        return {
          ok: true,
          status: 200,
          json: async () => ({
            result: true,
            receivers: [
              {
                localMessageId: 'wati_local_test_confirm_001',
                waId: '918142642051',
                isValidWhatsAppNumber: true,
              },
            ],
          }),
        };
      }
      return originalFetch(url, options);
    };

    try {
      const provider = new WatiWhatsAppProvider({
        endpoint: 'https://test-wati.io',
        token: 'test_wati_bearer_token',
        senderNumber: '918142642051',
      });

      const res = await provider.sendTemplateMessage({
        to: '8142642051',
        templateName: 'holistic_edge_appointment_confirmed',
        parameters: [
          { name: 'name', value: 'Ahmed Khan' },
          { name: 'registration_token', value: 'HE-133993' },
          { name: 'appointment_date', value: '30 September 2026' },
          { name: 'appointment_time', value: '10:30 AM' },
          { name: 'service_name', value: 'Chiropractic Care' },
        ],
      });

      assert.strictEqual(res.status, 'SENT');
      assert.strictEqual(res.providerMessageId, 'wati_local_test_confirm_001');
      assert.ok(capturedRequest, 'HTTP request must be made to WATI');
      assert.ok(capturedRequest.url.includes('whatsappNumber=918142642051'), 'Recipient normalized to 918142642051');
      assert.strictEqual(capturedRequest.body.template_name, 'holistic_edge_appointment_confirmed');
      assert.strictEqual(capturedRequest.headers.Authorization, 'Bearer test_wati_bearer_token');

      // Verify parameters array
      const params = capturedRequest.body.parameters;
      assert.strictEqual(params.find(p => p.name === 'name')?.value, 'Ahmed Khan');
      assert.strictEqual(params.find(p => p.name === 'registration_token')?.value, 'HE-133993');
      assert.strictEqual(params.find(p => p.name === 'service_name')?.value, 'Chiropractic Care');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 2. WATI API failure
  await t.test('2. WATI API failure handles error gracefully and returns structured failure', async () => {
    globalThis.fetch = async (url, options = {}) => {
      if (String(url).includes('/api/v1/sendTemplateMessage')) {
        return {
          ok: false,
          status: 400,
          json: async () => ({
            result: false,
            message: 'Template parameter count mismatch',
          }),
        };
      }
      return originalFetch(url, options);
    };

    try {
      const provider = new WatiWhatsAppProvider({
        endpoint: 'https://test-wati.io',
        token: 'test_wati_bearer_token',
      });

      await assert.rejects(
        async () => {
          await provider.sendTemplateMessage({
            to: '918142642051',
            templateName: 'holistic_edge_appointment_confirmed',
            parameters: [],
          });
        },
        /Template parameter count mismatch|WATI API error/
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 3. Missing WhatsApp number
  await t.test('3. Missing WhatsApp number throws descriptive error', async () => {
    const provider = new WatiWhatsAppProvider({
      endpoint: 'https://test-wati.io',
      token: 'test_wati_bearer_token',
    });

    await assert.rejects(
      async () => {
        await provider.sendTemplateMessage({
          to: '',
          templateName: 'holistic_edge_appointment_confirmed',
        });
      },
      /Invalid or missing WhatsApp recipient phone number/
    );
  });

  // 4. Invalid recipient number
  await t.test('4. Invalid recipient number is rejected safely', async () => {
    const provider = new WatiWhatsAppProvider({
      endpoint: 'https://test-wati.io',
      token: 'test_wati_bearer_token',
    });

    await assert.rejects(
      async () => {
        await provider.sendTemplateMessage({
          to: 'invalid-non-number',
          templateName: 'holistic_edge_appointment_confirmed',
        });
      },
      /Invalid or missing WhatsApp recipient phone number/
    );
  });

  // 5. Provider message ID saved
  await t.test('5. Provider message ID is saved in notificationLogs', async () => {
    const mockMsgId = 'wati_msg_save_test_999';
    const mockProvider = {
      sendTemplateMessage: async () => ({
        id: mockMsgId,
        providerMessageId: mockMsgId,
        provider: 'WATI',
        status: 'SENT',
        createdAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
      }),
    };

    setWhatsAppProviderForTest(mockProvider);

    try {
      const aptId = `test_apt_${Date.now()}`;
      await notificationService.notify({
        eventType: 'appointment_confirmed',
        patient: { name: 'Test Patient', phone: '918142642051', registrationTokenNumber: 'HE-TEST' },
        appointment: { id: aptId, date: '2026-10-01', time: '11:00 AM', service: 'Spinal Alignment' },
      });

      const logs = db.get('notificationLogs') || [];
      const savedLog = logs.find(l => l.providerMessageId === mockMsgId);

      assert.ok(savedLog, 'Notification log must be found with providerMessageId');
      assert.strictEqual(savedLog.provider, 'WATI');
      assert.strictEqual(savedLog.status, 'SENT');
      assert.strictEqual(savedLog.metadata?.appointmentId, aptId);
    } finally {
      resetWhatsAppProviderForTest();
    }
  });

  // 6. Duplicate prevention
  await t.test('6. Duplicate prevention guards against duplicate WhatsApp dispatches', async () => {
    let dispatchCount = 0;
    const mockProvider = {
      sendTemplateMessage: async () => {
        dispatchCount++;
        return {
          id: `wati_dup_${Date.now()}`,
          providerMessageId: `wati_dup_${Date.now()}`,
          provider: 'WATI',
          status: 'SENT',
          createdAt: new Date().toISOString(),
        };
      },
    };

    setWhatsAppProviderForTest(mockProvider);

    try {
      const aptId = `test_apt_dup_${Date.now()}`;
      const patient = { name: 'Duplicate Check Patient', phone: '918142642051', registrationTokenNumber: 'HE-DUP' };
      const appointment = { id: aptId, date: '2026-10-01', time: '11:00 AM', service: 'Posture Correction' };

      // First dispatch
      const res1 = await notificationService.notify({
        eventType: 'appointment_confirmed',
        patient,
        appointment,
      });
      assert.strictEqual(dispatchCount, 1, 'First dispatch must succeed');
      assert.strictEqual(res1.whatsApp.status, 'SENT');

      // Second duplicate dispatch attempt
      const res2 = await notificationService.notify({
        eventType: 'appointment_confirmed',
        patient,
        appointment,
      });

      assert.strictEqual(dispatchCount, 1, 'Duplicate dispatch must be blocked');
      assert.strictEqual(res2.whatsApp.status, 'SKIPPED_DUPLICATE', 'Must report SKIPPED_DUPLICATE');
    } finally {
      resetWhatsAppProviderForTest();
    }
  });

  // 7. Webhook SENT
  await t.test('7. Webhook SENT event updates notification status to SENT', async () => {
    const testMsgId = `wati_wh_sent_${Date.now()}`;
    db.insert('notificationLogs', {
      id: `log_${testMsgId}`,
      providerMessageId: testMsgId,
      status: 'PENDING',
      eventType: 'appointment_confirmed',
      provider: 'WATI',
      createdAt: new Date().toISOString(),
    });

    const res = await fetch(`${baseUrl}/api/wati/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'templateMessageSent_v2',
        statusString: 'Sent',
        localMessageId: testMsgId,
        timestamp: Math.floor(Date.now() / 1000),
      }),
    });

    assert.strictEqual(res.status, 200);
    const updated = db.find('notificationLogs', l => l.providerMessageId === testMsgId);
    assert.strictEqual(updated.status, 'SENT');
  });

  // 8. Webhook DELIVERED
  await t.test('8. Webhook DELIVERED event updates status to DELIVERED and records deliveredAt', async () => {
    const testMsgId = `wati_wh_del_${Date.now()}`;
    db.insert('notificationLogs', {
      id: `log_${testMsgId}`,
      providerMessageId: testMsgId,
      status: 'SENT',
      eventType: 'appointment_confirmed',
      provider: 'WATI',
      createdAt: new Date().toISOString(),
    });

    const res = await fetch(`${baseUrl}/api/wati/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'sentMessageDELIVERED_v2',
        statusString: 'Delivered',
        localMessageId: testMsgId,
        timestamp: Math.floor(Date.now() / 1000),
      }),
    });

    assert.strictEqual(res.status, 200);
    const updated = db.find('notificationLogs', l => l.providerMessageId === testMsgId);
    assert.strictEqual(updated.status, 'DELIVERED');
    assert.ok(updated.deliveredAt, 'deliveredAt timestamp must be set');
  });

  // 9. Webhook READ
  await t.test('9. Webhook READ event updates status to READ and records readAt', async () => {
    const testMsgId = `wati_wh_read_${Date.now()}`;
    db.insert('notificationLogs', {
      id: `log_${testMsgId}`,
      providerMessageId: testMsgId,
      status: 'DELIVERED',
      eventType: 'appointment_confirmed',
      provider: 'WATI',
      createdAt: new Date().toISOString(),
    });

    const res = await fetch(`${baseUrl}/api/wati/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'sentMessageREAD_v2',
        statusString: 'Read',
        localMessageId: testMsgId,
        timestamp: Math.floor(Date.now() / 1000),
      }),
    });

    assert.strictEqual(res.status, 200);
    const updated = db.find('notificationLogs', l => l.providerMessageId === testMsgId);
    assert.strictEqual(updated.status, 'READ');
    assert.ok(updated.readAt, 'readAt timestamp must be set');
  });

  // 10. Webhook FAILED
  await t.test('10. Webhook FAILED event records failure reason without breaking records', async () => {
    const testMsgId = `wati_wh_fail_${Date.now()}`;
    db.insert('notificationLogs', {
      id: `log_${testMsgId}`,
      providerMessageId: testMsgId,
      status: 'SENT',
      eventType: 'appointment_confirmed',
      provider: 'WATI',
      createdAt: new Date().toISOString(),
    });

    const res = await fetch(`${baseUrl}/api/wati/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'sentMessageFAILED_v2',
        statusString: 'Failed',
        localMessageId: testMsgId,
        failedReason: 'User phone number is inactive or not on WhatsApp',
      }),
    });

    assert.strictEqual(res.status, 200);
    const updated = db.find('notificationLogs', l => l.providerMessageId === testMsgId);
    assert.strictEqual(updated.status, 'FAILED');
    assert.ok(updated.error.includes('inactive or not on WhatsApp'));
  });

  // 11. Webhook idempotency
  await t.test('11. Webhook idempotency protects against duplicate events and prevents status regression', async () => {
    const testMsgId = `wati_wh_idem_${Date.now()}`;
    db.insert('notificationLogs', {
      id: `log_${testMsgId}`,
      providerMessageId: testMsgId,
      status: 'READ',
      readAt: new Date().toISOString(),
      eventType: 'appointment_confirmed',
      provider: 'WATI',
      createdAt: new Date().toISOString(),
    });

    // Attempting a delayed duplicate DELIVERED event after already READ
    const res = await fetch(`${baseUrl}/api/wati/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'sentMessageDELIVERED_v2',
        statusString: 'Delivered',
        localMessageId: testMsgId,
      }),
    });

    assert.strictEqual(res.status, 200);
    const updated = db.find('notificationLogs', l => l.providerMessageId === testMsgId);
    assert.strictEqual(updated.status, 'READ', 'Status must not regress from READ to DELIVERED');
  });

  // 12. Appointment remains intact when WhatsApp fails
  await t.test('12. Appointment creation succeeds and remains created even when WhatsApp delivery fails', async () => {
    // Force WATI failure
    const failingProvider = {
      sendTemplateMessage: async () => {
        throw new Error('Simulated WATI Gateway 503 Service Unavailable');
      },
    };
    setWhatsAppProviderForTest(failingProvider);

    try {
      const res = await fetch(`${baseUrl}/api/public/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Resilient Patient',
          phone: '7893700012',
          date: `2027-01-${String(Math.floor(1 + Math.random() * 28)).padStart(2, '0')}`,
          time: `${Math.floor(1 + Math.random() * 5)}:30 PM`,
        }),
      });

      assert.strictEqual(res.status, 201, 'Booking must succeed with HTTP 201 despite WhatsApp failure');
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.appointment?.id, 'Appointment must be created');

      // Verify appointment is saved in datastore
      const apptInDb = db.find('appointments', a => a.id === data.appointment.id);
      assert.ok(apptInDb, 'Appointment must be permanently stored in DB');
      assert.strictEqual(apptInDb.patientName, 'Resilient Patient');
    } finally {
      resetWhatsAppProviderForTest();
    }
  });

  // 13. Follow-up remains DUE after WhatsApp succeeds
  await t.test('13. Follow-up task status strictly remains DUE when WhatsApp succeeds', async () => {
    const successProvider = {
      sendTemplateMessage: async () => ({
        id: `wati_fu_succ_${Date.now()}`,
        providerMessageId: `wati_fu_succ_${Date.now()}`,
        provider: 'WATI',
        status: 'SENT',
      }),
    };
    setWhatsAppProviderForTest(successProvider);

    try {
      const remId = `rem_test_due_${Date.now()}`;
      const today = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];

      db.insert('reminders', {
        id: remId,
        patientId: 'pt_test_001',
        patientName: 'Due Followup Patient',
        patientPhone: '917893769903',
        scheduledDate: today,
        scheduledTime: '10:30 AM',
        status: 'DUE',
        messageStatus: 'PENDING',
        notes: 'Check cervical mobility',
        createdAt: new Date().toISOString(),
      });


      const res = await fetch(`${baseUrl}/api/follow-ups/${remId}/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user-email': 'admin@holisticedge.in',
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.reminder.messageStatus, 'SENT', 'messageStatus must be SENT');
      assert.strictEqual(data.reminder.status, 'DUE', 'Task status must remain DUE, never COMPLETED');

      const remInDb = db.find('reminders', r => r.id === remId);
      assert.strictEqual(remInDb.status, 'DUE', 'Database record must remain DUE');
    } finally {
      resetWhatsAppProviderForTest();
    }
  });

  // 14. Follow-up remains DUE after WhatsApp fails
  await t.test('14. Follow-up task status remains DUE when WhatsApp fails', async () => {
    const failProvider = {
      sendTemplateMessage: async () => {
        throw new Error('Simulated WATI dispatch failure');
      },
    };
    setWhatsAppProviderForTest(failProvider);

    try {
      const remId = `rem_test_fail_${Date.now()}`;
      const today = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];

      db.insert('reminders', {
        id: remId,
        patientId: 'pt_test_002',
        patientName: 'Fail Patient',
        patientPhone: '917893769903',
        scheduledDate: today,

        scheduledTime: '11:00 AM',
        status: 'DUE',
        messageStatus: 'PENDING',
        notes: 'Check lumbar alignment',
        createdAt: new Date().toISOString(),
      });

      const res = await fetch(`${baseUrl}/api/follow-ups/${remId}/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user-email': 'admin@holisticedge.in',
        },
      });

      assert.strictEqual(res.status, 502, 'Must return 502 Bad Gateway on provider failure');
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.reminder.messageStatus, 'FAILED', 'messageStatus must be FAILED');
      assert.strictEqual(data.reminder.status, 'DUE', 'Task status must remain DUE');

      const remInDb = db.find('reminders', r => r.id === remId);
      assert.strictEqual(remInDb.status, 'DUE', 'Database record status must remain DUE');
    } finally {
      resetWhatsAppProviderForTest();
    }
  });

  // 15. Existing Gmail functionality remains intact
  await t.test('15. Existing Gmail / SMTP email functionality remains fully operational', async () => {
    assert.strictEqual(typeof sendAppointmentConfirmationEmail, 'function');
    const smtp = new SMTPEmailProvider();
    assert.strictEqual(typeof smtp.sendEmail, 'function');
    assert.strictEqual(typeof smtp.getStatus, 'function');
    assert.strictEqual(typeof smtp.checkConnection, 'function');

    const status = smtp.getStatus();
    assert.strictEqual(status.type, 'SMTP');
  });

  // 16. Patient profile direct follow-up: POST /api/patients/:id/send-whatsapp successfully dispatches WhatsApp and creates reminder
  await t.test('16. Patient profile direct follow-up: POST /api/patients/:id/send-whatsapp successfully dispatches WhatsApp', async () => {
    let capturedReq = null;
    const mockProvider = {
      sendTemplateMessage: async ({ to, templateName, parameters }) => {
        capturedReq = { recipientPhone: to, templateName, parameters };
        return {
          status: 'SENT',
          providerMessageId: `wati_patient_followup_${Date.now()}`,
          provider: 'WATI',
        };
      },
    };
    setWhatsAppProviderForTest(mockProvider);

    const patientId = `pt_patient_followup_${Date.now()}`;
    const uniqueToken = `HE-${Math.floor(800000 + Math.random() * 99999)}`;
    try {
      db.insert('patients', {
        id: patientId,
        registrationTokenNumber: uniqueToken,
        name: 'Test User',
        phone: '917893769903',
        email: 'testuser.holisticedge@gmail.com',
      });

      const res = await fetch(`${baseUrl}/api/patients/${patientId}/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user-email': 'admin@holisticedge.in',
        },
        body: JSON.stringify({
          notes: 'Routine checkup follow-up',
          scheduledDate: '2026-10-05',
          scheduledTime: '11:30 AM',
          patientName: 'Test User',
          patientPhone: '917893769903',
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.reminder.messageStatus, 'SENT');
      assert.strictEqual(data.reminder.messageChannel, 'whatsapp');
      assert.ok(data.providerMessageId, 'providerMessageId must be returned');
      assert.ok(capturedReq, 'WATI provider must be called');
      assert.strictEqual(capturedReq.recipientPhone, '917893769903');
    } finally {
      db.delete('patients', patientId);
      resetWhatsAppProviderForTest();
    }
  });

  // 17. Patient profile direct follow-up rejects if recipient has no phone number
  await t.test('17. Patient profile direct follow-up rejects if recipient has no phone number', async () => {
    const patientId = `pt_nophone_${Date.now()}`;
    const uniqueToken = `HE-${Math.floor(800000 + Math.random() * 99999)}`;
    try {
      db.insert('patients', {
        id: patientId,
        registrationTokenNumber: uniqueToken,
        name: 'No Phone Patient',
        email: 'nophone@test.com',
      });

      const res = await fetch(`${baseUrl}/api/patients/${patientId}/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user-email': 'admin@holisticedge.in',
        },
        body: JSON.stringify({
          notes: 'Checkup',
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.error.includes('phone number'));
    } finally {
      db.delete('patients', patientId);
    }
  });
});
