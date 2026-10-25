require('dotenv').config();

async function sendMail({ to, subject, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Attendance System', email: process.env.MAIL_FROM },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Brevo ${res.status}: ${await res.text().catch(() => '')}`);
  }
}

function formatTimeString12hr(timeStr) {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${ampm}`;
}

async function sendAttendanceNotification({
  parentEmail,
  studentFirstName,
  studentLastName,
  subjectName,
  status,
  timeIn,
  sessionDate,
}) {
  if (!parentEmail) {
    console.error('sendAttendanceNotification: no parentEmail provided, skipping.');
    return;
  }
  if (!process.env.BREVO_API_KEY || !process.env.MAIL_FROM) {
    console.error('sendAttendanceNotification: BREVO_API_KEY / MAIL_FROM not set, skipping.');
    return;
  }

  const statusColor = status === 'Late' ? '#ea580c' : '#16a34a';
  const timeFormatted = formatTimeString12hr(timeIn);

  try {
    await sendMail({
      to: parentEmail,
      subject: `Attendance Update: ${studentFirstName} ${studentLastName} - ${subjectName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Attendance Notification</h2>
          <p>This is to inform you that <strong>${studentFirstName} ${studentLastName}</strong> was marked as:</p>
          <p style="font-size: 1.2rem; font-weight: bold; color: ${statusColor};">${status}</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">Subject</td>
              <td style="padding: 6px 0; font-weight: 600;">${subjectName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">Date</td>
              <td style="padding: 6px 0; font-weight: 600;">${sessionDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">Time in</td>
              <td style="padding: 6px 0; font-weight: 600;">${timeFormatted}</td>
            </tr>
          </table>
          <p style="margin-top: 20px; font-size: 0.85rem; color: #6b7280;">
            This is an automated message from the school attendance system.
          </p>
        </div>
      `,
    });
    console.log(`Attendance email sent to ${parentEmail} for ${studentFirstName} ${studentLastName}`);
  } catch (err) {
    console.error('Failed to send attendance email:', err.message);
  }
}

async function sendClassEndedNotification({
  parentEmail,
  studentFirstName,
  studentLastName,
  subjectName,
  status,
  timeIn,
  sessionDate,
}) {
  if (!parentEmail) {
    console.error('sendClassEndedNotification: no parentEmail provided, skipping.');
    return;
  }
  if (!process.env.BREVO_API_KEY || !process.env.MAIL_FROM) {
    console.error('sendClassEndedNotification: BREVO_API_KEY / MAIL_FROM not set, skipping.');
    return;
  }

  const statusColor = status === 'Absent' ? '#dc2626' : status === 'Late' ? '#ea580c' : '#16a34a';
  const timeFormatted = timeIn ? formatTimeString12hr(timeIn) : '—';

  try {
    await sendMail({
      to: parentEmail,
      subject: `Class Ended: ${studentFirstName} ${studentLastName} - ${subjectName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #2563eb;">This Class Has Ended</h2>
          <p><strong>${subjectName}</strong> has ended for the day. Here is your child's final attendance status:</p>
          <p style="font-size: 1.2rem; font-weight: bold; color: ${statusColor};">${status}</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            <tr><td style="padding: 6px 0; color: #6b7280;">Subject</td><td style="padding: 6px 0; font-weight: 600;">${subjectName}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Date</td><td style="padding: 6px 0; font-weight: 600;">${sessionDate}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Time in</td><td style="padding: 6px 0; font-weight: 600;">${timeFormatted}</td></tr>
          </table>
          <p style="margin-top: 20px; font-size: 0.85rem; color: #6b7280;">This is an automated message from the school attendance system.</p>
        </div>
      `,
    });
    console.log(`Class-ended email sent to ${parentEmail} for ${studentFirstName} ${studentLastName}`);
  } catch (err) {
    console.error('Failed to send class-ended email:', err.message);
  }
}

module.exports = { sendAttendanceNotification, sendClassEndedNotification };