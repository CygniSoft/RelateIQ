import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  DEFAULT_NOTIFICATION_PREFS,
  configureNotifications,
  syncScheduledNotifications,
  type NotificationPrefs,
} from "@/lib/notifications";
import {
  CALENDAR_EXPORT_STORAGE_KEY,
  MEETING_CALENDAR_STORAGE_KEY,
} from "@/lib/deviceCalendar";

export type ContactCategory =
  | "Potential client"
  | "Partner"
  | "Supplier"
  | "Investor"
  | "Candidate"
  | "Referral source"
  | "Friend"
  | "Vendor"
  | "Media"
  | "Other";

export type FollowUpAction =
  | "Send intro email"
  | "Schedule meeting"
  | "Send proposal"
  | "Send company profile"
  | "Make introduction"
  | "Call later"
  | "Add to newsletter"
  | "No follow-up needed";

export type Priority = "High" | "Medium" | "Low";

export interface TimelineEvent {
  id: string;
  type:
    | "scanned"
    | "email_sent"
    | "follow_up"
    | "meeting"
    | "proposal"
    | "note"
    | "deal";
  title: string;
  description?: string;
  date: string;
  meetingMetadata?: MeetingMetadata;
}

export interface MeetingMetadata {
    uid: string;
    title: string;
    startDate: string;
    endDate: string;
    location?: string;
    notes?: string;
    calendarEventId?: string;
    calendarStatus:
      | "pending"
      | "success"
      | "unsupported"
      | "permission-denied"
      | "no-calendar"
      | "failed";
    inviteStatus:
      | "pending"
      | "unknown"
      | "success"
      | "failed"
      | "not-sent";
    inviteError?: string;
    reminderMinutes: number;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  jobTitle: string;
  email: string;
  phone: string;
  website?: string;
  linkedin?: string;
  cardImageUri?: string;
  eventId?: string;
  eventName?: string;
  meetingNotes?: string;
  aiSummary?: string;
  introEmailDraft?: string;
  followUpAction: FollowUpAction;
  followUpDate?: string;
  category: ContactCategory;
  priority: Priority;
  relationshipScore: number;
  tags: string[];
  timeline: TimelineEvent[];
  dateAdded: string;
  dealValue?: number;
  emailSent?: boolean;
  replyReceived?: boolean;
  meetingBooked?: boolean;
}

export interface Event {
  id: string;
  name: string;
  location: string;
  date: string;
  type: string;
  cost: number;
  notes?: string;
  contactIds: string[];
  meetingsBooked: number;
  proposalsSent: number;
  dealsWon: number;
  revenueGenerated: number;
}

export interface UserProfile {
  name: string;
  company: string;
  jobTitle: string;
  email: string;
  phone: string;
  linkedin?: string;
  website?: string;
  calendarInviteUrl?: string;
  defaultSignature: string;
  defaultIntroMessage: string;
}

