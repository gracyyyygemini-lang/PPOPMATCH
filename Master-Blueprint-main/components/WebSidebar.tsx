import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const NAV_ITEMS = [
  { key: "/(tabs)", label: "Browse", icon: "home-outline" as const, activeIcon: "home" as const },
  { key: "/(tabs)/inbox", label: "Inbox", icon: "chatbubbles-outline" as const, activeIcon: "chatbubbles" as const },
  { key: "/(tabs)/profile", label: "Profile", icon: "person-outline" as const, activeIcon: "person" as const },
];

export default function WebSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (key: string) => {
    if (key === "/(tabs)") return pathname === "/" || pathname === "/index";
    if (key === "/(tabs)/inbox") return pathname === "/inbox";
    if (key === "/(tabs)/profile") return pathname === "/profile";
    return false;
  };

  return (
    <View style={styles.sidebar}>
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Ionicons name="home" size={20} color={Colors.white} />
        </View>
        <Text style={styles.logoText}>PopMatch</Text>
      </View>

      <View style={styles.navSection}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.key);
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(item.key as any)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={active ? item.activeIcon : item.icon}
                size={22}
                color={active ? Colors.ocean : Colors.textMuted}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/marketplace" as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="search-outline" size={22} color={Colors.textMuted} />
          <Text style={styles.navLabel}>Marketplace</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/matchmaker" as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="heart-outline" size={22} color={Colors.textMuted} />
          <Text style={styles.navLabel}>Matchmaker</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: Colors.white,
    borderRightWidth: 1,
    borderRightColor: Colors.borderSoft,
    paddingTop: 24,
    paddingHorizontal: 16,
    ...(Platform.OS === "web" ? { height: "100%" as any } : {}),
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSoft,
    marginBottom: 12,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.ocean,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 20,
    color: Colors.charcoal,
    marginLeft: 10,
  },
  navSection: {
    flex: 1,
    paddingTop: 4,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: Colors.ocean + "10",
  },
  navLabel: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 15,
    color: Colors.textMuted,
    marginLeft: 14,
  },
  navLabelActive: {
    color: Colors.ocean,
    fontFamily: "Nunito_700Bold",
  },
  bottomSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
    paddingTop: 12,
    paddingBottom: 24,
  },
});
