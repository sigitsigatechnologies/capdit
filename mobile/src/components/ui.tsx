import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Slider from "@react-native-community/slider";
import { colors, radius } from "../theme";

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const height = size === "lg" ? 50 : size === "sm" ? 34 : 42;
  const padding = size === "sm" ? 12 : size === "lg" ? 20 : 16;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { height, paddingHorizontal: padding, opacity: disabled ? 0.45 : pressed ? 0.82 : 1 },
        variant === "primary" && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        variant === "ghost" && styles.buttonGhost,
        variant === "danger" && styles.buttonDanger,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color="#fff" /> : icon}
      <Text
        style={[
          styles.buttonText,
          size === "sm" && { fontSize: 12 },
          variant === "ghost" && { color: colors.muted },
          variant === "secondary" && { color: colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  active,
}: {
  icon: React.ReactNode;
  onPress?: () => void;
  label?: string;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.iconButton,
        active && { backgroundColor: colors.violetSoft, borderColor: colors.violetBorder },
        pressed && { opacity: 0.7 },
      ]}
    >
      {icon}
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && { borderColor: colors.violetBorder, backgroundColor: colors.violetSoft },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={[styles.chipText, active && { color: "#ddd6fe" }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SliderRow({
  label,
  value,
  min = -100,
  max = 100,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{Math.round(value)}</Text>
      </View>
      <Slider
        minimumValue={min}
        maximumValue={max}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={colors.violet}
        maximumTrackTintColor="rgba(255,255,255,0.12)"
        thumbTintColor="#ffffff"
      />
    </View>
  );
}

export function SectionTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function GradientCard({
  colors: gradient,
  children,
  style,
  onPress,
}: {
  colors: [string, string];
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const content = (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradient, style]}>
      {children}
    </LinearGradient>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {content}
    </Pressable>
  );
}

export function Badge({ label, tone = "violet" }: { label: string; tone?: "violet" | "emerald" | "muted" }) {
  const palette =
    tone === "emerald"
      ? { bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.3)", text: "#a7f3d0" }
      : tone === "muted"
        ? { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", text: colors.muted }
        : { bg: colors.violetSoft, border: colors.violetBorder, text: "#ddd6fe" };
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

export const uiStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  muted: { color: colors.muted },
});

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  buttonPrimary: { backgroundColor: colors.violet },
  buttonSecondary: { backgroundColor: "rgba(255,255,255,0.06)", borderColor: colors.border },
  buttonGhost: { backgroundColor: "transparent" },
  buttonDanger: { backgroundColor: "rgba(248,113,113,0.14)", borderColor: "rgba(248,113,113,0.35)" },
  buttonText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  chip: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { color: colors.muted, fontSize: 11, fontWeight: "500" },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  sliderRow: { marginBottom: 8 },
  sliderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sliderLabel: { color: colors.text, fontSize: 12 },
  sliderValue: { color: colors.muted, fontSize: 11 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
  sectionSubtitle: { color: colors.muted, fontSize: 11, marginTop: 2 },
  gradient: { borderRadius: radius.lg, overflow: "hidden" },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
});
