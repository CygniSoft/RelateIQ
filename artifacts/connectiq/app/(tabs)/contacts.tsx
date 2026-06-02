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
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

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
              paddingTop: topPad + 16,
              paddingHorizontal: 20,
              paddingBottom: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
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
                Contacts
              </Text>
              <View
                style={{
                  backgroundColor: colors.primary + "22",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 20,
                }}
              >
                <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "700" as const }}>
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
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 14,
                paddingVertical: 10,
                gap: 10,
                marginBottom: 14,
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
                  fontSize: 15,
                }}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                </Pressable>
              )}
            </View>

            {/* Filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {filters.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveFilter(f);
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 7,
                    borderRadius: 20,
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
                      fontSize: 13,
                      fontWeight: "600" as const,
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
              gap: 12,
            }}
          >
            <Feather name="users" size={40} color={colors.mutedForeground} />
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: 16,
                fontWeight: "600" as const,
              }}
            >
              No contacts found
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: 14,
                textAlign: "center",
              }}
            >
              Scan a business card to add your first contact
            </Text>
          </View>
        ) : (
          <View style={{ paddingTop: 8 }}>
            {filtered.map((c, i) => (
              <ContactCard key={c.id} contact={c} index={i} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
