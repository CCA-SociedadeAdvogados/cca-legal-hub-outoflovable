import { format } from 'date-fns';

/** Evento mínimo para exportação de calendário (feed ICS do blueprint F5). */
export interface IcsEvent {
  id: string;
  date: Date;
  title: string;
  description?: string;
}

export function generateICS(events: IcsEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CCA Legal Hub//Prazos//PT',
    'CALSCALE:GREGORIAN',
  ];

  events.forEach((event) => {
    const dateStr = format(event.date, "yyyyMMdd'T'000000");
    lines.push('BEGIN:VEVENT');
    lines.push(`DTSTART:${dateStr}`);
    lines.push(`DTEND:${dateStr}`);
    lines.push(`SUMMARY:${event.title}`);
    if (event.description) lines.push(`DESCRIPTION:${event.description}`);
    lines.push(`UID:${event.id}@ccalegalhub`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS(events: IcsEvent[], filenamePrefix = 'prazos') {
  const ics = generateICS(events);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenamePrefix}_${format(new Date(), 'yyyy-MM-dd')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
