import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EventCard } from "@/components/EventCard";
import { GlassIcon } from "@/components/GlassIcon";
import { InsightCard } from "@/components/InsightCard";
import { StatCard } from "@/components/StatCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { getPortfolioInsights } from "@/lib/eventIntelligence";

function AddEventModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: { name: string; location: string; date: string; type: string; cost: number }) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("Conference");
  const [cost, setCost] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) setErrors({});
  }, [visible]);

  const EVENT_TYPES = [
    "Conference",
    "Trade show",
    "Chamber event",
    "Networking dinner",
    "Business meeting",
  ];

  function clearError(id: string) {
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function handleAdd() {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Event name is required";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    onAdd({
      name: name.trim(),
      location: location.trim() || "TBD",
      date: new Date().toISOString(),
      type,
      cost: cost ? parseInt(cost) : 0,
    });
    setName("");
    setLocation("");
    setCost("");
    setErrors({});
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
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
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 17,
              fontWeight: "600" as const,
            }}
          >
            Add Event
          </Text>
          <Pressable onPress={handleAdd}>
            <Text style={{ color: colors.primary, fontSize: 17, fontWeight: "600" as const }}>
              Add
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {[
            { id: "name", label: "Event Name *", value: name, onChange: setName, placeholder: "Toronto Business Expo" },
            { id: "location", label: "Location", value: location, onChange: setLocation, placeholder: "Convention Centre" },
            { id: "cost", label: "Cost ($)", value: cost, onChange: setCost, placeholder: "1200", numeric: true },
          ].map((f) => (
            <View key={f.label} style={{ marginBottom: 16 }}>
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
                {f.label}
              </Text>
              <TextInput
                value={f.value}
                onChangeText={(v) => {
                  f.onChange(v);
                  clearError(f.id);
                }}
                placeholder={f.placeholder}
                placeholderTextColor={colors.mutedForeground}
                keyboardType={f.numeric ? "numeric" : "default"}
                style={{
                  backgroundColor: colors.secondary,
                  borderWidth: 1,
                  borderColor: errors[f.id] ? "#FF4757" : colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: colors.foreground,
                  fontSize: 15,
                }}
              />
              {errors[f.id] ? (
                <Text style={{ color: "#FF4757", fontSize: 12, marginTop: 6 }}>
                  {errors[f.id]}
                </Text>
              ) : null}
            </View>
          ))}

          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 12,
              fontWeight: "600" as const,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              marginBottom: 8,
            }}
          >
            Event Type
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
            {EVENT_TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: type === t ? colors.primary : colors.border,
                  backgroundColor: type === t ? colors.primary + "22" : colors.card,
                }}
              >
                <Text
                  style={{
                    color: type === t ? colors.primary : colors.mutedForeground,
                    fontSize: 13,
                    fontWeight: type === t ? ("600" as const) : ("400" as const),
                  }}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function EventsScreen() {
  const colors = useColors();
  const { events, contacts, addEvent } = useApp();
  const insets = useSafeAreaInsets();
  const [showAddModal, setShowAddModal] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 + 16 : insets.bottom + 56 + 16;

  const roiStats = useMemo(() => {
    const totalCost = events.reduce((s, e) => s + e.cost, 0);
    const totalRevenue = events.reduce((s, e) => s + e.revenueGenerated, 0);
    const roi =
      totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;
    const totalContacts = contacts.length;
    const totalMeetings = events.reduce((s, e) => s + e.meetingsBooked, 0);
    return { totalCost, totalRevenue, roi, totalContacts, totalMeetings };
  }, [events, contacts]);

  const insights = useMemo(
    () => getPortfolioInsights(events, contacts),
    [events, contacts]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* Header */}
        <View style={{ paddingTop: topPad + 16, paddingHorizontal: 20, paddingBottom: 16 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
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
              Event Intelligence
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAddModal(true);
              }}
            >
              <GlassIcon tint={colors.primary} size={36}>
                <Feather name="plus" size={20} color="#fff" />
              </GlassIcon>
            </Pressable>
          </View>

          {/* ROI Banner */}
          <Animated.View entering={FadeIn.duration(500)}>
            <LinearGradient
              colors={["#1a1a2e", "#16213e", "#0f3460"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: colors.radius, padding: 20, marginBottom: 16 }}
            >
              <Text
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 12,
                  fontWeight: "600" as const,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Total Networking ROI
              </Text>
              <Text
                style={{
                  color: "#fff",
                  fontSize: 36,
                  fontWeight: "800" as const,
                  letterSpacing: -1,
                  marginBottom: 4,
                }}
              >
                {roiStats.roi > 0
                  ? `+${roiStats.roi.toFixed(0)}%`
                  : `${roiStats.roi.toFixed(0)}%`}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                ${roiStats.totalRevenue.toLocaleString()} revenue · $
                {roiStats.totalCost.toLocaleString()} invested
              </Text>
            </LinearGradient>
          </Animated.View>

          {/* Stats */}
          <View style={{ flexDirection: "row", gap: 10, alignItems: "stretch" }}>
            <StatCard
              label="Events"
              value={events.length}
              colors={["#4F8EFF", "#2563EB"]}
              icon={<Feather name="calendar" size={18} color="#fff" />}
              index={0}
            />
            <StatCard
              label="Contacts"
              value={roiStats.totalContacts}
              colors={["#7B5EFF", "#6D28D9"]}
              icon={<Feather name="users" size={18} color="#fff" />}
              index={1}
            />
            <StatCard
              label="Meetings"
              value={roiStats.totalMeetings}
              colors={["#F59E0B", "#D97706"]}
              icon={<Feather name="briefcase" size={18} color="#fff" />}
              index={2}
            />
          </View>
        </View>

        {/* AI Insights */}
        {insights.length > 0 && (
          <Animated.View
            entering={FadeIn.duration(500)}
            style={{ paddingHorizontal: 20, marginBottom: 8 }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Feather name="zap" size={16} color={colors.primary} />
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 18,
                  fontWeight: "700" as const,
                  letterSpacing: -0.3,
                }}
              >
                AI Insights
              </Text>
            </View>
            <View style={{ gap: 10 }}>
              {insights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  icon={insight.icon}
                  tint={insight.tint}
                  title={insight.title}
                  detail={insight.detail}
                />
              ))}
            </View>
          </Animated.View>
        )}

        {/* Events list */}
        <View style={{ paddingTop: 8 }}>
          {events.length === 0 ? (
            <View
              style={{
                alignItems: "center",
                paddingTop: 60,
                gap: 12,
              }}
            >
              <GlassIcon tint={colors.primary} size={80}>
                <Feather name="calendar" size={36} color="#fff" />
              </GlassIcon>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 16,
                  fontWeight: "600" as const,
                }}
              >
                No events yet
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 14,
                }}
              >
                Add your first networking event
              </Text>
            </View>
          ) : (
            events.map((event, i) => (
              <EventCard
                key={event.id}
                event={event}
                contactCount={
                  contacts.filter((c) => c.eventId === event.id).length
                }
                index={i}
              />
            ))
          )}
        </View>
      </ScrollView>

      <AddEventModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(data) =>
          addEvent({
            ...data,
            contactIds: [],
            meetingsBooked: 0,
            proposalsSent: 0,
            dealsWon: 0,
            revenueGenerated: 0,
          })
        }
      />
    </View>
  );
}
