import { MockAuthProvider, FirebaseAuthProvider } from './authProvider.js';
import { MockDataProvider, GoogleSheetsDataProvider } from './dataProvider.js';
import { MockMediaProvider, GoogleDriveMediaProvider } from './mediaProvider.js';
import { MockEmailProvider, SMTPEmailProvider } from './emailProvider.js';
import { MockWhatsAppProvider, MetaWhatsAppCloudProvider, getActiveWhatsAppProvider } from './whatsAppProvider.js';

export function getAuthProvider() {
  const providerType = (process.env.AUTH_PROVIDER || 'firebase').toLowerCase();
  if (providerType === 'firebase') {
    const fb = new FirebaseAuthProvider();
    if (fb.isConfigured) return fb;
    console.warn('[ProviderRegistry] Firebase specified but credentials missing. Falling back to MockAuthProvider.');
  }
  return new MockAuthProvider();
}

export function getDataProvider() {
  const providerType = (process.env.DATA_PROVIDER || 'google_sheets').toLowerCase();
  if (providerType === 'google_sheets' || providerType === 'googlesheets') {
    const sheets = new GoogleSheetsDataProvider();
    if (sheets.isConfigured) return sheets;
    console.warn('[ProviderRegistry] Google Sheets specified but credentials missing. Falling back to MockDataProvider.');
  }
  return new MockDataProvider();
}

export function getMediaProvider() {
  const providerType = (process.env.MEDIA_PROVIDER || 'google_drive').toLowerCase();
  if (providerType === 'google_drive' || providerType === 'googledrive') {
    const drive = new GoogleDriveMediaProvider();
    if (drive.isConfigured) return drive;
    console.warn('[ProviderRegistry] Google Drive specified but credentials missing. Falling back to MockMediaProvider.');
  }
  return new MockMediaProvider();
}

export function getEmailProvider() {
  const providerType = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
  if (providerType === 'smtp') {
    const smtp = new SMTPEmailProvider();
    if (smtp.isConfigured) return smtp;
    console.warn('[ProviderRegistry] SMTP specified but credentials missing. Falling back to MockEmailProvider.');
  }
  return new MockEmailProvider();
}

export function getWhatsAppProvider() {
  return getActiveWhatsAppProvider();
}

export const getActiveAuthProvider = getAuthProvider;
export const getActiveDataProvider = getDataProvider;
export const getActiveMediaProvider = getMediaProvider;
export const getActiveEmailProvider = getEmailProvider;
export { getActiveWhatsAppProvider };

