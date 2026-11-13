export function activityIcon(msg = '', styles) {
  const message = msg.toLowerCase();
  if (message.includes('marked late')) return [styles.actOrange, 'fa-clock'];
  if (message.includes('marked absent')) return [styles.actRed, 'fa-circle-xmark'];
  if (message.includes('marked present')) return [styles.actGreen, 'fa-user-check'];
  if (message.includes('teacher account')) return [styles.actBlue, 'fa-user-plus'];
  if (message.includes('class')) return [styles.actBlue, 'fa-calendar'];
  return [styles.actBlue, 'fa-circle-info'];
}
