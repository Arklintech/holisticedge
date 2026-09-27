import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

export class WhatsAppProvider {
  async sendTemplateMessage({ to, templateName, languageCode = 'en', parameters = [], components = [], metadata = {} }) {
    throw new Error('sendTemplateMessage must be implemented by provider');
  }

  getStatus() {
    throw new Error('getStatus must be implemented by provider');
  }

  async checkConnection() {
    return { healthy: false, status: 'NOT_IMPLEMENTED', message: 'Not implemented' };
  }
}

export class MockWhatsAppProvider extends WhatsAppProvider {
  constructor() {
    super();
    this.name = 'MockWhatsAppProvider';
    this.sentMessages = [];
  }

  getStatus() {
    return {
      provider: 'Mock WhatsApp Provider',
      type: 'MOCK_WHATSAPP',
      configured: true,
      status: 'ONLINE',
      details: 'Simulated WhatsApp provider for development and testing.',
    };
  }

  async checkConnection() {
    return {
      healthy: true,
      status: 'CONNECTED',
      message: 'Mock WhatsApp provider is ready.',
    };
  }

  async sendTemplateMessage({ to, templateName, languageCode = 'en', parameters = [], components = [], metadata = {} }) {
    const messageId = `wamid_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const record = {
      id: messageId,
      to,
      templateName,
      languageCode,
      parameters,
      components,
      metadata,
      providerMessageId: messageId,
      provider: 'MOCK_WHATSAPP',
      status: 'SENT',
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString(),
      readAt: null,
      error: null,
    };
    this.sentMessages.push(record);
    return record;
  }
}

export class WatiWhatsAppProvider extends WhatsAppProvider {
  constructor(options = {}) {
    super();
    this.name = 'WatiWhatsAppProvider';
    const envEndpoint = options.endpoint || process.env.WATI_API_ENDPOINT || 'https://live-server.wati.io';
    this.endpoint = envEndpoint.replace(/\/+$/, '');
    this.token = options.token !== undefined ? options.token : (process.env.WATI_API_TOKEN || '');
    this.senderNumber = options.senderNumber || process.env.WATI_PHONE_NUMBER || '918142642051';
    this.isEnabled = options.enabled !== undefined
      ? Boolean(options.enabled)
      : (process.env.WATI_ENABLED === 'false' ? false : Boolean(this.token));
    this.isConfigured = Boolean(this.token && this.token.trim().length > 0);
  }

  /**
   * Normalizes recipient phone number for WhatsApp / WATI delivery.
   * Expects standard E.164 without '+' or 10-digit Indian mobile.
   * Formats Indian 10-digit number to '91XXXXXXXXXX'.
   */
  normalizePhoneNumber(phone) {
    if (!phone) return null;
    const digits = String(phone).replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
    if (digits.startsWith('91') && digits.length === 12) return digits;
    if (digits.length >= 10 && digits.length <= 15) return digits;
    return null;
  }

  getStatus() {
    return {
      provider: 'WATI Official WhatsApp Business Platform',
      type: 'WATI',
      configured: this.isConfigured,
      enabled: this.isEnabled,
      senderNumber: this.senderNumber,
      endpoint: this.endpoint,
      status: this.isConfigured ? 'READY' : 'NOT_CONFIGURED',
      details: this.isConfigured
        ? `Configured with WATI endpoint: ${this.endpoint} and sender: +${this.senderNumber}`
        : 'WATI credentials missing. Required: WATI_API_TOKEN, WATI_API_ENDPOINT.',
    };
  }

  async checkConnection() {
    if (!this.isConfigured) {
      return {
        healthy: false,
        status: 'NOT_CONFIGURED',
        message: 'WATI WhatsApp credentials missing.',
      };
    }
    try {
      const isLiveMt = this.endpoint.includes('live-mt-server.wati.io');
      const testUrl = isLiveMt
        ? `${this.endpoint.replace(/\/\d+$/, '').replace(/\/+$/, '')}/api/ext/v3/messageTemplates`
        : `${this.endpoint}/api/v1/getMessageTemplates`;

      const response = await fetch(testUrl, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });
      if (response.ok) {
        return {
          healthy: true,
          status: 'CONNECTED',
          message: 'Connected to WATI WhatsApp Business API',
        };
      }
      return {
        healthy: false,
        status: 'ERROR',
        message: `WATI API connection returned HTTP ${response.status}`,
      };
    } catch (err) {
      return {
        healthy: false,
        status: 'ERROR',
        message: `WATI connection check failed: ${err.message}`,
      };
    }
  }

  async sendTemplateMessage({
    to,
    templateName,
    languageCode = 'en',
    parameters = [],
    components = [],
    metadata = {},
  }) {
    const normalizedPhone = this.normalizePhoneNumber(to);
    if (!normalizedPhone) {
      throw new Error(`Invalid or missing WhatsApp recipient phone number: ${to}`);
    }

    // Format parameters for WATI: array of { name, value }
    let watiParameters = [];
    if (Array.isArray(parameters) && parameters.length > 0) {
      watiParameters = parameters.map(p => ({
        name: String(p.name || p.key || ''),
        value: String(p.value ?? ''),
      }));
    } else if (Array.isArray(components) && components.length > 0) {
      // Graceful fallback from Meta components if passed
      const bodyComp = components.find(c => c.type === 'body');
      if (bodyComp && Array.isArray(bodyComp.parameters)) {
        const approvedVarKeys = ['name', 'service_name', 'appointment_date', 'appointment_time', 'registration_token'];
        watiParameters = bodyComp.parameters.map((p, idx) => ({
          name: approvedVarKeys[idx] || `param_${idx + 1}`,
          value: String(p.text ?? p.value ?? ''),
        }));
      }
    }

    const broadcastName = metadata?.broadcastName || templateName || 'transactional_appointment';

    if (!this.isConfigured) {
      // Safe dry-run when credentials not set in environment
      const simulatedId = `wati_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        id: simulatedId,
        providerMessageId: simulatedId,
        provider: 'WATI',
        status: 'READY_PENDING_CREDENTIALS',
        templateName,
        recipient: normalizedPhone,
        parameters: watiParameters,
        createdAt: new Date().toISOString(),
        sentAt: null,
        deliveredAt: null,
        readAt: null,
        error: 'WATI WhatsApp credentials not set in production environment.',
        metadata,
      };
    }

    const isLiveMt = this.endpoint.includes('live-mt-server.wati.io');
    let localMessageId = null;

    if (isLiveMt) {
      // Modern WATI v3 API for multi-tenant clusters
      const baseUrl = this.endpoint.replace(/\/\d+$/, '').replace(/\/+$/, '');
      const v3Url = `${baseUrl}/api/ext/v3/messageTemplates/send`;
      const v3Payload = {
        template_name: templateName,
        broadcast_name: broadcastName,
        recipients: [
          {
            target: normalizedPhone,
            custom_params: watiParameters,
          },
        ],
      };

      const response = await fetch(v3Url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(v3Payload),
      });

      let data = null;
      try {
        data = await response.json();
      } catch (_) {
        data = null;
      }

      if (!response.ok || (data && data.success === false)) {
        const errRecipient = data?.recipients?.[0]?.errors?.[0];
        const errMsg = errRecipient || data?.message || data?.error || `WATI API error HTTP ${response.status}`;
        const err = new Error(errMsg);
        err.watiResponse = data;
        err.status = response.status;
        throw err;
      }

      localMessageId = data?.recipients?.[0]?.local_message_id
        || data?.broadcast_id
        || `wati_local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    } else {
      // Legacy v1/v2 endpoint fallback
      const payload = {
        template_name: templateName,
        broadcast_name: broadcastName,
        parameters: watiParameters,
      };

      const targetUrl = `${this.endpoint}/api/v1/sendTemplateMessage?whatsappNumber=${normalizedPhone}`;

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      let data = null;
      try {
        data = await response.json();
      } catch (_) {
        data = null;
      }

      if (!response.ok || (data && data.result === false)) {
        const errMsg = (data && (data.info || data.message || data.error)) || `WATI API error HTTP ${response.status}`;
        const err = new Error(errMsg);
        err.watiResponse = data;
        err.status = response.status;
        throw err;
      }

      localMessageId = data?.receivers?.[0]?.localMessageId
        || data?.localMessageId
        || data?.messageId
        || `wati_local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    }

    return {
      id: localMessageId,
      providerMessageId: localMessageId,
      provider: 'WATI',
      status: 'SENT',
      templateName,
      recipient: normalizedPhone,
      parameters: watiParameters,
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      deliveredAt: null,
      readAt: null,
      error: null,
      metadata,
    };
  }
}

