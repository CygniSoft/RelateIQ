import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Calendar from "expo-calendar";
import { Platform } from "react-native";

export const CALENDAR_EXPORT_STORAGE_KEY = "@connectiq/calendarExportMap";
export const MEETING_CALENDAR_STORAGE_KEY = "@connectiq/meetingCalendarMap";

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

export type MeetingCalendarResult =
  | { status: "success"; eventId: string }
  | { status: "unsupported" | "permission-denied" | "no-calendar" | "failed" };

type MeetingCalendarMap = Record<string, string>;
const meetingFlights = new Map<string, Promise<MeetingCalendarResult>>();
const MEETING_UID_MARKER_PREFIX = "[RelateIQ+ Meeting UID: ";

function meetingUidMarker(uid: string): string {
  return `${MEETING_UID_MARKER_PREFIX}${uid}]`;
}

function meetingNotes(notes: string | undefined, uid: string): string {
  const userNotes = notes?.trim();
  return [userNotes, meetingUidMarker(uid)].filter(Boolean).join("\n\n");
}

async function loadMeetingCalendarMap(): Promise<MeetingCalendarMap> {
  try {
    const raw = await AsyncStorage.getItem(MEETING_CALENDAR_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === "object" ? (parsed as MeetingCalendarMap) : {};
  } catch {
    return {};
  }
}

async function saveMeetingCalendarMap(map: MeetingCalendarMap): Promise<void> {
  await AsyncStorage.setItem(MEETING_CALENDAR_STORAGE_KEY, JSON.stringify(map));
}

async function findMeetingEventByMarker(
  uid: string,
  startDate: Date,
  endDate: Date,
): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const readableCalendarIds = calendars
    .filter((calendar) => calendar.isVisible !== false && calendar.isSynced !== false)
    .map((calendar) => calendar.id);
  if (readableCalendarIds.length === 0) return null;

  // The short buffer accounts for calendar providers that normalize event times.
  const events = await Calendar.getEventsAsync(
    readableCalendarIds,
    new Date(startDate.getTime() - 5 * 60 * 1000),
    new Date(endDate.getTime() + 5 * 60 * 1000),
  );
  const marker = meetingUidMarker(uid);
  return events.find((event) => event.notes?.includes(marker))?.id ?? null;
}

async function createMeetingEventForUid(
  params: {
    uid: string;
    title: string;
    startDate: string;
    endDate: string;
    location?: string;
    notes?: string;
    alarmMinutes?: number;
  },
  previousEventId?: string
): Promise<MeetingCalendarResult> {
  try {
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

    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return { status: "failed" };
    }

    const details: Partial<Calendar.Event> = {
      title: params.title,
      startDate,
      endDate,
      location: params.location,
      // Keep the user's text intact while adding a durable recovery marker.
      notes: meetingNotes(params.notes, params.uid),
      allDay: false,
      alarms: typeof params.alarmMinutes === "number" ? [{ relativeOffset: -params.alarmMinutes }] : undefined,
    };

    const meetingMap = await loadMeetingCalendarMap();
    let knownEventId = previousEventId || meetingMap[params.uid];
    if (knownEventId) {
      try {
        await Calendar.updateEventAsync(knownEventId, details);
        meetingMap[params.uid] = knownEventId;
        await saveMeetingCalendarMap(meetingMap);
        return { status: "success", eventId: knownEventId };
      } catch {
        // It may have been deleted, or its provider may no longer be available.
      }
    }

    // If the process stopped after createEventAsync but before AsyncStorage saved,
    // reuse the marked OS event instead of creating a duplicate.
    const recoveredEventId = await findMeetingEventByMarker(params.uid, startDate, endDate);
    if (recoveredEventId) {
      await Calendar.updateEventAsync(recoveredEventId, details);
      meetingMap[params.uid] = recoveredEventId;
      await saveMeetingCalendarMap(meetingMap);
      return { status: "success", eventId: recoveredEventId };
    }

    const destination = await chooseWritableCalendar();
    if (!destination) {
      return { status: "no-calendar" };
    }

    const eventId = await Calendar.createEventAsync(destination.id, details);
    meetingMap[params.uid] = eventId;
    await saveMeetingCalendarMap(meetingMap);
    return { status: "success", eventId };
  } catch {
    // Expo Calendar (and persistence) failures must not escape into the UI.
    return { status: "failed" };
  }
}

export function createMeetingEvent(
  params: {
    uid: string;
    title: string;
    startDate: string;
    endDate: string;
    location?: string;
    notes?: string;
    alarmMinutes?: number;
  },
  previousEventId?: string,
): Promise<MeetingCalendarResult> {
  const existingFlight = meetingFlights.get(params.uid);
  if (existingFlight) return existingFlight;

  const flight = createMeetingEventForUid(params, previousEventId);
  meetingFlights.set(params.uid, flight);
  void flight.finally(() => {
    if (meetingFlights.get(params.uid) === flight) {
      meetingFlights.delete(params.uid);
    }
  });
  return flight;
}

export async function openCalendarEvent(eventId: string): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    await Calendar.openEventInCalendarAsync({ id: eventId });
    return true;
  } catch {
    return false;
  }
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