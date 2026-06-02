import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Contact } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface ContactCardProps {
  contact: Contact;
  index?: number;
  compact?: boolean;
}

function ScoreBadge({ score }: { score: number }) {
  const colors = useColors();
  let color = "#6B7490";
  let label = "Dormant";

  if (score >= 80) {
    color = "#10B981";
    label = "Hot";
  } else if (score >= 50) {
    color = "#F59E0B";
    label = "Warm";
  } else if (score >= 20) {
    color = "#3B82F6";
    label = "Cool";
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: color + "22",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: color + "55",
      }}
    >
      <View
        style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }}
      />
      <Text style={{ color, fontSize: 11, fontWeight: "600" as const }}>
        {score} · {label}
      </Text>
    </View>
  );
}

function Avatar({ contact, size = 48 }: { contact: Contact; size?: number }) {
  const colors = useColors();
  const initials = `${contact.firstName[0] ?? ""}${contact.lastName[0] ?? ""}`;
  const hue =
    ((contact.firstName.charCodeAt(0) + contact.lastName.charCodeAt(0)) * 37) %
    360;

  return (
    <LinearGradient
      colors={[`hsl(${hue},65%,55%)`, `hsl(${(hue + 30) % 360},70%,40%)`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontSize: size * 0.35,
          fontWeight: "700" as const,
        }}
      >
        {initials}
      </Text>
    </LinearGradient>
  );
}

export function ContactCard({ contact, index = 0, compact = false }: ContactCardProps) {
  const colors = useColors();
  const progress = useSharedValue(0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    progress.value = withDelay(
      index * 60,
      withSpring(1, { damping: 16, stiffness: 90 })
    );
  }, [index, progress]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [20, 0]) },
      { scale: pressScale.value },
    ],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        testID={`contact-card-${contact.id}`}
        onPressIn={() => {
          pressScale.value = withTiming(0.97, { duration: 80 });
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1, { damping: 12 });
        }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/contact/${contact.id}`);
        }}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
            ...(Platform.OS !== "web"
              ? {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                  elevation: 3,
                }
              : {}),
          },
        ]}
      >
        <Avatar contact={contact} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{ color: colors.foreground, fontSize: 16, fontWeight: "600" as const }}
            numberOfLines={1}
          >
            {contact.firstName} {contact.lastName}
          </Text>
          <Text
            style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 1 }}
            numberOfLines={1}
          >
            {contact.jobTitle} · {contact.company}
          </Text>
          {!compact && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
              <ScoreBadge score={contact.relationshipScore} />
              {contact.priority === "High" && (
                <View
                  style={{
                    backgroundColor: "#FF475722",
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#FF475755",
                  }}
                >
                  <Text style={{ color: "#FF4757", fontSize: 11, fontWeight: "600" as const }}>
                    Priority
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          {contact.dealValue ? (
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "700" as const }}>
              ${(contact.dealValue / 1000).toFixed(0)}K
            </Text>
          ) : null}
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
});

export { Avatar };
