import { format, addDays, parseISO } from 'date-fns';

/**
 * Google Calendar all-day events use date-only format YYYYMMDD (end date is EXCLUSIVE).
 * The previous implementation used a full timestamp with identical start/end,
 * which Google rejected or created a zero-length event.
 */
export const addToGoogleCalendar = (name: string, expiryDate: string) => {
  const date = parseISO(expiryDate);
  const reminderDate = addDays(date, -7); // 1 week before

  const start = format(reminderDate, 'yyyyMMdd');
  const end = format(addDays(reminderDate, 1), 'yyyyMMdd'); // exclusive end = 1-day event

  const title = encodeURIComponent(`Expiry Reminder: ${name}`);
  const details = encodeURIComponent(`Your ${name} will expire on ${expiryDate}. This is a 1-week reminder.`);

  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&sf=true`;

  window.open(url, '_blank');
};

export const downloadIcsFile = (name: string, expiryDate: string) => {
  const date = parseISO(expiryDate);
  const reminderDate = addDays(date, -7);

  // ICS all-day events: VALUE=DATE with exclusive end
  const startDate = format(reminderDate, 'yyyyMMdd');
  const endDate = format(addDays(reminderDate, 1), 'yyyyMMdd');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FamilyStockChecker//EN',
    'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${startDate}`,
    `DTEND;VALUE=DATE:${endDate}`,
    `SUMMARY:Expiry Reminder: ${name}`,
    `DESCRIPTION:Your ${name} will expire on ${expiryDate}. This is a 1-week reminder.`,
    'BEGIN:VALARM',
    'TRIGGER:-PT0M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Expiry Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `${name}_expiry.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(link.href);
};

/**
 * Cross-platform reminder: opens Google Calendar on Android/desktop,
 * downloads an .ics file on iOS (Safari handles the import natively).
 */
export const setReminderForItem = (name: string, expiryDate: string) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) {
    downloadIcsFile(name, expiryDate);
  } else {
    addToGoogleCalendar(name, expiryDate);
  }
};
