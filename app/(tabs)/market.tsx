import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView,
  Pressable, Modal, Platform, Animated, Image, Alert, ActivityIndicator,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { db, fn, rt, supabase } from "@/lib/supabaseClient";
import { useResponsive } from "@/hooks/useResponsive";
import CustomAvatar from "@/components/CustomAvatar";

// ─── Types ───────────────────────────────────────────────────
type MarketCategory = "all" | "textbooks" | "tech" | "furniture" | "bikes" | "clothing" | "other";
type MarketCondition = "new" | "like_new" | "good" | "fair" | "for_parts";

export interface MarketListing {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatarColor: string;
  title: string;
  description: string;
  price: number;
  category: MarketCategory;
  condition: MarketCondition;
  pickupLocation: string;
  acceptsVenmo: boolean;
  acceptsCash: boolean;
  acceptsZelle: boolean;
  images: string[];
  isSold: boolean;
  createdAt: number;
}

// ─── Constants ───────────────────────────────────────────────
const CATEGORIES: {
  id: MarketCategory; label: string; icon: keyof typeof Ionicons.glyphMap;
  color: string; bg: string; border: string;
}[] = [
  { id: "all",       label: "All",       icon: "apps-outline",    color: Colors.ocean,    bg: Colors.ocean + "15",  border: Colors.ocean + "35" },
  { id: "textbooks", label: "Textbooks", icon: "book-outline",    color: "#1A7AAF",       bg: "#E2EAF4",            border: "#AEC4DE" },
  { id: "tech",      label: "Tech",      icon: "laptop-outline",  color: "#7B5EA7",       bg: "#EDE9F4",            border: "#C5B8DE" },
  { id: "furniture", label: "Furniture", icon: "bed-outline",     color: "#B07D2B",       bg: "#FDF0D5",            border: "#E8CFA6" },
  { id: "bikes",     label: "Bikes",     icon: "bicycle-outline", color: "#4A8A5A",       bg: "#E4F1E9",            border: "#B1D4C0" },
  { id: "clothing",  label: "Clothing",  icon: "shirt-outline",   color: "#C05060",       bg: "#FDEAE4",            border: "#DEAEA4" },
  { id: "other",     label: "Other",     icon: "cube-outline",    color: Colors.textMuted, bg: "#F0F0EE",           border: "#D0D0D0" },
];

const CONDITIONS: Record<MarketCondition, { label: string; color: string; bg: string }> = {
  new:       { label: "New",       color: "#4A8A5A", bg: "#E4F1E9" },
  like_new:  { label: "Like New",  color: "#1A7AAF", bg: "#E2EAF4" },
  good:      { label: "Good",      color: "#B07D2B", bg: "#FDF0D5" },
  fair:      { label: "Fair",      color: "#C05060", bg: "#FDEAE4" },
  for_parts: { label: "For Parts", color: Colors.textMuted, bg: "#F0F0EE" },
};

// ─── Mapper ──────────────────────────────────────────────────
function mapRow(row: any): MarketListing {
  return {
    id:             row.id,
    userId:         row.user_id,
    userName:       row.users?.name ?? "Unknown",
    userEmail:      row.users?.email ?? "",
    userAvatarColor: row.users?.avatar_color ?? "#005F73",
    title:          row.title,
    description:    row.description ?? "",
    price:          row.price,
    category:       row.category,
    condition:      row.condition,
    pickupLocation: row.pickup_location ?? "",
    acceptsVenmo:   row.accepts_venmo,
    acceptsCash:    row.accepts_cash,
    acceptsZelle:   row.accepts_zelle,
    images:         Array.isArray(row.images) ? row.images : [],
    isSold:         row.is_sold,
    createdAt:      new Date(row.created_at).getTime(),
  };
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── MarketCard ──────────────────────────────────────────────
function MarketCard({ item, onPress }: { item: MarketListing; onPress: () => void }) {
  const cat = CATEGORIES.find(c => c.id === item.category) ?? CATEGORIES[6];
  const cond = CONDITIONS[item.condition];
  const imageUri = item.images.length > 0 ? item.images[0] : null;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      {/* Photo area — icon is always rendered as fallback; image overlays it when loaded */}
      <View style={[styles.cardPhoto, { backgroundColor: cat.bg }]}>
        <Ionicons name={cat.icon} size={32} color={cat.color + "80"} />
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : null}
        <View style={[styles.condBadge, { backgroundColor: cond.bg }]}>
          <Text style={[styles.condBadgeText, { color: cond.color }]}>{cond.label}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardPrice}>${item.price}</Text>

        {item.pickupLocation ? (
          <View style={styles.cardMeta}>
            <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
            <Text style={styles.cardMetaText} numberOfLines={1}>{item.pickupLocation}</Text>
          </View>
        ) : null}

        <View style={styles.payRow}>
          {item.acceptsCash   && <View style={styles.payChip}><Text style={styles.payChipText}>💵</Text></View>}
          {item.acceptsVenmo  && <View style={styles.payChip}><Text style={styles.payChipText}>💜</Text></View>}
          {item.acceptsZelle  && <View style={styles.payChip}><Text style={styles.payChipText}>🟣</Text></View>}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Detail Modal ────────────────────────────────────────────
