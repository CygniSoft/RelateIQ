import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ContactCard } from "@/components/ContactCard";
import { InsightCard } from "@/components/InsightCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { getEventInsight, getEventMetrics } from "@/lib/eventIntelligence";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { events, contacts, updateEvent } = useApp();
  const [editingRevenue, setEditingRevenue] = useState(false);
  const [revenueInput, setRevenueInput] = useState("");

  const event = events.find((e) => e.id === id);
  const eventContacts = useMemo(
    () => contacts.filter((c) => c.eventId === id),
    [contacts, id]
  );

  if (!event) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.mutedForeground }}>Event not found</Text>
      </View>
    );
  }

  const roi =
    event.cost > 0
      ? ((event.revenueGenerated - event.cost) / event.cost) * 100
      : 0;

  const metrics = getEventMetrics(event, eventContacts.length);
  const insight = getEventInsight(event, contacts, events);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom + 24;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* Hero */}
        <LinearGradient
          colors={["#0f1120", "#151828", colors.background]}
          locations={[0, 0.65, 1]}
          style={{
            paddingTop: topPad + 8,
            paddingBottom: 28,
            paddingHorizontal: 20,
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
              marginBottom: 20,
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>

          <Text style={{ color: colors.mutedForeground, fontSize: 13, marginBottom: 4 }}>
            {event.type}
          </Text>
          <Text
            style={{
              color: "#fff",
              fontSize: 26,
              fontWeight: "700" as const,
              letterSpacing: -0.5,
              marginBottom: 6,
            }}
          >
            {event.name}
          </Text>
          <View style={{ flexDirection: "row", gap: 16, marginBottom: 20 }}>
            <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
              <Feather name="map-pin" size={12} color="rgba(255,255,255,0.5)" />
              <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                {event.location}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
              <Feather name="calendar" size={12} color="rgba(255,255,255,0.5)" />
              <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                {new Date(event.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>

          {/* ROI callout */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "rgba(255,255,255,0.06)",
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <View>
              <Text
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 11,
                  fontWeight: "600" as const,
                  letterSpacing: 0.8,
                }}
              >
                NET ROI
              </Text>
              <Text
                style={{
                  color: roi >= 0 ? "#10B981" : "#FF4757",
                  fontSize: 32,
                  fontWeight: "800" as const,
                  letterSpacing: -1,
                }}
              >
                {roi >= 0 ? "+" : ""}
                {roi.toFixed(0)}%
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" as const }}>
                ${event.revenueGenerated.toLocaleString()}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
                ${event.cost.toLocaleString()} invested
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Event Intelligence panel */}
        <View style={{ paddingHorizontal: 20, marginTop: 4, marginBottom: 24 }}>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 16,
              fontWeight: "600" as const,
              marginBottom: 12,
            }}
          >
            Event Intelligence
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {[
              {
                label: "Cost",
                value: `$${metrics.cost.toLocaleString()}`,
                color: "#FF8A65",
              },
              {
                label: "Contacts",
                value: metrics.contacts,
                color: "#4F8EFF",
              },
              {
                label: "Meetings",
                value: metrics.meetings,
                color: "#7B5EFF",
              },
              {
                label: "Proposals",
                value: metrics.proposals,
                color: "#F59E0B",
              },
              {
                label: "Deals Won",
                value: metrics.deals,
                color: "#10B981",
              },
              {
                label: "Revenue",
                value: `$${metrics.revenue.toLocaleString()}`,
                color: "#06B6D4",
              },
            ].map((stat) => (
              <View
                key={stat.label}
                style={{
                  width: "47%",
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                  padding: 16,
                }}
              >
                <Text
                  style={{
                    color: stat.color,
                    fontSize: 24,
                    fontWeight: "800" as const,
                    letterSpacing: -1,
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {stat.value}
                </Text>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>

          {insight && (
            <View style={{ marginTop: 10 }}>
              <InsightCard
                icon={insight.icon}
                tint={insight.tint}
                title={insight.title}
                detail={insight.detail}
              />
            </View>
          )}
        </View>

        {/* Update revenue */}
        <View style={{ marginHorizontal: 20, marginBottom: 24 }}>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 16,
              fontWeight: "600" as const,
              marginBottom: 10,
            }}
          >
            Revenue Update
          </Text>
          {editingRevenue ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TextInput
                value={revenueInput}
                onChangeText={setRevenueInput}
                placeholder="Enter revenue ($)"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                style={{
                  flex: 1,
                  backgroundColor: colors.secondary,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: colors.foreground,
                  fontSize: 15,
                }}
              />
              <Pressable
                onPress={() => {
                  const val = parseInt(revenueInput) || 0;
                  updateEvent(event.id, { revenueGenerated: val });
                  setEditingRevenue(false);
                  setRevenueInput("");
                }}
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="check" size={18} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setRevenueInput(event.revenueGenerated.toString());
                setEditingRevenue(true);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: colors.secondary,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 13,
              }}
            >
              <Feather name="dollar-sign" size={16} color={colors.mutedForeground} />
              <Text style={{ color: colors.foreground, flex: 1, fontSize: 15 }}>
                ${event.revenueGenerated.toLocaleString()} revenue
              </Text>
              <Feather name="edit-2" size={14} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Contacts from this event */}
        {eventContacts.length > 0 && (
          <View>
            <Text
              style={{
                color: colors.foreground,
                fontSize: 16,
                fontWeight: "600" as const,
                paddingHorizontal: 20,
                marginBottom: 12,
              }}
            >
              Contacts ({eventContacts.length})
            </Text>
            {eventContacts.map((c, i) => (
              <ContactCard key={c.id} contact={c} index={i} compact />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
