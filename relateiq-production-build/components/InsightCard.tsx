import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

import { GlassIcon } from "@/components/GlassIcon";
import type { InsightIcon } from "@/lib/eventIntelligence";
import { useColors } from "@/hooks/useColors";
import { theme } from "@/constants/theme";

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
        gap: theme.spacing[12],
        alignItems: "flex-start",
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: theme.radius.lg,
        padding: theme.spacing[14],
        ...theme.getShadow("#000", "sm"),
      }}
    >
      <GlassIcon tint={tint} size={40}>
        <Feather name={icon} size={18} color="#fff" />
      </GlassIcon>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.foreground,
            ...theme.typography.bodySemi,
            marginBottom: 3,
          }}
        >
          {title}
        </Text>
        <Text
          style={{ color: colors.mutedForeground, ...theme.typography.bodySmall, lineHeight: 18 }}
        >
          {detail}
        </Text>
      </View>
    </View>
  );
}
