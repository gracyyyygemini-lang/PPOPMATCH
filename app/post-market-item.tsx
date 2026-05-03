import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Platform, KeyboardAvoidingView, Alert, Switch, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { fn, supabase } from "@/lib/supabaseClient";
import { uploadImageUris } from "@/lib/uploadImage";

const MAX_PHOTOS = 4;

type MarketCategory = "textbooks" | "tech" | "furniture" | "bikes" | "clothing" | "other";
type MarketCondition = "new" | "like_new" | "good" | "fair" | "for_parts";

const CATEGORIES: { key: MarketCategory; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }[] = [
  { key: "textbooks", label: "Textbooks", icon: "book-outline",    color: "#1A7AAF", bg: "#E2EAF4" },
  { key: "tech",      label: "Tech",      icon: "laptop-outline",  color: "#7B5EA7", bg: "#EDE9F4" },
  { key: "furniture", label: "Furniture", icon: "bed-outline",     color: "#B07D2B", bg: "#FDF0D5" },
  { key: "bikes",     label: "Bikes",     icon: "bicycle-outline", color: "#4A8A5A", bg: "#E4F1E9" },
  { key: "clothing",  label: "Clothing",  icon: "shirt-outline",   color: "#C05060", bg: "#FDEAE4" },
  { key: "other",     label: "Other",     icon: "cube-outline",    color: Colors.textMuted, bg: "#F0F0EE" },
];

const CONDITIONS: { key: MarketCondition; label: string; desc: string }[] = [
  { key: "new",       label: "New",       desc: "Never used, original packaging" },
  { key: "like_new",  label: "Like New",  desc: "Barely used, no visible wear" },
  { key: "good",      label: "Good",      desc: "Minor signs of use, fully functional" },
  { key: "fair",      label: "Fair",      desc: "Visible wear but works fine" },
  { key: "for_parts", label: "For Parts", desc: "Broken or incomplete" },
];

const DARK_TEAL = "#2C555C";

