import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

export class WhatsAppProvider {
  async sendTemplateMessage({ to, templateName, languageCode = 'en', components = [], metadata = {} }) {
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

  async sendTemplateMessage({ to, templateName, languageCode = 'en', components = [], metadata = {} }) {
    const messageId = `wamid_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const record = {
      id: messageId,
      to,
      templateName,
      languageCode,
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
      // Safe dry-run when credentials not yet configured
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
  }

  getProvider() {
    if (this.cachedProvider) return this.cachedProvider;
    const providerType = (process.env.WHATSAPP_PROVIDER || 'meta').toLowerCase();
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
