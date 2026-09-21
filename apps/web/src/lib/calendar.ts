/**
 * @hostelhub/web — lib/calendar.ts
 *
 * Generates valid iCalendar (.ics) format files for student move-in dates.
 */

export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startDate: Date; // e.g. 2026-09-25T10:00:00
  endDate: Date; // e.g. 2026-09-25T17:00:00
  organizerName?: string;
  organizerEmail?: string;
}

function formatIcsDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export function generateIcsContent(event: CalendarEvent): string {
  const dtStamp = formatIcsDate(new Date());
  const dtStart = formatIcsDate(event.startDate);
  const dtEnd = formatIcsDate(event.endDate);
  const uid = `hostelhub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@campus.edu`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HostelHub//Student Move-in Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`,
    `LOCATION:${event.location}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder: Hostel Move-In Tomorrow",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function triggerIcsDownload(event: CalendarEvent, filename = "hostel-move-in.ics"): void {
  const icsContent = generateIcsContent(event);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