interface AppContextType {
  contacts: Contact[];
  events: Event[];
  profile: UserProfile;
  addContact: (contact: Omit<Contact, "id" | "dateAdded" | "timeline">) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  addEvent: (event: Omit<Event, "id">) => void;
  updateEvent: (id: string, updates: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  addTimelineEvent: (contactId: string, event: Omit<TimelineEvent, "id">) => string;
  updateTimelineEvent: (contactId: string, eventId: string, updates: Partial<TimelineEvent>) => void;
  updateMeetingMetadata: (
    contactId: string,
    eventId: string,
    updates: Partial<MeetingMetadata>,
  ) => void;
  signOut: () => Promise<void>;
  clearAllData: () => Promise<void>;
  isLoaded: boolean;
  freeScansUsed: number;
  consumeFreeScan: () => void;
  notificationPrefs: NotificationPrefs;
  updateNotificationPrefs: (updates: Partial<NotificationPrefs>) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const DATA_VERSION = "2";

// Non-subscribers can complete this many full scans (extraction + AI email +
// save) before the paywall becomes mandatory. Tracked locally, consistent with
// the app's local-first model.
export const FREE_SCAN_LIMIT = 3;

const STORAGE_KEYS = {
  CONTACTS: "@connectiq/contacts",
  EVENTS: "@connectiq/events",
  PROFILE: "@connectiq/profile",
  VERSION: "@connectiq/dataVersion",
  FREE_SCANS: "@connectiq/freeScansUsed",
  NOTIF_PREFS: "@connectiq/notificationPrefs",
};

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  company: "",
  jobTitle: "",
  email: "",
  phone: "",
  linkedin: "",
  website: "",
  calendarInviteUrl: "",
  defaultSignature: "",
  defaultIntroMessage:
    "It was great meeting you! I'd love to explore how we can work together.",
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [freeScansUsed, setFreeScansUsed] = useState(0);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(
    DEFAULT_NOTIFICATION_PREFS,
  );

  useEffect(() => {
    (async () => {
      try {
        const version = await AsyncStorage.getItem(STORAGE_KEYS.VERSION);
        if (version !== DATA_VERSION) {
          // One-time wipe of legacy sample/demo data.
          await AsyncStorage.multiRemove([
            STORAGE_KEYS.CONTACTS,
            STORAGE_KEYS.EVENTS,
            STORAGE_KEYS.PROFILE,
          ]);
          await AsyncStorage.setItem(STORAGE_KEYS.VERSION, DATA_VERSION);
          setContacts([]);
          setEvents([]);
          setProfile(DEFAULT_PROFILE);
          return;
        }
        const [c, e, p, fs, np] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.CONTACTS),
          AsyncStorage.getItem(STORAGE_KEYS.EVENTS),
          AsyncStorage.getItem(STORAGE_KEYS.PROFILE),
          AsyncStorage.getItem(STORAGE_KEYS.FREE_SCANS),
          AsyncStorage.getItem(STORAGE_KEYS.NOTIF_PREFS),
        ]);
        setContacts(c ? JSON.parse(c) : []);
        setEvents(e ? JSON.parse(e) : []);
        setProfile(p ? JSON.parse(p) : DEFAULT_PROFILE);
        setFreeScansUsed(fs ? Number(fs) || 0 : 0);
        setNotificationPrefs(
          np
            ? { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(np) }
            : DEFAULT_NOTIFICATION_PREFS,
        );
      } catch {
        setContacts([]);
        setEvents([]);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // Configure the OS notification handler once on mount.
  useEffect(() => {
    configureNotifications();
  }, []);

  // Keep OS-scheduled notifications in sync with prefs and contacts. Runs after
  // data has loaded and whenever contacts or prefs change (meeting reminders read
  // from contact.timeline, so events aren't a dependency). No-op on web; runs are
  // serialized/coalesced inside syncScheduledNotifications.
  useEffect(() => {
    if (!isLoaded) return;
    void syncScheduledNotifications(notificationPrefs, contacts);
  }, [isLoaded, notificationPrefs, contacts]);

  useEffect(() => {
    if (!isLoaded) return;
    void AsyncStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
  }, [contacts, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    void AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  }, [events, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    void AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }, [isLoaded, profile]);

  const addContact = useCallback(
    (contact: Omit<Contact, "id" | "dateAdded" | "timeline">) => {
      setContacts((prev) => {
        const newContact: Contact = {
          ...contact,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          dateAdded: new Date().toISOString(),
          timeline: [
            {
              id: Date.now().toString(),
              type: "scanned",
              title: "Card scanned",
              description: contact.eventName
                ? `Met at ${contact.eventName}`
                : "Contact added",
              date: new Date().toISOString(),
            },
          ],
        };
        return [newContact, ...prev];
      });
    },
    []
  );

  const updateContact = useCallback(
    (id: string, updates: Partial<Contact>) => {
      setContacts((prev) => {
        return prev.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        );
      });
    },
    []
  );

  const deleteContact = useCallback(
    (id: string) => {
      setContacts((prev) => {
        return prev.filter((c) => c.id !== id);
      });
    },
    []
  );

  const addEvent = useCallback(
    (event: Omit<Event, "id">) => {
      setEvents((prev) => {
        const newEvent: Event = {
          ...event,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        };
        return [newEvent, ...prev];
      });
    },
    []
  );

  const updateEvent = useCallback(
    (id: string, updates: Partial<Event>) => {
      setEvents((prev) => {
        return prev.map((e) =>
          e.id === id ? { ...e, ...updates } : e
        );
      });
    },
    []
  );

  const deleteEvent = useCallback(
    (id: string) => {
      setEvents((prev) => {
        return prev.filter((e) => e.id !== id);
      });
    },
    []
  );

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      setProfile((prev) => {
        return { ...prev, ...updates };
      });
    },
    []
  );

