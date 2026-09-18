import { getActiveEmailProvider } from '../providers/emailProvider.js';
import { generateSignedAppointmentAccessToken } from './appointmentAccessTokenService.js';
import { db } from '../db.js';
import fs from 'fs';
import path from 'path';

const emailProvider = getActiveEmailProvider();

function getAppBaseUrl() {
  return process.env.APP_BASE_URL || 'https://www.holisticedge.in';
}

const PUBLIC_LOGO_URL = 'https://www.holisticedge.in/brand/holistic-edge-official-logo.png';

let cachedLogoAttachment = null;

function getLogoCidAttachment() {
  return [];
}

export function buildCleanEmailLayout({ title, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    :root { color-scheme: light only; supported-color-schemes: light only; }
    html, body { margin: 0 !important; padding: 0 !important; height: 100% !important; width: 100% !important; background-color: #FFFFFF !important; }
    * { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    
    @media (prefers-color-scheme: dark) {
      body, table, td, div, p, span, h1, h2, h3, a {
        background-color: #FFFFFF !important;
        color: #334155 !important;
      }
      .bg-outer, .bg-card, .bg-footer {
        background-color: #FFFFFF !important;
      }
      .detail-box {
        background-color: #F8FAFC !important;
        border-color: #E2E8F0 !important;
      }
      .t-navy { color: #0F2747 !important; }
      .t-slate { color: #334155 !important; }
      .cta-btn {
        background-color: #0F2747 !important;
        color: #FFFFFF !important;
      }
    }

    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .fluid-pd { padding: 24px 16px !important; }
      .cta-btn { width: 100% !important; padding: 14px 16px !important; box-sizing: border-box !important; text-align: center !important; }
      .logo-img { width: 260px !important; max-width: 85% !important; }
    }
  </style>
</head>
<body id="body" style="margin:0; padding:0; background-color:#FFFFFF; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#334155;">

  <!-- OUTER BACKGROUND -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" class="bg-outer" style="background-color:#FFFFFF; table-layout:fixed;">
    <tr>
      <td align="center" style="padding:24px 12px; background-color:#FFFFFF;">
        
        <table border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="max-width:600px; width:100%; margin:0 auto; background-color:#FFFFFF;">

          <!-- BRAND LOGO HEADER -->
          <tr>
            <td align="center" style="padding:16px 16px 24px 16px; background-color:#FFFFFF; text-align:center;">
              <img src="${PUBLIC_LOGO_URL}" alt="Holistic Edge Wellness Centre" width="280" class="logo-img"
                style="display:block; width:280px; max-width:85%; height:auto; border:0; margin:0 auto;" />
            </td>
          </tr>

          <!-- MAIN BODY CARD CONTAINER -->
          <tr>
            <td class="fluid-pd" style="background-color:#FFFFFF; border:1px solid #E2E8F0; border-radius:16px; padding:32px 28px 28px 28px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                
                <!-- TITLE HEADER -->
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <h1 style="margin:0; font-family:Georgia,Cambria,serif; font-size:22px; font-weight:700; color:#0F2747; line-height:1.3;">
                      ${title}
                    </h1>
                    <div style="width:36px; height:3px; background-color:#2D6A4F; border-radius:2px; margin:10px auto 0 auto;"></div>
                  </td>
                </tr>

                <!-- INNER CONTENT -->
                <tr>
                  <td style="padding-top:12px;">
                    ${bodyHtml}
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- CLINIC FOOTER -->
          <tr>
            <td style="padding:24px 12px; text-align:center; background-color:#FFFFFF;">
              <div style="font-family:Georgia,serif; font-size:13px; font-weight:700; color:#0F2747; letter-spacing:0.5px;">
                HOLISTIC EDGE CHIROPRACTIC & WELLNESS CLINIC
              </div>
              <div style="width:24px; height:2px; background-color:#2D6A4F; margin:6px auto 10px auto; border-radius:1px;"></div>
              <div style="font-size:12px; color:#475569; line-height:1.5; margin-bottom:6px;">
                &#128205; Ground Floor, Susheel Apartments, Behind Olive Hospital, Mehdipatnam, Hyderabad - 500028
              </div>
              <div style="font-size:12px; color:#475569; margin-bottom:14px; line-height:1.8;">
                <span style="white-space:nowrap;"><span style="font-size:16px; line-height:1; vertical-align:-2px;">&#128222;</span> <a href="tel:918142642051" style="color:#475569; text-decoration:none;">+91 81426 42051</a></span>
                &nbsp;|&nbsp;
                <span style="white-space:nowrap;"><span style="font-size:18px; line-height:1; vertical-align:-2px;">&#x2709;&#xFE0F;</span> <a href="mailto:info@holisticedge.in" style="color:#475569; text-decoration:none;">info@holisticedge.in</a></span>
                &nbsp;|&nbsp;
                <span style="white-space:nowrap;"><span style="font-size:18px; line-height:1; vertical-align:-2px;">&#x1F310;</span> <a href="https://www.holisticedge.in" target="_blank" rel="noopener noreferrer" style="color:#475569; text-decoration:none;">www.holisticedge.in</a></span>
              </div>
              <div style="border-top:1px solid #E2E8F0; padding-top:12px; font-size:11px; color:#94A3B8; line-height:1.5;">
                This is an automated operational message from Holistic Edge Clinic.<br />
                <div style="margin-top:10px; font-size:11px; color:#64748B;">
                  Website crafted by <a href="https://www.arklintech.com/" target="_blank" rel="noopener noreferrer" style="color:#0F2747 !important; text-decoration:none; font-weight:700; letter-spacing:3.5px; text-transform:uppercase; font-family:'Syncopate',sans-serif;">ARKLINTECH</a>
                </div>
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

export async function sendAppointmentConfirmationEmail(appointment, patient) {
  const idempotencyKey = `email_appt_${appointment.id}_${Date.now()}`;
  const subject = `Appointment Confirmed - ${patient.registrationTokenNumber} | Holistic Edge`;

  const bodyHtml = `
    <p style="margin:0 0 12px 0; font-size:15px; font-weight:700; color:#0F2747;">Dear ${patient.name},</p>
    <p style="margin:0 0 20px 0; font-size:14px; color:#334155; line-height:1.6;">
      Your appointment at Holistic Edge Chiropractic & Wellness Clinic has been <strong>successfully confirmed</strong>. Our medical team looks forward to welcoming you.
    </p>

    <!-- DETAILS BOX -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="detail-box" style="background-color:#F8FAFC; border:1px solid #E2E8F0; border-left:4px solid #0F2747; border-radius:8px; margin-bottom:24px;">
      <tr>
        <td style="padding:18px; background-color:#F8FAFC;">
          <p style="margin:0 0 8px 0; font-size:13px;"><strong style="color:#64748B;">Patient Name:</strong> <span style="color:#0F2747; font-weight:600;">${patient.name}</span></p>
          <p style="margin:0 0 8px 0; font-size:13px;"><strong style="color:#64748B;">Token / Reg. No.:</strong> <span style="color:#0F2747; font-weight:700; font-family:monospace;">${patient.registrationTokenNumber}</span></p>
          <p style="margin:0 0 8px 0; font-size:13px;"><strong style="color:#64748B;">Service:</strong> <span style="color:#0F2747; font-weight:600;">${appointment.service}</span></p>
          <p style="margin:0 0 8px 0; font-size:13px;"><strong style="color:#64748B;">Date & Time:</strong> <span style="color:#0F2747; font-weight:600;">${appointment.date} at ${appointment.time}</span></p>
          <p style="margin:0; font-size:13px;"><strong style="color:#64748B;">Status:</strong> <span style="color:#166534; font-weight:700; background-color:#DCFCE7; padding:2px 8px; border-radius:4px;">CONFIRMED</span></p>
        </td>
      </tr>
    </table>

    <!-- CONTACT STRIP -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #E2E8F0; padding-top:20px;">
      <tr>
        <td align="center" style="padding-bottom:14px; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:#64748B;">Need to reach us?</td>
      </tr>
      <tr>
        <td>
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <!-- Call the Clinic CTA (Full Width) -->
            <tr>
              <td width="100%" style="padding:12px; background-color:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; vertical-align:middle;">
                <a href="tel:918142642051" style="text-decoration:none; color:inherit; display:block; width:100%;">
                  <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
                    <tr>
                      <td align="center" valign="middle" style="width:32px; height:32px; background-color:#EEF2FF; border-radius:50%; font-size:15px; line-height:32px;">&#128222;</td>
                      <td style="padding-left:10px; text-align:left;" valign="middle">
                        <div style="font-size:12px; font-weight:700; color:#0F2747; line-height:1.3;">Call the Clinic</div>
                        <div style="font-size:12px; color:#475569; line-height:1.3;">+91 81426 42051</div>
                      </td>
                    </tr>
                  </table>
                </a>
              </td>
            </tr>
            <!-- Spacer Row -->
            <tr>
              <td height="10" style="height:10px; font-size:1px; line-height:10px; mso-line-height-rule:exactly;">&nbsp;</td>
            </tr>
            <!-- WhatsApp Us CTA (Full Width) -->
            <tr>
              <td width="100%" style="padding:12px; background-color:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; vertical-align:middle;">
                <a href="https://wa.me/918142642051" style="text-decoration:none; color:inherit; display:block; width:100%;">
                  <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
                    <tr>
                      <td align="center" valign="middle" style="width:32px; height:32px; background-color:#DCFCE7; border-radius:50%; font-size:15px; line-height:32px;">&#128172;</td>
                      <td style="padding-left:10px; text-align:left;" valign="middle">
                        <div style="font-size:12px; font-weight:700; color:#0F2747; line-height:1.3;">WhatsApp Us</div>
                        <div style="font-size:12px; color:#475569; line-height:1.3;">+91 81426 42051</div>
                      </td>
                    </tr>
                  </table>
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const html = buildCleanEmailLayout({ title: 'Your Appointment is Confirmed', bodyHtml });
  const text = `Dear ${patient.name}, your appointment (${appointment.service}) on ${appointment.date} at ${appointment.time} is confirmed. Token: ${patient.registrationTokenNumber}. Location: Ground Floor, Susheel Apartments, Behind Olive Hospital, Mehdipatnam, Hyderabad - 500028. For assistance: Call +91 81426 42051 | WhatsApp +91 81426 42051.`;

  const targetRecipient = (appointment.patientEmail || appointment.email || patient?.email || '').trim();
  if (!targetRecipient || targetRecipient === 'patient@example.com' || !targetRecipient.includes('@')) {
    console.warn(`[emailService] Skipping confirmation email for appointment ${appointment.id}: No valid recipient email provided.`);
    return { success: false, error: 'No valid recipient email provided', logId: null };
  }
  const logId = `elog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const logRecord = {
    id: logId, idempotencyKey,
    appointmentId: appointment.id, patientId: patient.id,
    recipient: targetRecipient,
    template: 'APPOINTMENT_CONFIRMATION',
    subject, status: 'QUEUED',
    queuedAt: new Date().toISOString(),
  };
  db.insert('emailLogs', logRecord);

  try {
    const result = await emailProvider.sendEmail({
      to: targetRecipient,
      subject, html, text, idempotencyKey,
      attachments: getLogoCidAttachment(),
      metadata: { appointmentId: appointment.id, registrationTokenNumber: patient.registrationTokenNumber },
    });
    db.update('emailLogs', logId, { status: 'SENT', sentAt: new Date().toISOString(), providerMessageId: result.providerMessageId });
    db.update('appointments', appointment.id, { emailStatus: 'SENT' });
    return { success: true, logId, providerMessageId: result.providerMessageId };
  } catch (err) {
    db.update('emailLogs', logId, { status: 'FAILED', failedAt: new Date().toISOString(), failureReason: err.message });
    db.update('appointments', appointment.id, { emailStatus: 'FAILED' });
    db.insert('notifications', {
      id: `notif_${Date.now()}`,
      title: 'Email Delivery Failed',
      message: `Failed to send confirmation to ${patient.name} (${patient.registrationTokenNumber}). Error: ${err.message}`,
      type: 'email', status: 'unread', createdAt: new Date().toISOString(),
    });
    return { success: false, error: err.message, logId };
  }
}

export async function sendFollowUpReminderEmail(reminder, patient, bookingUrl) {
  const idempotencyKey = `email_reminder_${reminder.id}_${Date.now()}`;
  const subject = `Follow-up Health Reminder - ${patient.registrationTokenNumber} | Holistic Edge`;

  const bodyHtml = `
    <p style="margin:0 0 12px 0; font-size:15px; font-weight:700; color:#0F2747;">Dear ${patient.name},</p>
    <p style="margin:0 0 22px 0; font-size:14px; color:#334155; line-height:1.6;">
      It is time for your follow-up wellness consultation under the guidance of Healer Abdul Mallik at Holistic Edge Wellness Centre.
    </p>

    <!-- REMINDER DETAILS -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="detail-box" style="background-color:#F8FAFC; border:1px solid #E2E8F0; border-left:4px solid #2D6A4F; border-radius:8px; margin-bottom:24px;">
      <tr>
        <td style="padding:16px 18px; background-color:#F8FAFC;">
          <p style="margin:4px 0; font-size:13px;"><strong style="color:#64748B;">Token / Reg. No.:</strong> <span style="color:#0F2747; font-weight:700; font-family:monospace;">${patient.registrationTokenNumber}</span></p>
          <p style="margin:4px 0; font-size:13px; color:#334155;"><strong>Note:</strong> ${reminder.notes || 'Routine follow-up assessment'}</p>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <table border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background-color:#0F2747; border-radius:8px;">
                <a href="${bookingUrl}" class="cta-btn"
                  style="display:inline-block; font-family:-apple-system,sans-serif; font-size:14px; font-weight:700; color:#FFFFFF; text-decoration:none; padding:13px 32px; border-radius:8px; background-color:#0F2747; letter-spacing:0.3px;">
                  BOOK FOLLOW-UP APPOINTMENT &rarr;
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0; font-size:13px; color:#64748B; text-align:center;">
      Or call us directly at <strong>+91 81426 42051</strong>.
    </p>
  `;

  const html = buildCleanEmailLayout({ title: 'Health Follow-up Reminder', bodyHtml });
  const text = `Dear ${patient.name}, it is time for your follow-up assessment. Token: ${patient.registrationTokenNumber}. Book online: ${bookingUrl}`;

  const targetRecipient = (reminder.patientEmail || reminder.email || patient?.email || '').trim();
  if (!targetRecipient || targetRecipient === 'patient@example.com' || !targetRecipient.includes('@')) {
    console.warn(`[emailService] Skipping follow-up reminder email for reminder ${reminder.id}: No valid recipient email provided.`);
    return { success: false, error: 'No valid recipient email provided', logId: null };
  }
  const logId = `elog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  db.insert('emailLogs', {
    id: logId, idempotencyKey, reminderId: reminder.id, patientId: patient.id,
    recipient: targetRecipient,
    template: 'FOLLOW_UP_REMINDER',
    subject, status: 'QUEUED', queuedAt: new Date().toISOString(),
  });

  try {
    const result = await emailProvider.sendEmail({
      to: targetRecipient,
      subject, html, text, idempotencyKey,
      attachments: getLogoCidAttachment(),
      metadata: { reminderId: reminder.id, patientId: patient.id },
    });
    db.update('emailLogs', logId, { status: 'SENT', sentAt: new Date().toISOString(), providerMessageId: result.providerMessageId });
    return { success: true, logId };
  } catch (err) {
    db.update('emailLogs', logId, { status: 'FAILED', failedAt: new Date().toISOString(), failureReason: err.message });
    throw err;
  }
}
export { sendAppointmentConfirmationEmail as sendAppointmentConfirmation };
