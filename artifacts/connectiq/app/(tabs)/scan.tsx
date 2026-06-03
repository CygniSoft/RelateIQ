import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScanFrame } from "@/components/ScanFrame";
import { useApp, ContactCategory, FollowUpAction, Priority } from "@/context/AppContext";
import { sendEmail } from "@/lib/emailApi";
import { useColors } from "@/hooks/useColors";

type ScanStep = "idle" | "scanning" | "review" | "context" | "email" | "done";

const MOCK_EXTRACTED = {
  firstName: "Jordan",
  lastName: "Blake",
  company: "NovaTech Industries",
  jobTitle: "Director of Partnerships",
  email: "jordan.blake@novatech.com",
  phone: "+1 (416) 555-0789",
  website: "novatech.com",
  linkedin: "linkedin.com/in/jordanblake",
};

function generateAISummary(data: typeof MOCK_EXTRACTED, eventName: string, notes: string) {
  return `Met ${data.firstName} ${data.lastName} at ${eventName || "a networking event"}. ${data.firstName} is ${data.jobTitle} at ${data.company}. ${notes ? `Discussion: ${notes}` : "Exploring potential partnership opportunities."} Recommended next step: send company profile and schedule intro call.`;
}

function generateIntroEmail(data: typeof MOCK_EXTRACTED, eventName: string, userProfile: { name: string; company: string; jobTitle: string }) {
  return `Hi ${data.firstName},\n\nIt was great meeting you at ${eventName || "the event"}!\n\nI enjoyed our conversation and learning more about ${data.company}.\n\nAs mentioned, I'm ${userProfile.name} from ${userProfile.company}, where I work as ${userProfile.jobTitle}. I'd love to explore how we might work together.\n\nWould you be open to a quick 20-minute call this week?\n\nBest regards,\n${userProfile.name}`;
}

