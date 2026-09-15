import { google } from 'googleapis';
import fs from 'fs';
import { db } from '../db.js';

export class DataProvider {
  getStatus() { throw new Error('getStatus must be implemented'); }
  async searchPatients(query) { throw new Error('searchPatients must be implemented'); }
  async getPatientById(id) { throw new Error('getPatientById must be implemented'); }
  async getPatientByRegistrationToken(token) { throw new Error('getPatientByRegistrationToken must be implemented'); }
  async createPatient(patientData) { throw new Error('createPatient must be implemented'); }
  async updatePatient(id, updateData) { throw new Error('updatePatient must be implemented'); }
  async getAppointments(filters) { throw new Error('getAppointments must be implemented'); }
  async createAppointment(appointmentData) { throw new Error('createAppointment must be implemented'); }
  async updateAppointment(id, updateData) { throw new Error('updateAppointment must be implemented'); }
  async getBookingSlots(date) { throw new Error('getBookingSlots must be implemented'); }
  async updateBookingSlot(id, updateData) { throw new Error('updateBookingSlot must be implemented'); }
  async createReminder(reminderData) { throw new Error('createReminder must be implemented'); }
  async getReminders(filters) { throw new Error('getReminders must be implemented'); }
  async getReminderById(id) { throw new Error('getReminderById must be implemented'); }
  async updateReminder(id, updateData) { throw new Error('updateReminder must be implemented'); }
}

export class MockDataProvider extends DataProvider {
  constructor() {
    super();
    this.name = 'MockDataProvider';
  }

  getStatus() {
    return {
      provider: 'Mock JSON Database Provider',
      type: 'MOCK',
      configured: true,
      status: 'ONLINE',
      details: 'Atomic persistent JSON database engine for development & testing.',
    };
  }

