import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, TouchableOpacity, Platform,
  Modal, TextInput, KeyboardAvoidingView, ScrollView, useWindowDimensions, Image,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { useApp, CrashPost, CrashVibe, CrashCurrency, Zone } from "@/context/AppContext";
import { useResponsive } from "@/hooks/useResponsive";
import CustomAvatar from "@/components/CustomAvatar";
import { uploadImageUri } from "@/lib/uploadImage";

const DARK_TEAL = "#2C555C";
const SUBTITLE_GREY = "#6B8A8F";
const SCREEN_BG = "#FBFBF9";
const CORAL_FAB = "#FF8C69";
const SOS_TINT = "#FDECE8";
const OFFER_TINT = "#E8F6F3";
const SOS_RED = "#E74C3C";
const OFFERING_GREEN = "#D0F0E0";
const GRID_GAP = 12;
const GRID_PAD = 16;
const DISABLED_BG = "#E0E8E9";
const DISABLED_TEXT = "#8A9FA3";

const ZONE_SHORT: Record<string, string> = {
  campustown: "Campustown",
  north: "North",
  south: "South",
  urbana: "Urbana",
  downtown: "Downtown",
};

const PLACEHOLDER_IMGS: Record<string, { colors: string[]; icon: keyof typeof Ionicons.glyphMap }> = {
  campustown: { colors: ["#FFE5D9", "#FBBF9E"], icon: "storefront-outline" },
  north: { colors: ["#D6EAF8", "#A9CCE3"], icon: "hardware-chip-outline" },
  south: { colors: ["#D5F5E3", "#A9DFBF"], icon: "football-outline" },
  urbana: { colors: ["#FCF3CF", "#F9E79F"], icon: "leaf-outline" },
  downtown: { colors: ["#E8DAEF", "#D2B4DE"], icon: "business-outline" },
};

const CURRENCY_OPTIONS: { key: CrashCurrency; emoji: string; label: string }[] = [
  { key: "cash", emoji: "💵", label: "Cash" },
  { key: "boba", emoji: "🧋", label: "Boba" },
  { key: "lion_cover", emoji: "🦁", label: "Lion Cover" },
  { key: "food", emoji: "🍕", label: "Food/Drinks" },
  { key: "favor", emoji: "🤝", label: "Return the Favor" },
];

const ZONE_OPTIONS: { key: Zone; label: string }[] = [
  { key: "campustown", label: "Campustown" },
  { key: "north", label: "North Campus" },
  { key: "south", label: "South Campus" },
  { key: "urbana", label: "Urbana" },
  { key: "downtown", label: "Downtown" },
];

