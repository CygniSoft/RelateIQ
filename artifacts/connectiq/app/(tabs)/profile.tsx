import { Feather, Ionicons } from "@expo/vector-icons";
import { useAuth, useClerk, useUser } from "@clerk/expo";
import { LinearGradient } from "expo-linear-gradient";
import * as ExpoLinking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { Paywall } from "@/components/Paywall";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useApp } from "@/context/AppContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useColors } from "@/hooks/useColors";
import { theme } from "@/constants/theme";
import { createPortalSession } from "@/lib/billingApi";
import {
  getIntegrationStatus,
  syncFollowUpsToCalendar,
  type IntegrationStatus,
} from "@/lib/integrationsApi";

const PLAN_COLORS: [string, string] = ["#7B5EFF", "#4F8EFF"];

function formatPeriodEnd(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: theme.spacing[16],
          paddingVertical: theme.spacing[14],
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: theme.spacing[14],
        },
        pressed && onPress && { backgroundColor: colors.secondary },
      ]}
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
          ...theme.typography.body,
        }}
      >
        {label}
      </Text>
      {value && (
        <Text style={{ color: colors.mutedForeground, ...theme.typography.bodySmall }}>{value}</Text>
      )}
      {onPress && !danger && (
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) setErrors({});
  }, [visible]);

  function clearError(key: string) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function save() {
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Full name is required";
    if (!form.email.trim()) nextErrors.email = "Email is required";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    updateProfile(form);
    onClose();
  }

  const fields: Array<{
    label: string;
    key: keyof typeof form;
    multiline?: boolean;
    required?: boolean;
  }> = [
    { label: "Full Name", key: "name", required: true },
    { label: "Company", key: "company" },
    { label: "Job Title", key: "jobTitle" },
    { label: "Email", key: "email", required: true },
    { label: "Phone", key: "phone" },
    { label: "LinkedIn", key: "linkedin" },
    { label: "Website", key: "website" },
    { label: "Calendar Invite URL", key: "calendarInviteUrl" },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: theme.spacing[20],
            paddingTop: insets.top + theme.spacing[16],
            paddingBottom: theme.spacing[16],
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ color: colors.foreground, ...theme.typography.h4 }}>
            Edit Profile
          </Text>
          <Pressable onPress={save} hitSlop={10}>
            <Text style={{ color: colors.primary, ...theme.typography.bodyLargeSemi }}>
              Save
            </Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: theme.spacing[20] }}
          keyboardShouldPersistTaps="handled"
        >
          {fields.map((f) => (
            <View key={f.key} style={{ marginBottom: theme.spacing[16] }}>
              <Text
                style={{
                  color: colors.mutedForeground,
                  ...theme.typography.label,
                  marginBottom: theme.spacing[6],
                }}
              >
                {f.label}
                {f.required ? " *" : ""}
              </Text>
              <TextInput
                value={(form[f.key] as string) || ""}
                onChangeText={(v) => {
                  setForm((p) => ({ ...p, [f.key]: v }));
                  clearError(f.key);
                }}
                style={{
                  backgroundColor: colors.secondary,
                  borderWidth: 1,
                  borderColor: errors[f.key] ? "#FF4757" : colors.border,
                  borderRadius: theme.radius.md,
                  paddingHorizontal: theme.spacing[14],
                  paddingVertical: theme.spacing[12],
                  color: colors.foreground,
                  ...theme.typography.body,
                }}
                placeholderTextColor={colors.mutedForeground}
              />
              {errors[f.key] ? (
                <Text style={{ color: "#FF4757", ...theme.typography.caption, marginTop: 6 }}>
                  {errors[f.key]}
                </Text>
              ) : null}
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
  const { notificationPrefs: prefs, updateNotificationPrefs } = useApp();

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
      key: "onboardingTips",
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
            paddingHorizontal: theme.spacing[20],
            paddingTop: insets.top + theme.spacing[16],
            paddingBottom: theme.spacing[16],
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ color: colors.foreground, ...theme.typography.h4 }}>
            Notifications
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: theme.spacing[20] }}>
          <Text style={{ color: colors.mutedForeground, ...theme.typography.body, marginBottom: theme.spacing[20], lineHeight: 20 }}>
            Choose which notifications RelateIQ+ sends you. Changes take effect immediately.
          </Text>
          {rows.map((row, i) => (
            <View
              key={row.key}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: theme.spacing[14],
                borderBottomWidth: i < rows.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
                gap: theme.spacing[14],
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, ...theme.typography.bodySemi }}>
                  {row.label}
                </Text>
                <Text style={{ color: colors.mutedForeground, ...theme.typography.bodySmall, marginTop: 2 }}>
                  {row.sub}
                </Text>
              </View>
              <Switch
                value={prefs[row.key]}
                onValueChange={(v) => updateNotificationPrefs({ [row.key]: v })}
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
      body: "All your contacts, events, and notes are stored on your device. RelateIQ+ never uploads your personal data to external servers.",
    },
    {
      icon: "mail" as const,
      title: "Email via Gmail",
      body: "Emails are sent using your own Gmail account through your App Password. RelateIQ+ does not store or log email content.",
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
            paddingHorizontal: theme.spacing[20],
            paddingTop: insets.top + theme.spacing[16],
            paddingBottom: theme.spacing[16],
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ color: colors.foreground, ...theme.typography.h4 }}>
            Privacy & Data
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: theme.spacing[20] }}>
          {items.map((item) => (
            <View
              key={item.title}
              style={{
                flexDirection: "row",
                gap: theme.spacing[14],
                marginBottom: theme.spacing[24],
              }}
            >
              <GlassIcon tint={colors.accent} size={40} style={{ flexShrink: 0 }}>
                <Feather name={item.icon} size={18} color="#fff" />
              </GlassIcon>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, ...theme.typography.bodySemi, marginBottom: 4 }}>
                  {item.title}
                </Text>
                <Text style={{ color: colors.mutedForeground, ...theme.typography.bodySmall, lineHeight: 19 }}>
                  {item.body}
                </Text>
              </View>
            </View>
          ))}

          <View
            style={{
              marginTop: theme.spacing[8],
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: theme.spacing[24],
            }}
          >
            <Text style={{ color: colors.foreground, ...theme.typography.bodySemi, marginBottom: theme.spacing[8] }}>
              Data Management
            </Text>
            <Text style={{ color: colors.mutedForeground, ...theme.typography.bodySmall, lineHeight: 19, marginBottom: theme.spacing[20] }}>
              This will permanently delete all contacts, events, and notes stored on this device. Your profile will be reset to defaults.
            </Text>
            <Pressable
              onPress={onClearData}
              style={({ pressed }) => [
                {
                  backgroundColor: "#FF475718",
                  borderWidth: 1,
                  borderColor: "#FF475744",
                  borderRadius: theme.radius.md,
                  paddingVertical: theme.spacing[14],
                  alignItems: "center",
                },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Text style={{ color: "#FF4757", ...theme.typography.bodySemi }}>
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
      a: "Tap the Scan tab, then press \"Scan Business Card\". You can use your camera or pick a photo from your gallery. RelateIQ+ will extract the contact's details automatically.",
    },
    {
      q: "How does AI intro email work?",
      a: "After scanning a card and adding meeting context, RelateIQ+ generates a personalised intro email based on the contact's role and your conversation notes. You can edit it before sending.",
    },
    {
      q: "How are introduction emails sent?",
      a: "Introduction emails are sent from RelateIQ+'s verified domain, with your name shown as the sender and replies routed straight back to your own email — so they look professional but stay personal. Delivery is configured centrally by your app administrator, so there's nothing for you to set up. Just write your intro, tap Send, and any replies land in your inbox.",
    },
    {
      q: "Where is my data stored?",
      a: "Everything is stored locally on your device using AsyncStorage. Nothing is sent to external servers except the introduction emails you choose to send.",
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
            paddingHorizontal: theme.spacing[20],
            paddingTop: insets.top + theme.spacing[16],
            paddingBottom: theme.spacing[16],
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ color: colors.foreground, ...theme.typography.h4 }}>
            Help & Support
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: theme.spacing[20] }}>
          <Text
            style={{
              color: colors.mutedForeground,
              ...theme.typography.label,
              marginBottom: theme.spacing[16],
            }}
          >
            Frequently Asked Questions
          </Text>
          {faqs.map((item, i) => (
            <View
              key={i}
              style={{
                marginBottom: theme.spacing[20],
                backgroundColor: colors.card,
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                padding: theme.spacing[16],
                ...theme.getShadow("#000", "sm")
              }}
            >
              <Text style={{ color: colors.foreground, ...theme.typography.bodySemi, marginBottom: theme.spacing[8] }}>
                {item.q}
              </Text>
              <Text style={{ color: colors.mutedForeground, ...theme.typography.bodySmall, lineHeight: 19 }}>
                {item.a}
              </Text>
            </View>
          ))}

          <View
            style={{
              marginTop: theme.spacing[8],
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: theme.spacing[24],
              gap: theme.spacing[12],
            }}
          >
            <Text style={{ color: colors.foreground, ...theme.typography.bodySemi, marginBottom: 4 }}>
              Still need help?
            </Text>
            <Pressable
              onPress={() => Linking.openURL("mailto:hr@cygnisoft.com")}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing[12],
                  backgroundColor: colors.secondary,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing[14],
                },
                pressed && { opacity: 0.8 }
              ]}
            >
              <Feather name="mail" size={18} color={colors.primary} />
              <Text style={{ color: colors.foreground, ...theme.typography.body }}>Email hr@cygnisoft.com</Text>
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
  const { signOut: clerkSignOut } = useClerk();
  const { user } = useUser();
  const [deleting, setDeleting] = useState(false);
  const { getToken } = useAuth();
  const { subscription, isPro, refresh: refreshSubscription } = useSubscription();
  const insets = useSafeAreaInsets();
  const [showEdit, setShowEdit] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);
  const [syncing, setSyncing] = useState<"calendar" | null>(null);

  const bottomPad = Platform.OS === "web" ? 84 + 16 : insets.bottom + 56 + 16;

  async function handleManageSubscription() {
    if (portalLoading) return;
    setPortalLoading(true);

    const popup =
      Platform.OS === "web"
        ? window.open("", "_blank", "noopener,noreferrer")
        : null;

    try {
      const token = (await getToken()) ?? undefined;
      const returnUrl = ExpoLinking.createURL("/profile");
      const portalUrl = await createPortalSession(returnUrl, token);
      if (Platform.OS === "web") {
        if (popup) {
          popup.location.href = portalUrl;
        } else {
          window.open(portalUrl, "_blank", "noopener,noreferrer");
        }
        await new Promise((r) => setTimeout(r, 1500));
        await refreshSubscription();
        return;
      }
      await WebBrowser.openAuthSessionAsync(portalUrl, returnUrl);
      await refreshSubscription();
    } catch (err) {
      notify(
        "Couldn't open billing",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setPortalLoading(false);
    }
  }

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
        "No pending follow-ups found to sync.",
      );
      return;
    }

    setSyncing("calendar");
    try {
      const result = await syncFollowUpsToCalendar(followUps);
      if (result.success) {
        notify(
          "Synced",
          `${result.synced ?? 0} follow-up reminders added to your calendar.`,
        );
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      notify(
        "Sync failed",
        err instanceof Error ? err.message : "Please try again later.",
      );
    } finally {
      setSyncing(null);
    }
  }

  async function doSignOut() {
    await signOut();
    await clerkSignOut();
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
      if (
        window.confirm(
          "This will permanently delete all contacts, events, and notes. This cannot be undone.",
        )
      ) {
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

  async function doDeleteAccount() {
    setDeleting(true);
    try {
      // Delete the remote Clerk account FIRST, while still authenticated. Only
      // after that succeeds do we wipe local data — otherwise a failed remote
      // delete (e.g. Clerk requires recent re-authentication) would leave the
      // account intact but the device already erased.
      if (!user) {
        throw new Error("Your session isn't ready yet.");
      }
      await user.delete();
      await clearAllData();
      await signOut();
      await clerkSignOut();
      // On success the auth state flips to signed-out and this screen unmounts,
      // so there's no need to reset `deleting` here.
    } catch (err) {
      setDeleting(false);
      const detail =
        err instanceof Error && err.message ? ` (${err.message})` : "";
      const msg =
        "We couldn't delete your account. Please sign out, sign back in, and try again." +
        detail;
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Couldn't delete account", msg);
    }
  }

  function handleDeleteAccount() {
    const message =
      "This permanently deletes your account and erases all contacts, events, and notes from this device. This cannot be undone.";
    if (Platform.OS === "web") {
      if (window.confirm(message)) void doDeleteAccount();
      return;
    }
    Alert.alert("Delete Account", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete Account",
        style: "destructive",
        onPress: () => {
          void doDeleteAccount();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        <ScreenHeader title="Profile" />

        <View style={{ paddingHorizontal: theme.spacing[20] }}>
          {/* User info */}
          <View style={{ alignItems: "center", marginBottom: theme.spacing[32] }}>
            <Avatar contact={{ firstName: profile.name, lastName: "", id: "me" } as any} size={88} />
            <Text
              style={{
                color: colors.foreground,
                ...theme.typography.h2,
                marginTop: theme.spacing[16],
              }}
            >
              {profile.name}
            </Text>
            <Text style={{ color: colors.mutedForeground, ...theme.typography.body, marginTop: theme.spacing[4] }}>
              {profile.jobTitle && profile.company
                ? `${profile.jobTitle} at ${profile.company}`
                : profile.email}
            </Text>

            <Pressable
              onPress={() => setShowEdit(true)}
              style={({ pressed }) => [
                {
                  marginTop: theme.spacing[16],
                  backgroundColor: colors.secondary,
                  paddingHorizontal: theme.spacing[20],
                  paddingVertical: theme.spacing[8],
                  borderRadius: theme.radius.full,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
                pressed && { opacity: 0.8 }
              ]}
            >
              <Text style={{ color: colors.foreground, ...theme.typography.bodySmallSemi }}>
                Edit Profile
              </Text>
            </Pressable>
          </View>

          {/* Subscription Banner */}
          <Pressable
            onPress={isPro ? handleManageSubscription : () => setShowPaywall(true)}
            style={({ pressed }) => [
              {
                marginBottom: theme.spacing[24],
                borderRadius: theme.radius.lg,
                overflow: "hidden",
                ...theme.getShadow(isPro ? "#7B5EFF" : "#000", "md")
              },
              pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] }
            ]}
          >
            <LinearGradient
              colors={isPro ? PLAN_COLORS : ["#1A1E35", "#0F1120"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: theme.spacing[20] }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <Feather name={isPro ? "star" : "zap"} size={16} color="#fff" />
                    <Text style={{ color: "#fff", ...theme.typography.bodyLargeSemi }}>
                      {isPro ? "Pro Plan" : "Free Plan"}
                    </Text>
                  </View>
                  <Text style={{ color: "rgba(255,255,255,0.7)", ...theme.typography.bodySmall }}>
                    {isPro
                      ? subscription?.currentPeriodEnd
                        ? `Renews ${formatPeriodEnd(subscription.currentPeriodEnd)}`
                        : "Active subscription"
                      : "Upgrade for unlimited scans"}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: "rgba(255,255,255,0.2)",
                    paddingHorizontal: theme.spacing[12],
                    paddingVertical: 6,
                    borderRadius: theme.radius.xl,
                  }}
                >
                  <Text style={{ color: "#fff", ...theme.typography.captionSemi }}>
                    {isPro ? "Manage" : "Upgrade"}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>

          {/* Settings sections */}
          <View style={{ gap: theme.spacing[24] }}>
            <View>
              <Text
                style={{
                  color: colors.mutedForeground,
                  ...theme.typography.label,
                  marginBottom: theme.spacing[8],
                  paddingHorizontal: theme.spacing[16],
                }}
              >
                Integrations
              </Text>
              <View style={{ backgroundColor: colors.card, borderRadius: theme.radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
                <SettingRow
                  icon={<Feather name="calendar" size={18} />}
                  label="Sync to Google Calendar"
                  value={
                    syncing === "calendar"
                      ? "Syncing..."
                      : integrations?.googleCalendar
                      ? "Connected"
                      : "Not connected"
                  }
                  onPress={handleSyncCalendar}
                />
              </View>
            </View>

            <View>
              <Text
                style={{
                  color: colors.mutedForeground,
                  ...theme.typography.label,
                  marginBottom: theme.spacing[8],
                  paddingHorizontal: theme.spacing[16],
                }}
              >
                Preferences
              </Text>
              <View style={{ backgroundColor: colors.card, borderRadius: theme.radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
                <SettingRow
                  icon={<Feather name="bell" size={18} />}
                  label="Notifications"
                  onPress={() => setShowNotifications(true)}
                />
                <SettingRow
                  icon={<Feather name="shield" size={18} />}
                  label="Privacy & Data"
                  onPress={() => setShowPrivacy(true)}
                />
              </View>
            </View>

            <View>
              <Text
                style={{
                  color: colors.mutedForeground,
                  ...theme.typography.label,
                  marginBottom: theme.spacing[8],
                  paddingHorizontal: theme.spacing[16],
                }}
              >
                Support
              </Text>
              <View style={{ backgroundColor: colors.card, borderRadius: theme.radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
                <SettingRow
                  icon={<Feather name="help-circle" size={18} />}
                  label="Help & FAQ"
                  onPress={() => setShowHelp(true)}
                />
                <SettingRow
                  icon={<Feather name="mail" size={18} />}
                  label="Contact Support"
                  onPress={() => Linking.openURL("mailto:hr@cygnisoft.com")}
                />
              </View>
            </View>

            <View>
              <View style={{ backgroundColor: colors.card, borderRadius: theme.radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
                <SettingRow
                  icon={<Feather name="log-out" size={18} />}
                  label="Sign Out"
                  onPress={handleSignOut}
                  danger
                />
                <SettingRow
                  icon={<Feather name="trash-2" size={18} />}
                  label={deleting ? "Deleting Account..." : "Delete Account"}
                  onPress={deleting ? undefined : handleDeleteAccount}
                  danger
                />
              </View>
              <Text style={{ textAlign: "center", color: colors.mutedForeground, ...theme.typography.caption, marginTop: theme.spacing[16] }}>
                RelateIQ+ Version 1.0.0
              </Text>
              <Text style={{ textAlign: "center", color: colors.mutedForeground, ...theme.typography.caption, marginTop: 4 }}>
                {user?.emailAddresses[0]?.emailAddress}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <EditProfileModal visible={showEdit} onClose={() => setShowEdit(false)} />
      <NotificationsModal visible={showNotifications} onClose={() => setShowNotifications(false)} />
      <PrivacyModal
        visible={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        onClearData={handleClearData}
      />
      <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} />
      <Paywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </View>
  );
}