import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

export default function LinkListingScreen() {
  const insets = useSafeAreaInsets();
  const isDesktopLl = Platform.OS === "web" && Dimensions.get("window").width >= 1024;
  const topPadding = Platform.OS === "web" ? (isDesktopLl ? 24 : 67) : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPadding + 20 }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}>
        <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="home-outline" size={48} color={Colors.ocean} />
        </View>
        <Text style={styles.title}>Link a Listing First</Text>
        <Text style={styles.subtitle}>
          As a Host or Sublessor, you need at least one active listing before using the Matchmaker.
        </Text>
        <Text style={styles.hint}>
          Post your space so potential roommates and sublessees can find you!
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.replace("/post-sublease?mode=host");
          }}
        >
          <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
          <Text style={styles.primaryBtnText}>Go to Marketplace</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}
        >
          <Text style={styles.secondaryBtnText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.sand, paddingHorizontal: 20 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.cardBg,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: Colors.borderSoft, marginBottom: 20,
  },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80, gap: 16 },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.ocean + "15", alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  title: { fontFamily: "Nunito_800ExtraBold", fontSize: 26, color: Colors.ocean, textAlign: "center" },
  subtitle: {
    fontFamily: "Nunito_400Regular", fontSize: 15, color: Colors.charcoal,
    textAlign: "center", lineHeight: 22, paddingHorizontal: 20,
  },
  hint: {
    fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted,
    textAlign: "center", paddingHorizontal: 30,
  },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.orange, borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 28, marginTop: 12,
  },
  primaryBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.white },
  secondaryBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  secondaryBtnText: { fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.textMuted },
});
