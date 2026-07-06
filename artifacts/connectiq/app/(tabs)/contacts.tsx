import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
import { GlassIcon } from "@/components/GlassIcon";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { theme } from "@/constants/theme";

type Filter = "All" | "Hot" | "Warm" | "Cool" | "Priority";

export default function ContactsScreen() {
  const colors = useColors();
  const { contacts } = useApp();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("All");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 + 16 : insets.bottom + 56 + 16;

  const filtered = useMemo(() => {
    let result = [...contacts];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.firstName.toLowerCase().includes(q) ||
          c.lastName.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      );
    }

    switch (activeFilter) {
      case "Hot":
        result = result.filter((c) => c.relationshipScore >= 80);
        break;
      case "Warm":
        result = result.filter(
          (c) => c.relationshipScore >= 50 && c.relationshipScore < 80
        );
        break;
      case "Cool":
        result = result.filter((c) => c.relationshipScore < 50);
        break;
      case "Priority":
        result = result.filter((c) => c.priority === "High");
        break;
    }

    return result.sort(
      (a, b) =>
        new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
    );
  }, [contacts, search, activeFilter]);

  const filters: Filter[] = ["All", "Hot", "Warm", "Cool", "Priority"];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* Sticky header */}
        <View style={{ backgroundColor: colors.background }}>
          <View
            style={{
              paddingTop: topPad + theme.spacing[16],
              paddingHorizontal: theme.spacing[20],
              paddingBottom: theme.spacing[12],
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: theme.spacing[16],
              }}
            >
              <Text
                style={{
                  color: colors.foreground,
                  ...theme.typography.h1,
                }}
              >
                Contacts
              </Text>
              <View
                style={{
                  backgroundColor: colors.primary + "22",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: theme.radius.xl,
                }}
              >
                <Text style={{ color: colors.primary, ...theme.typography.bodySemi }}>
                  {contacts.length}
                </Text>
              </View>
            </View>

            {/* Search */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.secondary,
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: theme.spacing[14],
                paddingVertical: theme.spacing[10],
                gap: theme.spacing[10],
                marginBottom: theme.spacing[14],
              }}
            >
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search contacts..."
                placeholderTextColor={colors.mutedForeground}
                style={{
                  flex: 1,
                  color: colors.foreground,
                  ...theme.typography.body,
                }}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} hitSlop={12}>
                  <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                </Pressable>
              )}
            </View>

            {/* Filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingRight: theme.spacing[20] }}
            >
              {filters.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveFilter(f);
                  }}
                  hitSlop={{ top: 8, bottom: 8 }}
                  style={{
                    paddingHorizontal: theme.spacing[16],
                    paddingVertical: 7,
                    borderRadius: theme.radius.xl,
                    backgroundColor:
                      activeFilter === f ? colors.primary : colors.card,
                    borderWidth: 1,
                    borderColor:
                      activeFilter === f ? colors.primary : colors.border,
                  }}
                >
                  <Text
                    style={{
                      color:
                        activeFilter === f ? "#fff" : colors.mutedForeground,
                      ...theme.typography.bodySmallSemi,
                    }}
                  >
                    {f}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Results */}
        {filtered.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 80,
              gap: theme.spacing[12],
            }}
          >
            <GlassIcon tint={colors.primary} size={80}>
              <Feather name="users" size={36} color="#fff" />
            </GlassIcon>
            <Text
              style={{
                color: colors.mutedForeground,
                ...theme.typography.bodyLargeSemi,
              }}
            >
              No contacts found
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                ...theme.typography.body,
                textAlign: "center",
              }}
            >
              Scan a business card to add your first contact
            </Text>
          </View>
        ) : (
          <View style={{ paddingTop: theme.spacing[8] }}>
            {filtered.map((c, i) => (
              <ContactCard key={c.id} contact={c} index={i} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}