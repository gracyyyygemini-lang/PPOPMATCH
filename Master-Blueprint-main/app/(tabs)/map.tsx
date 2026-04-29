import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, Zone, SubleasePost } from "@/context/AppContext";

const { width } = Dimensions.get("window");

const ZONES: {
  key: Zone; label: string; icon: keyof typeof Ionicons.glyphMap;
  color: string; avgRent: string; vibe: string;
  pros: string[]; cons: string[];
}[] = [
  {
    key: "campustown", label: "Campustown (Central Campus)", icon: "storefront-outline",
    color: Colors.zones.campustown, avgRent: "$800–1,100", vibe: "Social & Lively",
    pros: ["Steps from Main Quad", "Green St dining & bars", "Best bus access", "CUMTD hub"],
    cons: ["Noisy on weekends", "Higher rent", "Crowded game days"],
  },
  {
    key: "north", label: "North Campus (Engineering / Midtown)", icon: "hardware-chip-outline",
    color: Colors.zones.north, avgRent: "$700–950", vibe: "Academic & Focused",
    pros: ["Near Siebel & Grainger", "Quieter streets", "Reasonable rent", "Close to ECE"],
    cons: ["Far from Green St", "Limited late-night food", "Less social scene"],
  },
  {
    key: "south", label: "South Campus (Ikenberry / Seniorland)", icon: "football-outline",
    color: Colors.zones.south, avgRent: "$650–900", vibe: "Athletic & Community",
    pros: ["Next to ARC gym", "Ikenberry dining", "Game day energy", "More space"],
    cons: ["Far from central campus", "Bus dependent", "Feels spread out"],
  },
  {
    key: "urbana", label: "Urbana (Gradland)", icon: "leaf-outline",
    color: Colors.zones.urbana, avgRent: "$550–800", vibe: "Peaceful & Grad-Friendly",
    pros: ["Lowest rent", "Beautiful neighborhoods", "Great for studying", "Tight community"],
    cons: ["Need car or bus", "Away from campus buzz", "Limited late-night"],
  },
  {
    key: "downtown", label: "Downtown Champaign", icon: "business-outline",
    color: Colors.zones.downtown, avgRent: "$900–1,400", vibe: "Professional & Urban",
    pros: ["High-end dining & bars", "Bus to campus", "Modern apartments", "Coffee culture"],
    cons: ["Highest rent", "Furthest from campus", "Less student community"],
  },
];

type MapTab = "zones" | "listings";

