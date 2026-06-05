import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { GlassIcon } from "@/components/GlassIcon";
import { Contact } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface FollowUpCardProps {
  contact: Contact;
  onComplete: () => void;
}

export function FollowUpCard({ contact, onComplete }: FollowUpCardProps) {
  const colors = useColors();

  const dueDate = contact.followUpDate ? new Date(contact.followUpDate) : null;
  const now = new Date();
  const isOverdue = dueDate ? dueDate < now : false;
  const isDueToday =
    dueDate
      ? dueDate.toDateString() === now.toDateString()
      : false;

  const dueLabelColor = isOverdue
    ? "#FF4757"
    : isDueToday
    ? "#F59E0B"
    : colors.mutedForeground;

  const dueLabelText = isOverdue
    ? "Overdue"
    : isDueToday
    ? "Today"
    : dueDate
    ? dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "Soon";

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/contact/${contact.id}`);
      }}
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: isOverdue ? "#FF475744" : colors.border,
        borderRadius: colors.radius,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 8,
      }}
    >
      <GlassIcon tint={colors.primary} size={40}>
        <Feather name="clock" size={18} color="#fff" />
      </GlassIcon>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" as const }}>
          {contact.firstName} {contact.lastName}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 1 }}>
          {contact.followUpAction}
        </Text>
      </View>
      <Text style={{ color: dueLabelColor, fontSize: 12, fontWeight: "600" as const }}>
        {dueLabelText}
      </Text>
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onComplete();
        }}
        hitSlop={8}
      >
        <GlassIcon tint="#10B981" size={28}>
          <Feather name="check" size={14} color="#fff" />
        </GlassIcon>
      </Pressable>
    </Pressable>
  );
}
