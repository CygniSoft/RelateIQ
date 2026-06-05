import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ContactCard } from "@/components/ContactCard";
import { FollowUpCard } from "@/components/FollowUpCard";
import { GlassIcon } from "@/components/GlassIcon";
import { StatCard } from "@/components/StatCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function ScanFAB() {
  const colors = useColors();
  const pressScale = useSharedValue(1);

  return (
    <Pressable
      testID="scan-fab"
      onPressIn={() => {
        pressScale.value = withTiming(0.94, { duration: 80 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, { damping: 10 });
      }}
      onPress={() => router.push("/(tabs)/scan")}
    >
      <Animated.View
        style={{
          transform: [{ scale: pressScale }],
        }}
      >
        <LinearGradient
          colors={["#7B5EFF", "#4F8EFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 24,
            paddingVertical: 16,
            borderRadius: 50,
            ...(Platform.OS !== "web"
              ? {
                  shadowColor: "#7B5EFF",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.45,
                  shadowRadius: 16,
                  elevation: 8,
                }
              : {}),
          }}
        >
          <Ionicons name="scan" size={20} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" as const, letterSpacing: 0.3 }}>
            Scan Business Card
          </Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

function GreetingHeader({ name }: { name: string }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-12);

  useEffect(() => {
    opacity.value = withDelay(50, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(50, withSpring(0, { damping: 20, stiffness: 100 }));
  }, [opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        animStyle,
        {
          paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
        },
      ]}
    >
      <Text style={{ color: colors.mutedForeground, fontSize: 14, fontWeight: "500" as const }}>
        {greeting}
      </Text>
      <Text
        style={{
          color: colors.foreground,
          fontSize: 26,
          fontWeight: "700" as const,
          marginTop: 2,
          letterSpacing: -0.5,
        }}
      >
        {name.split(" ")[0]}
      </Text>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const { contacts, events, profile, updateContact } = useApp();
  const insets = useSafeAreaInsets();

  const stats = useMemo(() => {
    const totalContacts = contacts.length;
    const totalEvents = events.length;
    const totalRevenue = events.reduce((s, e) => s + e.revenueGenerated, 0);
    const revenueFormatted =
      totalRevenue >= 1_000_000
        ? `$${(totalRevenue / 1_000_000).toFixed(1)}M`
        : totalRevenue >= 1000
        ? `$${(totalRevenue / 1000).toFixed(0)}K`
        : `$${totalRevenue}`;
    return { totalContacts, totalEvents, totalRevenue, revenueFormatted };
  }, [contacts, events]);

  const recentContacts = useMemo(
    () =>
      [...contacts]
        .sort(
          (a, b) =>
            new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
        )
        .slice(0, 3),
    [contacts]
  );

  const followUps = useMemo(
    () =>
      contacts
        .filter(
          (c) =>
            c.followUpAction !== "No follow-up needed" && c.followUpDate
        )
        .sort(
          (a, b) =>
            new Date(a.followUpDate!).getTime() -
            new Date(b.followUpDate!).getTime()
        )
        .slice(0, 3),
    [contacts]
  );

  const bottomPad = Platform.OS === "web" ? 84 + 16 : insets.bottom + 56 + 24;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        <GreetingHeader name={profile.name} />

        {/* Stats Row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "stretch",
            paddingHorizontal: 16,
            gap: 10,
            marginBottom: 24,
          }}
        >
          <StatCard
            label="Contacts"
            value={stats.totalContacts}
            colors={["#4F8EFF", "#2563EB"]}
            icon={<Feather name="users" size={20} color="#fff" />}
            index={0}
          />
          <StatCard
            label="Events"
            value={stats.totalEvents}
            colors={["#7B5EFF", "#6D28D9"]}
            icon={<Feather name="calendar" size={20} color="#fff" />}
            index={1}
          />
          <StatCard
            label="Revenue"
            value={stats.revenueFormatted}
            colors={["#10B981", "#047857"]}
            icon={<Feather name="trending-up" size={20} color="#fff" />}
            index={2}
          />
        </View>

        {/* Revenue Banner */}
        {stats.totalRevenue > 0 && (
          <Animated.View
            style={[
              {
                marginHorizontal: 16,
                marginBottom: 24,
                borderRadius: colors.radius,
                overflow: "hidden",
              },
            ]}
          >
            <LinearGradient
              colors={["#0F2027", "#203A43", "#2C5364"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                padding: 18,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 12,
                    fontWeight: "500" as const,
                  }}
                >
                  Total Revenue Generated
                </Text>
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 28,
                    fontWeight: "700" as const,
                    letterSpacing: -1,
                    marginTop: 2,
                  }}
                >
                  ${stats.totalRevenue.toLocaleString()}
                </Text>
              </View>
              <GlassIcon tint="#10B981" size={52}>
                <Feather name="trending-up" size={24} color="#fff" />
              </GlassIcon>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Scan CTA */}
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <ScanFAB />
        </View>

        {/* Follow-ups */}
        {followUps.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 20,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 18,
                  fontWeight: "700" as const,
                  letterSpacing: -0.3,
                }}
              >
                Follow-ups
              </Text>
              <Pressable onPress={() => router.push("/(tabs)/contacts")}>
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" as const }}>
                  See all
                </Text>
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: 16 }}>
              {followUps.map((c) => (
                <FollowUpCard
                  key={c.id}
                  contact={c}
                  onComplete={() =>
                    updateContact(c.id, { followUpDate: undefined })
                  }
                />
              ))}
            </View>
          </View>
        )}

        {/* Recent Contacts */}
        {recentContacts.length > 0 && (
          <View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 20,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 18,
                  fontWeight: "700" as const,
                  letterSpacing: -0.3,
                }}
              >
                Recent Contacts
              </Text>
              <Pressable onPress={() => router.push("/(tabs)/contacts")}>
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" as const }}>
                  See all
                </Text>
              </Pressable>
            </View>
            {recentContacts.map((c, i) => (
              <ContactCard key={c.id} contact={c} index={i} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
