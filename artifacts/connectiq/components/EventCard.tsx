import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Event } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface EventCardProps {
  event: Event;
  contactCount: number;
  index?: number;
}

function ROIBadge({ roi }: { roi: number }) {
  const isPositive = roi > 0;
  return (
    <View
      style={{
        backgroundColor: isPositive ? "#10B98122" : "#FF475722",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: isPositive ? "#10B98155" : "#FF475755",
      }}
    >
      <Text
        style={{
          color: isPositive ? "#10B981" : "#FF4757",
          fontSize: 12,
          fontWeight: "700" as const,
        }}
      >
        {isPositive ? "+" : ""}
        {roi.toFixed(0)}% ROI
      </Text>
    </View>
  );
}

export function EventCard({ event, contactCount, index = 0 }: EventCardProps) {
  const colors = useColors();
  const progress = useSharedValue(0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    progress.value = withDelay(
      index * 70,
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

  const roi =
    event.cost > 0
      ? ((event.revenueGenerated - event.cost) / event.cost) * 100
      : 0;

  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => {
          pressScale.value = withTiming(0.97, { duration: 80 });
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1, { damping: 12 });
        }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/event/${event.id}`);
        }}
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: colors.radius,
          padding: 16,
          marginHorizontal: 16,
          marginBottom: 10,
          ...(Platform.OS !== "web"
            ? {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 2,
              }
            : {}),
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: colors.foreground, fontSize: 16, fontWeight: "600" as const }}
              numberOfLines={1}
            >
              {event.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
              <Feather name="map-pin" size={12} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                {event.location}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
              <Feather name="calendar" size={12} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                {formattedDate}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <ROIBadge roi={roi} />
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            marginTop: 14,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            gap: 0,
          }}
        >
          {[
            { label: "Contacts", value: contactCount },
            { label: "Meetings", value: event.meetingsBooked },
            { label: "Deals", value: event.dealsWon },
            {
              label: "Revenue",
              value:
                event.revenueGenerated > 0
                  ? `$${(event.revenueGenerated / 1000).toFixed(0)}K`
                  : "$0",
            },
          ].map((stat, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                alignItems: "center",
                borderRightWidth: i < 3 ? 1 : 0,
                borderRightColor: colors.border,
              }}
            >
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 16,
                  fontWeight: "700" as const,
                }}
              >
                {stat.value}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>
    </Animated.View>
  );
}
