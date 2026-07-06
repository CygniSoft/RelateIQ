import { Ionicons } from "@expo/vector-icons";
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
import { theme } from "@/constants/theme";

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
        gap: theme.spacing[4],
        backgroundColor: color + "22",
        paddingHorizontal: theme.spacing[8],
        paddingVertical: 3,
        borderRadius: theme.radius.xl,
        borderWidth: 1,
        borderColor: color + "55",
      }}
    >
      <View
        style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }}
      />
      <Text style={{ color, ...theme.typography.captionSemi }}>
        {score} · {label}
      </Text>
    </View>
  );
}

function Avatar({ contact, size = 48 }: { contact: Contact; size?: number }) {
  const initials =
    `${contact.firstName?.[0] ?? ""}${contact.lastName?.[0] ?? ""}`.toUpperCase();
  const seed =
    (contact.firstName?.charCodeAt(0) ?? 0) +
    (contact.lastName?.charCodeAt(0) ?? 0);
  const hue = (seed * 37) % 360 || 220;

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
      {initials ? (
        <Text
          style={{
            color: "#fff",
            fontSize: size * 0.35,
            fontWeight: "700" as const,
            fontFamily: "Inter_700Bold",
          }}
        >
          {initials}
        </Text>
      ) : (
        <Ionicons name="person" size={size * 0.45} color="#fff" />
      )}
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
            borderRadius: theme.radius.lg,
            ...theme.getShadow("#000", "sm"),
          },
        ]}
      >
        <Avatar contact={contact} />
        <View style={{ flex: 1, marginLeft: theme.spacing[12] }}>
          <Text
            style={{ color: colors.foreground, ...theme.typography.bodyLargeSemi }}
            numberOfLines={1}
          >
            {contact.firstName} {contact.lastName}
          </Text>
          <Text
            style={{ color: colors.mutedForeground, ...theme.typography.bodySmall, marginTop: 1 }}
            numberOfLines={1}
          >
            {contact.jobTitle} · {contact.company}
          </Text>
          {!compact && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing[8], marginTop: theme.spacing[6] }}>
              <ScoreBadge score={contact.relationshipScore} />
              {contact.priority === "High" && (
                <View
                  style={{
                    backgroundColor: "#FF475722",
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: theme.radius.sm,
                    borderWidth: 1,
                    borderColor: "#FF475755",
                  }}
                >
                  <Text style={{ color: "#FF4757", ...theme.typography.captionSemi }}>
                    Priority
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        <View style={{ alignItems: "flex-end", gap: theme.spacing[6] }}>
          {contact.dealValue ? (
            <Text style={{ color: colors.primary, ...theme.typography.bodySmallSemi }}>
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
    padding: theme.spacing[14],
    marginHorizontal: theme.spacing[16],
    marginBottom: theme.spacing[8],
    borderWidth: 1,
  },
});

export { Avatar };