export class MetaWhatsAppCloudProvider extends WhatsAppProvider {
  constructor() {
    super();
    this.name = 'MetaWhatsAppCloudProvider';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v19.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;

    this.isConfigured = Boolean(this.phoneNumberId && this.accessToken);
  }

  getStatus() {
    return {
      provider: 'Official Meta WhatsApp Business Cloud API',
      type: 'META_WHATSAPP',
      configured: this.isConfigured,
      status: this.isConfigured ? 'READY' : 'NOT_CONFIGURED',
      details: this.isConfigured
        ? `Configured with Phone Number ID: ${this.phoneNumberId}`
        : 'Meta WhatsApp credentials missing. Required: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN.',
    };
  }

  async checkConnection() {
    if (!this.isConfigured) {
      return {
        healthy: false,
        status: 'NOT_CONFIGURED',
        message: 'Meta WhatsApp Cloud API credentials missing.',
      };
    }
    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        return {
          healthy: true,
          status: 'CONNECTED',
          message: `Connected to Meta WhatsApp Cloud API (Display Name: ${data.verified_name || data.display_phone_number || 'OK'})`,
        };
      }
      return {
        healthy: false,
        status: 'ERROR',
        message: data.error?.message || 'Meta API verification failed',
      };
    } catch (err) {
      return {
        healthy: false,
        status: 'ERROR',
        message: `Connection test failed: ${err.message}`,
      };
    }
  }

  async sendTemplateMessage({ to, templateName, languageCode = 'en', components = [], metadata = {} }) {
    const formattedPhone = String(to).replace(/\D/g, '');
    const recipient = formattedPhone.startsWith('91') ? formattedPhone : `91${formattedPhone}`;

    if (!this.isConfigured) {
      const simulatedId = `wamid_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        id: simulatedId,
        providerMessageId: simulatedId,
        provider: 'META_WHATSAPP',
        status: 'READY_PENDING_CREDENTIALS',
        createdAt: new Date().toISOString(),
        sentAt: null,
        deliveredAt: null,
        readAt: null,
        error: 'Meta WhatsApp credentials not set in production environment.',
        metadata,
      };
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        ...(components && components.length > 0 ? { components } : {}),
      },
    };

    const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      const errMsg = data.error?.message || 'Failed to dispatch Meta WhatsApp template message';
      const err = new Error(errMsg);
      err.metaResponse = data;
      throw err;
    }

    const msgId = data.messages?.[0]?.id || `wamid_${Date.now()}`;
    return {
      id: msgId,
      providerMessageId: msgId,
      provider: 'META_WHATSAPP',
      status: 'SENT',
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      deliveredAt: null,
      readAt: null,
      error: null,
      metadata,
    };
  }
}

class DynamicWhatsAppProviderProxy extends WhatsAppProvider {
  constructor() {
    super();
    this.cachedProvider = null;
    this.forcedProvider = null;
  }

  setProvider(provider) {
    this.forcedProvider = provider;
  }

  resetProvider() {
    this.forcedProvider = null;
    this.cachedProvider = null;
  }

  getProvider() {
    if (this.forcedProvider) return this.forcedProvider;
    if (this.cachedProvider) return this.cachedProvider;

    const providerType = (process.env.WHATSAPP_PROVIDER || '').toLowerCase();

    // Default to WATI when configured or explicitly selected
    if (providerType === 'wati' || Boolean(process.env.WATI_API_TOKEN) || process.env.WATI_ENABLED === 'true') {
      const wati = new WatiWhatsAppProvider();
      this.cachedProvider = wati;
      return wati;
    }

    if (providerType === 'meta' || providerType === 'meta_cloud') {
      const meta = new MetaWhatsAppCloudProvider();
      this.cachedProvider = meta;
      return meta;
    }

    this.cachedProvider = new MockWhatsAppProvider();
    return this.cachedProvider;
  }

  async sendTemplateMessage(args) {
    return this.getProvider().sendTemplateMessage(args);
  }

  getStatus() {
    return this.getProvider().getStatus();
  }

  async checkConnection() {
    return this.getProvider().checkConnection();
  }
}

let activeSingletonWhatsAppProxy = null;

export function getActiveWhatsAppProvider() {
  if (!activeSingletonWhatsAppProxy) {
    activeSingletonWhatsAppProxy = new DynamicWhatsAppProviderProxy();
  }
  return activeSingletonWhatsAppProxy;
}

export function setWhatsAppProviderForTest(provider) {
  getActiveWhatsAppProvider().setProvider(provider);
}

export function resetWhatsAppProviderForTest() {
  getActiveWhatsAppProvider().resetProvider();
}
