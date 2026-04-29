import React, { useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, TextInput,
  ScrollView, Animated, Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

type Rating = "smooth" | "bumpy" | "rescue";

const RATINGS: { key: Rating; emoji: string; label: string; sub: string; color: string }[] = [
  { key: "smooth", emoji: "🌊", label: "Smooth sailing!", sub: "Great experience", color: Colors.ocean },
  { key: "bumpy", emoji: "🛶", label: "A bit bumpy.", sub: "Okay experience", color: Colors.goldDark },
  { key: "rescue", emoji: "🦈", label: "Needs a rescue.", sub: "Bad experience", color: Colors.ponyo },
];

const ISSUES = [
  "App crashed",
  "Too many fake posts",
  "Hard to use",
  "Bad matches",
  "Slow loading",
  "Inaccurate listings",
  "Other",
];

interface MicroFeedbackProps {
  visible: boolean;
  userEmail: string;
  onClose: () => void;
}

export default function MicroFeedback({ visible, userEmail, onClose }: MicroFeedbackProps) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Rating | null>(null);
  const [phase, setPhase] = useState<"rate" | "issues" | "thanks">("rate");
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const waveAnim = useRef(new Animated.Value(0)).current;

  const resetState = () => {
    setSelected(null);
    setPhase("rate");
    setSelectedIssues([]);
    setDetail("");
    setSubmitting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const pulseWave = () => {
    waveAnim.setValue(0);
    Animated.timing(waveAnim, {
      toValue: 1, duration: 800,
      useNativeDriver: false,
    }).start();
  };

  const handleRatingSelect = async (r: Rating) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelected(r);

    if (r === "rescue") {
      setPhase("issues");
      return;
    }

    await submitFeedback(r, "", "");
    setPhase("thanks");
    pulseWave();
    setTimeout(handleClose, 2000);
  };

  const submitFeedback = async (rating: string, category: string, detail: string) => {
    try {
      setSubmitting(true);
      const base = new URL("/api/feedback", getApiUrl()).toString();
      await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          rating,
          issueCategory: category,
          issueDetail: detail,
        }),
      });
    } catch {}
    setSubmitting(false);
  };

  const handleIssuesSubmit = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await submitFeedback("rescue", selectedIssues.join(", "), detail);
    setPhase("thanks");
    pulseWave();
    setTimeout(handleClose, 2000);
  };

  const toggleIssue = (issue: string) => {
    Haptics.selectionAsync();
    setSelectedIssues(prev =>
      prev.includes(issue) ? prev.filter(i => i !== issue) : [...prev, issue]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={mf.overlay}
        activeOpacity={1}
        onPress={phase === "thanks" ? undefined : handleClose}
      >
        <View style={[mf.sheet, {
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16)
        }]}>
          <View style={mf.handle} />

          {phase === "rate" && (
            <>
              <Text style={mf.title}>How was your experience?</Text>
              <Text style={mf.sub}>Your listing was just marked as leased</Text>

              <View style={mf.ratingRow}>
                {RATINGS.map(r => (
                  <TouchableOpacity
                    key={r.key}
                    style={[mf.ratingCard, selected === r.key && { borderColor: r.color, borderWidth: 2 }]}
                    onPress={() => handleRatingSelect(r.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={mf.emoji}>{r.emoji}</Text>
                    <Text style={[mf.ratingLabel, selected === r.key && { color: r.color }]}>{r.label}</Text>
                    <Text style={mf.ratingSub}>{r.sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity onPress={handleClose} style={mf.skipBtn}>
                <Text style={mf.skipText}>Skip</Text>
              </TouchableOpacity>
            </>
          )}

          {phase === "issues" && (
            <>
              <TouchableOpacity style={mf.backBtn} onPress={() => setPhase("rate")}>
                <Ionicons name="arrow-back" size={18} color={Colors.textMuted} />
                <Text style={mf.backText}>Back</Text>
              </TouchableOpacity>
              <Text style={mf.title}>What went wrong?</Text>
              <Text style={mf.sub}>Select all that apply</Text>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 220 }}>
                <View style={mf.issueGrid}>
                  {ISSUES.map(issue => {
                    const active = selectedIssues.includes(issue);
                    return (
                      <TouchableOpacity
                        key={issue}
                        style={[mf.issueChip, active && mf.issueChipActive]}
                        onPress={() => toggleIssue(issue)}
                      >
                        {active && <Ionicons name="checkmark-circle" size={14} color={Colors.ponyo} />}
                        <Text style={[mf.issueText, active && mf.issueTextActive]}>{issue}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <TextInput
                style={mf.detailInput}
                placeholder="Any other details? (optional)"
                placeholderTextColor={Colors.textLight}
                value={detail}
                onChangeText={setDetail}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[mf.submitBtn, { opacity: submitting ? 0.6 : 1 }]}
                onPress={handleIssuesSubmit}
                disabled={submitting}
              >
                <Text style={mf.submitText}>Send Feedback</Text>
              </TouchableOpacity>
            </>
          )}

          {phase === "thanks" && (
            <View style={mf.thanksContainer}>
              <Animated.View style={[mf.waveCircle, {
                transform: [{
                  scale: waveAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.4],
                  })
                }],
                opacity: waveAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.8, 1, 0],
                }),
              }]} />
              <Text style={mf.thanksEmoji}>🌊</Text>
              <Text style={mf.thanksTitle}>Thanks for the feedback!</Text>
              <Text style={mf.thanksSub}>You help make PopMatch better for everyone.</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const mf = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, gap: 4,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.borderSoft, alignSelf: "center", marginBottom: 12,
  },
  title: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.charcoal, textAlign: "center",
  },
  sub: {
    fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted,
    textAlign: "center", marginBottom: 16,
  },
  ratingRow: {
    flexDirection: "row", gap: 10, marginBottom: 8,
  },
  ratingCard: {
    flex: 1, alignItems: "center", gap: 6,
    backgroundColor: Colors.sand + "80",
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 8,
    borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  emoji: { fontSize: 30 },
  ratingLabel: {
    fontFamily: "Nunito_700Bold", fontSize: 11, color: Colors.charcoal, textAlign: "center",
  },
  ratingSub: {
    fontFamily: "Nunito_400Regular", fontSize: 10, color: Colors.textMuted, textAlign: "center",
  },
  skipBtn: { alignSelf: "center", padding: 10 },
  skipText: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textLight },
  backBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 4, marginBottom: 4,
  },
  backText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.textMuted },
  issueGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12,
  },
  issueChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: Colors.borderSoft,
    backgroundColor: Colors.cardBg,
  },
  issueChipActive: {
    borderColor: Colors.ponyo, backgroundColor: Colors.ponyo + "12",
  },
  issueText: {
    fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted,
  },
  issueTextActive: { color: Colors.ponyo },
  detailInput: {
    borderWidth: 1.5, borderColor: Colors.borderSoft, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.charcoal,
    backgroundColor: Colors.sand + "60", height: 72, textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: Colors.ocean, borderRadius: 14, paddingVertical: 14,
    alignItems: "center", marginTop: 8,
  },
  submitText: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.white },
  thanksContainer: {
    alignItems: "center", paddingVertical: 32, gap: 8, position: "relative",
  },
  waveCircle: {
    position: "absolute",
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.ocean + "30",
  },
  thanksEmoji: { fontSize: 52, marginBottom: 8 },
  thanksTitle: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.ocean,
  },
  thanksSub: {
    fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textMuted,
    textAlign: "center", paddingHorizontal: 20,
  },
});
