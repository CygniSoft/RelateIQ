import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

import { GlassIcon } from "@/components/GlassIcon";
import type { InsightIcon } from "@/lib/eventIntelligence";
import { useColors } from "@/hooks/useColors";

interface InsightCardProps {
  icon: InsightIcon;
  tint: string;
  title: string;
  detail: string;
}

export function InsightCard({ icon, tint, title, detail }: InsightCardProps) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 12,
        alignItems: "flex-start",
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: colors.radius,
        padding: 14,
      }}
    >
      <GlassIcon tint={tint} size={40}>
        <Feather name={icon} size={18} color="#fff" />
      </GlassIcon>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.foreground,
            fontSize: 14,
            fontWeight: "600" as const,
            marginBottom: 3,
          }}
        >
          {title}
        </Text>
        <Text
          style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 18 }}
        >
          {detail}
        </Text>
      </View>
    </View>
  );
}
