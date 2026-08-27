import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";
import { Contact, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  createMeetingEvent,
  MeetingCalendarResult,
  openCalendarEvent,
} from "@/lib/deviceCalendar";
import { sendMeetingInvite } from "@/lib/emailApi";

interface MeetingModalProps {
  visible: boolean;
  contact: Contact;
  onClose: () => void;
}

function getTomorrowDateString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function isValidTime(t: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(t);
}

function isValidDate(d: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!match) return false;
  const parsed = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return (
    parsed.getFullYear() === Number(match[1]) &&
    parsed.getMonth() === Number(match[2]) - 1 &&
    parsed.getDate() === Number(match[3])
  );
}

function createMeetingUid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function MeetingModal({ visible, contact, onClose }: MeetingModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    addTimelineEvent,
    updateContact,
    updateMeetingMetadata,
  } = useApp();
  const { getToken } = useAuth();

  const [title, setTitle] = useState(`Meeting with ${contact.firstName || contact.email}`);
  const [date, setDate] = useState(getTomorrowDateString());
  const [time, setTime] = useState("10:00");
  const [durationStr, setDurationStr] = useState("30");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [reminderStr, setReminderStr] = useState("60");

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(`Meeting with ${contact.firstName || contact.email}`);
    setDate(getTomorrowDateString());
    setTime("10:00");
    setDurationStr("30");
    setLocation("");
    setNotes("");
    setReminderStr("60");
  }, [contact.email, contact.firstName, visible]);

  async function handleSubmit() {
    const cleanTitle = title.trim();
    const cleanLocation = location.trim();
    const cleanNotes = notes.trim();
    if (!cleanTitle || cleanTitle.length > 255) {
      Alert.alert("Missing Title", "Please provide a meeting title.");
      return;
    }
    if (!isValidDate(date)) {
      Alert.alert("Invalid Date", "Please use YYYY-MM-DD format.");
      return;
    }
    if (!isValidTime(time)) {
      Alert.alert("Invalid Time", "Please use HH:MM format (24-hour).");
      return;
    }
    const durationMinutes = Number(durationStr);
    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes <= 0 ||
      durationMinutes > 1_440
    ) {
      Alert.alert(
        "Invalid Duration",
        "Duration must be between 1 minute and 24 hours.",
      );
      return;
    }
    const reminderMinutes = Number(reminderStr);
    if (
      !Number.isInteger(reminderMinutes) ||
      reminderMinutes < 0 ||
      reminderMinutes > 10_080
    ) {
      Alert.alert(
        "Invalid Reminder",
        "Reminder must be between 0 minutes and 7 days.",
      );
      return;
    }
    if (cleanLocation.length > 500 || cleanNotes.length > 5_000) {
      Alert.alert(
        "Meeting details are too long",
        "Please shorten the location or notes.",
      );
      return;
    }

    const startDateTime = new Date(`${date}T${time}:00`);
    if (isNaN(startDateTime.getTime())) {
      Alert.alert("Invalid Date/Time", "Could not parse the provided date and time.");
      return;
    }
    if (startDateTime.getTime() < Date.now()) {
      Alert.alert("Invalid Time", "Meeting start time must be in the future.");
      return;
    }

    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

    setIsSubmitting(true);

    try {
      const uid = createMeetingUid();
      const startDate = startDateTime.toISOString();
      const endDate = endDateTime.toISOString();
      const timelineEventId = addTimelineEvent(contact.id, {
        type: "meeting",
        title: "Meeting scheduled",
        description: cleanTitle,
        date: startDate,
        meetingMetadata: {
          uid,
          title: cleanTitle,
          startDate,
          endDate,
          location: cleanLocation || undefined,
          notes: cleanNotes || undefined,
          calendarStatus: "pending",
          inviteStatus: contact.email ? "pending" : "not-sent",
          reminderMinutes,
        },
      });
      updateContact(contact.id, { meetingBooked: true });

      let calRes: MeetingCalendarResult = { status: "failed" };
      try {
        calRes = await createMeetingEvent({
          uid,
          title: cleanTitle,
          startDate,
          endDate,
          location: cleanLocation || undefined,
          notes: cleanNotes || undefined,
          alarmMinutes: reminderMinutes,
        });
      } catch {
        // The calendar result is persisted as failed below.
      } finally {
        try {
          updateMeetingMetadata(contact.id, timelineEventId, {
            calendarEventId:
              calRes.status === "success" ? calRes.eventId : undefined,
            calendarStatus: calRes.status,
          });
        } catch {
          // Keep invitation delivery independent from a local state persistence error.
        }
      }

      let inviteStatus:
        | "success"
        | "pending"
        | "unknown"
        | "failed"
        | "not-sent" = contact.email ? "failed" : "not-sent";
      let inviteError: string | undefined;
      try {
        if (contact.email) {
          const token = await getToken().catch(() => null);
          if (!token) throw new Error("Please sign in again to send the invitation.");
          const res = await sendMeetingInvite({
            uid,
            to: contact.email,
            title: cleanTitle,
            startDate,
            endDate,
            location: cleanLocation || undefined,
            description: cleanNotes || undefined,
            reminderMinutes,
            token,
          });
          if (res.success) {
            inviteStatus =
              res.deliveryStatus === "sent"
                ? "success"
                : res.deliveryStatus;
          } else {
            inviteStatus = "failed";
            inviteError = res.error || "Invitation delivery failed.";
          }
        }
      } catch (error) {
        inviteStatus = "failed";
        inviteError =
          error instanceof Error ? error.message : "Invitation delivery failed.";
      } finally {
        try {
          updateMeetingMetadata(contact.id, timelineEventId, {
            inviteStatus,
            inviteError,
          });
        } catch {
          // Calendar completion has already been persisted independently.
        }
      }

      if (calRes.status === "success" && inviteStatus === "success") {
        onClose();
        Alert.alert(
          "Meeting scheduled",
          `The calendar event was created and an invitation was sent to ${contact.email}.`,
          [
            { text: "Done", style: "cancel" },
            {
              text: "Open Calendar",
              onPress: () => void openCalendarEvent(calRes.eventId),
            },
          ],
        );
      } else {
        const calendarMessage =
          calRes.status === "success"
            ? "Calendar event created."
            : `Calendar: ${calRes.status.replaceAll("-", " ")}.`;
        const inviteMessage =
          inviteStatus === "success"
            ? "Invitation sent."
            : inviteStatus === "pending"
              ? "Invitation delivery is still processing."
              : inviteStatus === "unknown"
                ? "Invitation was submitted, but delivery could not be confirmed. It will not be resent automatically."
            : inviteStatus === "not-sent"
              ? "Invitation not sent because this contact has no email."
              : `Invitation: ${inviteError || "delivery failed"}`;
        onClose();
        Alert.alert(
          "Meeting saved",
          `${calendarMessage}\n${inviteMessage}\n\nYou can retry failed steps from the timeline.`,
        );
      }
    } catch {
      Alert.alert(
        "Meeting could not be saved",
        "Please check the details and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: theme.spacing[20],
            paddingTop: Platform.OS === "web" ? 20 : insets.top + theme.spacing[16],
            paddingBottom: theme.spacing[16],
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          <Pressable onPress={onClose} hitSlop={12} disabled={isSubmitting}>
            <Text style={{ color: colors.mutedForeground, ...theme.typography.bodyLarge }}>Cancel</Text>
          </Pressable>
          <Text style={{ color: colors.foreground, ...theme.typography.bodyLargeSemi }}>
            Schedule Meeting
          </Text>
          <Pressable onPress={handleSubmit} hitSlop={12} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={{ color: colors.primary, ...theme.typography.bodyLargeSemi }}>Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: theme.spacing[20], gap: theme.spacing[20] }} keyboardShouldPersistTaps="handled">
          
          <View style={{ gap: theme.spacing[8] }}>
            <Text style={{ color: colors.foreground, ...theme.typography.bodySemi }}>Title</Text>
            <TextInput
              style={inputStyle(colors)}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Intro Chat"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          <View style={{ flexDirection: "row", gap: theme.spacing[16] }}>
            <View style={{ flex: 1, gap: theme.spacing[8] }}>
              <Text style={{ color: colors.foreground, ...theme.typography.bodySemi }}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={inputStyle(colors)}
                value={date}
                onChangeText={setDate}
                placeholder="2024-12-31"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={{ flex: 1, gap: theme.spacing[8] }}>
              <Text style={{ color: colors.foreground, ...theme.typography.bodySemi }}>Time (HH:MM)</Text>
              <TextInput
                style={inputStyle(colors)}
                value={time}
                onChangeText={setTime}
                placeholder="10:00"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: theme.spacing[16] }}>
            <View style={{ flex: 1, gap: theme.spacing[8] }}>
              <Text style={{ color: colors.foreground, ...theme.typography.bodySemi }}>Duration (mins)</Text>
              <TextInput
                style={inputStyle(colors)}
                value={durationStr}
                onChangeText={setDurationStr}
                keyboardType="numeric"
                placeholder="30"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={{ flex: 1, gap: theme.spacing[8] }}>
              <Text style={{ color: colors.foreground, ...theme.typography.bodySemi }}>Reminder (mins)</Text>
              <TextInput
                style={inputStyle(colors)}
                value={reminderStr}
                onChangeText={setReminderStr}
                keyboardType="numeric"
                placeholder="60"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          <View style={{ gap: theme.spacing[8] }}>
            <Text style={{ color: colors.foreground, ...theme.typography.bodySemi }}>Location (Optional)</Text>
            <TextInput
              style={inputStyle(colors)}
              value={location}
              onChangeText={setLocation}
              placeholder="Zoom link or address"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          <View style={{ gap: theme.spacing[8] }}>
            <Text style={{ color: colors.foreground, ...theme.typography.bodySemi }}>Notes (Optional)</Text>
            <TextInput
              style={[inputStyle(colors), { minHeight: 80, textAlignVertical: "top" }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Agenda or context..."
              placeholderTextColor={colors.mutedForeground}
              multiline
            />
          </View>

          <View style={{ marginTop: theme.spacing[8], padding: theme.spacing[12], backgroundColor: colors.secondary, borderRadius: theme.radius.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Feather name="mail" size={16} color={contact.email ? colors.primary : colors.mutedForeground} />
              <Text style={{ color: colors.foreground, ...theme.typography.bodySemi }}>
                Email Invitation
              </Text>
            </View>
            {contact.email ? (
              <Text style={{ color: colors.mutedForeground, ...theme.typography.bodySmall }}>
                An invitation will be sent to {contact.email}. Your verified
                account email will be shown as the organizer.
              </Text>
            ) : (
              <Text style={{ color: colors.mutedForeground, ...theme.typography.bodySmall }}>
                No email saved for this contact. A calendar invite cannot be sent.
              </Text>
            )}
          </View>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function inputStyle(colors: any) {
  return {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[12],
    color: colors.foreground,
    ...theme.typography.body,
  };
}
