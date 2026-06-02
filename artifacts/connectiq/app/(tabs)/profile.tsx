import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ContactCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const PLAN_COLORS: [string, string] = ["#7B5EFF", "#4F8EFF"];

function SettingRow({
  icon,
  label,
  value,
  onPress,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 14,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: danger ? "#FF475722" : colors.secondary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          flex: 1,
          color: danger ? "#FF4757" : colors.foreground,
          fontSize: 15,
        }}
      >
        {label}
      </Text>
      {value && (
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{value}</Text>
      )}
      {!danger && (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      )}
    </Pressable>
  );
}

function EditProfileModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useApp();
  const [form, setForm] = useState({ ...profile });

  function save() {
    updateProfile(form);
    onClose();
  }

  const fields: Array<{ label: string; key: keyof typeof form; multiline?: boolean }> = [
    { label: "Full Name", key: "name" },
    { label: "Company", key: "company" },
    { label: "Job Title", key: "jobTitle" },
    { label: "Email", key: "email" },
    { label: "Phone", key: "phone" },
    { label: "LinkedIn", key: "linkedin" },
    { label: "Website", key: "website" },
  ];

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
          <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "600" as const }}>
            Edit Profile
          </Text>
          <Pressable onPress={save}>
            <Text style={{ color: colors.primary, fontSize: 17, fontWeight: "600" as const }}>
              Save
            </Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {fields.map((f) => (
            <View key={f.key} style={{ marginBottom: 16 }}>
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
                value={(form[f.key] as string) || ""}
                onChangeText={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                style={{
                  backgroundColor: colors.secondary,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: colors.foreground,
                  fontSize: 15,
                }}
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const { profile, contacts, events } = useApp();
  const insets = useSafeAreaInsets();
  const [showEdit, setShowEdit] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 + 24 : insets.bottom + 56 + 24;

  const totalRevenue = events.reduce((s, e) => s + e.revenueGenerated, 0);

  const profileAsContact = {
    id: "profile",
    firstName: profile.name.split(" ")[0] ?? "",
    lastName: profile.name.split(" ").slice(1).join(" ") ?? "",
    company: profile.company,
    jobTitle: profile.jobTitle,
    email: profile.email,
    phone: profile.phone,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* Profile Hero */}
        <LinearGradient
          colors={["#0f1120", "#151828"]}
          style={{
            paddingTop: topPad + 20,
            paddingBottom: 28,
            paddingHorizontal: 20,
            alignItems: "center",
          }}
        >
          <Pressable onPress={() => setShowEdit(true)} style={{ marginBottom: 14 }}>
            <View style={{ position: "relative" }}>
              <Avatar
                contact={profileAsContact as any}
                size={80}
              />
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: "#151828",
                }}
              >
                <Feather name="edit-2" size={12} color="#fff" />
              </View>
            </View>
          </Pressable>

          <Text
            style={{
              color: "#fff",
              fontSize: 22,
              fontWeight: "700" as const,
              letterSpacing: -0.3,
            }}
          >
            {profile.name}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, marginTop: 3 }}>
            {profile.jobTitle} · {profile.company}
          </Text>

          {/* Inline stats */}
          <View
            style={{
              flexDirection: "row",
              marginTop: 20,
              gap: 0,
              borderRadius: 14,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            {[
              { label: "Contacts", value: contacts.length },
              { label: "Events", value: events.length },
              {
                label: "Revenue",
                value:
                  totalRevenue >= 1000
                    ? `$${(totalRevenue / 1000).toFixed(0)}K`
                    : `$${totalRevenue}`,
              },
            ].map((stat, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 12,
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderRightWidth: i < 2 ? 1 : 0,
                  borderRightColor: "rgba(255,255,255,0.1)",
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 18, fontWeight: "700" as const }}
                >
                  {stat.value}
                </Text>
                <Text
                  style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}
                >
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Subscription */}
        <View style={{ margin: 16, marginBottom: 8 }}>
          <LinearGradient
            colors={PLAN_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: colors.radius, padding: 16 }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "600" as const }}>
                  CURRENT PLAN
                </Text>
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" as const }}>
                  Professional
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 }}>
                  Unlimited scans · AI features · ROI tracking
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.2)",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" as const }}>
                  Active
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Account section */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            backgroundColor: colors.card,
            borderRadius: colors.radius,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
          }}
        >
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 12,
              fontWeight: "600" as const,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 8,
            }}
          >
            Account
          </Text>
          <SettingRow
            icon={<Feather name="user" size={16} color={colors.primary} />}
            label="Edit Profile"
            onPress={() => setShowEdit(true)}
          />
          <SettingRow
            icon={<Feather name="mail" size={16} color={colors.primary} />}
            label="Email"
            value={profile.email}
          />
          <SettingRow
            icon={<Feather name="phone" size={16} color={colors.primary} />}
            label="Phone"
            value={profile.phone}
          />
        </View>

        {/* Integrations */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            backgroundColor: colors.card,
            borderRadius: colors.radius,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
          }}
        >
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 12,
              fontWeight: "600" as const,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 8,
            }}
          >
            Integrations
          </Text>
          <SettingRow
            icon={<Feather name="mail" size={16} color="#EA4335" />}
            label="Gmail"
            value="Connected"
          />
          <SettingRow
            icon={<Feather name="calendar" size={16} color="#4285F4" />}
            label="Google Calendar"
            value="Connect"
          />
          <SettingRow
            icon={<Feather name="bar-chart-2" size={16} color="#FF7A59" />}
            label="HubSpot CRM"
            value="Connect"
          />
          <SettingRow
            icon={<Ionicons name="logo-linkedin" size={16} color="#0A66C2" />}
            label="LinkedIn"
            value="Connect"
          />
        </View>

        {/* Preferences */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            marginBottom: 8,
            backgroundColor: colors.card,
            borderRadius: colors.radius,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
          }}
        >
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 12,
              fontWeight: "600" as const,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 8,
            }}
          >
            Preferences
          </Text>
          <SettingRow
            icon={<Feather name="bell" size={16} color={colors.accent} />}
            label="Notifications"
          />
          <SettingRow
            icon={<Feather name="shield" size={16} color={colors.accent} />}
            label="Privacy & Data"
          />
          <SettingRow
            icon={<Feather name="help-circle" size={16} color={colors.accent} />}
            label="Help & Support"
          />
          <SettingRow
            icon={<Feather name="log-out" size={16} color="#FF4757" />}
            label="Sign Out"
            danger
          />
        </View>
      </ScrollView>

      <EditProfileModal visible={showEdit} onClose={() => setShowEdit(false)} />
    </View>
  );
}
