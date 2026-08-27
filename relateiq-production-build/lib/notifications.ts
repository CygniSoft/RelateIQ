import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

import type { Contact } from "@/context/AppContext";

const ONBOARDING_ANCHOR_KEY = "@connectiq/onboardingAnchor";

export interface NotificationPrefs {
  followUpReminders: boolean;
  emailAlerts: boolean;
  meetingReminders: boolean;
  weeklyDigest: boolean;
  onboardingTips: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  followUpReminders: true,
  emailAlerts: true,
  meetingReminders: true,
  weeklyDigest: false,
  onboardingTips: true,
};

// expo-notifications scheduling is a native (iOS/Android) capability. On web we
// no-op everywhere so preferences still persist and the UI works, but nothing is
// scheduled. Additionally, Expo Go on Android (SDK 53+) removed expo-notifications
// support entirely — even importing the module there raises a console error — so
// we treat it as unsupported and lazy-require the module only where it works.
// Notifications work normally in development/production builds.
const IS_EXPO_GO = Constants.executionEnvironment === "storeClient";
const NOTIFICATIONS_SUPPORTED =
  Platform.OS !== "web" && !(Platform.OS === "android" && IS_EXPO_GO);

type NotificationsModule = typeof import("expo-notifications");
let notificationsModule: NotificationsModule | null = null;

function getNotifications(): NotificationsModule | null {
  if (!NOTIFICATIONS_SUPPORTED) return null;
  if (!notificationsModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require("expo-notifications") as NotificationsModule;
  }
  return notificationsModule;
}

let handlerConfigured = false;

export function configureNotifications() {
  const Notifications = getNotifications();
  if (!Notifications || handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Ask the OS for permission to post notifications. Returns true if granted.
 * Safe to call repeatedly — the OS only prompts once.
 */
export async function ensureNotificationPermissions(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === "granted") return true;
    const { status: next } = await Notifications.requestPermissionsAsync();
    return next === "granted";
  } catch {
    return false;
  }
}

/** Fire an immediate notification (used for "Email Sent Alerts"). */
export async function notifyNow(title: string, body: string): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  const granted = await ensureNotificationPermissions();
  if (!granted) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {
    // Best-effort; never let a notification failure break the flow.
  }
}

function displayName(c: Contact): string {
  const name = `${c.firstName} ${c.lastName}`.trim();
  return name || c.company || "a contact";
}

// Single-flight coalescing: cancel-all-then-reschedule must never overlap, or
// two runs can interleave and leave stale/duplicate schedules. We serialize runs
// through one promise chain and only ever apply the *latest* requested args.
let syncChain: Promise<void> = Promise.resolve();
let pendingArgs: { prefs: NotificationPrefs; contacts: Contact[] } | null = null;

/**
 * Cancel every scheduled notification and re-schedule from scratch based on the
 * current preferences and app data. Safe to call whenever contacts or prefs
 * change — runs are serialized and coalesced to the latest args. Immediate alerts
 * (email sent) are not scheduled and so are unaffected.
 */
export function syncScheduledNotifications(
  prefs: NotificationPrefs,
  contacts: Contact[],
): Promise<void> {
  if (!NOTIFICATIONS_SUPPORTED) return Promise.resolve();
  pendingArgs = { prefs, contacts };
  syncChain = syncChain
    .then(async () => {
      if (!pendingArgs) return; // a later run already superseded this one
      const args = pendingArgs;
      pendingArgs = null;
      await runSync(args.prefs, args.contacts);
    })
    // Never let one failed run poison the chain and block future syncs.
    .catch(() => {});
  return syncChain;
}

async function runSync(
  prefs: NotificationPrefs,
  contacts: Contact[],
): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  const anyEnabled =
    prefs.followUpReminders ||
    prefs.meetingReminders ||
    prefs.weeklyDigest ||
    prefs.onboardingTips;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    return;
  }

  if (!anyEnabled) return;

  const granted = await ensureNotificationPermissions();
  if (!granted) return;

  const now = Date.now();
  const schedule = async (
    title: string,
    body: string,
    date: Date,
  ): Promise<void> => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        },
      });
    } catch {
      // ignore individual scheduling failures
    }
  };

  // 1. Follow-up reminders — fire at each contact's follow-up date.
  if (prefs.followUpReminders) {
    for (const c of contacts) {
      if (!c.followUpDate) continue;
      if (c.followUpAction === "No follow-up needed") continue;
      const when = new Date(c.followUpDate);
      if (isNaN(when.getTime()) || when.getTime() <= now) continue;
      await schedule(
        `Follow up with ${displayName(c)}`,
        c.followUpAction && c.followUpAction !== "Send intro email"
          ? `${c.followUpAction} — ${c.company || "your contact"}`
          : `It's time to reconnect with ${c.company || "your contact"}.`,
        when,
      );
    }
  }

  // 2. Meeting reminders — 1 hour before any future-dated meeting timeline event.
  if (prefs.meetingReminders) {
    for (const c of contacts) {
      for (const t of c.timeline || []) {
        if (t.type !== "meeting" || t.meetingMetadata) continue;
        const start = new Date(t.date);
        if (isNaN(start.getTime())) continue;
        const remindAt = start.getTime() - 60 * 60 * 1000;
        if (remindAt <= now) continue;
        await schedule(
          "Upcoming meeting",
          `Meeting with ${displayName(c)} in 1 hour.`,
          new Date(remindAt),
        );
      }
    }
  }

  // 3. Weekly digest — recurring summary every Monday at 9am.
  if (prefs.weeklyDigest) {
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const newContacts = contacts.filter(
      (c) => new Date(c.dateAdded).getTime() >= weekAgo,
    ).length;
    const dueFollowUps = contacts.filter(
      (c) =>
        c.followUpDate &&
        c.followUpAction !== "No follow-up needed" &&
        !c.emailSent,
    ).length;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Your weekly networking digest",
          body: `${newContacts} new contact${newContacts === 1 ? "" : "s"} this week · ${dueFollowUps} follow-up${dueFollowUps === 1 ? "" : "s"} pending. Keep the momentum going!`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: 2, // 1 = Sunday, 2 = Monday
          hour: 9,
          minute: 0,
        },
      });
    } catch {
      // ignore
    }
  }

  // 4. Onboarding tips — a short sequence over the first few days, anchored to a
  // persisted baseline so repeated syncs reschedule tips to the SAME absolute
  // times (idempotent) rather than pushing them forever into the future.
  if (prefs.onboardingTips) {
    let anchor = now;
    try {
      const stored = await AsyncStorage.getItem(ONBOARDING_ANCHOR_KEY);
      if (stored && !isNaN(Number(stored))) {
        anchor = Number(stored);
      } else {
        await AsyncStorage.setItem(ONBOARDING_ANCHOR_KEY, String(now));
      }
    } catch {
      // fall back to `now` if storage is unavailable
    }
    const tips = [
      "Scan a business card to add your first contact in seconds.",
      "Set a follow-up date so you never miss reconnecting with a lead.",
      "Book meetings from a contact's profile to keep your pipeline moving.",
    ];
    for (let i = 0; i < tips.length; i++) {
      const when = anchor + (i + 1) * 24 * 60 * 60 * 1000;
      if (when <= now) continue; // already elapsed — fire once, don't repeat
      await schedule("RelateIQ+ tip", tips[i], new Date(when));
    }
  } else {
    // Reset the anchor when tips are turned off so re-enabling restarts the run.
    try {
      await AsyncStorage.removeItem(ONBOARDING_ANCHOR_KEY);
    } catch {
      // ignore
    }
  }
}
