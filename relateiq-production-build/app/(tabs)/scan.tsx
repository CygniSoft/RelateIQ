import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
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

import { useAuth } from "@clerk/expo";

import { GlassIcon } from "@/components/GlassIcon";
import { Paywall } from "@/components/Paywall";
import { ScanFrame } from "@/components/ScanFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  useApp,
  ContactCategory,
  FollowUpAction,
  Priority,
  FREE_SCAN_LIMIT,
} from "@/context/AppContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { sendEmail } from "@/lib/emailApi";
import { scanCard, type ExtractedCard } from "@/lib/scanApi";
import { useColors } from "@/hooks/useColors";
import { theme } from "@/constants/theme";

type ScanStep = "idle" | "scanning" | "review" | "context" | "email" | "done";

const EMPTY_EXTRACTED: ExtractedCard = {
  firstName: "",
  lastName: "",
  company: "",
  jobTitle: "",
  email: "",
  phone: "",
  website: "",
  linkedin: "",
};

function generateAISummary(data: ExtractedCard, eventName: string, notes: string) {
  return `Met ${data.firstName} ${data.lastName} at ${eventName || "a networking event"}. ${data.firstName} is ${data.jobTitle} at ${data.company}. ${notes ? `Discussion: ${notes}` : "Exploring potential partnership opportunities."} Recommended next step: send company profile and schedule intro call.`;
}

function generateIntroEmail(
  data: ExtractedCard,
  eventName: string,
  userProfile: {
    name: string;
    company: string;
    jobTitle: string;
    calendarInviteUrl?: string;
  }
) {
  const calendarLink = userProfile.calendarInviteUrl?.trim()
    ? `\n\nYou can grab a time that works for you here: ${userProfile.calendarInviteUrl.trim()}`
    : "";
  return `Hi ${data.firstName},\n\nIt was great meeting you at ${eventName || "the event"}!\n\nI enjoyed our conversation and learning more about ${data.company}.\n\nAs mentioned, I'm ${userProfile.name} from ${userProfile.company}, where I work as ${userProfile.jobTitle}. I'd love to explore how we might work together.\n\nWould you be open to a quick 20-minute call this week?${calendarLink}\n\nBest regards,\n${userProfile.name}`;
}