function DetailModal({
  item, visible, onClose, currentUserId,
  onMarkSold, onDm,
}: {
  item: MarketListing | null;
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
  onMarkSold: (id: string) => void;
  onDm: (item: MarketListing) => void;
}) {
  const slideY = useRef(new Animated.Value(600)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      slideY.setValue(600);
      opacity.setValue(0);
    }
  }, [visible]);

  if (!item) return null;

  const cat = CATEGORIES.find(c => c.id === item.category) ?? CATEGORIES[6];
  const cond = CONDITIONS[item.condition];
  const isOwner = item.userId === currentUserId;
  const initials = item.userName.split(" ").map(n => n[0]).join("").slice(0, 2);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[dmStyles.overlay, { opacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

        <Animated.View
          style={[
            dmStyles.sheet,
            { transform: [{ translateY: slideY }], paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={dmStyles.handle} />

          {/* Image or placeholder — icon always rendered; image overlays when loaded */}
          <View style={[dmStyles.photoPlaceholder, { backgroundColor: cat.bg }]}>
            <Ionicons name={cat.icon} size={56} color={cat.color + "60"} />
            {item.images.length > 0 ? (
              <Image
                source={{ uri: item.images[0] }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
            ) : null}
          </View>

          <ScrollView style={dmStyles.scroll} showsVerticalScrollIndicator={false}>
            {/* Category + condition */}
            <View style={dmStyles.badgeRow}>
              <View style={[dmStyles.catBadge, { backgroundColor: cat.bg, borderColor: cat.border }]}>
                <Ionicons name={cat.icon} size={12} color={cat.color} />
                <Text style={[dmStyles.catBadgeText, { color: cat.color }]}>{cat.label}</Text>
              </View>
              <View style={[dmStyles.condBadge, { backgroundColor: cond.bg }]}>
                <Text style={[dmStyles.condBadgeText, { color: cond.color }]}>{cond.label}</Text>
              </View>
              <Text style={dmStyles.timeAgo}>{timeAgo(item.createdAt)}</Text>
            </View>

            <Text style={dmStyles.title}>{item.title}</Text>
            <Text style={dmStyles.price}>${item.price}</Text>

            {item.description ? (
              <Text style={dmStyles.description}>{item.description}</Text>
            ) : null}

            {/* Pickup */}
            {item.pickupLocation ? (
              <View style={dmStyles.infoRow}>
                <Ionicons name="location-outline" size={16} color={Colors.ocean} />
                <Text style={dmStyles.infoText}>{item.pickupLocation}</Text>
              </View>
            ) : null}

            {/* Payment */}
            <View style={dmStyles.paySection}>
              <Text style={dmStyles.sectionLabel}>Payment accepted</Text>
              <View style={dmStyles.payRow}>
                {item.acceptsCash   && <View style={dmStyles.payPill}><Text style={dmStyles.payPillText}>💵 Cash</Text></View>}
                {item.acceptsVenmo  && <View style={dmStyles.payPill}><Text style={dmStyles.payPillText}>💜 Venmo</Text></View>}
                {item.acceptsZelle  && <View style={dmStyles.payPill}><Text style={dmStyles.payPillText}>🟣 Zelle</Text></View>}
              </View>
              <Text style={dmStyles.payNote}>This app does not process payments — arrange directly with the seller.</Text>
            </View>

            {/* Seller */}
            <View style={dmStyles.sellerRow}>
              <View style={[dmStyles.sellerAvatar, { backgroundColor: item.userAvatarColor }]}>
                <Text style={dmStyles.sellerInitials}>{initials}</Text>
              </View>
              <View style={dmStyles.sellerInfo}>
                <Text style={dmStyles.sellerName}>{item.userName}</Text>
                <View style={dmStyles.verifiedRow}>
                  <Ionicons name="shield-checkmark" size={12} color={Colors.grassGreen} />
                  <Text style={dmStyles.verifiedText}>{item.userEmail}</Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            {isOwner ? (
              <TouchableOpacity
                style={dmStyles.soldBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onMarkSold(item.id); }}
              >
                <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                <Text style={dmStyles.soldBtnText}>Mark as Sold</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={dmStyles.dmBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onDm(item); }}
              >
                <Ionicons name="chatbubble-outline" size={18} color={Colors.white} />
                <Text style={dmStyles.dmBtnText}>Message {item.userName.split(" ")[0]}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────
export default function MarketScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, startConversation } = useApp();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const topPadding = Platform.OS === "web" ? (isDesktop ? 24 : 67) : insets.top;

  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [category, setCategory] = useState<MarketCategory>("all");
  const [selected, setSelected] = useState<MarketListing | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async (cat: MarketCategory) => {
    try {
      setLoading(true);
      const rows = await db.getMarketListings(cat === "all" ? undefined : cat);
      setListings(rows.map(mapRow));
    } catch (e) {
      console.warn("market load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(category); }, [category]);

  useEffect(() => {
    // marketplace_listings table, not the sublease listings table
    const unsub = rt.onMarketListingChange(() => load(category));
    return unsub;
  }, [category]);

  const handleMarkSold = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      await fn.markSold(token, id);
      setListings(prev => prev.filter(l => l.id !== id));
      setSelected(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not mark as sold");
    }
  };

  const handleDm = async (item: MarketListing) => {
    setSelected(null);
    const convoId = await startConversation(
      item.userId, item.userName, item.userAvatarColor, item.userEmail,
      item.id, item.title, item.price, undefined, undefined, "market"
    );
    if (convoId) router.push(`/chat?conversationId=${convoId}&source=market`);
  };

  const numCols = isDesktop ? 3 : 2;
  const q = searchQuery.trim().toLowerCase();
  const visibleListings = q
    ? listings.filter(l => l.title.toLowerCase().includes(q))
    : listings;

  return (
    <View style={[styles.container, { backgroundColor: Colors.sand }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View>
          <Text style={styles.headerTitle}>Illini Market</Text>
          <Text style={styles.headerSub}>Buy &amp; sell on campus — UIUC students only</Text>
        </View>
        <TouchableOpacity
          style={styles.sellBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/post-market-item"); }}
        >
          <Ionicons name="add" size={18} color={Colors.white} />
          <Text style={styles.sellBtnText}>Sell</Text>
        </TouchableOpacity>
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillScroll}
        contentContainerStyle={styles.pillRow}
      >
        {CATEGORIES.map(cat => {
          const active = category === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => { setCategory(cat.id); Haptics.selectionAsync(); }}
              style={[
                styles.pill,
                active
                  ? { backgroundColor: cat.color, borderColor: cat.color }
                  : { backgroundColor: Colors.white, borderColor: Colors.borderSoft },
              ]}
            >
              <Ionicons name={cat.icon} size={13} color={active ? Colors.white : cat.color} />
              <Text style={[styles.pillText, { color: active ? Colors.white : Colors.textMuted }]}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search listings…"
          placeholderTextColor={Colors.textLight}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.searchClear}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Grid */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.ocean} size="large" />
        </View>
      ) : visibleListings.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name={q ? "search-outline" : "storefront-outline"} size={44} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>{q ? "No results" : "Nothing here yet"}</Text>
          <Text style={styles.emptySub}>
            {q ? `No listings match "${searchQuery}"` : "Be the first to list something!"}
          </Text>
          {!q && (
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/post-market-item")}>
              <Text style={styles.emptyBtnText}>Sell Something</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={visibleListings}
          keyExtractor={item => item.id}
          numColumns={numCols}
          key={numCols}
          contentContainerStyle={[
            styles.grid,
            {
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
              maxWidth: isDesktop ? 960 : contentMaxWidth,
              alignSelf: "center" as const,
              width: "100%",
            },
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.cardWrap, { width: `${100 / numCols}%` as any }]}>
              <MarketCard item={item} onPress={() => { Haptics.selectionAsync(); setSelected(item); }} />
            </View>
          )}
        />
      )}

      {/* Detail modal */}
      <DetailModal
        item={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
        currentUserId={currentUser?.id ?? ""}
        onMarkSold={handleMarkSold}
        onDm={handleDm}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const DARK_TEAL = "#2C555C";

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 10,
  },
  headerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 26, color: Colors.ocean },
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  sellBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.ocean, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  sellBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
  pillScroll: { maxHeight: 48 },
  pillRow: { paddingHorizontal: 16, paddingVertical: 6, gap: 8, alignItems: "center" },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
  },
  pillText: { fontFamily: "Nunito_600SemiBold", fontSize: 12 },
  grid: { padding: 10, gap: 0 },
  cardWrap: { padding: 6 },
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16, borderWidth: 1.5, borderColor: Colors.borderSoft,
    overflow: "hidden",
    shadowColor: Colors.charcoal,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardPressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
  cardPhoto: {
    aspectRatio: 1, width: "100%",
    alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  cardImage: { width: "100%", height: "100%" },
  condBadge: {
    position: "absolute", top: 7, right: 7,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  condBadgeText: { fontFamily: "Nunito_700Bold", fontSize: 9 },
  cardBody: { padding: 10, gap: 4 },
  cardTitle: { fontFamily: "Nunito_700Bold", fontSize: 13, color: DARK_TEAL, lineHeight: 17 },
  cardPrice: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: Colors.ocean },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 3 },
  cardMetaText: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted, flex: 1 },
  payRow: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  payChip: {
    backgroundColor: Colors.sand, borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  payChipText: { fontSize: 11 },
  searchRow: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginTop: 8, marginBottom: 4,
    backgroundColor: Colors.white, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.borderSoft,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1, fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.charcoal,
    paddingVertical: 0,
  },
  searchClear: { padding: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyTitle: { fontFamily: "Nunito_700Bold", fontSize: 18, color: Colors.charcoal },
  emptySub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
  emptyBtn: { backgroundColor: Colors.ocean, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 },
  emptyBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
});

const dmStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.cardBg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: "90%",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderSoft,
    alignSelf: "center", marginTop: 12, marginBottom: 4,
  },
  photo: { width: "100%", height: 220 },
  photoPlaceholder: {
    width: "100%", height: 220,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  scroll: { paddingHorizontal: 20 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, marginBottom: 8 },
  catBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4,
  },
  catBadgeText: { fontFamily: "Nunito_700Bold", fontSize: 11 },
  condBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  condBadgeText: { fontFamily: "Nunito_700Bold", fontSize: 11 },
  timeAgo: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textLight, marginLeft: "auto" },
  title: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.charcoal, lineHeight: 28 },
  price: { fontFamily: "Nunito_800ExtraBold", fontSize: 30, color: Colors.ocean, marginTop: 4, marginBottom: 8 },
  description: {
    fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.charcoal,
    lineHeight: 20, marginBottom: 12,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  infoText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.textMuted, flex: 1 },
  paySection: { marginBottom: 16 },
  sectionLabel: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  payRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 8 },
  payPill: {
    backgroundColor: Colors.sand, borderRadius: 10, borderWidth: 1,
    borderColor: Colors.borderSoft, paddingHorizontal: 12, paddingVertical: 6,
  },
  payPillText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: DARK_TEAL },
  payNote: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textLight, lineHeight: 16 },
  sellerRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: Colors.borderSoft,
    marginBottom: 16,
  },
  sellerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  sellerInitials: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
  sellerInfo: { flex: 1 },
  sellerName: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  verifiedText: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.grassGreen },
  dmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.ocean, borderRadius: 14, paddingVertical: 14, marginBottom: 8,
  },
  dmBtnText: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.white },
  soldBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.grassGreen, borderRadius: 14, paddingVertical: 14, marginBottom: 8,
  },
  soldBtnText: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.white },
});
