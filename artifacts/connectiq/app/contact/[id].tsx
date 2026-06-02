import { Feather, Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
import { useApp, TimelineEvent } from "@/context/AppContext";
import { sendEmail } from "@/lib/emailApi";
import { useColors } from "@/hooks/useColors";

function TimelineItem({
  event,
  isLast,
}: {
  event: TimelineEvent;
  isLast: boolean;
}) {
  const colors = useColors();

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

  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <View style={{ alignItems: "center", width: 36 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: color + "22",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: color + "55",
          }}
        >
          <Feather name={name} size={15} color={color} />
        </View>
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
      <View style={{ flex: 1, paddingBottom: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" as const }}>
            {event.title}
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
            {formattedDate}
          </Text>
        </View>
        {event.description && (
          <Text
            style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 3 }}
          >
            {event.description}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contacts, updateContact, deleteContact, addTimelineEvent, profile } = useApp();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [savedToPhone, setSavedToPhone] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "email">("overview");

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

  function getScoreColor(score: number) {
    if (score >= 80) return "#10B981";
    if (score >= 50) return "#F59E0B";
    if (score >= 20) return "#4F8EFF";
    return "#6B7490";
  }

  async function handleSaveToContacts() {
    if (Platform.OS === "web") {
      Alert.alert("Not supported", "Saving to phone contacts requires the mobile app.");
      return;
    }

    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission denied",
        "ConnectIQ needs access to your contacts to save this person.",
      );
      return;
    }

    try {
      const newContact: Contacts.Contact = {
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
        urlAddresses: contact.linkedIn
          ? [{ url: contact.linkedIn, label: "LinkedIn" }]
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
      Alert.alert("Error", "Could not save contact. Please try again.");
    }
  }

  async function handleSendEmail() {
    const emailBody =
      contact.introEmailDraft ||
      `Hi ${contact.firstName},\n\nGreat connecting with you!\n\nLooking forward to staying in touch.\n\nBest regards,`;

    const result = await sendEmail({
      to: contact.email,
      subject: `Following up${contact.eventName ? ` — met at ${contact.eventName}` : ""}`,
      body: emailBody,
      fromName: profile.name,
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
      setShowEmailModal(false);
    } else {
      Alert.alert("Send failed", result.error ?? "Could not send email. Check your Gmail credentials.");
    }
  }

  function handleAddNote() {
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
            paddingBottom: 24,
            paddingHorizontal: 20,
          }}
        >
          {/* Back + actions */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Pressable
              onPress={() => router.back()}
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

          <View style={{ alignItems: "center", gap: 12 }}>
            <Avatar contact={contact} size={72} />
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  color: "#fff",
                  fontSize: 24,
                  fontWeight: "700" as const,
                  letterSpacing: -0.3,
                }}
              >
                {contact.firstName} {contact.lastName}
              </Text>
              <Text
                style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, marginTop: 2 }}
              >
                {contact.jobTitle} · {contact.company}
              </Text>
              {contact.eventName && (
                <Text
                  style={{
                    color: "rgba(255,255,255,0.45)",
                    fontSize: 12,
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
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: 20,
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
              <Text style={{ color: scoreColor, fontSize: 14, fontWeight: "700" as const }}>
                {contact.relationshipScore} Relationship Score
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick actions */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 20,
            gap: 10,
            marginTop: -12,
            marginBottom: 20,
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
              onPress: () => {},
            },
            {
              icon: "calendar",
              label: "Meet",
              color: "#F59E0B",
              onPress: () => {
                addTimelineEvent(contact.id, {
                  type: "meeting",
                  title: "Meeting booked",
                  date: new Date().toISOString(),
                });
                updateContact(contact.id, { meetingBooked: true });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
              style={{
                flex: 1,
                backgroundColor: action.color + "18",
                borderWidth: 1,
                borderColor: action.color + "44",
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: "center",
                gap: 4,
              }}
            >
              <Feather name={action.icon as any} size={18} color={action.color} />
              <Text style={{ color: action.color, fontSize: 12, fontWeight: "600" as const }}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tabs */}
        <View
          style={{
            flexDirection: "row",
            marginHorizontal: 20,
            backgroundColor: colors.secondary,
            borderRadius: 12,
            padding: 3,
            marginBottom: 20,
          }}
        >
          {(["overview", "timeline", "email"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor:
                  activeTab === tab ? colors.card : "transparent",
              }}
            >
              <Text
                style={{
                  color:
                    activeTab === tab ? colors.foreground : colors.mutedForeground,
                  fontSize: 13,
                  fontWeight: activeTab === tab ? ("600" as const) : ("400" as const),
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
          style={{ paddingHorizontal: 20 }}
        >
          {activeTab === "overview" && (
            <View style={{ gap: 12 }}>
              {/* AI Summary */}
              {contact.aiSummary && (
                <View
                  style={{
                    backgroundColor: colors.primary + "14",
                    borderWidth: 1,
                    borderColor: colors.primary + "33",
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Ionicons name="sparkles" size={14} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.5 }}>
                      AI SUMMARY
                    </Text>
                  </View>
                  <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20 }}>
                    {contact.aiSummary}
                  </Text>
                </View>
              )}

              {/* Contact info */}
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 14,
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
                      paddingHorizontal: 16,
                      paddingVertical: 13,
                      borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                      gap: 12,
                    }}
                  >
                    <Feather name={item.icon as any} size={16} color={colors.mutedForeground} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: "600" as const }}>
                        {item.label.toUpperCase()}
                      </Text>
                      <Text style={{ color: colors.foreground, fontSize: 14, marginTop: 1 }}>
                        {item.value}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Tags */}
              {contact.tags.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {contact.tags.map((tag) => (
                    <View
                      key={tag}
                      style={{
                        backgroundColor: colors.secondary,
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Add note */}
              <View style={{ gap: 8 }}>
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
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    color: colors.foreground,
                    fontSize: 14,
                    minHeight: 70,
                    textAlignVertical: "top",
                  }}
                />
                {noteText.trim().length > 0 && (
                  <Pressable
                    onPress={handleAddNote}
                    style={{
                      backgroundColor: colors.primary,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "600" as const }}>
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
                <View style={{ alignItems: "center", paddingTop: 40, gap: 10 }}>
                  <Feather name="clock" size={32} color={colors.mutedForeground} />
                  <Text style={{ color: colors.mutedForeground }}>No activity yet</Text>
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
                      isLast={i === arr.length - 1}
                    />
                  ))
              )}
            </View>
          )}

          {activeTab === "email" && (
            <View style={{ gap: 14 }}>
              {contact.introEmailDraft ? (
                <View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: 16,
                        fontWeight: "600" as const,
                      }}
                    >
                      Intro Email
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        backgroundColor: contact.emailSent
                          ? "#10B98122"
                          : colors.secondary,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 20,
                      }}
                    >
                      <Feather
                        name={contact.emailSent ? "check" : "clock"}
                        size={12}
                        color={contact.emailSent ? "#10B981" : colors.mutedForeground}
                      />
                      <Text
                        style={{
                          color: contact.emailSent
                            ? "#10B981"
                            : colors.mutedForeground,
                          fontSize: 12,
                          fontWeight: "600" as const,
                        }}
                      >
                        {contact.emailSent ? "Sent" : "Draft"}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 16,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: 14,
                        lineHeight: 22,
                      }}
                    >
                      {contact.introEmailDraft}
                    </Text>
                  </View>
                  {!contact.emailSent && (
                    <Pressable
                      onPress={() => setShowEmailModal(true)}
                      style={{ marginTop: 12 }}
                    >
                      <LinearGradient
                        colors={["#7B5EFF", "#4F8EFF"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          paddingVertical: 14,
                          borderRadius: 14,
                          alignItems: "center",
                          flexDirection: "row",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        <Feather name="send" size={16} color="#fff" />
                        <Text style={{ color: "#fff", fontWeight: "700" as const }}>
                          Send Email
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  )}
                </View>
              ) : (
                <View style={{ alignItems: "center", paddingTop: 40, gap: 12 }}>
                  <Feather name="mail" size={40} color={colors.mutedForeground} />
                  <Text style={{ color: colors.mutedForeground, fontSize: 16, fontWeight: "600" as const }}>
                    No email draft
                  </Text>
                  <Pressable
                    onPress={() => setShowEmailModal(true)}
                    style={{
                      backgroundColor: colors.primary,
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      borderRadius: 20,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "600" as const }}>
                      Compose Email
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Email confirmation modal */}
      <Modal
        visible={showEmailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
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
            <Pressable onPress={() => setShowEmailModal(false)}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "600" as const }}>
              Send Email
            </Text>
            <Pressable onPress={handleSendEmail}>
              <Text style={{ color: colors.primary, fontSize: 17, fontWeight: "600" as const }}>
                Send
              </Text>
            </Pressable>
          </View>
          <View style={{ padding: 20 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, marginBottom: 16 }}>
              To: {contact.email}
            </Text>
            <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 22 }}>
              {contact.introEmailDraft ||
                `Hi ${contact.firstName},\n\nGreat connecting with you!\n\nLooking forward to staying in touch.\n\nBest regards,`}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
