import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

export function ScamBanner() {
  const { scamBannerDismissed, dismissScamBanner } = useApp();
  if (scamBannerDismissed) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.iconWrap}>
        <Ionicons name="shield-outline" size={18} color={Colors.alertOrange} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Scam Alert — Stay Safe</Text>
        <Text style={styles.body}>
          Never wire money for movers or extra rent. Fake check scams target UIUC students. Always meet landlords in person and verify listings.
        </Text>
      </View>
      <TouchableOpacity onPress={() => { Haptics.selectionAsync(); dismissScamBanner(); }} style={styles.closeBtn}>
        <Ionicons name="close" size={16} color={Colors.alertOrange} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#FFF4E0",
    borderLeftWidth: 3, borderLeftColor: Colors.alertOrange,
    borderRadius: 12, padding: 12,
  },
  iconWrap: { paddingTop: 1 },
  content: { flex: 1 },
  title: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.alertOrange },
  body: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.charcoal, lineHeight: 17, marginTop: 2 },
  closeBtn: { padding: 2 },
});