export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addContact, profile, events, freeScansUsed, consumeFreeScan } = useApp();
  const { getToken } = useAuth();
  const { isPro } = useSubscription();

  const freeScansLeft = Math.max(0, FREE_SCAN_LIMIT - freeScansUsed);
  const canScan = isPro || freeScansLeft > 0;

  const [showPaywall, setShowPaywall] = useState(false);
  const [step, setStep] = useState<ScanStep>("idle");
  const [cardImageUri, setCardImageUri] = useState<string | undefined>();
  const [extracted, setExtracted] = useState({ ...EMPTY_EXTRACTED });
  const [eventName, setEventName] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<ContactCategory>("Potential client");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [followUp, setFollowUp] = useState<FollowUpAction>("Send intro email");
  const [emailDraft, setEmailDraft] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [introEmailSent, setIntroEmailSent] = useState(false);
  const [reviewErrors, setReviewErrors] = useState<
    Partial<Record<keyof ExtractedCard, string>>
  >({});

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 + 24 : insets.bottom + 56 + 24;

  function showError(message: string) {
    if (Platform.OS === "web") {
      window.alert(message);
    } else {
      Alert.alert("Couldn't read card", message);
    }
  }

  function showInfo(title: string, message: string) {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  async function extractFromAsset(asset: ImagePicker.ImagePickerAsset) {
    setCardImageUri(asset.uri);
    setStep("scanning");

    const image =
      asset.base64 != null && asset.base64 !== ""
        ? asset.base64
        : asset.uri.startsWith("data:")
        ? asset.uri
        : undefined;

    if (!image) {
      setStep("idle");
      showError("Could not read the image. Please try a different photo.");
      return;
    }

    let scanToken: string | undefined;
    try {
      scanToken = (await getToken()) ?? undefined;
    } catch {
      scanToken = undefined;
    }
    const result = await scanCard(image, scanToken);

    if (result.success && result.data) {
      if (!isPro) consumeFreeScan();
      setExtracted(result.data);
      setReviewErrors({});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("review");
    } else {
      setStep("idle");
      showError(
        (result.error ?? "Something went wrong.") +
          "\n\nYou can try again or enter the details manually.",
      );
    }
  }

  function requireScan(): boolean {
    if (canScan) return true;
    setShowPaywall(true);
    return false;
  }

  async function handleScan() {
    if (!requireScan()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS === "web") {
      handlePickFromLibrary();
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera access needed", "Please allow camera access to scan business cards.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      await extractFromAsset(result.assets[0]);
    }
  }

  async function handlePickFromLibrary() {
    if (!requireScan()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      await extractFromAsset(result.assets[0]);
    }
  }

  function handleProceedToContext() {
    const nextErrors: Partial<Record<keyof ExtractedCard, string>> = {};
    if (!extracted.firstName.trim())
      nextErrors.firstName = "First name is required";
    if (!extracted.email.trim()) nextErrors.email = "Email is required";
    if (Object.keys(nextErrors).length > 0) {
      setReviewErrors(nextErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setReviewErrors({});
    setStep("context");
  }

  function handleGenerateEmail() {
    const summary = generateAISummary(extracted, eventName, notes);
    const email = generateIntroEmail(extracted, eventName, profile);
    setAiSummary(summary);
    setEmailDraft(email);
    setStep("email");
  }

  async function handleSaveContact(sendIntroEmail: boolean) {
    addContact({
      ...extracted,
      cardImageUri,
      eventId: selectedEventId,
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
      emailSent: sendIntroEmail,
      replyReceived: false,
      meetingBooked: false,
      dealValue: dealValue ? parseInt(dealValue) * 1000 : undefined,
    });

    if (sendIntroEmail) {
      void (async () => {
        let token: string | undefined;
        try {
          token = (await getToken()) ?? undefined;
        } catch {
        }
        await sendEmail({
          to: extracted.email,
          subject: `Great meeting you${eventName ? ` at ${eventName}` : ""}`,
          body: emailDraft,
          fromName: profile.name,
          replyTo: profile.email || undefined,
          token,
        });
      })().catch(() => {});
    }

    setIntroEmailSent(sendIntroEmail);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep("done");
    setTimeout(() => {
      setStep("idle");
      setExtracted({ ...EMPTY_EXTRACTED });
      setEventName("");
      setSelectedEventId(undefined);
      setNotes("");
      setCardImageUri(undefined);
      setEmailDraft("");
      setAiSummary("");
      setDealValue("");
      setIntroEmailSent(false);
    }, 2500);
  }

  function handleManualEntry() {
    if (!requireScan()) return;
    if (!isPro) consumeFreeScan();
    setReviewErrors({});
    setStep("review");
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Step: Idle */}
      {step === "idle" && (
        <Animated.ScrollView
          entering={FadeIn.duration(300)}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: bottomPad,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader 
            title="Scan Card" 
            subtitle="Capture a business card to save the contact"
          />

          {!isPro && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
                gap: 6,
                marginHorizontal: theme.spacing[20],
                marginBottom: theme.spacing[16],
                paddingHorizontal: theme.spacing[12],
                paddingVertical: 7,
                borderRadius: theme.radius.xl,
                borderWidth: 1,
                borderColor:
                  freeScansLeft > 0 ? "rgba(123,94,255,0.3)" : "rgba(255,71,87,0.3)",
                backgroundColor:
                  freeScansLeft > 0 ? "rgba(123,94,255,0.12)" : "rgba(255,71,87,0.12)",
              }}
            >
              <Feather
                name={freeScansLeft > 0 ? "zap" : "lock"}
                size={13}
                color={freeScansLeft > 0 ? "#7B5EFF" : "#FF4757"}
              />
              <Text
                style={{
                  color: freeScansLeft > 0 ? "#B7A6FF" : "#FF8A94",
                  ...theme.typography.captionSemi,
                }}
              >
                {freeScansLeft > 0
                  ? `${freeScansLeft} of ${FREE_SCAN_LIMIT} free scans left`
                  : "Free scans used — upgrade to Pro"}
              </Text>
            </View>
          )}

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
                ...theme.typography.bodySmall,
                textAlign: "center",
                marginTop: theme.spacing[24],
                marginBottom: Platform.OS === "web" ? 8 : theme.spacing[32],
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
                  borderRadius: theme.radius.md,
                  paddingHorizontal: theme.spacing[12],
                  paddingVertical: 7,
                  marginBottom: theme.spacing[28],
                  borderWidth: 1,
                  borderColor: "rgba(79,142,255,0.25)",
                }}
              >
                <Feather name="info" size={13} color={colors.primary} />
                <Text style={{ color: colors.primary, ...theme.typography.caption }}>
                  Pick a card image to scan in web preview
                </Text>
              </View>
            )}

            {/* Main scan button */}
            <Pressable onPress={handleScan} hitSlop={10}>
              <LinearGradient
                colors={["#7B5EFF", "#4F8EFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: theme.radius.full,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: theme.spacing[24],
                  ...theme.getShadow("#7B5EFF", "lg"),
                }}
              >
                <Ionicons name="camera" size={32} color="#fff" />
              </LinearGradient>
            </Pressable>

            <View style={{ flexDirection: "row", gap: theme.spacing[16] }}>
              <Pressable
                onPress={handlePickFromLibrary}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: theme.spacing[16],
                  paddingVertical: theme.spacing[10],
                  borderRadius: theme.radius.xl,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                }}
              >
                <Feather name="image" size={15} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, ...theme.typography.bodySmall }}>
                  From Library
                </Text>
              </Pressable>
              <Pressable
                testID="manual-entry-button"
                onPress={handleManualEntry}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: theme.spacing[16],
                  paddingVertical: theme.spacing[10],
                  borderRadius: theme.radius.xl,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                }}
              >
                <Feather name="edit-3" size={15} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, ...theme.typography.bodySmall }}>
                  Manual Entry
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.ScrollView>
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
            gap: theme.spacing[20],
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.foreground, ...theme.typography.h4 }}>
            Extracting details...
          </Text>
          <Text style={{ color: colors.mutedForeground, ...theme.typography.body }}>
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
                paddingTop: topPad + theme.spacing[16],
                paddingBottom: bottomPad,
                paddingHorizontal: theme.spacing[20],
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text
                style={{
                  color: colors.foreground,
                  ...theme.typography.h2,
                  marginBottom: theme.spacing[6],
                }}
              >
                Review Details
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  ...theme.typography.body,
                  marginBottom: theme.spacing[24],
                }}
              >
                Edit any extracted information
              </Text>

              {(
                [
                  { label: "First Name", key: "firstName", required: true },
                  { label: "Last Name", key: "lastName" },
                  { label: "Company", key: "company" },
                  { label: "Job Title", key: "jobTitle" },
                  { label: "Email", key: "email", required: true },
                  { label: "Phone", key: "phone" },
                  { label: "Website", key: "website" },
                  { label: "LinkedIn", key: "linkedin" },
                ] as Array<{
                  label: string;
                  key: keyof ExtractedCard;
                  required?: boolean;
                }>
              ).map((field) => (
                <View key={field.key} style={{ marginBottom: theme.spacing[14] }}>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      ...theme.typography.label,
                      marginBottom: theme.spacing[6],
                    }}
                  >
                    {field.label}
                    {field.required ? " *" : ""}
                  </Text>
                  <TextInput
                    value={extracted[field.key]}
                    onChangeText={(v) => {
                      setExtracted((prev) => ({ ...prev, [field.key]: v }));
                      if (reviewErrors[field.key]) {
                        setReviewErrors((prev) => {
                          const next = { ...prev };
                          delete next[field.key];
                          return next;
                        });
                      }
                    }}
                    keyboardType={field.key === "email" ? "email-address" : "default"}
                    autoCapitalize={field.key === "email" ? "none" : "sentences"}
                    style={{
                      backgroundColor: colors.secondary,
                      borderWidth: 1,
                      borderColor: reviewErrors[field.key]
                        ? "#FF4757"
                        : colors.border,
                      borderRadius: theme.radius.md,
                      paddingHorizontal: theme.spacing[14],
                      paddingVertical: theme.spacing[12],
                      color: colors.foreground,
                      ...theme.typography.body,
                    }}
                    placeholderTextColor={colors.mutedForeground}
                  />
                  {reviewErrors[field.key] ? (
                    <Text
                      style={{ color: "#FF4757", ...theme.typography.caption, marginTop: 6 }}
                    >
                      {reviewErrors[field.key]}
                    </Text>
                  ) : null}
                </View>
              ))}

              <Pressable
                onPress={handleProceedToContext}
                style={{ marginTop: theme.spacing[8] }}
              >
                <LinearGradient
                  colors={["#7B5EFF", "#4F8EFF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: theme.spacing[16],
                    borderRadius: theme.radius.lg,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      ...theme.typography.bodyLargeSemi,
                    }}
                  >
                    Add Contact
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
                paddingTop: topPad + theme.spacing[16],
                paddingBottom: bottomPad,
                paddingHorizontal: theme.spacing[20],
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text
                style={{
                  color: colors.foreground,
                  ...theme.typography.h2,
                  marginBottom: theme.spacing[6],
                }}
              >
                Add Context
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  ...theme.typography.body,
                  marginBottom: theme.spacing[24],
                }}
              >
                Where did you meet {extracted.firstName}?
              </Text>

              {/* Event selection */}
              <View style={{ marginBottom: theme.spacing[20] }}>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    ...theme.typography.label,
                    marginBottom: theme.spacing[6],
                  }}
                >
                  Recent Events
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  <Pressable
                    onPress={() => {
                      setSelectedEventId(undefined);
                      setEventName("");
                    }}
                    style={{
                      paddingHorizontal: theme.spacing[16],
                      paddingVertical: theme.spacing[8],
                      borderRadius: theme.radius.xl,
                      backgroundColor: !selectedEventId ? colors.primary : colors.card,
                      borderWidth: 1,
                      borderColor: !selectedEventId ? colors.primary : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        color: !selectedEventId ? "#fff" : colors.mutedForeground,
                        ...theme.typography.bodySmallSemi,
                      }}
                    >
                      None
                    </Text>
                  </Pressable>
                  {events.slice(0, 5).map((e) => (
                    <Pressable
                      key={e.id}
                      onPress={() => {
                        setSelectedEventId(e.id);
                        setEventName(e.name);
                      }}
                      style={{
                        paddingHorizontal: theme.spacing[16],
                        paddingVertical: theme.spacing[8],
                        borderRadius: theme.radius.xl,
                        backgroundColor: selectedEventId === e.id ? colors.primary : colors.card,
                        borderWidth: 1,
                        borderColor: selectedEventId === e.id ? colors.primary : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          color: selectedEventId === e.id ? "#fff" : colors.mutedForeground,
                          ...theme.typography.bodySmallSemi,
                        }}
                      >
                        {e.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {!selectedEventId && (
                <View style={{ marginBottom: theme.spacing[20] }}>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      ...theme.typography.label,
                      marginBottom: theme.spacing[6],
                    }}
                  >
                    Or enter a location/event name
                  </Text>
                  <TextInput
                    value={eventName}
                    onChangeText={setEventName}
                    placeholder="e.g. Coffee shop, Web Summit"
                    placeholderTextColor={colors.mutedForeground}
                    style={{
                      backgroundColor: colors.secondary,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: theme.radius.md,
                      paddingHorizontal: theme.spacing[14],
                      paddingVertical: theme.spacing[12],
                      color: colors.foreground,
                      ...theme.typography.body,
                    }}
                  />
                </View>
              )}

              <View style={{ marginBottom: theme.spacing[20] }}>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    ...theme.typography.label,
                    marginBottom: theme.spacing[6],
                  }}
                >
                  Category
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
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
                        paddingHorizontal: theme.spacing[14],
                        paddingVertical: theme.spacing[8],
                        borderRadius: theme.radius.xl,
                        backgroundColor: category === cat ? colors.primary + "22" : colors.card,
                        borderWidth: 1,
                        borderColor: category === cat ? colors.primary : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          color: category === cat ? colors.primary : colors.mutedForeground,
                          ...theme.typography.bodySmallSemi,
                        }}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={{ marginBottom: theme.spacing[20] }}>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    ...theme.typography.label,
                    marginBottom: theme.spacing[6],
                  }}
                >
                  Priority
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(["High", "Medium", "Low"] as Priority[]).map((p) => (
                    <Pressable
                      key={p}
                      onPress={() => setPriority(p)}
                      style={{
                        flex: 1,
                        paddingVertical: theme.spacing[10],
                        alignItems: "center",
                        borderRadius: theme.radius.md,
                        backgroundColor: priority === p ? colors.primary + "22" : colors.card,
                        borderWidth: 1,
                        borderColor: priority === p ? colors.primary : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          color: priority === p ? colors.primary : colors.mutedForeground,
                          ...theme.typography.bodySmallSemi,
                        }}
                      >
                        {p}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={{ marginBottom: theme.spacing[20] }}>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    ...theme.typography.label,
                    marginBottom: theme.spacing[6],
                  }}
                >
                  Meeting Notes (Optional)
                </Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Topics discussed, next steps..."
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
                    minHeight: 100,
                    textAlignVertical: "top",
                  }}
                />
              </View>

              <View style={{ marginBottom: theme.spacing[24] }}>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    ...theme.typography.label,
                    marginBottom: theme.spacing[6],
                  }}
                >
                  Estimated Deal Value (Optional)
                </Text>
                <TextInput
                  value={dealValue}
                  onChangeText={setDealValue}
                  placeholder="e.g. 50 (in thousands)"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                  style={{
                    backgroundColor: colors.secondary,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: theme.radius.md,
                    paddingHorizontal: theme.spacing[14],
                    paddingVertical: theme.spacing[12],
                    color: colors.foreground,
                    ...theme.typography.body,
                  }}
                />
              </View>

              <Pressable onPress={handleGenerateEmail}>
                <LinearGradient
                  colors={["#7B5EFF", "#4F8EFF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: theme.spacing[16],
                    borderRadius: theme.radius.lg,
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
                      ...theme.typography.bodyLargeSemi,
                    }}
                  >
                    Draft Intro Email
                  </Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      {/* Step: AI Email Draft & Review */}
      {step === "email" && (
        <Animated.View entering={FadeInDown.duration(300)} style={{ flex: 1 }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={{
                paddingTop: topPad + theme.spacing[16],
                paddingBottom: bottomPad,
                paddingHorizontal: theme.spacing[20],
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text
                style={{
                  color: colors.foreground,
                  ...theme.typography.h2,
                  marginBottom: theme.spacing[6],
                }}
              >
                Send Intro
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  ...theme.typography.body,
                  marginBottom: theme.spacing[24],
                }}
              >
                Review the AI-generated follow-up email
              </Text>

              <View
                style={{
                  backgroundColor: colors.primary + "14",
                  borderWidth: 1,
                  borderColor: colors.primary + "33",
                  borderRadius: theme.radius.lg,
                  padding: theme.spacing[16],
                  marginBottom: theme.spacing[24],
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Ionicons name="sparkles" size={14} color={colors.primary} />
                  <Text style={{ color: colors.primary, ...theme.typography.label }}>
                    AI MEETING SUMMARY
                  </Text>
                </View>
                <Text style={{ color: colors.foreground, ...theme.typography.bodySmall, lineHeight: 20 }}>
                  {aiSummary}
                </Text>
              </View>

              <View style={{ marginBottom: theme.spacing[24] }}>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    ...theme.typography.label,
                    marginBottom: theme.spacing[6],
                  }}
                >
                  Email Draft
                </Text>
                <TextInput
                  value={emailDraft}
                  onChangeText={setEmailDraft}
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
                <Text style={{ color: colors.mutedForeground, ...theme.typography.caption, marginTop: 8 }}>
                  Emails are sent via RelateIQ+ verified servers. Your reply-to address will be set to your email.
                </Text>
              </View>

              <View style={{ marginBottom: theme.spacing[24] }}>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    ...theme.typography.label,
                    marginBottom: theme.spacing[6],
                  }}
                >
                  Next Follow-up Action
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {(
                    [
                      "Send intro email",
                      "Schedule meeting",
                      "Send proposal",
                      "Make introduction",
                      "Call later",
                    ] as FollowUpAction[]
                  ).map((action) => (
                    <Pressable
                      key={action}
                      onPress={() => setFollowUp(action)}
                      style={{
                        paddingHorizontal: theme.spacing[14],
                        paddingVertical: theme.spacing[8],
                        borderRadius: theme.radius.xl,
                        backgroundColor: followUp === action ? colors.primary + "22" : colors.card,
                        borderWidth: 1,
                        borderColor: followUp === action ? colors.primary : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          color: followUp === action ? colors.primary : colors.mutedForeground,
                          ...theme.typography.bodySmallSemi,
                        }}
                      >
                        {action}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={{ flexDirection: "row", gap: theme.spacing[12] }}>
                <Pressable
                  onPress={() => setStep("context")}
                  style={{
                    flex: 1,
                    paddingVertical: theme.spacing[16],
                    borderRadius: theme.radius.lg,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                  }}
                >
                  <Text style={{ color: colors.foreground, ...theme.typography.bodyLargeSemi }}>
                    Back
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleSaveContact(true)}
                  style={{ flex: 2 }}
                >
                  <LinearGradient
                    colors={["#7B5EFF", "#4F8EFF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      paddingVertical: theme.spacing[16],
                      borderRadius: theme.radius.lg,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        ...theme.typography.bodyLargeSemi,
                      }}
                    >
                      Save & Send Email
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
              <Pressable
                testID="save-without-email-button"
                onPress={() => void handleSaveContact(false)}
                style={{
                  marginTop: theme.spacing[12],
                  paddingVertical: theme.spacing[14],
                  borderRadius: theme.radius.lg,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                }}
              >
                <Text style={{ color: colors.foreground, ...theme.typography.bodyLargeSemi }}>
                  Save Without Email
                </Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
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
            gap: theme.spacing[16],
          }}
        >
          <GlassIcon tint="#10B981" size={80}>
            <Feather name="check" size={40} color="#fff" />
          </GlassIcon>
          <Text style={{ color: colors.foreground, ...theme.typography.h2 }}>
            Contact Saved!
          </Text>
          <Text style={{ color: colors.mutedForeground, ...theme.typography.body }}>
            {introEmailSent
              ? "Intro email has been sent"
              : "You can follow up whenever you're ready"}
          </Text>
        </Animated.View>
      )}

      {/* Paywall */}
      <Paywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </View>
  );
}