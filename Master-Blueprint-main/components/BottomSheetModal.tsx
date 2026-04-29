import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Platform,
  KeyboardAvoidingView, DimensionValue,
} from "react-native";
import Colors from "@/constants/colors";

export default function BottomSheetModal({
  visible,
  onClose,
  title,
  children,
  maxHeight,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxHeight?: DimensionValue;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={bsStyles.overlay}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close sheet"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ justifyContent: "flex-end" }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[bsStyles.sheet, maxHeight !== undefined ? { maxHeight } : undefined]}
          >
            <View style={bsStyles.handle} />
            <Text style={bsStyles.title} accessibilityRole="header">{title}</Text>
            {children}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

const bsStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36, maxHeight: "75%",
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.borderSoft,
    alignSelf: "center", marginBottom: 16,
  },
  title: {
    fontFamily: "Nunito_700Bold", fontSize: 18, color: Colors.charcoal, marginBottom: 16,
  },
});
