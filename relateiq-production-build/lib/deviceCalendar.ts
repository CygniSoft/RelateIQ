import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Calendar from "expo-calendar";
import { Platform } from "react-native";

export const CALENDAR_EXPORT_STORAGE_KEY = "@connectiq/calendarExportMap";

export interface CalendarFollowUp {
  contactId: string;
  name: string;
  action: string;
  date: string;
  notes?: string;
}

interface ExportRecord {
  eventId: string;
  calendarId: string;
  fingerprint: string;
}

type ExportMap = Record<string, ExportRecord>;

export type CalendarExportResult =
  | {
      status: "success";
      created: number;
      updated: number;
      skipped: number;
      failed: number;
    }
  | {
      status: "unsupported" | "permission-denied" | "no-calendar";
    };

function eventTimes(dateValue: string): { startDate: Date; endDate: Date } | null {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return null;

  const startDate = new Date(parsed);
  startDate.setHours(9, 0, 0, 0);
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
  return { startDate, endDate };
}

function eventDetails(
  followUp: CalendarFollowUp,
  times: { startDate: Date; endDate: Date },
): Omit<Partial<Calendar.Event>, "id"> {
  const notes = [
    `Action: ${followUp.action}`,
    followUp.notes?.trim() ? `Notes: ${followUp.notes.trim()}` : null,
    "Added by RelateIQ+",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    title: `Follow up: ${followUp.name}`,
    startDate: times.startDate,
    endDate: times.endDate,
    allDay: false,
    notes,
    alarms: [{ relativeOffset: 0 }],
  };
}

function fingerprint(
  followUp: CalendarFollowUp,
  times: { startDate: Date; endDate: Date },
): string {
  return JSON.stringify({
    name: followUp.name,
    action: followUp.action,
    notes: followUp.notes?.trim() ?? "",
    startDate: times.startDate.toISOString(),
    endDate: times.endDate.toISOString(),
  });
}

async function loadExportMap(): Promise<ExportMap> {
  const raw = await AsyncStorage.getItem(CALENDAR_EXPORT_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as ExportMap) : {};
  } catch {
    return {};
  }
}

async function saveExportMap(map: ExportMap): Promise<void> {
  await AsyncStorage.setItem(CALENDAR_EXPORT_STORAGE_KEY, JSON.stringify(map));
}

async function chooseWritableCalendar(): Promise<Calendar.Calendar | null> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.filter(
    (calendar) =>
      calendar.allowsModifications &&
      calendar.isVisible !== false &&
      calendar.isSynced !== false,
  );
  if (writable.length === 0) return null;

  if (Platform.OS === "ios") {
    try {
      const defaultCalendar = await Calendar.getDefaultCalendarAsync();
      const writableDefault = writable.find(
        (calendar) => calendar.id === defaultCalendar.id,
      );
      if (writableDefault) return writableDefault;
    } catch {
      // Fall through to another writable calendar.
    }
  }

  return writable.find((calendar) => calendar.isPrimary) ?? writable[0] ?? null;
}

export async function exportFollowUpsToDeviceCalendar(
  followUps: CalendarFollowUp[],
): Promise<CalendarExportResult> {
  if (Platform.OS === "web" || !(await Calendar.isAvailableAsync())) {
    return { status: "unsupported" };
  }

  let permission = await Calendar.getCalendarPermissionsAsync();
  if (permission.status !== "granted" && permission.canAskAgain) {
    permission = await Calendar.requestCalendarPermissionsAsync();
  }
  if (permission.status !== "granted") {
    return { status: "permission-denied" };
  }

  const destination = await chooseWritableCalendar();
  if (!destination) {
    return { status: "no-calendar" };
  }

  const exportMap = await loadExportMap();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const followUp of followUps) {
    const times = eventTimes(followUp.date);
    if (!times) {
      failed += 1;
      continue;
    }

    const details = eventDetails(followUp, times);
    const nextFingerprint = fingerprint(followUp, times);
    const previous = exportMap[followUp.contactId];

    if (previous?.fingerprint === nextFingerprint) {
      try {
        await Calendar.getEventAsync(previous.eventId);
        skipped += 1;
        continue;
      } catch {
        // The user deleted the event; create it again below.
      }
    }

    if (previous) {
      try {
        await Calendar.updateEventAsync(previous.eventId, details);
        exportMap[followUp.contactId] = {
          ...previous,
          fingerprint: nextFingerprint,
        };
        await saveExportMap(exportMap);
        updated += 1;
        continue;
      } catch {
        // The old event/calendar is unavailable; create a replacement below.
      }
    }

    try {
      const eventId = await Calendar.createEventAsync(destination.id, details);
      exportMap[followUp.contactId] = {
        eventId,
        calendarId: destination.id,
        fingerprint: nextFingerprint,
      };
      await saveExportMap(exportMap);
      created += 1;
    } catch {
      failed += 1;
    }
  }

  return { status: "success", created, updated, skipped, failed };
}