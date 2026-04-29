import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  SafeAreaView, ScrollView, Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { MutualFriend } from "@/context/AppContext";

interface FacePileProps {
  mutuals: MutualFriend[];
  maxVisible?: number;
}

function Avatar({ name, color, size, style }: {
  name: string; color: string; size: number; style?: object
}) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <View style={[{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color,
      alignItems: "center", justifyContent: "center",
      borderWidth: 2, borderColor: Colors.cardBg,
    }, style]}>
      <Text style={{
        fontFamily: "Nunito_700Bold",
        fontSize: size * 0.35,
        color: Colors.white,
      }}>
        {initials}
      </Text>
    </View>
  );
}

export default function FacePile({ mutuals, maxVisible = 3 }: FacePileProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  if (!mutuals || mutuals.length === 0) return null;

  const visible = mutuals.slice(0, maxVisible);
  const overflow = mutuals.length - maxVisible;
  const label = mutuals.length === 1 ? "1 Mutual" : `${mutuals.length} Mutuals`;
  const AVATAR_SIZE = 26;
  const OVERLAP = 9;

  return (
    <>
      <TouchableOpacity
        style={fp.container}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.75}
      >
        <View style={[fp.pile, { width: AVATAR_SIZE + (visible.length - 1) * (AVATAR_SIZE - OVERLAP) + (overflow > 0 ? AVATAR_SIZE - OVERLAP : 0) }]}>
          {visible.map((m, i) => (
            <Avatar
              key={m.email}
              name={m.name}
              color={m.avatarColor}
              size={AVATAR_SIZE}
              style={{ position: "absolute", left: i * (AVATAR_SIZE - OVERLAP), zIndex: visible.length - i }}
            />
          ))}
          {overflow > 0 && (
            <View style={[{
              width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
              backgroundColor: Colors.ocean + "CC",
              alignItems: "center", justifyContent: "center",
              borderWidth: 2, borderColor: Colors.cardBg,
              position: "absolute",
              left: visible.length * (AVATAR_SIZE - OVERLAP),
              zIndex: 0,
            }]}>
              <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 9, color: Colors.white }}>
                +{overflow}
              </Text>
            </View>
          )}
        </View>

        <Text style={fp.label}>{label}</Text>
        <Ionicons name="chevron-forward" size={11} color={Colors.ocean} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={fp.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={[fp.sheet, {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16)
          }]}>
            <View style={fp.sheetHandle} />
            <View style={fp.sheetHeader}>
              <Ionicons name="people" size={20} color={Colors.ocean} />
              <Text style={fp.sheetTitle}>Shared Friends</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={fp.sheetSub}>
              You and this person share {mutuals.length} connection{mutuals.length !== 1 ? "s" : ""}
            </Text>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {mutuals.map(m => {
                const initials = m.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <View key={m.email} style={fp.friendRow}>
                    <View style={[fp.friendAvatar, { backgroundColor: m.avatarColor }]}>
                      <Text style={fp.friendInitials}>{initials}</Text>
                    </View>
                    <View style={fp.friendInfo}>
                      <Text style={fp.friendName}>{m.name}</Text>
                      <Text style={fp.friendEmail}>{m.email}</Text>
                    </View>
                    <View style={fp.friendBadge}>
                      <Ionicons name="people" size={11} color={Colors.grassGreen} />
                      <Text style={fp.friendBadgeText}>In your circle</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const fp = StyleSheet.create({
  container: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: Colors.ocean + "12",
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.ocean + "30",
    alignSelf: "flex-start",
  },
  pile: {
    height: 26, position: "relative",
  },
  label: {
    fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.ocean,
  },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.borderSoft, alignSelf: "center", marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4,
  },
  sheetTitle: {
    fontFamily: "Nunito_700Bold", fontSize: 18, color: Colors.ocean, flex: 1,
  },
  sheetSub: {
    fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, marginBottom: 16,
  },
  friendRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderSoft,
  },
  friendAvatar: {
    width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
  },
  friendInitials: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
  friendInfo: { flex: 1 },
  friendName: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  friendEmail: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted },
  friendBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.grassGreen + "18",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  friendBadgeText: { fontFamily: "Nunito_700Bold", fontSize: 10, color: Colors.grassGreen },
});
