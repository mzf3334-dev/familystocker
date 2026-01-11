import { format, addDays, parseISO } from 'date-fns';

export const addToGoogleCalendar = (name: string, expiryDate: string) => {
  const date = parseISO(expiryDate);
  const reminderDate = addDays(date, -7); // 1 week before
  
  const startDate = format(reminderDate, "yyyyMMdd'T'HHmmss'Z'");
  const endDate = format(reminderDate, "yyyyMMdd'T'HHmmss'Z'");
  
  const title = encodeURIComponent(`Expiry Reminder: ${name}`);
  const details = encodeURIComponent(`Your ${name} will expire on ${expiryDate}. This is a 1-week reminder.`);
  
  const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&sf=true&output=xml`;
  
  window.open(url, '_blank');
};

export const downloadIcsFile = (name: string, expiryDate: string) => {
  const date = parseISO(expiryDate);
  const reminderDate = addDays(date, -7);
  
  const startDate = format(reminderDate, "yyyyMMdd'T'HHmmss'Z'");
  const endDate = format(reminderDate, "yyyyMMdd'T'HHmmss'Z'");
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    `SUMMARY:Expiry Reminder: ${name}`,
    `DESCRIPTION:Your ${name} will expire on ${expiryDate}. This is a 1-week reminder.`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\n');
  
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `${name}_expiry.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
