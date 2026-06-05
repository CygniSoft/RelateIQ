import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ContactCard";
import { GlassIcon } from "@/components/GlassIcon";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  getIntegrationStatus,
  syncContactsToHubSpot,
  syncFollowUpsToCalendar,
  type IntegrationStatus,
} from "@/lib/integrationsApi";

const PLAN_COLORS: [string, string] = ["#7B5EFF", "#4F8EFF"];

function SettingRow({
  icon,
  label,
  value,
  onPress,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 14,
      }}
    >
      <GlassIcon tint={danger ? "#FF4757" : colors.primary} size={36}>
        {React.isValidElement(icon)
          ? React.cloneElement(
              icon as React.ReactElement<{ color?: string }>,
              { color: "#fff" }
            )
          : icon}
      </GlassIcon>
      <Text
        style={{
          flex: 1,
          color: danger ? "#FF4757" : colors.foreground,
          fontSize: 15,
        }}
      >
        {label}
      </Text>
      {value && (
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{value}</Text>
      )}
      {!danger && (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      )}
    </Pressable>
  );
}

function EditProfileModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useApp();
  const [form, setForm] = useState({ ...profile });

  function save() {
    updateProfile(form);
    onClose();
  }

  const fields: Array<{ label: string; key: keyof typeof form; multiline?: boolean }> = [
    { label: "Full Name", key: "name" },
    { label: "Company", key: "company" },
    { label: "Job Title", key: "jobTitle" },
    { label: "Email", key: "email" },
    { label: "Phone", key: "phone" },
    { label: "LinkedIn", key: "linkedin" },
    { label: "Website", key: "website" },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: insets.top + 16,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "600" as const }}>
            Edit Profile
          </Text>
          <Pressable onPress={save}>
            <Text style={{ color: colors.primary, fontSize: 17, fontWeight: "600" as const }}>
              Save
            </Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {fields.map((f) => (
            <View key={f.key} style={{ marginBottom: 16 }}>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 12,
                  fontWeight: "600" as const,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 6,
                }}
              >
                {f.label}
              </Text>
              <TextInput
                value={(form[f.key] as string) || ""}
                onChangeText={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                style={{
                  backgroundColor: colors.secondary,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: colors.foreground,
                  fontSize: 15,
                }}
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

function NotificationsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState({
    followUpReminders: true,
    emailAlerts: true,
    meetingReminders: true,
    weeklyDigest: false,
    newContactTips: true,
  });

  const rows: Array<{ key: keyof typeof prefs; label: string; sub: string }> = [
    {
      key: "followUpReminders",
      label: "Follow-up Reminders",
      sub: "Get reminded when a follow-up is due",
    },
    {
      key: "emailAlerts",
      label: "Email Sent Alerts",
      sub: "Confirm when an intro email is delivered",
    },
    {
      key: "meetingReminders",
      label: "Meeting Reminders",
      sub: "Notification 1 hour before booked meetings",
    },
    {
      key: "weeklyDigest",
      label: "Weekly Digest",
      sub: "Summary of your networking activity",
    },
    {
      key: "newContactTips",
      label: "Onboarding Tips",
      sub: "Helpful suggestions as you build your network",
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: insets.top + 16,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "600" as const }}>
            Notifications
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 14, marginBottom: 20, lineHeight: 20 }}>
            Choose which notifications ConnectIQ sends you. Changes take effect immediately.
          </Text>
          {rows.map((row, i) => (
            <View
              key={row.key}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 14,
                borderBottomWidth: i < rows.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
                gap: 14,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "500" as const }}>
                  {row.label}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 2 }}>
                  {row.sub}
                </Text>
              </View>
              <Switch
                value={prefs[row.key]}
                onValueChange={(v) => setPrefs((p) => ({ ...p, [row.key]: v }))}
                trackColor={{ false: colors.border, true: colors.primary + "88" }}
                thumbColor={prefs[row.key] ? colors.primary : colors.mutedForeground}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

