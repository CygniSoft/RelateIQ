import { useAuth } from "@clerk/expo";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ContactCard";
import { GlassIcon } from "@/components/GlassIcon";
import { MeetingModal } from "@/components/MeetingModal";
import { useApp, TimelineEvent, Contact, MeetingMetadata } from "@/context/AppContext";
import { notifyNow } from "@/lib/notifications";
import { sendEmail, sendMeetingInvite } from "@/lib/emailApi";
import { openCalendarEvent, createMeetingEvent } from "@/lib/deviceCalendar";
import { useColors } from "@/hooks/useColors";
import { theme } from "@/constants/theme";

function TimelineItem({
  event,
  isLast,
  contact,
}: {
  event: TimelineEvent;
  isLast: boolean;
  contact: Contact;
}) {
  const colors = useColors();
  const { getToken } = useAuth();
  const { updateMeetingMetadata } = useApp();

  const iconMap: Record<TimelineEvent["type"], { name: any; color: string }> = {
    scanned: { name: "maximize", color: "#4F8EFF" },
    email_sent: { name: "send", color: "#7B5EFF" },
    follow_up: { name: "clock", color: "#F59E0B" },
    meeting: { name: "calendar", color: "#10B981" },
    proposal: { name: "file-text", color: "#EC4899" },
    note: { name: "edit-3", color: "#6B7490" },
    deal: { name: "dollar-sign", color: "#10B981" },
  };

  const { name, color } = iconMap[event.type];
  const date = new Date(event.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const { meetingMetadata } = event;

  const retryInvite = async () => {
    if (!meetingMetadata || !contact.email) return;
    updateMeetingMetadata(contact.id, event.id, {
      inviteStatus: "pending",
      inviteError: undefined,
    });
    let inviteError: string | undefined;
    let finalInviteStatus: MeetingMetadata["inviteStatus"] = "failed";
    try {
      const token = await getToken().catch(() => null);
      if (!token) {
        inviteError = "Please sign in again to send the invitation.";
      } else {
        const res = await sendMeetingInvite({
          uid: meetingMetadata.uid,
          to: contact.email,
          title: meetingMetadata.title,
          startDate: meetingMetadata.startDate,
          endDate: meetingMetadata.endDate,
          location: meetingMetadata.location,
          description: meetingMetadata.notes,
          reminderMinutes: meetingMetadata.reminderMinutes,
          token,
        });
        if (res.success) {
          finalInviteStatus =
            res.deliveryStatus === "sent"
              ? "success"
              : res.deliveryStatus;
        } else {
          inviteError = res.error || "Invitation delivery failed.";
        }
      }
    } catch (error) {
      inviteError =
        error instanceof Error ? error.message : "Invitation delivery failed.";
    } finally {
      updateMeetingMetadata(contact.id, event.id, {
        inviteStatus: finalInviteStatus,
        inviteError:
          finalInviteStatus === "failed" ? inviteError : undefined,
      });
    }

    if (finalInviteStatus === "success") {
      Alert.alert("Success", "Invite sent.");
    } else if (finalInviteStatus === "pending") {
      Alert.alert(
        "Invitation processing",
        "This invitation is already being processed and will not be sent twice.",
      );
    } else if (finalInviteStatus === "unknown") {
      Alert.alert(
        "Delivery unconfirmed",
        "The invitation was submitted, but delivery could not be confirmed. It will not be resent automatically.",
      );
    } else {
      Alert.alert(
        "Failed",
        inviteError || "Invitation delivery failed.",
      );
    }
  };

  const retryCalendar = async () => {
    if (!meetingMetadata) return;
    updateMeetingMetadata(contact.id, event.id, { calendarStatus: "pending" });
    let calendarStatus: MeetingMetadata["calendarStatus"] = "failed";
    let calendarEventId: string | undefined;
    try {
      const calRes = await createMeetingEvent({
        uid: meetingMetadata.uid,
        title: meetingMetadata.title,
        startDate: meetingMetadata.startDate,
        endDate: meetingMetadata.endDate,
        location: meetingMetadata.location,
        notes: meetingMetadata.notes,
        alarmMinutes: meetingMetadata.reminderMinutes,
      },
      meetingMetadata.calendarEventId,
    );
      if (calRes.status === "success") {
        calendarStatus = "success";
        calendarEventId = calRes.eventId;
      } else {
        calendarStatus = calRes.status;
      }
    } catch {
      calendarStatus = "failed";
    } finally {
      updateMeetingMetadata(contact.id, event.id, {
        calendarEventId,
        calendarStatus,
      });
    }

    if (calendarStatus === "success") {
      Alert.alert("Success", "Added to calendar.");
    } else {
      Alert.alert("Failed", "Calendar error");
    }
  };

  return (
    <View style={{ flexDirection: "row", gap: theme.spacing[12] }}>
      <View style={{ alignItems: "center", width: 36 }}>
        <GlassIcon tint={color} size={36}>
          <Feather name={name} size={15} color="#fff" />
        </GlassIcon>
        {!isLast && (
          <View
            style={{
              width: 1,
              flex: 1,
              minHeight: 20,
              backgroundColor: colors.border,
              marginTop: 4,
            }}
          />
        )}
      </View>
      <View style={{ flex: 1, paddingBottom: theme.spacing[20] }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: colors.foreground, ...theme.typography.bodySemi }}>
            {event.title}
          </Text>
          <Text style={{ color: colors.mutedForeground, ...theme.typography.caption }}>
            {formattedDate}
          </Text>
        </View>
        {event.description && (
          <Text
            style={{ color: colors.mutedForeground, ...theme.typography.bodySmall, marginTop: 3 }}
          >
            {event.description}
          </Text>
        )}

        {meetingMetadata && (
          <View style={{ marginTop: 8, gap: 6, backgroundColor: colors.secondary, padding: 10, borderRadius: theme.radius.sm }}>
            <Text style={{ color: colors.foreground, ...theme.typography.captionSemi }}>
              {new Date(meetingMetadata.startDate).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
            </Text>
            {meetingMetadata.location && (
              <Text style={{ color: colors.mutedForeground, ...theme.typography.caption }}>
                {meetingMetadata.location}
              </Text>
            )}
            <Text style={{ color: colors.mutedForeground, ...theme.typography.caption }}>
              Calendar: {meetingMetadata.calendarStatus.replaceAll("-", " ")}
              {"  "}Invite: {meetingMetadata.inviteStatus.replaceAll("-", " ")}
            </Text>

            {meetingMetadata.calendarEventId && (
              <Pressable
                onPress={async () => {
                  const opened = await openCalendarEvent(
                    meetingMetadata.calendarEventId!,
                  );
                  if (!opened) {
                    Alert.alert(
                      "Calendar unavailable",
                      "The calendar event could not be opened.",
                    );
                  }
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Feather name="calendar" size={12} color={colors.primary} />
                <Text style={{ color: colors.primary, ...theme.typography.captionSemi }}>Open in Calendar</Text>
              </Pressable>
            )}

            {meetingMetadata.calendarStatus !== "success" &&
              meetingMetadata.calendarStatus !== "pending" && (
              <Pressable
                onPress={retryCalendar}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Feather name="alert-circle" size={12} color="#F59E0B" />
                <Text style={{ color: "#F59E0B", ...theme.typography.captionSemi }}>Retry Calendar Sync</Text>
              </Pressable>
            )}

            {meetingMetadata.inviteStatus === "failed" && contact.email && (
              <Pressable
                onPress={retryInvite}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Feather name="alert-circle" size={12} color="#FF4757" />
                <Text style={{ color: "#FF4757", ...theme.typography.captionSemi }}>Retry Sending Invite</Text>
              </Pressable>
            )}
          </View>
        )}

      </View>
    </View>
  );
}

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contacts, updateContact, deleteContact, addTimelineEvent, profile, notificationPrefs } =
    useApp();
  const { getToken } = useAuth();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [savedToPhone, setSavedToPhone] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "email">("overview");
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  const contact = contacts.find((c) => c.id === id);

  if (!contact) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ color: colors.mutedForeground }}>Contact not found</Text>
      </View>
    );
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom + 24;

  function showMessage(title: string, message: string) {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  function getScoreColor(score: number) {
    if (score >= 80) return "#10B981";
    if (score >= 50) return "#F59E0B";
    if (score >= 20) return "#4F8EFF";
    return "#6B7490";
  }

  async function handleSaveToContacts() {
    if (!contact) return;

    if (Platform.OS === "web") {
      Alert.alert("Not supported", "Saving to phone contacts requires the mobile app.");
      return;
    }

    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission denied",
        "RelateIQ+ needs access to your contacts to save this person.",
      );
      return;
    }

    try {
      const fullName = `${contact.firstName} ${contact.lastName}`.trim();
      const newContact: Contacts.Contact = {
        name: fullName || contact.company || "New contact",
        contactType: Contacts.ContactTypes.Person,
        firstName: contact.firstName,
        lastName: contact.lastName,
        jobTitle: contact.jobTitle,
        company: contact.company,
        emails: contact.email
          ? [{ email: contact.email, label: "work", isPrimary: true }]
          : undefined,
        phoneNumbers: contact.phone
          ? [{ number: contact.phone, label: "work", isPrimary: true }]
          : undefined,
        urlAddresses: contact.linkedin
          ? [{ url: contact.linkedin, label: "LinkedIn" }]
          : undefined,
        note: [
          contact.eventName ? `Met at ${contact.eventName}` : "",
          contact.meetingNotes ?? "",
        ]
          .filter(Boolean)
          .join("\n"),
      };

      await Contacts.addContactAsync(newContact);
      setSavedToPhone(true);
      addTimelineEvent(contact.id, {
        type: "note",
        title: "Saved to phone contacts",
        description: "Contact exported to device address book",
        date: new Date().toISOString(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved!", `${contact.firstName} ${contact.lastName} added to your phone contacts.`);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Please try again.";
      Alert.alert("Couldn't save contact", detail);
    }
  }

  async function handleSendEmail() {
    if (!contact) return;
    const emailBody =
      contact.introEmailDraft ||
      `Hi ${contact.firstName},\n\nGreat connecting with you!\n\nLooking forward to staying in touch.\n\nBest regards,`;

    let token: string | undefined;
    try {
      token = (await getToken()) ?? undefined;
    } catch {
      // ignore — handled as auth failure below
    }
    const result = await sendEmail({
      to: contact.email,
      subject: `Following up${contact.eventName ? ` — met at ${contact.eventName}` : ""}`,
      body: emailBody,
      fromName: profile.name,
      replyTo: profile.email || undefined,
      token,
    });

    if (result.success) {
      updateContact(contact.id, { emailSent: true });
      addTimelineEvent(contact.id, {
        type: "email_sent",
        title: "Email sent",
        description: `Sent to ${contact.email}`,
        date: new Date().toISOString(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (notificationPrefs.emailAlerts) {
        void notifyNow(
          "Intro email sent",
          `Your intro email to ${contact.firstName || contact.email} was delivered.`,
        );
      }
      setShowEmailModal(false);
    } else {
      Alert.alert("Send failed", result.error ?? "Could not send email. Please try again.");
    }
  }

  function handleAddNote() {
    if (!contact) return;
    if (!noteText.trim()) return;
    addTimelineEvent(contact.id, {
      type: "note",
      title: "Note added",
      description: noteText.trim(),
      date: new Date().toISOString(),
    });
    updateContact(contact.id, {
      meetingNotes: contact.meetingNotes
        ? `${contact.meetingNotes}\n${noteText.trim()}`
        : noteText.trim(),
    });
    setNoteText("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleDelete() {
    if (!contact) return;
    Alert.alert(
      "Delete Contact",
      `Remove ${contact.firstName} ${contact.lastName} from your contacts?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteContact(contact.id);
            router.back();
          },
        },
      ]
    );
  }

  const scoreColor = getScoreColor(contact.relationshipScore);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* Hero */}
        <LinearGradient
          colors={["#0f1120", "#151828", colors.background]}
          locations={[0, 0.6, 1]}
          style={{
            paddingTop: topPad + 8,
            paddingBottom: theme.spacing[24],
            paddingHorizontal: theme.spacing[20],
          }}
        >
          {/* Back + actions */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: theme.spacing[20],
            }}
          >
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "rgba(255,255,255,0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </Pressable>
            <Pressable
              onPress={handleDelete}
              hitSlop={12}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "rgba(255,71,87,0.15)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="trash-2" size={16} color="#FF4757" />
            </Pressable>
          </View>

          <View style={{ alignItems: "center", gap: theme.spacing[12] }}>
            <Avatar contact={contact} size={72} />
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  color: "#fff",
                  ...theme.typography.h2,
                }}
              >
                {contact.firstName} {contact.lastName}
              </Text>
              <Text
                style={{ color: "rgba(255,255,255,0.65)", ...theme.typography.body, marginTop: 2 }}
              >
                {contact.jobTitle} · {contact.company}
              </Text>
              {contact.eventName && (
                <Text
                  style={{
                    color: "rgba(255,255,255,0.45)",
                    ...theme.typography.caption,
                    marginTop: 4,
                  }}
                >
                  Met at {contact.eventName}
                </Text>
              )}
            </View>

            {/* Score ring */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: scoreColor + "22",
                paddingHorizontal: theme.spacing[16],
                paddingVertical: 6,
                borderRadius: theme.radius.xl,
                borderWidth: 1,
                borderColor: scoreColor + "55",
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: scoreColor,
                }}
              />
              <Text style={{ color: scoreColor, ...theme.typography.bodySemi }}>
                {contact.relationshipScore} Relationship Score
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick actions */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: theme.spacing[20],
            gap: theme.spacing[10],
            marginTop: -12,
            marginBottom: theme.spacing[20],
          }}
        >
          {[
            {
              icon: "mail",
              label: "Email",
              color: "#4F8EFF",
              onPress: () => setShowEmailModal(true),
            },
            {
              icon: "phone",
              label: "Call",
              color: "#10B981",
              onPress: () => {
                if (!contact.phone) {
                  showMessage(
                    "No phone number",
                    "This contact doesn't have a phone number saved.",
                  );
                  return;
                }
                const digits = contact.phone.replace(/[^+\d]/g, "");
                if (!digits) {
                  showMessage(
                    "No phone number",
                    "This contact doesn't have a valid phone number saved.",
                  );
                  return;
                }
                Linking.openURL(`tel:${digits}`).catch(() => {
                  showMessage(
                    "Can't place call",
                    "Calling isn't available on this device.",
                  );
                });
              },
            },
            {
              icon: "calendar",
              label: "Meet",
              color: "#F59E0B",
              onPress: () => {
                setShowMeetingModal(true);
              },
            },
            {
              icon: savedToPhone ? "check" : "user-plus",
              label: savedToPhone ? "Saved" : "Save",
              color: savedToPhone ? "#10B981" : "#7B5EFF",
              onPress: handleSaveToContacts,
            },
          ].map((action) => (
            <Pressable
              key={action.label}
              onPress={action.onPress}
              style={({ pressed }) => [
                {
                  flex: 1,
                  backgroundColor: action.color + "18",
                  borderWidth: 1,
                  borderColor: action.color + "44",
                  borderRadius: theme.radius.md,
                  paddingVertical: theme.spacing[12],
                  alignItems: "center",
                  gap: 4,
                },
                pressed && { opacity: 0.8 }
              ]}
            >
              <Feather name={action.icon as any} size={18} color={action.color} />
              <Text style={{ color: action.color, ...theme.typography.captionSemi }}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tabs */}
        <View
          style={{
            flexDirection: "row",
            marginHorizontal: theme.spacing[20],
            backgroundColor: colors.secondary,
            borderRadius: theme.radius.md,
            padding: 3,
            marginBottom: theme.spacing[20],
          }}
        >
          {(["overview", "timeline", "email"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: theme.spacing[8],
                borderRadius: theme.radius.sm,
                alignItems: "center",
                backgroundColor:
                  activeTab === tab ? colors.card : "transparent",
              }}
            >
              <Text
                style={{
                  color:
                    activeTab === tab ? colors.foreground : colors.mutedForeground,
                  ...theme.typography.bodySmallSemi,
                  fontWeight: activeTab === tab ? "600" : "400",
                  textTransform: "capitalize",
                }}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab content */}
        <Animated.View
          key={activeTab}
          entering={FadeInDown.duration(200)}
          style={{ paddingHorizontal: theme.spacing[20] }}
        >
          {activeTab === "overview" && (
            <View style={{ gap: theme.spacing[12] }}>
              {/* AI Summary */}
              {contact.aiSummary && (
                <View
                  style={{
                    backgroundColor: colors.primary + "14",
                    borderWidth: 1,
                    borderColor: colors.primary + "33",
                    borderRadius: theme.radius.md,
                    padding: theme.spacing[16],
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: theme.spacing[8] }}>
                    <Ionicons name="sparkles" size={14} color={colors.primary} />
                    <Text style={{ color: colors.primary, ...theme.typography.label }}>
                      AI SUMMARY
                    </Text>
                  </View>
                  <Text style={{ color: colors.foreground, ...theme.typography.bodySmall, lineHeight: 20 }}>
                    {contact.aiSummary}
                  </Text>
                </View>
              )}

              {/* Contact info */}
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: theme.radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: "hidden",
                }}
              >
                {[
                  { icon: "mail", label: "Email", value: contact.email },
                  { icon: "phone", label: "Phone", value: contact.phone },
                  ...(contact.website
                    ? [{ icon: "globe", label: "Website", value: contact.website }]
                    : []),
                  ...(contact.linkedin
                    ? [{ icon: "linkedin", label: "LinkedIn", value: contact.linkedin }]
                    : []),
                ].map((item, i, arr) => (
                  <View
                    key={item.label}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: theme.spacing[16],
                      paddingVertical: theme.spacing[12],
                      borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                      gap: theme.spacing[12],
                    }}
                  >
                    <Feather name={item.icon as any} size={16} color={colors.mutedForeground} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.mutedForeground, ...theme.typography.label }}>
                        {item.label}
                      </Text>
                      <Text style={{ color: colors.foreground, ...theme.typography.body, marginTop: 1 }}>
                        {item.value}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Tags */}
              {contact.tags.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing[8] }}>
                  {contact.tags.map((tag) => (
                    <View
                      key={tag}
                      style={{
                        backgroundColor: colors.secondary,
                        paddingHorizontal: theme.spacing[12],
                        paddingVertical: 5,
                        borderRadius: theme.radius.xl,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ color: colors.mutedForeground, ...theme.typography.caption }}>
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Add note */}
              <View style={{ gap: theme.spacing[8] }}>
                <TextInput
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder="Add a note..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  style={{
                    backgroundColor: colors.secondary,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: theme.radius.md,
                    paddingHorizontal: theme.spacing[14],
                    paddingVertical: theme.spacing[12],
                    color: colors.foreground,
                    ...theme.typography.body,
                    minHeight: 70,
                    textAlignVertical: "top",
                  }}
                />
                {noteText.trim().length > 0 && (
                  <Pressable
                    onPress={handleAddNote}
                    style={({ pressed }) => [
                      {
                        backgroundColor: colors.primary,
                        paddingVertical: theme.spacing[12],
                        borderRadius: theme.radius.md,
                        alignItems: "center",
                      },
                      pressed && { opacity: 0.8 }
                    ]}
                  >
                    <Text style={{ color: "#fff", ...theme.typography.bodySemi }}>
                      Save Note
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {activeTab === "timeline" && (
            <View style={{ paddingTop: 4 }}>
              {contact.timeline.length === 0 ? (
                <View style={{ alignItems: "center", paddingTop: 40, gap: theme.spacing[10] }}>
                  <GlassIcon tint={colors.primary} size={64}>
                    <Feather name="clock" size={24} color="#fff" />
                  </GlassIcon>
                  <Text style={{ color: colors.mutedForeground, ...theme.typography.bodyLargeSemi }}>No activity yet</Text>
                  <Text style={{ color: colors.mutedForeground, ...theme.typography.bodySmall }}>Interactions will appear here.</Text>
                </View>
              ) : (
                [...contact.timeline]
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                  )
                  .map((event, i, arr) => (
                    <TimelineItem
                      key={event.id}
                      event={event}
                      contact={contact}
                      isLast={i === arr.length - 1}
                    />
                  ))
              )}
            </View>
          )}

          {activeTab === "email" && (
            <View style={{ gap: theme.spacing[14] }}>
              {contact.introEmailDraft ? (
                <View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: theme.spacing[12],
                    }}
                  >
                    <Text
                      style={{
                        color: colors.foreground,
                        ...theme.typography.bodyLargeSemi,
                      }}
                    >
                      Email Draft
                    </Text>
                    {contact.emailSent && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Feather name="check" size={14} color="#10B981" />
                        <Text style={{ color: "#10B981", ...theme.typography.captionSemi }}>Sent</Text>
                      </View>
                    )}
                  </View>

                  <View
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: theme.radius.md,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: theme.spacing[16],
                    }}
                  >
                    <Text style={{ color: colors.foreground, ...theme.typography.body, lineHeight: 22 }}>
                      {contact.introEmailDraft}
                    </Text>
                  </View>

                  {!contact.emailSent && (
                    <Pressable
                      onPress={() => setShowEmailModal(true)}
                      style={({ pressed }) => [
                        {
                          marginTop: theme.spacing[16],
                          backgroundColor: colors.primary,
                          paddingVertical: theme.spacing[14],
                          borderRadius: theme.radius.md,
                          alignItems: "center",
                          flexDirection: "row",
                          justifyContent: "center",
                          gap: 8,
                        },
                        pressed && { opacity: 0.8 }
                      ]}
                    >
                      <Feather name="send" size={16} color="#fff" />
                      <Text style={{ color: "#fff", ...theme.typography.bodySemi }}>
                        Edit & Send
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <View style={{ alignItems: "center", paddingTop: 40, gap: 10 }}>
                  <GlassIcon tint={colors.primary} size={64}>
                    <Feather name="mail" size={24} color="#fff" />
                  </GlassIcon>
                  <Text style={{ color: colors.mutedForeground, ...theme.typography.bodyLargeSemi }}>No draft available</Text>
                  <Text style={{ color: colors.mutedForeground, ...theme.typography.bodySmall }}>Draft an email during the scan process.</Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <MeetingModal
        visible={showMeetingModal}
        contact={contact}
        onClose={() => setShowMeetingModal(false)}
      />

      {/* Send Email Modal */}
      <Modal visible={showEmailModal} animationType="slide" presentationStyle="pageSheet">
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
            <Pressable onPress={() => setShowEmailModal(false)} hitSlop={10}>
              <Text style={{ color: colors.mutedForeground, ...theme.typography.bodyLargeSemi }}>
                Cancel
              </Text>
            </Pressable>
            <Text style={{ color: colors.foreground, ...theme.typography.h4 }}>
              Send Email
            </Text>
            <Pressable onPress={handleSendEmail} hitSlop={10}>
              <Text style={{ color: colors.primary, ...theme.typography.bodyLargeSemi }}>
                Send
              </Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: theme.spacing[20] }}>
            <View style={{ marginBottom: theme.spacing[16] }}>
              <Text style={{ color: colors.mutedForeground, ...theme.typography.label, marginBottom: theme.spacing[6] }}>
                To
              </Text>
              <TextInput
                value={contact.email}
                editable={false}
                style={{
                  backgroundColor: colors.secondary,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: theme.radius.md,
                  paddingHorizontal: theme.spacing[14],
                  paddingVertical: theme.spacing[12],
                  color: colors.foreground,
                  ...theme.typography.body,
                  opacity: 0.7,
                }}
              />
            </View>
            <View style={{ marginBottom: theme.spacing[16] }}>
              <Text style={{ color: colors.mutedForeground, ...theme.typography.label, marginBottom: theme.spacing[6] }}>
                Message
              </Text>
              <TextInput
                value={contact.introEmailDraft}
                onChangeText={(v) => updateContact(contact.id, { introEmailDraft: v })}
                multiline
                style={{
                  backgroundColor: colors.secondary,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: theme.radius.md,
                  paddingHorizontal: theme.spacing[14],
                  paddingVertical: theme.spacing[12],
                  color: colors.foreground,
                  ...theme.typography.body,
                  minHeight: 200,
                  textAlignVertical: "top",
                }}
              />
            </View>
            <Text style={{ color: colors.mutedForeground, ...theme.typography.caption }}>
              This email will be sent via RelateIQ+ verified servers. Your reply-to address will be set to your email.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}