export default function PostMarketItemScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice]             = useState("");
  const [category, setCategory]       = useState<MarketCategory>("other");
  const [condition, setCondition]     = useState<MarketCondition>("good");
  const [pickup, setPickup]           = useState("");
  const [venmo, setVenmo]             = useState(false);
  const [cash, setCash]               = useState(true);
  const [zelle, setZelle]             = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [localImages, setLocalImages] = useState<string[]>([]);

  const canSubmit = title.trim().length > 0 && price.trim().length > 0 && !isNaN(Number(price)) && Number(price) >= 0;

  const pickImage = async () => {
    if (localImages.length >= MAX_PHOTOS) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]?.base64) {
      const asset = result.assets[0];
      const mime = asset.mimeType ?? "image/jpeg";
      setLocalImages(prev => [...prev, `data:${mime};base64,${asset.base64}`]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const removeImage = (idx: number) => {
    setLocalImages(prev => prev.filter((_, i) => i !== idx));
    Haptics.selectionAsync();
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(true);
    try {
      setUploading(localImages.length > 0);
      const imageUrls = await uploadImageUris(localImages, "market");
      setUploading(false);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      await fn.postMarketListing(token, {
        title:          title.trim(),
        description:    description.trim(),
        price:          Math.round(Number(price)),
        category,
        condition,
        pickupLocation: pickup.trim(),
        acceptsVenmo:   venmo,
        acceptsCash:    cash,
        acceptsZelle:   zelle,
        images:         imageUrls,
      });
      router.replace("/(tabs)/market");
    } catch (e: any) {
      setUploading(false);
      Alert.alert("Couldn't post listing", e?.message ?? "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/market")}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>List an Item</Text>
          <Text style={styles.headerSub}>Illini Market · @illinois.edu only</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photos */}
        <Text style={styles.label}>Photos</Text>
        <Text style={styles.fieldHint}>Add up to {MAX_PHOTOS} photos — buyers trust listings with clear pictures.</Text>
        <View style={styles.photoRow}>
          {localImages.map((uri, idx) => (
            <View key={idx} style={styles.photoSlot}>
              <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
              <TouchableOpacity style={styles.photoRemove} onPress={() => removeImage(idx)}>
                <Ionicons name="close-circle" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ))}
          {localImages.length < MAX_PHOTOS && (
            <TouchableOpacity style={styles.photoAdd} onPress={pickImage}>
              <Ionicons name="camera-outline" size={26} color={Colors.ocean + "80"} />
              <Text style={styles.photoAddText}>
                {localImages.length === 0 ? "Add Photo" : "Add More"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Title */}
        <Text style={styles.label}>Item Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Calculus textbook, MacBook charger, Bike lock"
          placeholderTextColor={Colors.textLight}
          maxLength={80}
          returnKeyType="next"
        />

        {/* Category */}
        <Text style={styles.label}>Category *</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map(cat => {
            const active = category === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.catCard,
                  { backgroundColor: active ? cat.bg : Colors.white, borderColor: active ? cat.color : Colors.borderSoft },
                ]}
                onPress={() => { setCategory(cat.key); Haptics.selectionAsync(); }}
              >
                <Ionicons name={cat.icon} size={22} color={cat.color} />
                <Text style={[styles.catLabel, { color: active ? cat.color : Colors.textMuted }]}>{cat.label}</Text>
                {active && <Ionicons name="checkmark-circle" size={14} color={cat.color} style={styles.catCheck} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Condition */}
        <Text style={styles.label}>Condition *</Text>
        {CONDITIONS.map(cond => {
          const active = condition === cond.key;
          return (
            <TouchableOpacity
              key={cond.key}
              style={[styles.condRow, active && styles.condRowActive]}
              onPress={() => { setCondition(cond.key); Haptics.selectionAsync(); }}
            >
              <View style={[styles.condRadio, active && styles.condRadioActive]}>
                {active && <View style={styles.condRadioDot} />}
              </View>
              <View style={styles.condText}>
                <Text style={[styles.condLabel, active && styles.condLabelActive]}>{cond.label}</Text>
                <Text style={styles.condDesc}>{cond.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Price */}
        <Text style={styles.label}>Price *</Text>
        <View style={styles.priceRow}>
          <Text style={styles.dollarSign}>$</Text>
          <TextInput
            style={[styles.input, styles.priceInput]}
            value={price}
            onChangeText={setPrice}
            placeholder="0"
            placeholderTextColor={Colors.textLight}
            keyboardType="numeric"
            maxLength={6}
          />
        </View>
        <Text style={styles.fieldHint}>Enter 0 for free items</Text>

        {/* Description */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Add details about the item, its history, why you're selling..."
          placeholderTextColor={Colors.textLight}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={400}
        />

        {/* Pickup */}
        <Text style={styles.label}>Pickup Location</Text>
        <TextInput
          style={styles.input}
          value={pickup}
          onChangeText={setPickup}
          placeholder="e.g. Grainger Library lobby, Green St, Ikenberry"
          placeholderTextColor={Colors.textLight}
          returnKeyType="done"
        />

        {/* Payment */}
        <Text style={styles.label}>Payment Methods Accepted *</Text>
        <Text style={styles.fieldHint}>This app does not process payments — you'll arrange directly with buyers.</Text>

        {[
          { label: "💵 Cash", value: cash, onChange: setCash },
          { label: "💜 Venmo", value: venmo, onChange: setVenmo },
          { label: "🟣 Zelle", value: zelle, onChange: setZelle },
        ].map(({ label, value, onChange }) => (
          <View key={label} style={styles.switchRow}>
            <Text style={styles.switchLabel}>{label}</Text>
            <Switch
              value={value}
              onValueChange={v => { onChange(v); Haptics.selectionAsync(); }}
              trackColor={{ false: Colors.borderSoft, true: Colors.ocean + "60" }}
              thumbColor={value ? Colors.ocean : Colors.textLight}
            />
          </View>
        ))}
      </ScrollView>

      {/* Submit */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          <Ionicons name="storefront-outline" size={18} color={canSubmit ? Colors.white : Colors.textLight} />
          <Text style={[styles.submitBtnText, (!canSubmit || submitting) && styles.submitBtnTextDisabled]}>
            {uploading ? "Uploading photos…" : submitting ? "Posting…" : "Post Listing"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.sand },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10, gap: 12,
    backgroundColor: Colors.sand,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.cardBg,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontFamily: "Nunito_700Bold", fontSize: 18, color: Colors.ocean },
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, gap: 6 },
  label: {
    fontFamily: "Nunito_700Bold", fontSize: 13, color: DARK_TEAL,
    marginTop: 16, marginBottom: 6,
  },
  fieldHint: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  input: {
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: "Nunito_400Regular", fontSize: 14, color: DARK_TEAL,
  },
  textArea: { minHeight: 80, paddingTop: 12 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dollarSign: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.ocean },
  priceInput: { flex: 1, fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: Colors.ocean },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catCard: {
    width: "30%", flexGrow: 1,
    alignItems: "center", gap: 6, padding: 12,
    borderRadius: 14, borderWidth: 1.5, position: "relative",
  },
  catLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 12 },
  catCheck: { position: "absolute", top: 6, right: 6 },
  condRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 14, marginBottom: 8,
  },
  condRowActive: { borderColor: Colors.ocean, backgroundColor: Colors.ocean + "06" },
  condRadio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: Colors.borderSoft, alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  condRadioActive: { borderColor: Colors.ocean },
  condRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.ocean },
  condText: { flex: 1 },
  condLabel: { fontFamily: "Nunito_700Bold", fontSize: 14, color: DARK_TEAL },
  condLabelActive: { color: Colors.ocean },
  condDesc: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  switchRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
  },
  switchLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 14, color: DARK_TEAL },
  footer: {
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.borderSoft,
    backgroundColor: Colors.sand,
  },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.ocean, borderRadius: 14, paddingVertical: 15,
  },
  submitBtnDisabled: { backgroundColor: "#E0E8E9" },
  submitBtnText: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.white },
  submitBtnTextDisabled: { color: "#8A9FA3" },

  // Photo picker
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  photoSlot: { width: 80, height: 80, borderRadius: 12, overflow: "hidden", position: "relative" },
  photoThumb: { width: "100%", height: "100%" },
  photoRemove: {
    position: "absolute", top: 3, right: 3,
    backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 10,
  },
  photoAdd: {
    width: 80, height: 80, borderRadius: 12,
    backgroundColor: Colors.ocean + "10",
    borderWidth: 1.5, borderColor: Colors.ocean + "30",
    borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 4,
  },
  photoAddText: { fontFamily: "Nunito_600SemiBold", fontSize: 10, color: Colors.ocean + "80" },
});