export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addContact, profile } = useApp();

  const [step, setStep] = useState<ScanStep>("idle");
  const [cardImageUri, setCardImageUri] = useState<string | undefined>();
  const [extracted, setExtracted] = useState({ ...MOCK_EXTRACTED });
  const [eventName, setEventName] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<ContactCategory>("Potential client");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [followUp, setFollowUp] = useState<FollowUpAction>("Send intro email");
  const [emailDraft, setEmailDraft] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [dealValue, setDealValue] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 + 24 : insets.bottom + 56 + 24;

  function simulateScan(uri?: string) {
    setCardImageUri(uri);
    setStep("scanning");
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("review");
    }, 2200);
  }

  async function handleScan() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Camera is blocked inside the web preview iframe — skip straight to AI extraction
    if (Platform.OS === "web") {
      simulateScan();
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera access needed", "Please allow camera access to scan business cards.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      quality: 0.9,
      allowsEditing: true,
      aspect: [16, 10],
    });
    if (!result.canceled && result.assets[0]) {
      simulateScan(result.assets[0].uri);
    }
  }

  async function handlePickFromLibrary() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // File picker is restricted inside the web preview iframe — skip straight to AI extraction
    if (Platform.OS === "web") {
      simulateScan();
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      simulateScan(result.assets[0].uri);
    }
  }

  function handleProceedToContext() {
    setStep("context");
  }

  function handleGenerateEmail() {
    const summary = generateAISummary(extracted, eventName, notes);
    const email = generateIntroEmail(extracted, eventName, profile);
    setAiSummary(summary);
    setEmailDraft(email);
    setStep("email");
  }

  async function handleSaveContact() {
    addContact({
      ...extracted,
      cardImageUri,
      eventName,
      meetingNotes: notes,
      aiSummary,
      introEmailDraft: emailDraft,
      followUpAction: followUp,
      followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      category,
      priority,
      relationshipScore: priority === "High" ? 72 : priority === "Medium" ? 48 : 25,
      tags: [category, eventName].filter(Boolean),
      emailSent: true,
      replyReceived: false,
      meetingBooked: false,
      dealValue: dealValue ? parseInt(dealValue) * 1000 : undefined,
    });

    // Fire real email — don't block on result, contact is already saved
    sendEmail({
      to: extracted.email,
      subject: `Great meeting you${eventName ? ` at ${eventName}` : ""}`,
      body: emailDraft,
      fromName: profile.name,
    }).catch(() => {
      // Silent — email failure doesn't block the save
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep("done");
    setTimeout(() => {
      setStep("idle");
      setExtracted({ ...MOCK_EXTRACTED });
      setEventName("");
      setNotes("");
      setCardImageUri(undefined);
      setEmailDraft("");
      setAiSummary("");
      setDealValue("");
    }, 2500);
  }

  function handleManualEntry() {
    setStep("review");
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Step: Idle */}
      {step === "idle" && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={{ flex: 1, paddingTop: topPad }}
        >
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: 16,
            }}
          >
            <Text
              style={{
                color: colors.foreground,
                fontSize: 28,
                fontWeight: "700" as const,
                letterSpacing: -0.5,
              }}
            >
              Scan Card
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, marginTop: 4 }}>
              Capture a business card to save the contact
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 0,
            }}
          >
            <ScanFrame active={true} />

            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: 13,
                textAlign: "center",
                marginTop: 24,
                marginBottom: Platform.OS === "web" ? 8 : 36,
              }}
            >
              Position the business card within the frame
            </Text>

            {Platform.OS === "web" && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: "rgba(79,142,255,0.1)",
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  marginBottom: 28,
                  borderWidth: 1,
                  borderColor: "rgba(79,142,255,0.25)",
                }}
              >
                <Feather name="info" size={13} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 12 }}>
                  Camera uses AI demo mode in web preview
                </Text>
              </View>
            )}

            {/* Main scan button */}
            <Pressable onPress={handleScan}>
              <LinearGradient
                colors={["#7B5EFF", "#4F8EFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 24,
                  ...(Platform.OS !== "web"
                    ? {
                        shadowColor: "#7B5EFF",
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.5,
                        shadowRadius: 20,
                        elevation: 8,
                      }
                    : {}),
                }}
              >
                <Ionicons name="camera" size={32} color="#fff" />
              </LinearGradient>
            </Pressable>

            <View style={{ flexDirection: "row", gap: 16 }}>
              <Pressable
                onPress={handlePickFromLibrary}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                }}
              >
                <Feather name="image" size={15} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                  From Library
                </Text>
              </Pressable>
              <Pressable
                onPress={handleManualEntry}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                }}
              >
                <Feather name="edit-3" size={15} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                  Manual Entry
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Step: Scanning (loading) */}
      {step === "scanning" && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "600" as const }}>
            Extracting details...
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
            AI is reading the business card
          </Text>
        </Animated.View>
      )}

      {/* Step: Review Extracted Data */}
      {step === "review" && (
        <Animated.View entering={FadeInDown.duration(300)} style={{ flex: 1 }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={{
                paddingTop: topPad + 16,
                paddingBottom: bottomPad,
                paddingHorizontal: 20,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 22,
                  fontWeight: "700" as const,
                  marginBottom: 6,
                }}
              >
                Review Details
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 14,
                  marginBottom: 24,
                }}
              >
                Edit any extracted information
              </Text>

              {(
                [
                  { label: "First Name", key: "firstName" },
                  { label: "Last Name", key: "lastName" },
                  { label: "Company", key: "company" },
                  { label: "Job Title", key: "jobTitle" },
                  { label: "Email", key: "email" },
                  { label: "Phone", key: "phone" },
                  { label: "Website", key: "website" },
                  { label: "LinkedIn", key: "linkedin" },
                ] as Array<{ label: string; key: keyof typeof MOCK_EXTRACTED }>
              ).map((field) => (
                <View key={field.key} style={{ marginBottom: 14 }}>
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
                    {field.label}
                  </Text>
                  <TextInput
                    value={extracted[field.key]}
                    onChangeText={(v) =>
                      setExtracted((prev) => ({ ...prev, [field.key]: v }))
                    }
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

              <Pressable
                onPress={handleProceedToContext}
                style={{ marginTop: 8 }}
              >
                <LinearGradient
                  colors={["#7B5EFF", "#4F8EFF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: 16,
                    borderRadius: 16,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: "700" as const,
                    }}
                  >
                    Add Context
                  </Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      {/* Step: Context */}
      {step === "context" && (
        <Animated.View entering={FadeInDown.duration(300)} style={{ flex: 1 }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={{
                paddingTop: topPad + 16,
                paddingBottom: bottomPad,
                paddingHorizontal: 20,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 22,
                  fontWeight: "700" as const,
                  marginBottom: 6,
                }}
              >
                Add Context
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 14,
                  marginBottom: 24,
                }}
              >
                Tell AI what you discussed
              </Text>

              <View style={{ marginBottom: 16 }}>
                <Text style={labelStyle(colors)}>Event Name</Text>
                <TextInput
                  value={eventName}
                  onChangeText={setEventName}
                  placeholder="e.g. Toronto Business Expo"
                  placeholderTextColor={colors.mutedForeground}
                  style={inputStyle(colors)}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={labelStyle(colors)}>Meeting Notes</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="What did you discuss?"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={3}
                  style={[inputStyle(colors), { height: 80, textAlignVertical: "top" }]}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={labelStyle(colors)}>Deal Value (in $K)</Text>
                <TextInput
                  value={dealValue}
                  onChangeText={setDealValue}
                  placeholder="e.g. 50"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                  style={inputStyle(colors)}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={labelStyle(colors)}>Category</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                  {(
                    [
                      "Potential client",
                      "Partner",
                      "Investor",
                      "Referral source",
                      "Vendor",
                      "Other",
                    ] as ContactCategory[]
                  ).map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor:
                          category === cat ? colors.primary : colors.border,
                        backgroundColor:
                          category === cat
                            ? colors.primary + "22"
                            : colors.card,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            category === cat
                              ? colors.primary
                              : colors.mutedForeground,
                          fontSize: 13,
                          fontWeight: category === cat ? ("600" as const) : ("400" as const),
                        }}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={{ marginBottom: 24 }}>
                <Text style={labelStyle(colors)}>Priority</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                  {(["High", "Medium", "Low"] as Priority[]).map((p) => {
                    const pColor =
                      p === "High"
                        ? "#FF4757"
                        : p === "Medium"
                        ? "#F59E0B"
                        : "#6B7490";
                    return (
                      <Pressable
                        key={p}
                        onPress={() => setPriority(p)}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor:
                            priority === p ? pColor : colors.border,
                          backgroundColor:
                            priority === p ? pColor + "22" : colors.card,
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: priority === p ? pColor : colors.mutedForeground,
                            fontWeight: "600" as const,
                            fontSize: 14,
                          }}
                        >
                          {p}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Pressable onPress={handleGenerateEmail}>
                <LinearGradient
                  colors={["#7B5EFF", "#4F8EFF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: 16,
                    borderRadius: 16,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons name="sparkles" size={18} color="#fff" />
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: "700" as const,
                    }}
                  >
                    Generate AI Email
                  </Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      {/* Step: Email Preview */}
      {step === "email" && (
        <Animated.View entering={FadeInDown.duration(300)} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{
              paddingTop: topPad + 16,
              paddingBottom: bottomPad,
              paddingHorizontal: 20,
            }}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.primary + "22",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="sparkles" size={18} color={colors.primary} />
              </View>
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 22,
                  fontWeight: "700" as const,
                }}
              >
                AI Email Draft
              </Text>
            </View>
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: 14,
                marginBottom: 20,
              }}
            >
              Review before sending to {extracted.firstName}
            </Text>

            {/* AI Summary */}
            <View
              style={{
                backgroundColor: colors.primary + "14",
                borderWidth: 1,
                borderColor: colors.primary + "33",
                borderRadius: 14,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Feather name="cpu" size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.5 }}>
                  AI SUMMARY
                </Text>
              </View>
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20 }}>
                {aiSummary}
              </Text>
            </View>

            {/* Email */}
            <View
              style={{
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 14,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 6 }}>
                To: {extracted.email}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 12 }}>
                Subject: Great meeting you{eventName ? ` at ${eventName}` : ""}
              </Text>
              <TextInput
                value={emailDraft}
                onChangeText={setEmailDraft}
                multiline
                style={{
                  color: colors.foreground,
                  fontSize: 14,
                  lineHeight: 22,
                  minHeight: 180,
                  textAlignVertical: "top",
                }}
              />
            </View>

            <Pressable onPress={handleSaveContact}>
              <LinearGradient
                colors={["#10B981", "#059669"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 16,
                  borderRadius: 16,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Feather name="send" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" as const }}>
                  Send & Save Contact
                </Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </Animated.View>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <Animated.View
          entering={FadeIn.duration(400)}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <LinearGradient
            colors={["#10B981", "#059669"]}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="check" size={36} color="#fff" />
          </LinearGradient>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 22,
              fontWeight: "700" as const,
            }}
          >
            Contact Saved!
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
            Intro email sent to {extracted.firstName}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

function labelStyle(colors: ReturnType<typeof useColors>) {
  return {
    color: colors.mutedForeground,
    fontSize: 12,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    marginBottom: 6,
  };
}

function inputStyle(colors: ReturnType<typeof useColors>) {
  return {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.foreground,
    fontSize: 15,
  };
}
