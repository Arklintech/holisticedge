import { google } from 'googleapis';
import fs from 'fs';

const credsFile = 'c:\\Users\\NEXAWAVE\\Downloads\\holistic-edge-chiropractic-&-wellness-clinic\\peak-monument-444920-q1-e1871d1be943.json';
const spreadsheetId = '1fFTHGvyYhDAXBie3VbGVYOskciiU4f8lbbyfsvGjihQ';

async function auditProduction() {
  const auth = new google.auth.GoogleAuth({
    keyFile: credsFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheetsApi = google.sheets({ version: 'v4', auth });

  console.log('--- FETCHING PRODUCTION DATA ---');
  const [patientsRes, apptsRes, followUpsRes] = await Promise.all([
    sheetsApi.spreadsheets.values.get({ spreadsheetId, range: 'PATIENTS!A1:I500' }),
    sheetsApi.spreadsheets.values.get({ spreadsheetId, range: 'APPOINTMENTS!A1:K500' }),
    sheetsApi.spreadsheets.values.get({ spreadsheetId, range: 'FOLLOW_UPS!A1:K500' }),
  ]);

  const patientRows = patientsRes.data.values || [];
  const apptRows = apptsRes.data.values || [];
  const followUpRows = followUpsRes.data.values || [];

  console.log(`PATIENTS total rows (including header): ${patientRows.length}`);
  console.log(`APPOINTMENTS total rows: ${apptRows.length}`);
  console.log(`FOLLOW_UPS total rows: ${followUpRows.length}`);

  const header = patientRows[0];
  const dataRows = patientRows.slice(1);

  // Appt count by patientId or token
  const apptsByPatientId = new Map();
  const apptsByToken = new Map();
  for (const r of apptRows.slice(1)) {
    const pId = r[1];
    const tok = r[2];
    if (pId) apptsByPatientId.set(pId, (apptsByPatientId.get(pId) || 0) + 1);
    if (tok) apptsByToken.set(tok, (apptsByToken.get(tok) || 0) + 1);
  }

  const followUpsByPatientId = new Map();
  const followUpsByToken = new Map();
  for (const r of followUpRows.slice(1)) {
    const pId = r[1];
    const tok = r[2];
    if (pId) followUpsByPatientId.set(pId, (followUpsByPatientId.get(pId) || 0) + 1);
    if (tok) followUpsByToken.set(tok, (followUpsByToken.get(tok) || 0) + 1);
  }

  // Token map: token -> array of patients
  const tokenMap = new Map();
  const allPatients = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const rowNum = i + 2;
    const p = {
      row: rowNum,
      id: r[0],
      token: r[1],
      name: r[2],
      phone: r[3],
      email: r[4],
      patientType: r[5],
      status: r[6],
      createdAt: r[7],
      updatedAt: r[8],
      linkedAppointments: (apptsByPatientId.get(r[0]) || 0),
      linkedFollowUps: (followUpsByPatientId.get(r[0]) || 0),
    };
    allPatients.push(p);

    if (p.token) {
      if (!tokenMap.has(p.token)) {
        tokenMap.set(p.token, []);
      }
      tokenMap.get(p.token).push(p);
    }
  }

  console.log(`\nTotal unique tokens: ${tokenMap.size} across ${allPatients.length} patient rows`);

  const duplicates = [];
  for (const [token, list] of tokenMap.entries()) {
    if (list.length > 1) {
      duplicates.push({ token, count: list.length, patients: list });
    }
  }

  console.log('\n=============================================');
  console.log(`DUPLICATE AUDIT RESULT: ${duplicates.length} duplicate tokens found.`);
  console.log('=============================================');

  if (duplicates.length > 0) {
    for (const dup of duplicates) {
      console.log(`\nDUPLICATE TOKEN: ${dup.token} (Count: ${dup.count})`);
      for (const p of dup.patients) {
        console.log(`  - Row ${p.row}: ID=${p.id} | Name=${p.name} | Phone=${p.phone} | Created=${p.createdAt} | Appts=${p.linkedAppointments} | FollowUps=${p.linkedFollowUps}`);
      }
    }
  } else {
    console.log('ALL PATIENTS HAVE 100% UNIQUE REGISTRATION TOKENS!');
  }

  // Check HE-999979 specifically
  console.log('\n--- SPECIFIC CHECK: HE-999979 ---');
  const token79 = tokenMap.get('HE-999979') || [];
  console.log(`Patients with HE-999979: ${token79.length}`);
  token79.forEach(p => {
    console.log(`  Row ${p.row}: ID=${p.id}, Name=${p.name}, Phone=${p.phone}, Appts=${p.linkedAppointments}, FollowUps=${p.linkedFollowUps}`);
  });

  // Check HE-999996 specifically
  console.log('\n--- SPECIFIC CHECK: HE-999996 ---');
  const token96 = tokenMap.get('HE-999996') || [];
  console.log(`Patients with HE-999996: ${token96.length}`);
  token96.forEach(p => {
    console.log(`  Row ${p.row}: ID=${p.id}, Name=${p.name}, Phone=${p.phone}, Appts=${p.linkedAppointments}, FollowUps=${p.linkedFollowUps}`);
  });

  // Find highest token in the entire dataset
  let highestTokenSeq = 0;
  for (const p of allPatients) {
    if (p.token && p.token.startsWith('HE-')) {
      const seq = parseInt(p.token.replace('HE-', ''), 10);
      if (!isNaN(seq) && seq > highestTokenSeq) {
        highestTokenSeq = seq;
      }
    }
  }
  console.log(`\nHighest HE token sequence in production: HE-${highestTokenSeq}`);
}

auditProduction().catch(console.error);