type VibeFilter = "all" | "sos" | "offering";

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function GridCard({
  post, cardWidth, isOwner, isPinned, onDm, onMarkFilled,
}: {
  post: CrashPost; cardWidth: number; isOwner: boolean; isPinned: boolean;
  onDm: () => void; onMarkFilled: () => void;
}) {
  const isSos = post.vibe === "sos";
  const tint = isSos ? SOS_TINT : OFFER_TINT;
  const placeholder = PLACEHOLDER_IMGS[post.zone] || PLACEHOLDER_IMGS.campustown;
  const hasImage = !!post.imageUrl;

  return (
    <View style={[gc.card, { width: cardWidth, backgroundColor: tint }, isPinned && gc.pinnedCard]}>
      <View style={gc.heroWrap}>
        {hasImage ? (
          <Image source={{ uri: post.imageUrl }} style={gc.heroImage} />
        ) : (
          <View style={[gc.heroPlaceholder, { backgroundColor: placeholder.colors[0] }]}>
            <Ionicons name={placeholder.icon} size={36} color={placeholder.colors[1]} />
          </View>
        )}
        <View style={gc.avatarOverlay}>
          <CustomAvatar name={post.userName} avatarColor={post.avatarColor} size={28} fontSize={12} />
        </View>
        <View style={gc.tagOverlay}>
          <View style={[gc.tagPill, isSos ? gc.tagSos : gc.tagOffer]}>
            <Text style={gc.tagText}>{isSos ? "🚨 NEED" : "🛋️ GOT"}</Text>
          </View>
        </View>
        {isPinned && (
          <View style={gc.pinnedOverlay}>
            <View style={gc.pinnedPill}>
              <Text style={gc.pinnedText}>📌 Pinned</Text>
            </View>
          </View>
        )}
      </View>

      <View style={gc.details}>
        <Text style={gc.story} numberOfLines={2}>{post.story}</Text>
        <View style={gc.essBox}>
          <View style={gc.essItem}>
            <Text style={gc.essIcon}>🗓️</Text>
            <Text style={gc.essText} numberOfLines={1}>{post.dates}</Text>
          </View>
          <View style={gc.essItem}>
            <Text style={gc.essIcon}>📍</Text>
            <Text style={gc.essText} numberOfLines={1} ellipsizeMode="tail">{ZONE_SHORT[post.zone] || post.zone}{post.approxLocation ? ` (${post.approxLocation})` : ""}</Text>
          </View>
        </View>

        <View style={gc.actionRow}>
          <Text style={gc.currency} numberOfLines={1}>{post.currencyLabel}</Text>
          {isOwner ? (
            <Pressable onPress={onMarkFilled}>
              {({ pressed }) => (
                <View style={[gc.filledBtn, pressed && { opacity: 0.7 }]}>
                  <Text style={gc.filledBtnText}>Filled 🔒</Text>
                </View>
              )}
            </Pressable>
          ) : (
            <Pressable onPress={onDm}>
              {({ pressed }) => (
                <View style={[gc.dmBtn, pressed && { backgroundColor: "#1E4448", transform: [{ scale: 0.95 }] }]}>
                  <Text style={gc.dmBtnText}>DM ⚡️</Text>
                </View>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const gc = StyleSheet.create({
  card: {
    borderRadius: 16, overflow: "hidden",
    shadowColor: "rgba(0,0,0,0.05)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 16,
    elevation: 2,
  },
  heroWrap: { height: 180, position: "relative" },
  heroImage: { width: "100%", height: "100%", resizeMode: "cover" },
  heroPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  avatarOverlay: { position: "absolute", top: 8, left: 8 },
  avatar: {
    width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: Colors.white,
  },
  avatarText: { fontFamily: "Nunito_800ExtraBold", fontSize: 12, color: Colors.white },
  tagOverlay: { position: "absolute", bottom: -10, left: 8 },
  tagPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagSos: { backgroundColor: "#FF6B4E" },
  tagOffer: { backgroundColor: Colors.grassGreen },
  tagText: { fontFamily: "Nunito_800ExtraBold", fontSize: 11, color: Colors.white },
  details: { padding: 8, paddingTop: 16, gap: 6 },
  story: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: DARK_TEAL, lineHeight: 18 },
  essBox: { backgroundColor: Colors.white, borderRadius: 8, padding: 6, gap: 3 },
  essItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  essIcon: { fontSize: 11 },
  essText: { fontFamily: "Nunito_400Regular", fontSize: 11, color: DARK_TEAL, flex: 1 },
  actionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  currency: { fontFamily: "Nunito_800ExtraBold", fontSize: 13, color: DARK_TEAL, flex: 1 },
  dmBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: DARK_TEAL },
  dmBtnText: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.white },
  filledBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1.5, borderColor: SUBTITLE_GREY, backgroundColor: "transparent",
  },
  filledBtnText: { fontFamily: "Nunito_700Bold", fontSize: 12, color: SUBTITLE_GREY },
  pinnedCard: { borderWidth: 2, borderColor: "#005F73" },
  pinnedOverlay: { position: "absolute", top: 8, right: 8 },
  pinnedPill: {
    backgroundColor: "rgba(0,95,115,0.85)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  pinnedText: { fontFamily: "Nunito_700Bold", fontSize: 10, color: "#FFFFFF" },
});

function SegmentedToggle({ value, onChange }: { value: VibeFilter; onChange: (v: VibeFilter) => void }) {
  const opts: { key: VibeFilter; label: string }[] = [
    { key: "sos", label: "🚨 Needing" },
    { key: "offering", label: "🛋️ Offering" },
    { key: "all", label: "All" },
  ];
  return (
    <View style={seg.wrap}>
      {opts.map(o => (
        <Pressable key={o.key} onPress={() => { onChange(o.key); Haptics.selectionAsync(); }} style={{ flex: 1 }}>
          {({ pressed }) => (
            <View style={[seg.item, value === o.key && seg.itemActive, pressed && { opacity: 0.85 }]}>
              <Text style={[seg.text, value === o.key && seg.textActive]}>{o.label}</Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const seg = StyleSheet.create({
  wrap: {
    flexDirection: "row", backgroundColor: "#EDF2F2", borderRadius: 14, padding: 3,
    marginHorizontal: GRID_PAD, marginBottom: 8,
  },
  item: { paddingVertical: 8, borderRadius: 12, alignItems: "center" },
  itemActive: { backgroundColor: Colors.white, shadowColor: "rgba(0,0,0,0.06)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  text: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: SUBTITLE_GREY },
  textActive: { fontFamily: "Nunito_700Bold", color: DARK_TEAL },
});

function getNext10Days(): { label: string; ts: number }[] {
  const days: { label: string; ts: number }[] = [];
  const now = new Date();
  for (let i = 0; i < 10; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(23, 59, 59, 999);
    const dayLabel = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    days.push({ label: dayLabel, ts: d.getTime() });
  }
  return days;
}

function NewPostSheet({
  visible, onClose, onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    vibe: CrashVibe; story: string; dates: string; targetDate: number;
    zone: Zone; currency: CrashCurrency; currencyLabel: string; imageUrl: string;
    approxLocation?: string;
  }) => void;
}) {
  const [vibe, setVibe] = useState<CrashVibe>("sos");
  const [story, setStory] = useState("");
  const [selectedDateIdx, setSelectedDateIdx] = useState<number | null>(null);
  const [zone, setZone] = useState<Zone>("campustown");
  const [approxLocation, setApproxLocation] = useState("");
  const [currency, setCurrency] = useState<CrashCurrency>("cash");
  const [customCurrencyLabel, setCustomCurrencyLabel] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [uploading, setUploading] = useState(false);
  const insets = useSafeAreaInsets();
  const next10 = useMemo(getNext10Days, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]?.base64) {
      const asset = result.assets[0];
      const mime = asset.mimeType ?? "image/jpeg";
      setImageUri(`data:${mime};base64,${asset.base64}`);
    }
  };

  const maxDate = Date.now() + 10 * 24 * 60 * 60 * 1000;
  const isDateValid = selectedDateIdx !== null && next10[selectedDateIdx].ts <= maxDate;
  const isFormComplete = !!story.trim() && isDateValid && !!imageUri;

  const handleSubmit = async () => {
    if (!isFormComplete || uploading) return;
    const currOpt = CURRENCY_OPTIONS.find(c => c.key === currency);
    const label = customCurrencyLabel.trim() || `${currOpt?.emoji} ${currOpt?.label}`;
    const dateInfo = next10[selectedDateIdx!];

    let uploadedImageUrl: string;
    try {
      setUploading(true);
      uploadedImageUrl = await uploadImageUri(imageUri, "crash");
    } catch (err: any) {
      setUploading(false);
      Alert.alert("Upload failed", err?.message ?? "Could not upload photo. Please try again.");
      return;
    } finally {
      setUploading(false);
    }

    onSubmit({
      vibe,
      story: story.trim(),
      dates: dateInfo.label,
      targetDate: dateInfo.ts,
      zone,
      currency,
      currencyLabel: label,
      imageUrl: uploadedImageUrl,
      approxLocation: approxLocation.trim() || undefined,
    });
    setStory("");
    setSelectedDateIdx(null);
    setApproxLocation("");
    setCustomCurrencyLabel("");
    setImageUri("");
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={np.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ justifyContent: "flex-end", flex: 1 }}>
          <ScrollView bounces={false} style={[np.sheet, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]} contentContainerStyle={{ gap: 8, paddingBottom: 20 }}>
            <View style={np.handle} />
            <Text style={np.title}>New Crash Post</Text>

            <View style={np.urgentBox}>
              <Text style={np.urgentText}>⚡️ Crash & Cash is for urgent stays only. You can only post for the next 10 days.</Text>
            </View>

            <Text style={np.label}>Vibe</Text>
            <View style={np.vibeRow}>
              <Pressable onPress={() => setVibe("sos")} style={[np.vibeOption, vibe === "sos" && np.vibeActive]}>
                <Text style={np.vibeOptionText}>🚨 SOS</Text>
              </Pressable>
              <Pressable onPress={() => setVibe("offering")} style={[np.vibeOption, vibe === "offering" && np.vibeActiveGreen]}>
                <Text style={np.vibeOptionText}>🛋️ Offering</Text>
              </Pressable>
            </View>

            <Text style={np.label}>Photo <Text style={np.required}>*</Text></Text>
            <TouchableOpacity onPress={pickImage} activeOpacity={0.7}>
              {imageUri ? (
                <View style={np.imagePreviewWrap}>
                  <Image source={{ uri: imageUri }} style={np.imagePreview} />
                  <View style={np.imageOverlay}>
                    <Ionicons name="camera-outline" size={20} color={Colors.white} />
                    <Text style={np.imageOverlayText}>Change Photo</Text>
                  </View>
                </View>
              ) : (
                <View style={np.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={28} color={SUBTITLE_GREY} />
                  <Text style={np.imagePlaceholderText}>Upload a photo of the room or situation</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={np.label}>Your Story <Text style={np.required}>*</Text></Text>
            <TextInput
              style={np.textArea}
              placeholder="What's the situation? Keep it real..."
              placeholderTextColor={SUBTITLE_GREY}
              multiline
              value={story}
              onChangeText={setStory}
              maxLength={280}
            />

            <Text style={np.label}>When <Text style={np.required}>*</Text></Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 48 }} contentContainerStyle={{ gap: 8 }}>
              {next10.map((d, idx) => (
                <Pressable key={idx} onPress={() => setSelectedDateIdx(idx)} style={[np.dateChip, selectedDateIdx === idx && np.dateChipActive]}>
                  <Text style={[np.dateChipText, selectedDateIdx === idx && { color: Colors.white }]}>{d.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={np.label}>Zone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 42 }} contentContainerStyle={{ gap: 8 }}>
              {ZONE_OPTIONS.map(z => (
                <Pressable key={z.key} onPress={() => setZone(z.key)} style={[np.zoneChip, zone === z.key && np.zoneChipActive]}>
                  <Text style={[np.zoneChipText, zone === z.key && { color: Colors.white }]}>{z.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={np.label}>Approximate Location (Cross Streets or Building)</Text>
            <TextInput
              style={np.input}
              placeholder="e.g., Green & 3rd, or Near County Market"
              placeholderTextColor={SUBTITLE_GREY}
              value={approxLocation}
              onChangeText={setApproxLocation}
              maxLength={80}
            />
            <Text style={np.safetyHint}>🔒 For your safety, never post your exact apartment number publicly. Share it in DMs once you approve your guest.</Text>

            <Text style={np.label}>Accepted Currency</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 42 }} contentContainerStyle={{ gap: 8 }}>
              {CURRENCY_OPTIONS.map(c => (
                <Pressable key={c.key} onPress={() => setCurrency(c.key)} style={[np.zoneChip, currency === c.key && np.zoneChipActive]}>
                  <Text style={[np.zoneChipText, currency === c.key && { color: Colors.white }]}>{c.emoji} {c.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <TextInput
              style={[np.input, { marginTop: 4 }]}
              placeholder="Custom price label (e.g. $20, Boba from Kung Fu)"
              placeholderTextColor={SUBTITLE_GREY}
              value={customCurrencyLabel}
              onChangeText={setCustomCurrencyLabel}
            />

            <View style={np.btnRow}>
              <TouchableOpacity style={np.cancelBtn} onPress={onClose}>
                <Text style={np.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[np.submitBtn, (!isFormComplete || uploading) && { backgroundColor: DISABLED_BG }]}
                onPress={handleSubmit}
                disabled={!isFormComplete || uploading}
              >
                <Text style={[np.submitBtnText, (!isFormComplete || uploading) && { color: DISABLED_TEXT }]}>
                  {uploading ? "Uploading…" : "Post to Feed ✨"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const np = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 14, maxHeight: "90%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderSoft, alignSelf: "center", marginBottom: 8 },
  title: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: DARK_TEAL, marginBottom: 4 },
  urgentBox: {
    backgroundColor: SOS_TINT, borderRadius: 12, padding: 12,
  },
  urgentText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: DARK_TEAL, lineHeight: 19 },
  label: { fontFamily: "Nunito_700Bold", fontSize: 13, color: SUBTITLE_GREY, marginTop: 4 },
  required: { color: "#FF6B4E", fontSize: 13 },
  vibeRow: { flexDirection: "row", gap: 10 },
  vibeOption: {
    flex: 1, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: "#E0E8E9",
    alignItems: "center",
  },
  vibeActive: { backgroundColor: SOS_RED + "15", borderColor: SOS_RED },
  vibeActiveGreen: { backgroundColor: OFFERING_GREEN, borderColor: Colors.grassGreen },
  vibeOptionText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: DARK_TEAL },
  imagePlaceholder: {
    height: 120, borderRadius: 14, borderWidth: 2, borderColor: "#E0E8E9", borderStyle: "dashed",
    backgroundColor: "#F5F8F8", alignItems: "center", justifyContent: "center", gap: 6,
  },
  imagePlaceholderText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: SUBTITLE_GREY },
  imagePreviewWrap: { height: 160, borderRadius: 14, overflow: "hidden", position: "relative" },
  imagePreview: { width: "100%", height: "100%", resizeMode: "cover" },
  imageOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.4)", flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6, paddingVertical: 8,
  },
  imageOverlayText: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.white },
  textArea: {
    fontFamily: "Nunito_400Regular", fontSize: 14, color: DARK_TEAL,
    backgroundColor: "#F0F5F5", borderRadius: 14, padding: 12, minHeight: 80,
    textAlignVertical: "top",
  },
  input: {
    fontFamily: "Nunito_400Regular", fontSize: 14, color: DARK_TEAL,
    backgroundColor: "#F0F5F5", borderRadius: 14, padding: 12, height: 44,
  },
  safetyHint: {
    fontFamily: "Nunito_400Regular", fontSize: 11, color: "rgba(44, 85, 92, 0.6)",
    marginTop: 4, lineHeight: 15,
  },
  dateChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#E0E8E9", backgroundColor: Colors.white,
  },
  dateChipActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  dateChipText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: DARK_TEAL },
  zoneChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#E0E8E9", backgroundColor: Colors.white,
  },
  zoneChipActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  zoneChipText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: DARK_TEAL },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: "#E0E8E9",
    alignItems: "center",
  },
  cancelBtnText: { fontFamily: "Nunito_700Bold", fontSize: 15, color: SUBTITLE_GREY },
  submitBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: CORAL_FAB,
    alignItems: "center",
  },
  submitBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 15, color: Colors.white },
});

export default function CrashCashScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { crashPosts, addCrashPost, updateCrashPost, currentUser, startConversation } = useApp();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const topPadding = Platform.OS === "web" ? (isDesktop ? 24 : 67) : insets.top;
  const [showNewPost, setShowNewPost] = useState(false);
  const [vibeFilter, setVibeFilter] = useState<VibeFilter>("all");
  const [selectedPost, setSelectedPost] = useState<CrashPost | null>(null);

  const containerWidth = isDesktop ? Math.min(640, screenWidth) : Math.min(screenWidth, contentMaxWidth);
  const cardWidth = (containerWidth - GRID_PAD * 2 - GRID_GAP) / 2;

  const handleDm = async (post: CrashPost) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const convoId = await startConversation(
      post.userId, post.userName, post.avatarColor, post.userEmail,
      post.id, `Crash: ${post.dates}`, 0, undefined, undefined, "crash_cash"
    );
    if (convoId) router.push(`/chat?conversationId=${convoId}&source=crash_cash`);
  };

  const handleMarkFilled = (postId: string) => {
    Alert.alert(
      "Mark as Filled?",
      "This will remove the post from the feed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Filled",
          style: "destructive",
          onPress: () => {
            updateCrashPost(postId, { status: "completed" });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleNewPost = (data: {
    vibe: CrashVibe; story: string; dates: string; targetDate: number;
    zone: Zone; currency: CrashCurrency; currencyLabel: string; imageUrl: string;
    approxLocation?: string;
  }) => {
    if (!currentUser) return;
    const post: CrashPost = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      avatarColor: currentUser.avatarColor,
      ...data,
      timestamp: Date.now(),
      status: "active",
    };
    addCrashPost(post);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowNewPost(false);
  };

  const isHost = currentUser?.intent === "host";

  const sorted = useMemo(() => {
    const now = Date.now();
    const maxWindow = now + 10 * 24 * 60 * 60 * 1000;
    const active = crashPosts
      .filter(p => p.status === "active" && p.targetDate >= now && p.targetDate <= maxWindow)
      .filter(p => vibeFilter === "all" || p.vibe === vibeFilter)
      .sort((a, b) => a.targetDate - b.targetDate);

    if (isHost && currentUser) {
      const myPosts = active.filter(p => p.userId === currentUser.id);
      const otherPosts = active.filter(p => p.userId !== currentUser.id);
      return [...myPosts, ...otherPosts];
    }
    return active;
  }, [crashPosts, vibeFilter, isHost, currentUser]);

  return (
    <View style={[styles.container, { backgroundColor: SCREEN_BG }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }, isDesktop && { maxWidth: 640, alignSelf: "center" as const, width: "100%" }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}>
          <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Crash & Cash</Text>
          <Text style={styles.headerSub}>Rent your couch. Get paid in cash, boba, or Red Lion cover.</Text>
        </View>
      </View>

      <SegmentedToggle value={vibeFilter} onChange={setVibeFilter} />

      <FlatList
        data={sorted}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={{
          gap: GRID_GAP,
          paddingHorizontal: GRID_PAD,
          maxWidth: isDesktop ? 640 : contentMaxWidth,
          alignSelf: "center" as const,
          width: "100%",
        }}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.85} onPress={() => { setSelectedPost(item); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
            <GridCard
              post={item}
              cardWidth={cardWidth}
              isOwner={currentUser?.id === item.userId}
              isPinned={!!isHost && currentUser?.id === item.userId}
              onDm={() => handleDm(item)}
              onMarkFilled={() => handleMarkFilled(item.id)}
            />
          </TouchableOpacity>
        )}
        contentContainerStyle={{
          gap: GRID_GAP,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80,
          paddingTop: 4,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🛋️</Text>
            <Text style={styles.emptyTitle}>No one is crashing right now!</Text>
            <Text style={styles.emptySub}>Be the first to offer a spot. 🛋️</Text>
          </View>
        }
      />

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16 }]}
        onPress={() => { setShowNewPost(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
      >
        {({ pressed }) => (
          <View style={[styles.fabInner, pressed && { transform: [{ scale: 0.92 }] }]}>
            <Ionicons name="add" size={26} color={Colors.white} />
          </View>
        )}
      </Pressable>

      {selectedPost && (
        <Modal visible={true} animationType="slide" transparent={false} onRequestClose={() => setSelectedPost(null)}>
          <View style={[dm.container, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) }]}>
            <ScrollView style={dm.scroll} contentContainerStyle={dm.scrollContent} bounces={false} showsVerticalScrollIndicator={false}>
              <View style={dm.heroWrap}>
                {selectedPost.imageUrl ? (
                  <Image source={{ uri: selectedPost.imageUrl }} style={dm.heroImage} resizeMode="cover" />
                ) : (
                  <View style={[dm.heroPlaceholder, { backgroundColor: (PLACEHOLDER_IMGS[selectedPost.zone] || PLACEHOLDER_IMGS.campustown).colors[0] }]}>
                    <Ionicons name={(PLACEHOLDER_IMGS[selectedPost.zone] || PLACEHOLDER_IMGS.campustown).icon} size={64} color={(PLACEHOLDER_IMGS[selectedPost.zone] || PLACEHOLDER_IMGS.campustown).colors[1]} />
                  </View>
                )}
                <TouchableOpacity style={dm.closeBtn} onPress={() => setSelectedPost(null)} activeOpacity={0.7}>
                  <Ionicons name="close" size={22} color={DARK_TEAL} />
                </TouchableOpacity>
              </View>

              <View style={dm.body}>
                <View style={dm.userRow}>
                  <CustomAvatar name={selectedPost.userName} avatarColor={selectedPost.avatarColor} size={40} fontSize={16} />
                  <View style={dm.userInfo}>
                    <Text style={dm.userName}>{selectedPost.userName}</Text>
                    <Text style={dm.userTime}>{formatDate(selectedPost.targetDate)}</Text>
                  </View>
                  <View style={[dm.tagPill, selectedPost.vibe === "sos" ? dm.tagSos : dm.tagOffer]}>
                    <Text style={dm.tagText}>{selectedPost.vibe === "sos" ? "🚨 NEED" : "🛋️ GOT"}</Text>
                  </View>
                </View>

                <Text style={dm.storyText}>{selectedPost.story}</Text>

                <View style={dm.essBox}>
                  <View style={dm.essItem}>
                    <Text style={dm.essIcon}>🗓️</Text>
                    <Text style={dm.essLabel}>When</Text>
                    <Text style={dm.essValue}>{selectedPost.dates}</Text>
                  </View>
                  <View style={dm.essDivider} />
                  <View style={dm.essItem}>
                    <Text style={dm.essIcon}>📍</Text>
                    <Text style={dm.essLabel}>Where</Text>
                    <Text style={dm.essValue} numberOfLines={2}>{ZONE_SHORT[selectedPost.zone] || selectedPost.zone}{selectedPost.approxLocation ? ` (${selectedPost.approxLocation})` : ""}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={dm.footer}>
              <Text style={dm.footerCurrency}>{selectedPost.currencyLabel}</Text>
              {currentUser?.id === selectedPost.userId ? (
                <TouchableOpacity
                  style={dm.filledBtn}
                  activeOpacity={0.7}
                  onPress={() => { handleMarkFilled(selectedPost.id); setSelectedPost(null); }}
                >
                  <Text style={dm.filledBtnText}>Mark Filled 🔒</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={dm.dmBtn}
                  activeOpacity={0.8}
                  onPress={() => { handleDm(selectedPost); setSelectedPost(null); }}
                >
                  <Text style={dm.dmBtnText}>Slide into DMs ⚡️</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}

      <NewPostSheet
        visible={showNewPost}
        onClose={() => setShowNewPost(false)}
        onSubmit={handleNewPost}
      />
    </View>
  );
}

const dm = StyleSheet.create({
  container: { flex: 1, backgroundColor: SCREEN_BG },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  heroWrap: { position: "relative" },
  heroImage: { width: "100%", height: 350, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden" as const },
  heroPlaceholder: {
    width: "100%", height: 350, alignItems: "center", justifyContent: "center",
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  closeBtn: {
    position: "absolute", top: Platform.OS === "web" ? 72 : 52, right: 16, zIndex: 10,
    width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center", justifyContent: "center",
    shadowColor: "rgba(0,0,0,0.1)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 4,
  },
  body: { paddingHorizontal: 20, paddingTop: 20, gap: 20 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  userInfo: { flex: 1 },
  userName: { fontFamily: "Nunito_700Bold", fontSize: 18, color: DARK_TEAL },
  userTime: { fontFamily: "Nunito_400Regular", fontSize: 13, color: SUBTITLE_GREY },
  tagPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  tagSos: { backgroundColor: "#FF6B4E" },
  tagOffer: { backgroundColor: Colors.grassGreen },
  tagText: { fontFamily: "Nunito_800ExtraBold", fontSize: 12, color: Colors.white },
  storyText: { fontFamily: "Nunito_600SemiBold", fontSize: 18, lineHeight: 26, color: DARK_TEAL },
  essBox: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, gap: 12,
    shadowColor: "rgba(0,0,0,0.04)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 1,
  },
  essItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  essIcon: { fontSize: 18 },
  essLabel: { fontFamily: "Nunito_400Regular", fontSize: 13, color: SUBTITLE_GREY, width: 50 },
  essValue: { fontFamily: "Nunito_700Bold", fontSize: 15, color: DARK_TEAL, flex: 1 },
  essDivider: { height: 1, backgroundColor: "#EDF2F2" },
  footer: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: SCREEN_BG, borderTopWidth: 1, borderTopColor: "#EDF2F2",
    shadowColor: "rgba(0,0,0,0.06)", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4,
  },
  footerCurrency: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: DARK_TEAL },
  dmBtn: {
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, backgroundColor: DARK_TEAL,
    shadowColor: "rgba(0,0,0,0.1)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4,
  },
  dmBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.white },
  filledBtn: {
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: SUBTITLE_GREY, backgroundColor: "transparent",
  },
  filledBtnText: { fontFamily: "Nunito_700Bold", fontSize: 16, color: SUBTITLE_GREY },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: GRID_PAD, paddingBottom: 10, flexDirection: "row", alignItems: "flex-start", gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.white,
    alignItems: "center", justifyContent: "center",
    shadowColor: "rgba(0,0,0,0.05)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
    marginTop: 2,
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 24, color: DARK_TEAL },
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 12, color: SUBTITLE_GREY, lineHeight: 17, marginTop: 2 },
  fab: { position: "absolute", right: 20 },
  fabInner: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: CORAL_FAB,
    alignItems: "center", justifyContent: "center",
    shadowColor: "rgba(0,0,0,0.05)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 16, elevation: 6,
  },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: "Nunito_700Bold", fontSize: 20, color: DARK_TEAL },
  emptySub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: SUBTITLE_GREY, textAlign: "center" },
});