  const consumeFreeScan = useCallback(() => {
    setFreeScansUsed((prev) => {
      const next = prev + 1;
      void AsyncStorage.setItem(STORAGE_KEYS.FREE_SCANS, String(next));
      return next;
    });
  }, []);

  const signOut = useCallback(async () => {
    // Signing out ends the Clerk session only. Profile, contacts, and events
    // remain local to this device until the user explicitly clears app data.
  }, []);

  const clearAllData = useCallback(async () => {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.CONTACTS,
      STORAGE_KEYS.EVENTS,
      STORAGE_KEYS.PROFILE,
      STORAGE_KEYS.FREE_SCANS,
      STORAGE_KEYS.NOTIF_PREFS,
      CALENDAR_EXPORT_STORAGE_KEY,
      MEETING_CALENDAR_STORAGE_KEY,
      "@connectiq/onboardingAnchor",
    ]);
    await AsyncStorage.setItem(STORAGE_KEYS.VERSION, DATA_VERSION);
    setContacts([]);
    setEvents([]);
    setProfile(DEFAULT_PROFILE);
    setFreeScansUsed(0);
    setNotificationPrefs(DEFAULT_NOTIFICATION_PREFS);
  }, []);

  const updateNotificationPrefs = useCallback(
    (updates: Partial<NotificationPrefs>) => {
      setNotificationPrefs((prev) => {
        const next = { ...prev, ...updates };
        void AsyncStorage.setItem(
          STORAGE_KEYS.NOTIF_PREFS,
          JSON.stringify(next),
        );
        return next;
      });
    },
    [],
  );

  const addTimelineEvent = useCallback(
    (contactId: string, event: Omit<TimelineEvent, "id">) => {
      const eventId =
        Date.now().toString() + Math.random().toString(36).substring(2, 11);
      setContacts((prev) => {
        return prev.map((c) =>
          c.id === contactId
            ? {
                ...c,
                timeline: [
                  ...c.timeline,
                  {
                    ...event,
                    id: eventId,
                  },
                ],
              }
            : c
        );
      });
      return eventId;
    },
    []
  );

  const updateTimelineEvent = useCallback(
    (contactId: string, eventId: string, updates: Partial<TimelineEvent>) => {
      setContacts((prev) => {
        return prev.map((c) =>
          c.id === contactId
            ? { ...c, timeline: c.timeline.map((item) => item.id === eventId ? { ...item, ...updates } : item) }
            : c,
        );
      });
    },
    [],
  );

  const updateMeetingMetadata = useCallback(
    (
      contactId: string,
      eventId: string,
      updates: Partial<MeetingMetadata>,
    ) => {
      setContacts((prev) =>
        prev.map((contact) =>
          contact.id === contactId
            ? {
                ...contact,
                timeline: contact.timeline.map((event) =>
                  event.id === eventId && event.meetingMetadata
                    ? {
                        ...event,
                        meetingMetadata: {
                          ...event.meetingMetadata,
                          ...updates,
                        },
                      }
                    : event,
                ),
              }
            : contact,
        ),
      );
    },
    [],
  );

  return (
    <AppContext.Provider
      value={{
        contacts,
        events,
        profile,
        addContact,
        updateContact,
        deleteContact,
        addEvent,
        updateEvent,
        deleteEvent,
        updateProfile,
        addTimelineEvent,
        updateTimelineEvent,
        updateMeetingMetadata,
        signOut,
        clearAllData,
        isLoaded,
        freeScansUsed,
        consumeFreeScan,
        notificationPrefs,
        updateNotificationPrefs,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