  async searchPatients(query) {
    if (!query) return db.get('patients');
    const q = query.toLowerCase().trim();
    return db.filter('patients', p =>
      (p.registrationTokenNumber && p.registrationTokenNumber.toLowerCase().includes(q)) ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  }

  async getPatientById(id) {
    return db.find('patients', p => p.id === id);
  }

  async getPatientByRegistrationToken(token) {
    if (!token) return null;
    const cleanToken = token.trim().toUpperCase();
    return db.find('patients', p => p.registrationTokenNumber && p.registrationTokenNumber.toUpperCase() === cleanToken);
  }

  async createPatient(patientData) {
    return db.insert('patients', patientData);
  }

  async updatePatient(id, updateData) {
    return db.update('patients', id, updateData);
  }

  async getAppointments(filters = {}) {
    let appointments = db.get('appointments') || [];
    if (filters.patientId) {
      appointments = appointments.filter(a => a.patientId === filters.patientId);
    }
    if (filters.date) {
      appointments = appointments.filter(a => (a.date || a.preferredDate) === filters.date);
    }
    if (filters.status) {
      const sFilter = filters.status.toLowerCase().replace(/[\s_]+/g, '-');
      if (sFilter === 'active') {
        appointments = appointments.filter(a => {
          const s = (a.status || '').toLowerCase().replace(/[\s_]+/g, '-');
          return s !== 'completed' && s !== 'cancelled' && s !== 'no-show';
        });
      } else if (sFilter === 'history' || sFilter === 'historical') {
        appointments = appointments.filter(a => {
          const s = (a.status || '').toLowerCase().replace(/[\s_]+/g, '-');
          return s === 'completed' || s === 'cancelled' || s === 'no-show';
        });
      } else if (sFilter !== 'all') {
        appointments = appointments.filter(a => (a.status || '').toLowerCase().replace(/[\s_]+/g, '-') === sFilter);
      }
    }
    return appointments;
  }

  async createAppointment(appointmentData) {
    return db.insert('appointments', appointmentData);
  }

  async updateAppointment(id, updateData) {
    return db.update('appointments', id, updateData);
  }

  async getBookingSlots(date) {
    const allSlots = db.get('bookingSlots');
    if (!date) return allSlots;
    return allSlots.filter(s => s.date === date);
  }

  async updateBookingSlot(id, updateData) {
    return db.update('bookingSlots', id, updateData);
  }

  async createReminder(reminderData) {
    return db.insert('reminders', reminderData);
  }

  async getReminders(filters = {}) {
    let reminders = db.get('reminders') || [];
    if (filters.patientId) {
      reminders = reminders.filter(r => r.patientId === filters.patientId);
    }
    if (filters.status) {
      const sFilter = filters.status.toLowerCase();
      if (sFilter === 'active') {
        reminders = reminders.filter(r => {
          const s = (r.status || '').toLowerCase();
          return s !== 'completed' && s !== 'cancelled';
        });
      } else if (sFilter === 'history' || sFilter === 'historical') {
        reminders = reminders.filter(r => {
          const s = (r.status || '').toLowerCase();
          return s === 'completed' || s === 'cancelled';
        });
      } else if (sFilter !== 'all') {
        reminders = reminders.filter(r => (r.status || '').toLowerCase() === sFilter);
      }
    }
    return reminders;
  }

  async getReminderById(id) {
    const reminders = await this.getReminders({});
    return reminders.find(r => r.id === id) || db.find('reminders', r => r.id === id);
  }

  async updateReminder(id, updateData) {
    return db.update('reminders', id, updateData);
  }
}

// 8 Master Required Schema Definitions
const REQUIRED_SHEET_SCHEMAS = {
  PATIENTS: ['ID', 'TokenNumber', 'Name', 'Phone', 'Email', 'Type', 'Status', 'CreatedAt', 'UpdatedAt'],
  APPOINTMENTS: ['ID', 'PatientID', 'TokenNumber', 'SlotID', 'Date', 'Time', 'Service', 'Status', 'Source', 'CreatedAt', 'UpdatedAt'],
  BOOKING_SLOTS: ['ID', 'Date', 'Time', 'Capacity', 'Status', 'UpdatedAt'],
  LEADS: ['ID', 'Name', 'Phone', 'Email', 'Source', 'Status', 'CreatedAt'],
  REVIEWS: ['ID', 'AuthorName', 'Rating', 'Text', 'RelativeTime', 'Status', 'CreatedAt'],
  NOTIFICATIONS: ['ID', 'Title', 'Message', 'Type', 'Status', 'CreatedAt'],
  FOLLOW_UPS: ['ID', 'PatientID', 'TokenNumber', 'AppointmentID', 'ScheduledDate', 'ScheduledTime', 'Channel', 'Purpose', 'Status', 'SentAt', 'BookedAppointmentID', 'BookedAt', 'FailureReason', 'CreatedBy', 'CreatedAt'],
  AUDIT_LOGS: ['ID', 'Actor', 'ActorID', 'Action', 'Entity', 'EntityID', 'Description', 'Timestamp'],
};

export class GoogleSheetsDataProvider extends DataProvider {
  constructor() {
    super();
    this.name = 'GoogleSheetsDataProvider';
    this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '1fFTHGvyYhDAXBie3VbGVYOskciiU4f8lbbyfsvGjihQ';
    this.credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH;
    this.schemaInitialized = false;

    this.isConfigured = Boolean(this.spreadsheetId);
    if (this.isConfigured) {
      try {
        if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
          const auth = new google.auth.JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
          });
          this.sheetsApi = google.sheets({ version: 'v4', auth });
        } else if (this.credentialsPath && fs.existsSync(this.credentialsPath)) {
          const auth = new google.auth.GoogleAuth({
            keyFile: this.credentialsPath,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
          });
          this.sheetsApi = google.sheets({ version: 'v4', auth });
        } else {
          this.isConfigured = false;
          console.warn('[GoogleSheets] Missing keyFile or private key credentials. Falling back to Mock.');
          return;
        }
      } catch (err) {
        this.isConfigured = false;
        console.error('[GoogleSheets] Init error:', err.message);
      }
    }
  }

  async initializeSchema() {
    if (this.schemaInitialized || !this.isConfigured) return;
    try {
      const metadata = await this.sheetsApi.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const existingSheetNames = metadata.data.sheets?.map(s => s.properties?.title) || [];
      const requests = [];

      for (const [sheetName, headers] of Object.entries(REQUIRED_SHEET_SCHEMAS)) {
        if (!existingSheetNames.includes(sheetName)) {
          requests.push({
            addSheet: { properties: { title: sheetName } },
          });
        }
      }

      if (requests.length > 0) {
        await this.sheetsApi.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: { requests },
        });

        for (const [sheetName, headers] of Object.entries(REQUIRED_SHEET_SCHEMAS)) {
          if (!existingSheetNames.includes(sheetName)) {
            await this.sheetsApi.spreadsheets.values.update({
              spreadsheetId: this.spreadsheetId,
              range: `${sheetName}!A1`,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values: [headers] },
            });
          }
        }
      }

      this.schemaInitialized = true;
    } catch (err) {
      console.error('[GoogleSheets] Schema init error:', err.message);
    }
  }

  getStatus() {
    return {
      provider: 'Google Sheets Production Engine',
      type: 'GOOGLE_SHEETS',
      configured: this.isConfigured,
      status: this.isConfigured ? 'READY' : 'NOT_CONFIGURED',
      details: this.isConfigured
        ? `Spreadsheet ID: ${this.spreadsheetId}`
        : 'Google Sheets API not configured. Set GOOGLE_SPREADSHEET_ID and GOOGLE_CREDENTIALS_PATH.',
    };
  }

  // --- Patients ---

  async searchPatients(query) {
    const localPatients = db.get('patients') || [];
    if (!this.isConfigured) return localPatients;

    try {
      const sheetsFetch = this.sheetsApi.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'PATIENTS!A2:I1000',
      });
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 6000));
      const res = await Promise.race([sheetsFetch, timeout]);

      const rows = res.data.values || [];
      const patients = rows.map(r => ({
        id: r[0],
        registrationTokenNumber: r[1],
        name: r[2],
        phone: r[3],
        email: r[4],
        patientType: r[5] || 'Standard',
        status: r[6] || 'ACTIVE',
        createdAt: r[7],
        updatedAt: r[8],
      }));

      const mergedMap = new Map();
      patients.forEach(p => mergedMap.set(p.id, p));
      localPatients.forEach(p => mergedMap.set(p.id, p));

      const merged = Array.from(mergedMap.values());
      if (!query) return merged;

      const q = query.toLowerCase().trim();
      return merged.filter(p =>
        (p.registrationTokenNumber && p.registrationTokenNumber.toLowerCase().includes(q)) ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
      );
    } catch (err) {
      if (!query) return localPatients;
      const q = query.toLowerCase().trim();
      return localPatients.filter(p =>
        (p.registrationTokenNumber && p.registrationTokenNumber.toLowerCase().includes(q)) ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
      );
    }
  }

  async getPatientById(id) {
    const local = db.find('patients', p => p.id === id);
    if (local) return local;
    const patients = await this.searchPatients('');
    return patients.find(p => p.id === id) || null;
  }

  async getPatientByRegistrationToken(token) {
    if (!token) return null;
    const cleanToken = token.trim().toUpperCase();
    const local = db.find('patients', p => p.registrationTokenNumber && p.registrationTokenNumber.toUpperCase() === cleanToken);
    if (local) return local;
    const patients = await this.searchPatients('');
    return patients.find(p => p.registrationTokenNumber && p.registrationTokenNumber.toUpperCase() === cleanToken) || null;
  }

  async createPatient(patientData) {
    db.insert('patients', patientData);
    if (!this.isConfigured) return patientData;

    try {
      const row = [
        patientData.id,
        patientData.registrationTokenNumber,
        patientData.name,
        patientData.phone,
        patientData.email || '',
        patientData.patientType || 'Standard',
        patientData.status || 'ACTIVE',
        patientData.createdAt || new Date().toISOString(),
        patientData.updatedAt || new Date().toISOString(),
      ];

      try {
        await this.sheetsApi.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: 'PATIENTS!A:I',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [row] },
        });
        console.log(`[GoogleSheets] Appended Patient ${patientData.registrationTokenNumber} to PATIENTS sheet`);
      } catch (e) {
        console.error('[GoogleSheets] append error:', e.message);
      }
    } catch (err) {
      console.error('[GoogleSheets] createPatient append error:', err.message);
    }

    return patientData;
  }

  async updatePatient(id, updateData) {
    return db.update('patients', id, updateData);
  }

  // --- Appointments ---

  async getAppointments(filters = {}) {
    const localAppts = db.get('appointments') || [];
    if (!this.isConfigured) return localAppts;
    try {
      const sheetsFetch = this.sheetsApi.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'APPOINTMENTS!A2:K1000',
      });
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 6000));
      const res = await Promise.race([sheetsFetch, timeout]);

      const rows = res.data.values || [];
      const appointments = rows.map(r => ({
        id: r[0],
        patientId: r[1],
        registrationTokenNumber: r[2],
        slotId: r[3],
        date: r[4],
        time: r[5],
        service: r[6],
        status: r[7],
        source: r[8],
        createdAt: r[9],
        updatedAt: r[10],
      }));

      const mergedMap = new Map();
      appointments.forEach(a => mergedMap.set(a.id, a));
      localAppts.forEach(a => mergedMap.set(a.id, a));

      const applyFilters = (list) => {
        let result = list;
        if (filters.patientId) result = result.filter(a => a.patientId === filters.patientId);
        if (filters.date) result = result.filter(a => (a.date || a.preferredDate) === filters.date);
        if (filters.status) {
          const sFilter = filters.status.toLowerCase().replace(/[\s_]+/g, '-');
          if (sFilter === 'active') {
            result = result.filter(a => {
              const s = (a.status || '').toLowerCase().replace(/[\s_]+/g, '-');
              return s !== 'completed' && s !== 'cancelled' && s !== 'no-show';
            });
          } else if (sFilter === 'history' || sFilter === 'historical') {
            result = result.filter(a => {
              const s = (a.status || '').toLowerCase().replace(/[\s_]+/g, '-');
              return s === 'completed' || s === 'cancelled' || s === 'no-show';
            });
          } else if (sFilter !== 'all') {
            result = result.filter(a => (a.status || '').toLowerCase().replace(/[\s_]+/g, '-') === sFilter);
          }
        }
        return result;
      };

      return applyFilters(Array.from(mergedMap.values()));
    } catch (err) {
      const applyFilters = (list) => {
        let result = list;
        if (filters.patientId) result = result.filter(a => a.patientId === filters.patientId);
        if (filters.date) result = result.filter(a => (a.date || a.preferredDate) === filters.date);
        if (filters.status) {
          const sFilter = filters.status.toLowerCase().replace(/[\s_]+/g, '-');
          if (sFilter === 'active') {
            result = result.filter(a => {
              const s = (a.status || '').toLowerCase().replace(/[\s_]+/g, '-');
              return s !== 'completed' && s !== 'cancelled' && s !== 'no-show';
            });
          } else if (sFilter === 'history' || sFilter === 'historical') {
            result = result.filter(a => {
              const s = (a.status || '').toLowerCase().replace(/[\s_]+/g, '-');
              return s === 'completed' || s === 'cancelled' || s === 'no-show';
            });
          } else if (sFilter !== 'all') {
            result = result.filter(a => (a.status || '').toLowerCase().replace(/[\s_]+/g, '-') === sFilter);
          }
        }
        return result;
      };
      return applyFilters(localAppts);
    }
  }

  async createAppointment(appointmentData) {
    db.insert('appointments', appointmentData);
    if (!this.isConfigured) return appointmentData;

    try {
      const row = [
        appointmentData.id,
        appointmentData.patientId,
        appointmentData.registrationTokenNumber,
        appointmentData.slotId,
        appointmentData.date,
        appointmentData.time,
        appointmentData.service,
        appointmentData.status,
        appointmentData.source || 'WEBSITE',
        appointmentData.createdAt || new Date().toISOString(),
        appointmentData.updatedAt || new Date().toISOString(),
      ];

      try {
        await this.sheetsApi.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: 'APPOINTMENTS!A:K',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [row] },
        });
        console.log(`[GoogleSheets] Appended Appointment ${appointmentData.id} to APPOINTMENTS sheet`);
      } catch (e) {
        console.error('[GoogleSheets] append error:', e.message);
      }
    } catch (err) {
      console.error('[GoogleSheets] createAppointment append error:', err.message);
    }

    return appointmentData;
  }

  async updateAppointment(id, updateData) {
    return db.update('appointments', id, updateData);
  }

  // --- Booking Slots ---

  async getBookingSlots(date) {
    const allSlots = db.get('bookingSlots');
    if (!date) return allSlots;
    return allSlots.filter(s => s.date === date);
  }

  async updateBookingSlot(id, updateData) {
    return db.update('bookingSlots', id, updateData);
  }

  // --- Follow-ups ---

  async createReminder(reminderData) {
    db.insert('reminders', reminderData);
    if (!this.isConfigured) return reminderData;

    try {
      const row = [
        reminderData.id,
        reminderData.patientId,
        reminderData.registrationTokenNumber || '',
        reminderData.appointmentId || '',
        reminderData.scheduledDate,
        reminderData.scheduledTime || '10:00 AM',
        'EMAIL',
        'Follow-up Reminder',
        reminderData.status || 'SCHEDULED',
        new Date().toISOString(),
        '',
        '',
        '',
        'Staff',
        new Date().toISOString(),
      ];

      try {
        await this.sheetsApi.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: 'FOLLOW_UPS!A:O',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [row] },
        });
        console.log(`[GoogleSheets] Appended Follow-up ${reminderData.id} to FOLLOW_UPS sheet`);
      } catch (e) {
        console.error('[GoogleSheets] append error:', e.message);
      }
    } catch (err) {
      console.error('[GoogleSheets] createReminder append error:', err.message);
    }

    return reminderData;
  }

  async getReminders(filters = {}) {
    let reminders = db.get('reminders') || [];
    if (filters.patientId) reminders = reminders.filter(r => r.patientId === filters.patientId);
    if (filters.status) {
      const sFilter = filters.status.toLowerCase();
      if (sFilter === 'active') {
        reminders = reminders.filter(r => {
          const s = (r.status || '').toLowerCase();
          return s !== 'completed' && s !== 'cancelled';
        });
      } else if (sFilter === 'history' || sFilter === 'historical') {
        reminders = reminders.filter(r => {
          const s = (r.status || '').toLowerCase();
          return s === 'completed' || s === 'cancelled';
        });
      } else if (sFilter !== 'all') {
        reminders = reminders.filter(r => (r.status || '').toLowerCase() === sFilter);
      }
    }
    return reminders;
  }

  async getReminderById(id) {
    const reminders = await this.getReminders({});
    return reminders.find(r => r.id === id) || db.find('reminders', r => r.id === id);
  }

  async updateReminder(id, updateData) {
    return db.update('reminders', id, updateData);
  }
}

export function getActiveDataProvider() {
  const providerType = (process.env.DATA_PROVIDER || 'mock').toLowerCase();
  if (providerType === 'google_sheets' || providerType === 'googlesheets') {
    const sheets = new GoogleSheetsDataProvider();
    if (sheets.isConfigured) return sheets;
    console.warn('[DataProvider] Google Sheets specified but credentials missing. Falling back to MockDataProvider.');
  }
  return new MockDataProvider();
}
