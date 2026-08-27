export function parseFutureIsoDate(value: unknown): Date | null {
  if (typeof value !== "string") {
    return null;
  }
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second, zone] = match;
  const calendarDate = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );
  if (
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59 ||
    calendarDate.getUTCFullYear() !== Number(year) ||
    calendarDate.getUTCMonth() !== Number(month) - 1 ||
    calendarDate.getUTCDate() !== Number(day) ||
    (zone !== "Z" &&
      (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4, 6)) > 59))
  ) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.getTime() <= Date.now()
    ? null
    : date;
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

export function escapeIcsParameter(value: string): string {
  return `"${value.replace(/(["\\\r\n])/g, "\\$1")}"`;
}

export function formatIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function foldIcsLine(line: string): string {
  const chunks: string[] = [];
  let chunk = "";
  let bytes = 0;
  for (const character of line) {
    const characterBytes = Buffer.byteLength(character, "utf8");
    if (bytes + characterBytes > 75 && chunk !== "") {
      chunks.push(chunk);
      chunk = ` ${character}`;
      bytes = 1 + characterBytes;
    } else {
      chunk += character;
      bytes += characterBytes;
    }
  }
  chunks.push(chunk);
  return chunks.join("\r\n");
}

export interface MeetingInviteIcsDetails {
  uid: string;
  to: string;
  organizerName: string;
  organizerEmail: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  description?: string;
  reminderMinutes?: number;
}

export function buildMeetingInviteIcs(details: MeetingInviteIcsDetails): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "PRODID:-//ConnectIQ//Meeting Invitation//EN",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${details.uid}@connectiq`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `DTSTART:${formatIcsUtc(details.startDate)}`,
    `DTEND:${formatIcsUtc(details.endDate)}`,
    `SUMMARY:${escapeIcsText(details.title)}`,
    ...(details.description
      ? [`DESCRIPTION:${escapeIcsText(details.description)}`]
      : []),
    ...(details.location ? [`LOCATION:${escapeIcsText(details.location)}`] : []),
    `ORGANIZER;CN=${escapeIcsParameter(details.organizerName)}:mailto:${details.organizerEmail}`,
    `ATTENDEE;RSVP=TRUE:mailto:${details.to}`,
    ...(details.reminderMinutes === undefined
      ? []
      : [
          "BEGIN:VALARM",
          `TRIGGER:-PT${details.reminderMinutes}M`,
          "ACTION:DISPLAY",
          "DESCRIPTION:Meeting reminder",
          "END:VALARM",
        ]),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}