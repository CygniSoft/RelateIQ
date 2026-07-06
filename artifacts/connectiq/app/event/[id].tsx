import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ContactCard } from "@/components/ContactCard";
import { StatCard } from "@/components/StatCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { theme } from "@/constants/theme";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { events, contacts } = useApp();

  const event = events.find((e) => e.id === id);
  const eventContacts = contacts.filter((c) => c.eventId === id);

  if (!event) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ color: colors.mutedForeground, ...theme.typography.body }}>Event not found</Text>
      </View>
    );
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom + 24;

  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const roi =
    event.cost > 0
      ? ((event.revenueGenerated - event.cost) / event.cost) * 100
      : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* Header */}
        <View
          style={{
            paddingTop: topPad + 8,
            paddingHorizontal: theme.spacing[20],
            paddingBottom: theme.spacing[24],
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [
              {
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.secondary,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: theme.spacing[16],
              },
              pressed && { opacity: 0.7 }
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </Pressable>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <View
              style={{
                backgroundColor: colors.primary + "22",
                paddingHorizontal: theme.spacing[8],
                paddingVertical: 4,
                borderRadius: theme.radius.sm,
              }}
            >
              <Text style={{ color: colors.primary, ...theme.typography.captionSemi }}>
                {event.type}
              </Text>
            </View>
            <Text style={{ color: colors.mutedForeground, ...theme.typography.caption }}>{formattedDate}</Text>
          </View>

          <Text style={{ color: colors.foreground, ...theme.typography.h1, marginBottom: 4 }}>
            {event.name}
          </Text>
          <Text style={{ color: colors.mutedForeground, ...theme.typography.body }}>
            {event.location}
          </Text>
        </View>

        {/* Stats */}
        <View style={{ padding: theme.spacing[20] }}>
          <Text style={{ color: colors.foreground, ...theme.typography.h4, marginBottom: theme.spacing[16] }}>
            Performance
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing[10] }}>
            <View style={{ width: "48%", marginBottom: theme.spacing[10] }}>
              <StatCard
                label="ROI"
                value={`${roi.toFixed(0)}%`}
                colors={roi >= 0 ? ["#10B981", "#047857"] : ["#FF4757", "#C92A3A"]}
                icon={<Ionicons name="trending-up" size={18} color="#fff" />}
              />
            </View>
            <View style={{ width: "48%", marginBottom: theme.spacing[10] }}>
              <StatCard
                label="Revenue"
                value={`$${(event.revenueGenerated / 1000).toFixed(0)}K`}
                colors={["#4F8EFF", "#2563EB"]}
                icon={<Ionicons name="cash" size={18} color="#fff" />}
              />
            </View>
            <View style={{ width: "48%" }}>
              <StatCard
                label="Cost"
                value={`$${event.cost}`}
                colors={["#6B7490", "#4B5563"]}
                icon={<Ionicons name="wallet" size={18} color="#fff" />}
              />
            </View>
            <View style={{ width: "48%" }}>
              <StatCard
                label="Deals Won"
                value={event.dealsWon}
                colors={["#7B5EFF", "#6D28D9"]}
                icon={<Ionicons name="briefcase" size={18} color="#fff" />}
              />
            </View>
          </View>
        </View>

        {/* Contacts from Event */}
        <View style={{ paddingHorizontal: 0, paddingTop: theme.spacing[8] }}>
          <View style={{ paddingHorizontal: theme.spacing[20], marginBottom: theme.spacing[12] }}>
            <Text style={{ color: colors.foreground, ...theme.typography.h4 }}>
              Contacts Met ({eventContacts.length})
            </Text>
          </View>
          {eventContacts.length === 0 ? (
            <View style={{ padding: theme.spacing[20], alignItems: "center" }}>
              <Text style={{ color: colors.mutedForeground, ...theme.typography.body }}>
                No contacts saved from this event yet.
              </Text>
            </View>
          ) : (
            eventContacts.map((c, i) => (
              <ContactCard key={c.id} contact={c} index={i} compact />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}