function ZoneGrid({ selected, onSelect }: { selected: Zone; onSelect: (z: Zone) => void }) {
  return (
    <View style={styles.zoneGrid}>
      {ZONES.map(zone => (
        <TouchableOpacity
          key={zone.key}
          style={[styles.zoneCell, {
            borderColor: zone.color,
            backgroundColor: selected === zone.key ? zone.color + "40" : zone.color + "18",
          }]}
          onPress={() => { onSelect(zone.key); Haptics.selectionAsync(); }}>
          <Ionicons name={zone.icon} size={18} color={selected === zone.key ? Colors.charcoal : Colors.textMuted} />
          <Text style={[styles.zoneCellLabel, selected === zone.key && styles.zoneCellLabelActive]}>
            {zone.label}
          </Text>
          <Text style={styles.zoneCellVibe}>{zone.vibe}</Text>
          {selected === zone.key && (
            <View style={[styles.zoneCellDot, { backgroundColor: zone.color }]} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ListingPin({ post, index }: { post: SubleasePost; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const zone = ZONES.find(z => z.key === post.zone);
  const initials = post.userName.split(" ").map(n => n[0]).join("").slice(0, 2);

  return (
    <TouchableOpacity
      style={[styles.listingPin, expanded && styles.listingPinExpanded]}
      onPress={() => { setExpanded(!expanded); Haptics.selectionAsync(); }}
      activeOpacity={0.85}>
      <View style={styles.pinTop}>
        <View style={[styles.pinIcon, { backgroundColor: zone?.color || Colors.ocean }]}>
          <Ionicons name={zone?.icon || "location"} size={14} color={Colors.white} />
        </View>
        <View style={styles.pinInfo}>
          <Text style={styles.pinBuilding}>{post.buildingName}</Text>
          <Text style={styles.pinZone}>{zone?.label}</Text>
        </View>
        <View style={styles.pinPriceBlock}>
          <Text style={styles.pinPrice}>${post.pricePerMonth}</Text>
          <Text style={styles.pinPriceSub}>/mo</Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={Colors.textMuted} />
      </View>

      {expanded && (
        <View style={styles.pinExpanded}>
          <Text style={styles.pinDesc} numberOfLines={3}>{post.description}</Text>
          <View style={styles.pinMeta}>
            <View style={[styles.pinAvatar, { backgroundColor: post.avatarColor }]}>
              <Text style={styles.pinAvatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={styles.pinPoster}>{post.userName}</Text>
              <Text style={styles.pinEmail}>{post.userEmail}</Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, mockUsers, subleases, computeScore } = useApp();
  const [selectedZone, setSelectedZone] = useState<Zone>(currentUser?.zone || "campustown");
  const [activeTab, setActiveTab] = useState<MapTab>("zones");

  const zone = ZONES.find(z => z.key === selectedZone)!;
  const zoneUsers = mockUsers.filter(u => u.zone === selectedZone && u.id !== currentUser?.id);
  const zoneListings = subleases.filter(s => s.zone === selectedZone);
  const isDesktopMap = Platform.OS === "web" && Dimensions.get("window").width >= 1024;
  const topPadding = Platform.OS === "web" ? (isDesktopMap ? 24 : 67) : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: Colors.sand }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View>
          <Text style={styles.headerTitle}>PopMap</Text>
          <Text style={styles.headerSub}>Explore UIUC neighborhoods</Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="map" size={18} color={Colors.ocean} />
        </View>
      </View>

      <View style={styles.tabRow}>
        {([
          { key: "zones" as MapTab, label: "Zone Guide", icon: "grid-outline" as const },
          { key: "listings" as MapTab, label: "All Listings", icon: "list-outline" as const },
        ]).map(t => (
          <TouchableOpacity key={t.key}
            style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
            onPress={() => { setActiveTab(t.key); Haptics.selectionAsync(); }}>
            <Ionicons name={t.icon} size={14} color={activeTab === t.key ? Colors.ocean : Colors.textMuted} />
            <Text style={[styles.tabBtnText, activeTab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "zones" ? (
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, {
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90
        }]} showsVerticalScrollIndicator={false}>

          <View style={styles.mapCard}>
            <Text style={styles.mapCardTitle}>Select a Zone</Text>
            <ZoneGrid selected={selectedZone} onSelect={setSelectedZone} />
          </View>

          <View style={[styles.zoneDetail, { borderLeftColor: zone.color }]}>
            <View style={styles.zoneDetailHeader}>
              <View style={[styles.zoneDetailIcon, { backgroundColor: zone.color + "25" }]}>
                <Ionicons name={zone.icon} size={20} color={zone.color} />
              </View>
              <View style={styles.zoneDetailMeta}>
                <Text style={styles.zoneDetailName}>{zone.label}</Text>
                <Text style={styles.zoneDetailVibe}>{zone.vibe}</Text>
              </View>
              <View style={[styles.rentBadge, { backgroundColor: zone.color + "25" }]}>
                <Text style={[styles.rentText, { color: Colors.charcoal }]}>{zone.avgRent}</Text>
                <Text style={styles.rentSub}>/mo</Text>
              </View>
            </View>

            <View style={styles.prosConsList}>
              <View style={styles.prosCol}>
                <Text style={[styles.prosTitle, { color: Colors.grassGreen }]}>Pros</Text>
                {zone.pros.map(p => (
                  <View key={p} style={styles.proItem}>
                    <Ionicons name="checkmark" size={12} color={Colors.grassGreen} />
                    <Text style={styles.proText}>{p}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.consCol}>
                <Text style={[styles.consTitle, { color: Colors.errorRed }]}>Cons</Text>
                {zone.cons.map(c => (
                  <View key={c} style={styles.conItem}>
                    <Ionicons name="remove" size={12} color={Colors.errorRed} />
                    <Text style={styles.conText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {zoneListings.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Subleases in {zone.label}</Text>
              {zoneListings.map((listing, i) => <ListingPin key={listing.id} post={listing} index={i} />)}
            </View>
          )}

          {zoneUsers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Students in {zone.label}</Text>
              {zoneUsers.map(user => {
                const score = currentUser ? computeScore(currentUser, user) : 0;
                const initials = user.name.split(" ").map(n => n[0]).join("").slice(0, 2);
                return (
                  <View key={user.id} style={styles.userCard}>
                    <View style={[styles.userAvatar, { backgroundColor: user.avatarColor }]}>
                      <Text style={styles.userInitials}>{initials}</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.name}</Text>
                      <Text style={styles.userDetails}>{user.major} · ${user.budget}/mo</Text>
                    </View>
                    <View style={[styles.userScore, {
                      backgroundColor: score >= 80 ? Colors.grassGreen : score >= 60 ? Colors.ocean : Colors.textMuted
                    }]}>
                      <Text style={styles.userScoreText}>{score}%</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, {
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90
        }]} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>{subleases.length} Active Listing{subleases.length !== 1 ? "s" : ""}</Text>
          {subleases.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={40} color={Colors.textLight} />
              <Text style={styles.emptyText}>No listings yet. Post a sublease!</Text>
            </View>
          ) : (
            subleases.map((listing, i) => <ListingPin key={listing.id} post={listing} index={i} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, paddingBottom: 8,
  },
  headerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 28, color: Colors.ocean },
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
  headerBadge: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.ocean + "15",
    alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: Colors.ocean + "30",
  },
  tabRow: {
    flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 8,
  },
  tabBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, paddingVertical: 9,
  },
  tabBtnActive: { backgroundColor: Colors.ocean + "15", borderColor: Colors.ocean + "40" },
  tabBtnText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.textMuted },
  tabBtnTextActive: { color: Colors.ocean },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  mapCard: {
    backgroundColor: Colors.cardBg, borderRadius: 18, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 14, gap: 10,
  },
  mapCardTitle: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.charcoal },
  zoneGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  zoneCell: {
    width: (width - 64) / 2, borderRadius: 12, borderWidth: 2,
    padding: 12, alignItems: "center", gap: 4, position: "relative",
  },
  zoneCellLabel: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.textMuted, textAlign: "center" },
  zoneCellLabelActive: { color: Colors.charcoal },
  zoneCellVibe: { fontFamily: "Nunito_400Regular", fontSize: 10, color: Colors.textLight, textAlign: "center" },
  zoneCellDot: { position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: 4 },
  zoneDetail: {
    backgroundColor: Colors.cardBg, borderRadius: 16, borderWidth: 1.5,
    borderColor: Colors.borderSoft, borderLeftWidth: 4, padding: 16, gap: 12,
  },
  zoneDetailHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  zoneDetailIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  zoneDetailMeta: { flex: 1 },
  zoneDetailName: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: Colors.charcoal },
  zoneDetailVibe: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  rentBadge: { alignItems: "flex-end" },
  rentText: { fontFamily: "Nunito_700Bold", fontSize: 13 },
  rentSub: { fontFamily: "Nunito_400Regular", fontSize: 10, color: Colors.textMuted },
  prosConsList: { flexDirection: "row", gap: 16 },
  prosCol: { flex: 1, gap: 5 },
  consCol: { flex: 1, gap: 5 },
  prosTitle: { fontFamily: "Nunito_700Bold", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  consTitle: { fontFamily: "Nunito_700Bold", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  proItem: { flexDirection: "row", alignItems: "flex-start", gap: 5 },
  conItem: { flexDirection: "row", alignItems: "flex-start", gap: 5 },
  proText: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.charcoal, flex: 1, lineHeight: 17 },
  conText: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.charcoal, flex: 1, lineHeight: 17 },
  section: { gap: 8 },
  sectionTitle: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.charcoal },
  listingPin: {
    backgroundColor: Colors.cardBg, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.borderSoft, padding: 12,
  },
  listingPinExpanded: { borderColor: Colors.ocean + "50" },
  pinTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  pinIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  pinInfo: { flex: 1 },
  pinBuilding: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  pinZone: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted },
  pinPriceBlock: { alignItems: "flex-end" },
  pinPrice: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.ocean },
  pinPriceSub: { fontFamily: "Nunito_400Regular", fontSize: 10, color: Colors.textMuted },
  pinExpanded: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderSoft, gap: 10 },
  pinDesc: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.charcoal, lineHeight: 19 },
  pinMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  pinAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  pinAvatarText: { fontFamily: "Nunito_700Bold", fontSize: 10, color: Colors.white },
  pinPoster: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.charcoal },
  pinEmail: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted },
  userCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.borderSoft, padding: 12,
  },
  userAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  userInitials: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
  userInfo: { flex: 1 },
  userName: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  userDetails: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  userScore: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  userScoreText: { fontFamily: "Nunito_800ExtraBold", fontSize: 11, color: Colors.white },
  emptyState: { alignItems: "center", gap: 8, paddingTop: 40 },
  emptyText: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center" },
});
