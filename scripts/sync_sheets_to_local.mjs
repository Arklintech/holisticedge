import { google } from 'googleapis';
import fs from 'fs';

const credsFile = 'c:\\Users\\NEXAWAVE\\Downloads\\holistic-edge-chiropractic-&-wellness-clinic\\peak-monument-444920-q1-e1871d1be943.json';
const spreadsheetId = '1fFTHGvyYhDAXBie3VbGVYOskciiU4f8lbbyfsvGjihQ';

async function syncSheetsToLocal() {
  const auth = new google.auth.GoogleAuth({
    keyFile: credsFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheetsApi = google.sheets({ version: 'v4', auth });

  console.log('Fetching live PATIENTS from Google Sheets...');
  const res = await sheetsApi.spreadsheets.values.get({
    spreadsheetId,
    range: 'PATIENTS!A2:I500',
  });

  const rows = res.data.values || [];
  console.log(`Fetched ${rows.length} patient rows from Google Sheets`);

  const sheetPatients = rows.map(r => ({
    id: r[0],
    registrationTokenNumber: r[1],
    name: r[2],
    phone: r[3],
    email: r[4] || '',
    patientType: r[5] || 'Standard',
    status: r[6] || 'ACTIVE',
    createdAt: r[7] || new Date().toISOString(),
    updatedAt: r[8] || new Date().toISOString(),
  }));

  // Read local db.json
  const dbPath = 'server/data/db.json';
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  const existingPatients = dbData.patients || [];
  const patientMap = new Map();

  // Populate with existing
  for (const p of existingPatients) {
    if (p.id) patientMap.set(p.id, p);
  }

  // Google Sheets authoritative overwrite/merge
  for (const sp of sheetPatients) {
    patientMap.set(sp.id, sp);
  }

  // Ensure every patient in local has a valid registrationTokenNumber
  const updatedPatients = Array.from(patientMap.values());
  const tokenSet = new Set();
  for (const p of updatedPatients) {
    if (p.registrationTokenNumber) {
      tokenSet.add(p.registrationTokenNumber);
    }
  }

  let nextMockSeq = 1001;
  for (const p of updatedPatients) {
    if (!p.registrationTokenNumber) {
      let cand = `HE-${String(nextMockSeq).padStart(6, '0')}`;
      while (tokenSet.has(cand)) {
        nextMockSeq++;
        cand = `HE-${String(nextMockSeq).padStart(6, '0')}`;
      }
      p.registrationTokenNumber = cand;
      tokenSet.add(cand);
      nextMockSeq++;
    }
  }

  dbData.patients = updatedPatients;

  // Sync counters
  if (!dbData.counters) dbData.counters = [];
  let tokenCounter = dbData.counters.find(c => c.key === 'PATIENT_REGISTRATION_TOKEN');
  if (!tokenCounter) {
    tokenCounter = {
      id: 'cnt_PATIENT_REGISTRATION_TOKEN',
      key: 'PATIENT_REGISTRATION_TOKEN',
      seq: 999996,
      lockOwnerId: '',
      lockTimestamp: 0,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dbData.counters.push(tokenCounter);
  } else {
    tokenCounter.seq = Math.max(tokenCounter.seq || 0, 999996);
  }

  fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');
  console.log(`Successfully synced ${updatedPatients.length} patients and counter (seq: ${tokenCounter.seq}) to server/data/db.json!`);
}

syncSheetsToLocal().catch(console.error);
