import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { Zone } from "@/context/AppContext";

const ZONES: { key: Zone | "all"; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "all", label: "All Zones", icon: "apps-outline" },
  { key: "campustown", label: "Campustown (Central Campus)", icon: "storefront-outline" },
  { key: "north", label: "North Campus (Engineering / Midtown)", icon: "hardware-chip-outline" },
  { key: "south", label: "South Campus (Ikenberry / Seniorland)", icon: "football-outline" },
  { key: "urbana", label: "Urbana (Gradland)", icon: "leaf-outline" },
  { key: "downtown", label: "Downtown Champaign", icon: "business-outline" },
];

interface ZonePickerProps {
  selected: Zone | "all";
  onSelect: (zone: Zone | "all") => void;
}

export default function ZonePicker({ selected, onSelect }: ZonePickerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {ZONES.map(z => {
        const active = selected === z.key;
        return (
          <TouchableOpacity
            key={z.key}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => { onSelect(z.key); Haptics.selectionAsync(); }}
          >
            <Ionicons name={z.icon} size={13} color={active ? Colors.white : Colors.textMuted} />
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{z.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 48 },
  row: { paddingHorizontal: 16, gap: 8, paddingVertical: 6, alignItems: "center" },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  chipActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  chipText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted },
  chipTextActive: { color: Colors.white },
});