function PrivacyModal({
  visible,
  onClose,
  onClearData,
}: {
  visible: boolean;
  onClose: () => void;
  onClearData: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const items = [
    {
      icon: "database" as const,
      title: "Local Storage Only",
      body: "All your contacts, events, and notes are stored on your device. ConnectIQ never uploads your personal data to external servers.",
    },
    {
      icon: "mail" as const,
      title: "Email via Gmail",
      body: "Emails are sent using your own Gmail account through your App Password. ConnectIQ does not store or log email content.",
    },
    {
      icon: "eye-off" as const,
      title: "No Analytics Tracking",
      body: "We don't track your usage, contacts, or networking activity. Your business relationships stay private.",
    },
    {
      icon: "lock" as const,
      title: "Contacts Permission",
      body: "The Contacts permission is only used when you explicitly tap \"Save to Phone Contacts\". It is never accessed automatically.",
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: insets.top + 16,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "600" as const }}>
            Privacy & Data
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {items.map((item) => (
            <View
              key={item.title}
              style={{
                flexDirection: "row",
                gap: 14,
                marginBottom: 24,
              }}
            >
              <GlassIcon tint={colors.accent} size={40} style={{ flexShrink: 0 }}>
                <Feather name={item.icon} size={18} color="#fff" />
              </GlassIcon>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "600" as const, marginBottom: 4 }}>
                  {item.title}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 19 }}>
                  {item.body}
                </Text>
              </View>
            </View>
          ))}

          <View
            style={{
              marginTop: 8,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: 24,
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "600" as const, marginBottom: 8 }}>
              Data Management
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 19, marginBottom: 20 }}>
              This will permanently delete all contacts, events, and notes stored on this device. Your profile will be reset to defaults.
            </Text>
            <Pressable
              onPress={onClearData}
              style={{
                backgroundColor: "#FF475718",
                borderWidth: 1,
                borderColor: "#FF475744",
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#FF4757", fontSize: 15, fontWeight: "600" as const }}>
                Clear All App Data
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function HelpModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const faqs = [
    {
      q: "How do I scan a business card?",
      a: "Tap the Scan tab, then press \"Scan Business Card\". You can use your camera or pick a photo from your gallery. ConnectIQ will extract the contact's details automatically.",
    },
    {
      q: "How does AI intro email work?",
      a: "After scanning a card and adding meeting context, ConnectIQ generates a personalised intro email based on the contact's role and your conversation notes. You can edit it before sending.",
    },
    {
      q: "How do I set up Gmail sending?",
      a: "Go to your Google Account → Security → 2-Step Verification → App Passwords. Generate a password for ConnectIQ, then ask your admin to add it to the app secrets (GMAIL_USER and GMAIL_APP_PASSWORD).",
    },
    {
      q: "Where is my data stored?",
      a: "Everything is stored locally on your device using AsyncStorage. Nothing is sent to external servers except the emails you choose to send through Gmail.",
    },
    {
      q: "How does relationship scoring work?",
      a: "Scores are calculated from contact priority, follow-up completion, emails sent, and meetings booked. Higher priority contacts with active engagement score highest.",
    },
    {
      q: "Can I export my contacts?",
      a: "Yes — open any contact and tap \"Save\" to export them to your phone's address book, including all contact details and where you met them.",
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: insets.top + 16,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "600" as const }}>
            Help & Support
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 12,
              fontWeight: "600" as const,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Frequently Asked Questions
          </Text>
          {faqs.map((item, i) => (
            <View
              key={i}
              style={{
                marginBottom: 20,
                backgroundColor: colors.card,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 16,
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" as const, marginBottom: 8 }}>
                {item.q}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 19 }}>
                {item.a}
              </Text>
            </View>
          ))}

          <View
            style={{
              marginTop: 8,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: 24,
              gap: 12,
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "600" as const, marginBottom: 4 }}>
              Still need help?
            </Text>
            <Pressable
              onPress={() => Linking.openURL("mailto:hr@cygnisoft.com")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: colors.secondary,
                borderRadius: 12,
                padding: 14,
              }}
            >
              <Feather name="mail" size={18} color={colors.primary} />
              <Text style={{ color: colors.foreground, fontSize: 14 }}>Email hr@cygnisoft.com</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const { profile, contacts, events, signOut, clearAllData } = useApp();
  const insets = useSafeAreaInsets();
  const [showEdit, setShowEdit] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);
  const [syncing, setSyncing] = useState<"hubspot" | "calendar" | null>(null);

  const refreshIntegrations = useCallback(async () => {
    const status = await getIntegrationStatus();
    setIntegrations(status);
  }, []);

  useEffect(() => {
    void refreshIntegrations();
  }, [refreshIntegrations]);

  function notify(title: string, message: string) {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  async function handleSyncCalendar() {
    if (syncing) return;
    if (!integrations?.googleCalendar) {
      notify(
        "Google Calendar not connected",
        "Connect Google Calendar from Replit to sync your follow-up reminders.",
      );
      return;
    }
    const followUps = contacts
      .filter(
        (c) =>
          c.followUpDate &&
          c.followUpAction &&
          c.followUpAction !== "No follow-up needed",
      )
      .map((c) => ({
        contactId: c.id,
        name: `${c.firstName} ${c.lastName}`.trim() || c.company || "Contact",
        action: c.followUpAction,
        date: c.followUpDate as string,
        notes: c.meetingNotes,
      }));

    if (followUps.length === 0) {
      notify(
        "Nothing to sync",
        "Add a follow-up date to a contact and it will show up in your Google Calendar.",
      );
      return;
    }

    setSyncing("calendar");
    const result = await syncFollowUpsToCalendar(followUps);
    setSyncing(null);

    if (result.success) {
      notify(
        "Google Calendar",
        `Added ${result.synced} follow-up${result.synced === 1 ? "" : "s"} to your calendar.` +
          (result.skipped ? ` ${result.skipped} already there.` : ""),
      );
    } else {
      notify("Calendar sync failed", result.error ?? "Please try again.");
    }
  }

  async function handleSyncHubSpot() {
    if (syncing) return;
    if (!integrations?.hubspot) {
      notify(
        "HubSpot not connected",
        "Connect HubSpot from Replit to push your contacts into your CRM.",
      );
      return;
    }
    const payload = contacts.map((c) => ({
      firstName: c.firstName,
      lastName: c.lastName,
      company: c.company,
      jobTitle: c.jobTitle,
      email: c.email,
      phone: c.phone,
      website: c.website,
    }));

    if (payload.length === 0) {
      notify("Nothing to sync", "Scan a few cards first, then push them to HubSpot.");
      return;
    }

    setSyncing("hubspot");
    const result = await syncContactsToHubSpot(payload);
    setSyncing(null);

    if (result.success) {
      notify(
        "HubSpot",
        `Synced ${result.synced} contact${result.synced === 1 ? "" : "s"} to HubSpot.` +
          (result.skipped ? ` ${result.skipped} skipped (no email).` : ""),
      );
    } else {
      notify("HubSpot sync failed", result.error ?? "Please try again.");
    }
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 + 24 : insets.bottom + 56 + 24;

  const totalRevenue = events.reduce((s, e) => s + e.revenueGenerated, 0);

  const profileAsContact = {
    id: "profile",
    firstName: profile.name.split(" ")[0] ?? "",
    lastName: profile.name.split(" ").slice(1).join(" ") ?? "",
    company: profile.company,
    jobTitle: profile.jobTitle,
    email: profile.email,
    phone: profile.phone,
  };

  async function doSignOut() {
    await signOut();
    router.replace("/(tabs)");
  }

  function handleSignOut() {
    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Sign out? Your contacts and events stay saved on this device, but your profile will be cleared.",
        )
      ) {
        void doSignOut();
      }
      return;
    }
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? Your contacts and events stay saved on this device, but your profile will be cleared.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => {
            void doSignOut();
          },
        },
      ],
    );
  }

  function handleClearData() {
    if (Platform.OS === "web") {
      if (window.confirm("This will permanently delete all contacts, events, and notes. This cannot be undone.")) {
        clearAllData().then(() => setShowPrivacy(false));
      }
      return;
    }
    Alert.alert(
      "Clear All Data",
      "This will permanently delete all contacts, events, and notes. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Everything",
          style: "destructive",
          onPress: async () => {
            await clearAllData();
            setShowPrivacy(false);
          },
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* Profile Hero */}
        <LinearGradient
          colors={["#0f1120", "#151828"]}
          style={{
            paddingTop: topPad + 20,
            paddingBottom: 28,
            paddingHorizontal: 20,
            alignItems: "center",
          }}
        >
          <Pressable onPress={() => setShowEdit(true)} style={{ marginBottom: 14 }}>
            <View style={{ position: "relative" }}>
              <Avatar
                contact={profileAsContact as any}
                size={80}
              />
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: "#151828",
                }}
              >
                <Feather name="edit-2" size={12} color="#fff" />
              </View>
            </View>
          </Pressable>

          <Text
            style={{
              color: "#fff",
              fontSize: 22,
              fontWeight: "700" as const,
              letterSpacing: -0.3,
            }}
          >
            {profile.name || "Your Name"}
          </Text>
          {[profile.jobTitle, profile.company].filter(Boolean).length > 0 ? (
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, marginTop: 3 }}>
              {[profile.jobTitle, profile.company].filter(Boolean).join(" · ")}
            </Text>
          ) : (
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 3 }}>
              Tap the avatar to set up your profile
            </Text>
          )}

          {/* Inline stats */}
          <View
            style={{
              flexDirection: "row",
              marginTop: 20,
              gap: 0,
              borderRadius: 14,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
              alignSelf: "stretch",
            }}
          >
            {[
              { label: "Contacts", value: contacts.length },
              { label: "Events", value: events.length },
              {
                label: "Revenue",
                value:
                  totalRevenue >= 1000
                    ? `$${(totalRevenue / 1000).toFixed(0)}K`
                    : `$${totalRevenue}`,
              },
            ].map((stat, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 12,
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderRightWidth: i < 2 ? 1 : 0,
                  borderRightColor: "rgba(255,255,255,0.1)",
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 18, fontWeight: "700" as const }}
                >
                  {stat.value}
                </Text>
                <Text
                  style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}
                >
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Subscription */}
        <View style={{ margin: 16, marginBottom: 8 }}>
          <LinearGradient
            colors={PLAN_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: colors.radius, padding: 16 }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "600" as const }}>
                  CURRENT PLAN
                </Text>
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" as const }}>
                  Professional
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 }}>
                  Unlimited scans · AI features · ROI tracking
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.2)",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" as const }}>
                  Active
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Account section */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            backgroundColor: colors.card,
            borderRadius: colors.radius,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
          }}
        >
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 12,
              fontWeight: "600" as const,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 8,
            }}
          >
            Account
          </Text>
          <SettingRow
            icon={<Feather name="user" size={16} color={colors.primary} />}
            label="Edit Profile"
            onPress={() => setShowEdit(true)}
          />
          <SettingRow
            icon={<Feather name="mail" size={16} color={colors.primary} />}
            label="Email"
            value={profile.email}
          />
          <SettingRow
            icon={<Feather name="phone" size={16} color={colors.primary} />}
            label="Phone"
            value={profile.phone}
          />
        </View>

        {/* Integrations */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            backgroundColor: colors.card,
            borderRadius: colors.radius,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
          }}
        >
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 12,
              fontWeight: "600" as const,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 8,
            }}
          >
            Integrations
          </Text>
          <SettingRow
            icon={<Feather name="mail" size={16} color="#EA4335" />}
            label="Gmail"
            value={integrations?.gmail ? "Connected" : "Not connected"}
            onPress={() =>
              notify(
                "Gmail",
                integrations?.gmail
                  ? "Connected. Your AI intro emails are sent through Gmail."
                  : "Gmail is not configured for this app yet.",
              )
            }
          />
          <SettingRow
            icon={<Feather name="calendar" size={16} color="#4285F4" />}
            label="Google Calendar"
            value={
              syncing === "calendar"
                ? "Syncing…"
                : integrations?.googleCalendar
                ? "Sync follow-ups"
                : "Not connected"
            }
            onPress={handleSyncCalendar}
          />
          <SettingRow
            icon={<Feather name="bar-chart-2" size={16} color="#FF7A59" />}
            label="HubSpot CRM"
            value={
              syncing === "hubspot"
                ? "Syncing…"
                : integrations?.hubspot
                ? "Sync contacts"
                : "Not connected"
            }
            onPress={handleSyncHubSpot}
          />
        </View>

        {/* Preferences */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            marginBottom: 8,
            backgroundColor: colors.card,
            borderRadius: colors.radius,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
          }}
        >
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 12,
              fontWeight: "600" as const,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 8,
            }}
          >
            Preferences
          </Text>
          <SettingRow
            icon={<Feather name="bell" size={16} color={colors.accent} />}
            label="Notifications"
            onPress={() => setShowNotifications(true)}
          />
          <SettingRow
            icon={<Feather name="shield" size={16} color={colors.accent} />}
            label="Privacy & Data"
            onPress={() => setShowPrivacy(true)}
          />
          <SettingRow
            icon={<Feather name="help-circle" size={16} color={colors.accent} />}
            label="Help & Support"
            onPress={() => setShowHelp(true)}
          />
          <SettingRow
            icon={<Feather name="log-out" size={16} color="#FF4757" />}
            label="Sign Out"
            danger
            onPress={handleSignOut}
          />
        </View>
      </ScrollView>

      <EditProfileModal visible={showEdit} onClose={() => setShowEdit(false)} />
      <NotificationsModal visible={showNotifications} onClose={() => setShowNotifications(false)} />
      <PrivacyModal visible={showPrivacy} onClose={() => setShowPrivacy(false)} onClearData={handleClearData} />
      <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} />
    </View>
  );
}
