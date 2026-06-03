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

const STORAGE_KEYS = {
  CONTACTS: "@connectiq/contacts",
  EVENTS: "@connectiq/events",
  PROFILE: "@connectiq/profile",
};

const DEFAULT_PROFILE: UserProfile = {
  name: "Alex Morgan",
  company: "Apex Ventures",
  jobTitle: "Business Development Director",
  email: "alex.morgan@apexventures.com",
  phone: "+1 (416) 555-0192",
  linkedin: "linkedin.com/in/alexmorgan",
  website: "apexventures.com",
  defaultSignature:
    "Best regards,\nAlex Morgan\nBusiness Development Director\nApex Ventures",
  defaultIntroMessage:
    "It was great meeting you! I'd love to explore how we can work together.",
};

const SAMPLE_CONTACTS: Contact[] = [
  {
    id: "1",
    firstName: "Raj",
    lastName: "Singh",
    company: "ABC Manufacturing",
    jobTitle: "VP Operations",
    email: "raj.singh@abcmfg.com",
    phone: "+1 (416) 555-0101",
    eventId: "1",
    eventName: "Indo-Canadian Chamber",
    meetingNotes:
      "Exploring staffing support for warehouse and production roles.",
    aiSummary:
      "Met Raj at the Indo-Canadian Chamber event. He's VP Operations exploring staffing support for 200+ warehouse roles. High potential — send manufacturing staffing profile this week.",
    introEmailDraft:
      "Hi Raj,\n\nIt was great meeting you at the Indo-Canadian Chamber event. I enjoyed learning about ABC Manufacturing's expansion plans.\n\nAs mentioned, I'm Alex from Apex Ventures, where we specialize in connecting top-tier operations talent with growing manufacturers.\n\nI'd love to send you our manufacturing staffing profile. When would be a good time to connect?\n\nBest regards,\nAlex Morgan",
    followUpAction: "Send company profile",
    followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    category: "Potential client",
    priority: "High",
    relationshipScore: 78,
    tags: ["Manufacturing", "Staffing lead", "Hot lead"],
    emailSent: true,
    replyReceived: false,
    meetingBooked: false,
    dealValue: 45000,
    timeline: [
      {
        id: "t1",
        type: "scanned",
        title: "Card scanned",
        description: "Met at Indo-Canadian Chamber event",
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "t2",
        type: "email_sent",
        title: "Intro email sent",
        description: "Personalized intro email delivered",
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    dateAdded: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    firstName: "Sarah",
    lastName: "Chen",
    company: "TechNova Solutions",
    jobTitle: "CEO",
    email: "sarah.chen@technova.io",
    phone: "+1 (647) 555-0234",
    eventId: "2",
    eventName: "Toronto Tech Summit",
    meetingNotes: "Discussed AI integration for their logistics platform.",
    aiSummary:
      "Sarah is CEO of TechNova, a 50-person SaaS company building AI logistics tools. Looking for strategic partnerships. High-value connection — schedule a demo this week.",
    introEmailDraft:
      "Hi Sarah,\n\nThank you for the great conversation at Toronto Tech Summit!\n\nI'd love to explore how Apex Ventures can support TechNova's growth...",
    followUpAction: "Schedule meeting",
    followUpDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    category: "Partner",
    priority: "High",
    relationshipScore: 91,
    tags: ["Technology partner", "AI", "Logistics"],
    emailSent: true,
    replyReceived: true,
    meetingBooked: true,
    dealValue: 120000,
    timeline: [
      {
        id: "t3",
        type: "scanned",
        title: "Card scanned",
        description: "Met at Toronto Tech Summit",
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "t4",
        type: "email_sent",
        title: "Intro email sent",
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "t5",
        type: "meeting",
        title: "Meeting booked",
        description: "Product demo scheduled for next Tuesday",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    dateAdded: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    firstName: "Marcus",
    lastName: "Williams",
    company: "Blue Horizon Capital",
    jobTitle: "Managing Partner",
    email: "m.williams@bluehorizon.vc",
    phone: "+1 (416) 555-0356",
    eventId: "1",
    eventName: "Indo-Canadian Chamber",
    meetingNotes: "Early-stage investor focused on B2B SaaS.",
    aiSummary:
      "Marcus manages a $50M fund investing in B2B SaaS at Series A. Mentioned interest in workforce tech. Follow up with deck in 2 weeks.",
    followUpAction: "Send proposal",
    followUpDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    category: "Investor",
    priority: "High",
    relationshipScore: 65,
    tags: ["Investor", "VC", "Series A"],
    emailSent: true,
    replyReceived: false,
    meetingBooked: false,
    dealValue: 500000,
    timeline: [
      {
        id: "t6",
        type: "scanned",
        title: "Card scanned",
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    dateAdded: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    firstName: "Priya",
    lastName: "Patel",
    company: "Greenfield Logistics",
    jobTitle: "Head of Procurement",
    email: "priya.patel@greenfield.ca",
    phone: "+1 (905) 555-0478",
    eventId: "2",
    eventName: "Toronto Tech Summit",
    followUpAction: "Call later",
    category: "Potential client",
    priority: "Medium",
    relationshipScore: 42,
    tags: ["Logistics", "Procurement"],
    emailSent: false,
    meetingBooked: false,
    timeline: [
      {
        id: "t7",
        type: "scanned",
        title: "Card scanned",
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    dateAdded: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const SAMPLE_EVENTS: Event[] = [
  {
    id: "1",
    name: "Indo-Canadian Chamber",
    location: "Toronto Convention Centre",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    type: "Chamber event",
    cost: 850,
    notes: "Annual networking gala — 200+ attendees",
    contactIds: ["1", "3"],
    meetingsBooked: 3,
    proposalsSent: 2,
    dealsWon: 0,
    revenueGenerated: 0,
  },
  {
    id: "2",
    name: "Toronto Tech Summit",
    location: "MaRS Discovery District",
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    type: "Conference",
    cost: 1200,
    contactIds: ["2", "4"],
    meetingsBooked: 7,
    proposalsSent: 3,
    dealsWon: 1,
    revenueGenerated: 18000,
  },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [c, e, p] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.CONTACTS),
          AsyncStorage.getItem(STORAGE_KEYS.EVENTS),
          AsyncStorage.getItem(STORAGE_KEYS.PROFILE),
        ]);
        setContacts(c ? JSON.parse(c) : SAMPLE_CONTACTS);
        setEvents(e ? JSON.parse(e) : SAMPLE_EVENTS);
        setProfile(p ? JSON.parse(p) : DEFAULT_PROFILE);
      } catch {
        setContacts(SAMPLE_CONTACTS);
        setEvents(SAMPLE_EVENTS);
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
    setContacts(SAMPLE_CONTACTS);
    setEvents(SAMPLE_EVENTS);
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
