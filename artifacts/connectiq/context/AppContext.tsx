import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

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
  addTimelineEvent: (contactId: string, event: Omit<TimelineEvent, "id">) => void;
  clearAllData: () => Promise<void>;
  isLoaded: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

const DATA_VERSION = "2";

const STORAGE_KEYS = {
  CONTACTS: "@connectiq/contacts",
  EVENTS: "@connectiq/events",
  PROFILE: "@connectiq/profile",
  VERSION: "@connectiq/dataVersion",
};

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  company: "",
  jobTitle: "",
  email: "",
  phone: "",
  linkedin: "",
  website: "",
  defaultSignature: "",
  defaultIntroMessage:
    "It was great meeting you! I'd love to explore how we can work together.",
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoaded, setIsLoaded] = useState(false);

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
        const [c, e, p] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.CONTACTS),
          AsyncStorage.getItem(STORAGE_KEYS.EVENTS),
          AsyncStorage.getItem(STORAGE_KEYS.PROFILE),
        ]);
        setContacts(c ? JSON.parse(c) : []);
        setEvents(e ? JSON.parse(e) : []);
        setProfile(p ? JSON.parse(p) : DEFAULT_PROFILE);
      } catch {
        setContacts([]);
        setEvents([]);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const saveContacts = useCallback(async (updated: Contact[]) => {
    setContacts(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(updated));
  }, []);

  const saveEvents = useCallback(async (updated: Event[]) => {
    setEvents(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(updated));
  }, []);

  const addContact = useCallback(
    (contact: Omit<Contact, "id" | "dateAdded" | "timeline">) => {
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
      const updated = [newContact, ...contacts];
      saveContacts(updated);
    },
    [contacts, saveContacts]
  );

  const updateContact = useCallback(
    (id: string, updates: Partial<Contact>) => {
      const updated = contacts.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      );
      saveContacts(updated);
    },
    [contacts, saveContacts]
  );

  const deleteContact = useCallback(
    (id: string) => {
      saveContacts(contacts.filter((c) => c.id !== id));
    },
    [contacts, saveContacts]
  );

  const addEvent = useCallback(
    (event: Omit<Event, "id">) => {
      const newEvent: Event = {
        ...event,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      };
      const updated = [newEvent, ...events];
      saveEvents(updated);
    },
    [events, saveEvents]
  );

  const updateEvent = useCallback(
    (id: string, updates: Partial<Event>) => {
      const updated = events.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      );
      saveEvents(updated);
    },
    [events, saveEvents]
  );

  const deleteEvent = useCallback(
    (id: string) => {
      saveEvents(events.filter((e) => e.id !== id));
    },
    [events, saveEvents]
  );

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      const updated = { ...profile, ...updates };
      setProfile(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
    },
    [profile]
  );

  const clearAllData = useCallback(async () => {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.CONTACTS,
      STORAGE_KEYS.EVENTS,
      STORAGE_KEYS.PROFILE,
    ]);
    await AsyncStorage.setItem(STORAGE_KEYS.VERSION, DATA_VERSION);
    setContacts([]);
    setEvents([]);
    setProfile(DEFAULT_PROFILE);
  }, []);

  const addTimelineEvent = useCallback(
    (contactId: string, event: Omit<TimelineEvent, "id">) => {
      const updated = contacts.map((c) =>
        c.id === contactId
          ? {
              ...c,
              timeline: [
                ...c.timeline,
                {
                  ...event,
                  id:
                    Date.now().toString() +
                    Math.random().toString(36).substr(2, 9),
                },
              ],
            }
          : c
      );
      saveContacts(updated);
    },
    [contacts, saveContacts]
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
        clearAllData,
        isLoaded,
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
