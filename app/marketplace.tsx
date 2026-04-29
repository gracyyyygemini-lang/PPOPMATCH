import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Platform, Modal, Animated, Image, Dimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, SubleasePost, Landlord, Zone } from "@/context/AppContext";
import { useCallback } from "react";
import FacePile from "@/components/FacePile";
import MicroFeedback from "@/components/MicroFeedback";
import ZonePicker from "@/components/ZonePicker";
import { getApiUrl } from "@/lib/query-client";
import { useResponsive } from "@/hooks/useResponsive";

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  roommate_openings: "Roommate Openings",
  summer_only: "Summer Only",
  august_gap: "August Gap",
  semester_takeover: "Semester / Full Year",
  short_term: "Short-Term & Events",
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  all: "apps-outline",
  roommate_openings: "people-outline",
  summer_only: "sunny-outline",
  august_gap: "time-outline",
  semester_takeover: "calendar-outline",
  short_term: "ticket-outline",
};

const CATEGORY_COLORS: Record<string, string> = {
  all: Colors.ocean,
  roommate_openings: "#8B5CF6",
  summer_only: Colors.orange,
  august_gap: Colors.ocean,
  semester_takeover: Colors.grassGreen,
  short_term: Colors.goldDark,
};

const CATEGORY_DATES: Record<string, string> = {
  summer_only: "May 15 – Aug 10",
  august_gap: "1–2 weeks in Aug",
  semester_takeover: "Aug–Dec, Jan–May, or Full Year",
  short_term: "1–14 days",
};

const ZONE_LABELS: Record<string, string> = {
  campustown: "Campustown (Central Campus)",
  north: "North Campus (Engineering / Midtown)",
  south: "South Campus (Ikenberry / Seniorland)",
  urbana: "Urbana (Gradland)",
  downtown: "Downtown Champaign",
};

const LANDLORD_LABELS: Record<Landlord, string> = {
  jsm: "JSM",
  ugroup: "UGroup",
  bailey: "Bailey",
  american: "American Campus",
  smile: "Smile",
  cpm: "CPM",
  green_st_realty: "Green St Realty",
  other: "Private",
};

const LEASE_LABELS: Record<string, string> = {
  full_year: "Full Year",
  fall_sublease: "Fall Sublease",
  spring_sublease: "Spring Sublease",
  summer_sublease: "Summer Sublease",
};

type CategoryFilter = "all" | "roommate_openings" | "summer_only" | "august_gap" | "semester_takeover" | "short_term";

const DARK_TEAL = "#2C555C";
const CHIP_BORDER = "#E0E8E9";
const CHIP_SEAFOAM = "#D0F0E0";

const SUB_FILTERS: Record<string, string[]> = {
  roommate_openings: ["Girls Only", "Guys Only", "Co-ed", "Grainger Grind", "Grad/PhD"],
  semester_takeover: ["Spring", "Fall", "Full Year"],
  summer_only: ["Full Summer", "Early Summer", "Late Summer", "🚗 Parking Only"],
  short_term: ["Mom's Weekend", "Graduation", "August Gap", "Homecoming", "Dad's Weekend", "Thanksgiving", "Winter Break"],
};

const SUMMER_CHIP_TO_SUB: Record<string, string> = {
  "Full Summer": "full_summer",
  "Early Summer": "early_summer",
  "Late Summer": "late_summer",
};

const SEMESTER_CHIP_TO_CAT: Record<string, string> = {
  "Spring": "spring",
  "Fall": "fall",
  "Full Year": "full_year",
};

function SubFilterRow({
  category,
  selected,
  onToggle,
}: {
  category: CategoryFilter;
  selected: string[];
  onToggle: (chip: string) => void;
}) {
  const chips = SUB_FILTERS[category];
  if (!chips) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={sfStyles.scroll}
      contentContainerStyle={sfStyles.row}
    >
      {chips.map((chip) => {
        const isSelected = selected.includes(chip);
        return (
          <Pressable
            key={chip}
            onPress={() => {
              onToggle(chip);
              Haptics.selectionAsync();
            }}
            accessibilityRole="checkbox"
            accessibilityLabel={chip}
            accessibilityState={{ checked: isSelected }}
          >
            {({ pressed }) => (
              <View
                style={[
                  sfStyles.chip,
                  isSelected && sfStyles.chipSelected,
                  pressed && !isSelected && { backgroundColor: "#F2F7F7" },
                ]}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" style={{ marginRight: 2 }} />
                )}
                <Text style={[sfStyles.chipText, isSelected && sfStyles.chipTextSelected]}>{chip}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const sfStyles = StyleSheet.create({
  scroll: { maxHeight: 46 },
  row: { paddingHorizontal: 16, gap: 8, paddingVertical: 6, alignItems: "center" as const },
  chip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: CHIP_BORDER,
  },
  chipSelected: {
    backgroundColor: DARK_TEAL,
    borderColor: DARK_TEAL,
  },
  chipText: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    color: DARK_TEAL,
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
});

function CongratsSheet({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const waveScale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      waveScale.setValue(0.7);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(waveScale, { toValue: 1, tension: 60, friction: 10, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: false }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDone}>
      <View style={cg.overlay}>
        <Animated.View style={[cg.sheet, { opacity, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
          <View style={cg.handle} />
          <Animated.View style={[cg.waveCircle, { transform: [{ scale: waveScale }] }]} />
          <Text style={cg.emoji}>🏠</Text>
          <Text style={cg.title}>Your place found a home!</Text>
          <Text style={cg.sub}>Congrats on the successful sublease!</Text>
          <TouchableOpacity style={cg.btn} onPress={onDone}>
            <Text style={cg.btnText}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const cg = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.cardBg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 16, alignItems: "center", gap: 10,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderSoft,
    marginBottom: 12,
  },
  waveCircle: {
    position: "absolute", top: 40, width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.ocean + "20",
  },
  emoji: { fontSize: 56, marginVertical: 8 },
  title: { fontFamily: "Nunito_800ExtraBold", fontSize: 24, color: Colors.ocean, textAlign: "center" },
  sub: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center" },
  btn: {
    backgroundColor: Colors.ocean, borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 40, marginTop: 12,
  },
  btnText: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.white },
});

const PLACEHOLDER_COLORS = ["#1A7AAF", "#5A8A5A", "#9B59B6", "#CC5500", "#E0BC00", "#4A8A5A"];

function isValidImageUri(uri: string): boolean {
  if (!uri || typeof uri !== "string") return false;
  const trimmed = uri.trim();
  return trimmed.length > 0 && (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("file://") || trimmed.startsWith("data:image"));
}

function CardPhotoSection({ post, onImagePress }: { post: SubleasePost; onImagePress?: () => void }) {
  const placeholderColor = post.avatarColor || PLACEHOLDER_COLORS[post.buildingName.length % PLACEHOLDER_COLORS.length];
  const amenities = post.amenities;
  const [activeIdx, setActiveIdx] = useState(0);
  const [cardWidth, setCardWidth] = useState(Math.min(Dimensions.get("window").width - 32, 500));

  const allImages: string[] = [];
  if (post.images) {
    post.images.forEach(img => { if (isValidImageUri(img)) allImages.push(img); });
  }
  if (isValidImageUri(post.floorPlanUrl ?? "")) allImages.push(post.floorPlanUrl!);
  const hasImage = allImages.length > 0;
  const hasMultiple = allImages.length > 1;

  const amenityItems = amenities ? [
    { icon: "bed-outline" as const, active: amenities.isFurnished, label: "Furnished" },
    { icon: "water-outline" as const, active: amenities.hasLaundry, label: "Laundry" },
    { icon: "wifi-outline" as const, active: amenities.hasWifi, label: "WiFi" },
    { icon: "snow-outline" as const, active: amenities.hasAC, label: "AC" },
  ] : [];

  const handleScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const w = e.nativeEvent.layoutMeasurement.width;
    if (w > 0) setActiveIdx(Math.round(x / w));
  };

  return (
    <TouchableOpacity
      activeOpacity={onImagePress && hasImage ? 0.85 : 1}
      onPress={onImagePress && hasImage ? onImagePress : undefined}
      style={styles.photoSection}
      onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
    >
      {hasImage ? (
        hasMultiple ? (
          <>
            <ScrollView
              horizontal pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              scrollEventThrottle={16}
              style={styles.galleryScroll}
            >
              {allImages.map((uri, idx) => (
                <Image key={idx} source={{ uri }} style={[styles.galleryImage, { width: cardWidth }]} resizeMode="cover" />
              ))}
            </ScrollView>
            <View style={styles.galleryDots}>
              {allImages.map((_, idx) => (
                <View key={idx} style={[styles.galleryDot, idx === activeIdx && styles.galleryDotActive]} />
              ))}
            </View>
            {isValidImageUri(post.floorPlanUrl ?? "") && activeIdx === allImages.length - 1 && (
              <View style={styles.floorPlanLabel}>
                <Ionicons name="map-outline" size={10} color={Colors.white} />
                <Text style={styles.floorPlanLabelText}>Floor Plan</Text>
              </View>
            )}
          </>
        ) : (
          <Image source={{ uri: allImages[0] }} style={styles.photoImage} resizeMode="cover" />
        )
      ) : (
        <View style={[styles.photoPlaceholder, { backgroundColor: placeholderColor + "20" }]}>
          <Ionicons name="home-outline" size={40} color={placeholderColor + "60"} />
          <Text style={[styles.photoPlaceholderText, { color: placeholderColor + "80" }]}>{post.buildingName}</Text>
        </View>
      )}
      {amenities && (
        <View style={styles.amenityOverlay}>
          {amenityItems.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.amenityOverlayIcon,
                item.active && styles.amenityOverlayIconActive,
              ]}
            >
              <Ionicons
                name={item.icon}
                size={13}
                color={item.active ? Colors.white : "rgba(255,255,255,0.5)"}
              />
            </View>
          ))}
        </View>
      )}
      {hasImage && (
        <View style={styles.expandHint}>
          <Ionicons name="expand-outline" size={12} color={Colors.white} />
        </View>
      )}
    </TouchableOpacity>
  );
}

function FullScreenGallery({ images, visible, onClose, buildingName }: {
  images: string[]; visible: boolean; onClose: () => void; buildingName: string;
}) {
  const insets = useSafeAreaInsets();
  const [activeIdx, setActiveIdx] = useState(0);
  const screenW = Dimensions.get("window").width;

  const validImages = images.filter(isValidImageUri);

  if (!visible || validImages.length === 0) return null;
  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={fsStyles.overlay}>
        <View style={[fsStyles.header, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 8 }]}>
          <TouchableOpacity onPress={onClose} style={fsStyles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={fsStyles.title} numberOfLines={1}>{buildingName}</Text>
          <Text style={fsStyles.counter}>{activeIdx + 1} / {validImages.length}</Text>
        </View>
        <ScrollView
          horizontal pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
            setActiveIdx(idx);
          }}
          style={fsStyles.scroll}
          contentContainerStyle={fsStyles.scrollContent}
        >
          {validImages.map((uri, idx) => (
            <Image key={idx} source={{ uri }} style={{ width: screenW, height: "100%" }} resizeMode="contain" />
          ))}
        </ScrollView>
        <View style={[fsStyles.dots, { paddingBottom: insets.bottom + 16 }]}>
          {validImages.map((_, idx) => (
            <View key={idx} style={[fsStyles.dot, idx === activeIdx && fsStyles.dotActive]} />
          ))}
        </View>
      </View>
    </Modal>
  );
}

const fsStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 12,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  title: { flex: 1, fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.white },
  counter: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: "rgba(255,255,255,0.6)" },
  scroll: { flex: 1 },
  scrollContent: { alignItems: "center" as const },
  dots: {
    flexDirection: "row", justifyContent: "center", gap: 6, paddingTop: 12,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.35)" },
  dotActive: { backgroundColor: Colors.white, width: 8, height: 8, borderRadius: 4 },
});

function SubleaseCard({ post, onMarkLeased }: {
  post: SubleasePost;
  onMarkLeased: (post: SubleasePost) => void;
}) {
  const { getTrustInfo, currentUser, startConversation } = useApp();
  const trust = getTrustInfo(post.userEmail);
  const initials = post.userName.split(" ").map(n => n[0]).join("").slice(0, 2);
  const rawCat = post.listingType === "roommate" ? "roommate_openings" : (post.category || "semester_takeover");
  const cat = rawCat === "summer" ? "summer_only" : ["spring", "fall", "full_year"].includes(rawCat) ? "semester_takeover" : rawCat;
  const catColor = CATEGORY_COLORS[cat] || Colors.ocean;
  const isOwner = currentUser?.email === post.userEmail;
  const [galleryVisible, setGalleryVisible] = useState(false);

  const allImages: string[] = [];
  if (post.images) post.images.forEach(img => { if (isValidImageUri(img)) allImages.push(img); });
  if (isValidImageUri(post.floorPlanUrl ?? "")) allImages.push(post.floorPlanUrl!);
  const hasValidImages = allImages.length > 0;

  return (
    <View style={[styles.card, isOwner && styles.ownerCard]}>
      {isOwner && (
        <View style={styles.ownerBanner}>
          <Ionicons name="star" size={12} color={Colors.ocean} />
          <Text style={styles.ownerBannerText}>Your Listing</Text>
        </View>
      )}
      <CardPhotoSection post={post} onImagePress={hasValidImages ? () => setGalleryVisible(true) : undefined} />
      <FullScreenGallery
        images={allImages}
        visible={galleryVisible}
        onClose={() => setGalleryVisible(false)}
        buildingName={post.buildingName}
      />

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          {cat !== "semester_takeover" && (
            <View style={[styles.catTag, { backgroundColor: catColor + "18", borderColor: catColor + "40" }]}>
              <Ionicons name={CATEGORY_ICONS[cat] || "home-outline"} size={11} color={catColor} />
              <Text style={[styles.catTagText, { color: catColor }]}>{CATEGORY_LABELS[cat] ?? cat}</Text>
            </View>
          )}
          {cat === "semester_takeover" && (
            <View style={[styles.catTag, { backgroundColor: Colors.grassGreen + "18", borderColor: Colors.grassGreen + "40" }]}>
              <Text style={[styles.catTagText, { color: Colors.grassGreen }]}>{LEASE_LABELS[post.leaseType]}</Text>
            </View>
          )}
          {post.availableDuringBreaks && (
            <View style={styles.breakAvailTag}>
              <Ionicons name="home" size={10} color={Colors.grassGreen} />
              <Text style={styles.breakAvailText}>Break-Friendly</Text>
            </View>
          )}
          <Text style={styles.cardTime}>
            {Math.floor((Date.now() - post.timestamp) / 86400000)}d ago
          </Text>
        </View>

        <Text style={styles.buildingName}>{post.buildingName}</Text>
        <Text style={styles.address}>{post.address}</Text>

        <View style={styles.priceRow}>
          {post.unitType ? (
            <View style={styles.unitTypeBadge}>
              <Text style={styles.unitTypeText}>{post.unitType}</Text>
            </View>
          ) : null}
          <Text style={styles.price}>${post.pricePerMonth}</Text>
          <Text style={styles.priceSub}>/month</Text>
          {cat === "august_gap" || cat === "short_term" ? (
            <View style={[styles.dateBadge, { backgroundColor: catColor + "15" }]}>
              <Text style={[styles.dateBadgeText, { color: catColor }]}>
                {CATEGORY_DATES[cat]}
              </Text>
            </View>
          ) : null}
          {post.isPrivateBedroom && post.isPrivateBathroom ? (
            <View style={styles.fullyPrivateBadge}>
              <Ionicons name="shield-checkmark" size={10} color={Colors.grassGreen} />
              <Text style={styles.fullyPrivateText}>Fully Private</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.dateStripRow}>
          <View style={styles.dateStripPill}>
            <Ionicons name="calendar-outline" size={14} color="#2C555C" />
            <Text style={styles.dateStripText}>
              {post.moveInDate && post.moveOutDate
                ? `${new Date(post.moveInDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${new Date(post.moveOutDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                : "Exact Dates Required"}
            </Text>
          </View>
        </View>

        {post.listingType === "roommate" && (
          <View style={styles.roommateInfo}>
            {post.roomsAvailable ? (
              <View style={styles.roommateInfoItem}>
                <Ionicons name="bed-outline" size={13} color="#8B5CF6" />
                <Text style={styles.roommateInfoText}>{post.roomsAvailable} spot{post.roomsAvailable > 1 ? "s" : ""} open</Text>
              </View>
            ) : null}
            {post.currentResidentBio ? (
              <Text style={styles.residentBio} numberOfLines={2}>
                {post.currentResidentBio}
              </Text>
            ) : null}
          </View>
        )}

        {post.description ? (
          <Text style={styles.description} numberOfLines={2}>{post.description}</Text>
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>{ZONE_LABELS[post.zone]}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="business-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>{(post.landlords || []).map(l => LANDLORD_LABELS[l]).join(", ") || "N/A"}</Text>
          </View>
        </View>

        <View style={styles.posterRow}>
          <View style={[styles.posterAvatar, { backgroundColor: post.avatarColor }]}>
            <Text style={styles.posterInitials}>{initials}</Text>
          </View>
          <View style={styles.posterInfo}>
            <Text style={styles.posterName}>{post.userName}</Text>
            <Text style={styles.posterEmail}>{post.userEmail}</Text>
          </View>
          <View style={{ alignItems: "flex-end" as const, gap: 4 }}>
            {trust.degree === 1 && (
              <View style={[styles.trustChip, { backgroundColor: Colors.grassGreen + "20" }]}>
                <Ionicons name="people" size={10} color={Colors.grassGreen} />
                <Text style={[styles.trustChipText, { color: Colors.grassGreen }]}>1st Degree</Text>
              </View>
            )}
            {trust.degree === 2 && trust.mutualFriends.length > 0 ? (
              <FacePile mutuals={trust.mutualFriends} maxVisible={3} />
            ) : trust.sharedOrg && !trust.degree ? (
              <View style={[styles.trustChip, { backgroundColor: Colors.goldDark + "20" }]}>
                <Ionicons name="school-outline" size={10} color={Colors.goldDark} />
                <Text style={[styles.trustChipText, { color: Colors.goldDark }]}>{trust.sharedOrg}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {!isOwner && (
          <TouchableOpacity
            style={styles.messageBtn}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const convoId = await startConversation(
                post.userId, post.userName, post.avatarColor, post.userEmail,
                post.id, post.buildingName, post.pricePerMonth, post.unitType, undefined, "sublease"
              );
              console.log("conversationId returned (Message button):", convoId);
              if (convoId) router.push(`/chat?conversationId=${convoId}&source=sublease`);
            }}
          >
            <Ionicons name="chatbubble-outline" size={15} color={Colors.ocean} />
            <Text style={styles.messageBtnText}>
              {post.listingType === "roommate" ? "Message Host" : `Message ${post.userName.split(" ")[0]}`}
            </Text>
          </TouchableOpacity>
        )}

        {isOwner && (
          <TouchableOpacity
            style={styles.leasedBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onMarkLeased(post); }}
          >
            <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
            <Text style={styles.leasedBtnText}>Mark as Leased</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function MarketplaceScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string; zone?: string; subFilter?: string }>();
  const { subleases, removeSublease, currentUser } = useApp();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const topPadding = Platform.OS === "web" ? (isDesktop ? 24 : 67) : insets.top;

  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [zoneFilter, setZoneFilter] = useState<Zone | "all">("all");
  const [selectedSubFilters, setSelectedSubFilters] = useState<string[]>([]);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [leasedPost, setLeasedPost] = useState<SubleasePost | null>(null);

  const handleCategoryChange = (cat: CategoryFilter) => {
    setActiveFilter(cat);
    setSelectedSubFilters([]);
  };

  const handleSubFilterToggle = (chip: string) => {
    setSelectedSubFilters(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    );
  };

  const PARAM_TO_FILTER: Record<string, CategoryFilter> = {
    summer: "summer_only",
    summer_only: "summer_only",
    short_term: "short_term",
    semester_takeover: "semester_takeover",
    roommate_openings: "roommate_openings",
    august_gap: "august_gap",
    all: "all",
  };

  useEffect(() => {
    const resolvedCat = params.category ? (PARAM_TO_FILTER[params.category] || params.category) : undefined;
    if (resolvedCat && Object.keys(CATEGORY_LABELS).includes(resolvedCat)) {
      setActiveFilter(resolvedCat as CategoryFilter);
      const cat = resolvedCat as CategoryFilter;
      if (params.subFilter) {
        const sf = params.subFilter;
        if (SUB_FILTERS[cat]?.includes(sf)) {
          setSelectedSubFilters([sf]);
        } else {
          const summerReverse = Object.entries(SUMMER_CHIP_TO_SUB).find(([, v]) => v === sf);
          const semReverse = Object.entries(SEMESTER_CHIP_TO_CAT).find(([, v]) => v === sf);
          if (summerReverse) setSelectedSubFilters([summerReverse[0]]);
          else if (semReverse) setSelectedSubFilters([semReverse[0]]);
          else setSelectedSubFilters([]);
        }
      } else {
        setSelectedSubFilters([]);
      }
    }
    if (params.zone && ["campustown", "north", "south", "urbana", "downtown"].includes(params.zone)) {
      setZoneFilter(params.zone as Zone);
    }
  }, [params.category, params.zone, params.subFilter]);

  const catToFilter: Record<string, string> = {
    summer: "summer_only",
    spring: "semester_takeover",
    fall: "semester_takeover",
    full_year: "semester_takeover",
    short_term: "short_term",
    august_gap: "august_gap",
    semester_takeover: "semester_takeover",
    roommate_openings: "roommate_openings",
  };

  const filtered = subleases.filter(s => {
    if (activeFilter === "roommate_openings") {
      if (s.listingType !== "roommate") return false;
    } else if (activeFilter !== "all") {
      if (s.listingType === "roommate") return false;
      const postCat = s.category || "semester_takeover";
      const mappedFilter = catToFilter[postCat] || postCat;
      if (mappedFilter !== activeFilter) return false;
    }
    if (zoneFilter !== "all" && s.zone !== zoneFilter) return false;

    if (selectedSubFilters.length > 0) {
      if (activeFilter === "roommate_openings") {
        if (!s.roommatePreference || !selectedSubFilters.includes(s.roommatePreference)) return false;
      } else if (activeFilter === "short_term") {
        if (!s.eventTag || !selectedSubFilters.includes(s.eventTag)) return false;
      } else if (activeFilter === "summer_only") {
        const parkingOnly = selectedSubFilters.includes("🚗 Parking Only");
        const timelineFilters = selectedSubFilters.filter(f => f !== "🚗 Parking Only");
        const subcatValues = timelineFilters.map(f => SUMMER_CHIP_TO_SUB[f]).filter(Boolean);
        if (subcatValues.length > 0 && (!s.subCategory || !subcatValues.includes(s.subCategory))) return false;
        if (parkingOnly && !s.hasParking) return false;
      } else if (activeFilter === "semester_takeover") {
        const catValues = selectedSubFilters.map(f => SEMESTER_CHIP_TO_CAT[f]).filter(Boolean);
        if (catValues.length > 0) {
          const sCat = s.category || "semester_takeover";
          if (!catValues.includes(sCat)) return false;
        }
      }
    }

    return true;
  }).sort((a, b) => {
    const aOwn = currentUser?.email === a.userEmail ? 1 : 0;
    const bOwn = currentUser?.email === b.userEmail ? 1 : 0;
    if (aOwn !== bOwn) return bOwn - aOwn;
    return b.timestamp - a.timestamp;
  });

  const headerCatColor = activeFilter !== "all" ? CATEGORY_COLORS[activeFilter] : Colors.ocean;

  const handleMarkLeased = async (post: SubleasePost) => {
    setLeasedPost(post);
    await removeSublease(post.id);
    try {
      const delUrl = new URL(`/api/listings/${post.id}`, getApiUrl()).toString();
      await fetch(delUrl, { method: "DELETE" });
      const incUrl = new URL("/api/stats/increment", getApiUrl()).toString();
      await fetch(incUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "successful_subleases" }),
      });
    } catch {}
    setShowCongrats(true);
  };

  const handleCongratsClose = () => {
    setShowCongrats(false);
    setTimeout(() => setShowFeedback(true), 400);
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.sand }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }, isDesktop && { maxWidth: 960, alignSelf: "center" as const, width: "100%" }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}>
          <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {activeFilter === "all" ? "Sublease Marketplace" : CATEGORY_LABELS[activeFilter]}
          </Text>
          <Text style={styles.headerSub}>
            {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
            {activeFilter !== "all" && CATEGORY_DATES[activeFilter] ? ` · ${CATEGORY_DATES[activeFilter]}` : ""}
          </Text>
        </View>
        <TouchableOpacity style={[styles.postBtn, { backgroundColor: headerCatColor }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/post-sublease"); }}>
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.postBtnText}>Post</Text>
        </TouchableOpacity>
      </View>

      <ZonePicker selected={zoneFilter} onSelect={setZoneFilter} />

      <View style={{ height: 16 }} />

      <SubFilterRow
        category={activeFilter}
        selected={selectedSubFilters}
        onToggle={handleSubFilterToggle}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, {
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20,
          maxWidth: isDesktop ? 960 : contentMaxWidth,
          alignSelf: "center" as const,
          width: "100%",
        }]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={44} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptySub}>
              {activeFilter !== "all"
                ? `No ${CATEGORY_LABELS[activeFilter]} listings posted yet.`
                : "Be the first to post a sublease!"}
            </Text>
            <TouchableOpacity style={styles.postFirstBtn} onPress={() => router.push("/post-sublease")}>
              <Text style={styles.postFirstBtnText}>Post a Sublease</Text>
            </TouchableOpacity>
          </View>
        ) : isDesktop ? (
          <View style={styles.desktopGrid}>
            {filtered.map(post => (
              <View key={post.id} style={styles.desktopGridItem}>
                <SubleaseCard post={post} onMarkLeased={handleMarkLeased} />
              </View>
            ))}
          </View>
        ) : (
          filtered.map(post => (
            <SubleaseCard key={post.id} post={post} onMarkLeased={handleMarkLeased} />
          ))
        )}
      </ScrollView>

      <CongratsSheet visible={showCongrats} onDone={handleCongratsClose} />

      <MicroFeedback
        visible={showFeedback}
        userEmail={currentUser?.email ?? ""}
        onClose={() => setShowFeedback(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.sand },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8, gap: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.cardBg,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontFamily: "Nunito_700Bold", fontSize: 17, color: Colors.ocean },
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  postBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  postBtnText: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.white },
  filterScroll: { maxHeight: 52 },
  filterRow: { paddingHorizontal: 16, gap: 8, paddingVertical: 8, alignItems: "center" },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  filterChipText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted },
  filterChipTextActive: { color: Colors.white },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.cardBg, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.borderSoft,
    overflow: "hidden" as const,
    shadowColor: Colors.charcoal, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  photoSection: {
    width: "100%",
    aspectRatio: 1.6,
    backgroundColor: Colors.sandDark,
    position: "relative" as const,
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  galleryScroll: {
    width: "100%",
    height: "100%",
  },
  galleryImage: {
    height: "100%",
  },
  galleryDots: {
    position: "absolute" as const, bottom: 8, left: 0, right: 0,
    flexDirection: "row" as const, justifyContent: "center" as const, gap: 5,
  },
  galleryDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.45)",
  },
  galleryDotActive: {
    backgroundColor: Colors.white, width: 8, height: 8, borderRadius: 4,
  },
  floorPlanLabel: {
    position: "absolute" as const, top: 8, left: 8,
    flexDirection: "row" as const, alignItems: "center" as const, gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  floorPlanLabelText: {
    fontFamily: "Nunito_700Bold", fontSize: 10, color: Colors.white,
  },
  expandHint: {
    position: "absolute" as const, top: 8, right: 8,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
  },
  photoPlaceholderText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
  },
  amenityOverlay: {
    position: "absolute" as const,
    bottom: 8,
    right: 8,
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    width: 62,
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 10,
    padding: 6,
  },
  amenityOverlayIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  amenityOverlayIconActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  cardBody: {
    padding: 16,
    gap: 10,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" },
  catTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1,
  },
  catTagText: { fontFamily: "Nunito_700Bold", fontSize: 10 },
  breakAvailTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: Colors.grassGreen + "20",
  },
  breakAvailText: { fontFamily: "Nunito_600SemiBold", fontSize: 10, color: Colors.grassGreen },
  ownerCard: {
    borderColor: Colors.ocean + "40",
    borderWidth: 2,
    backgroundColor: Colors.ocean + "06",
  },
  ownerBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: Colors.ocean + "12", paddingVertical: 8,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  ownerBannerText: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.ocean },
  ownerTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: Colors.ocean + "15",
  },
  ownerTagText: { fontFamily: "Nunito_600SemiBold", fontSize: 10, color: Colors.ocean },
  cardTime: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textLight, marginLeft: "auto" },
  buildingName: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: Colors.charcoal },
  address: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: -4 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  price: { fontFamily: "Nunito_800ExtraBold", fontSize: 26, color: Colors.ocean },
  priceSub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
  dateBadge: {
    marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: "center",
  },
  dateBadgeText: { fontFamily: "Nunito_600SemiBold", fontSize: 11 },
  unitTypeBadge: {
    backgroundColor: Colors.ocean + "15", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
    marginRight: 4, alignSelf: "center" as const,
  },
  unitTypeText: { fontFamily: "Nunito_800ExtraBold", fontSize: 13, color: Colors.ocean },
  fullyPrivateBadge: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 3,
    backgroundColor: Colors.grassGreen + "15", borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2, marginLeft: 6, alignSelf: "center" as const,
  },
  fullyPrivateText: { fontFamily: "Nunito_700Bold", fontSize: 10, color: Colors.grassGreen },
  dateStripRow: { flexDirection: "row" as const, alignItems: "center" as const, marginTop: 8, marginBottom: 8 },
  dateStripPill: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 6,
    backgroundColor: "#E8F0F1", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  dateStripText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#2C555C" },
  roommateInfo: {
    backgroundColor: "#8B5CF6" + "0D", borderRadius: 10, padding: 10, gap: 6,
    borderWidth: 1, borderColor: "#8B5CF6" + "20",
  },
  roommateInfoItem: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 6,
  },
  roommateInfoText: { fontFamily: "Nunito_700Bold", fontSize: 13, color: "#8B5CF6" },
  residentBio: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.charcoal, lineHeight: 17 },
  description: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.charcoal, lineHeight: 19 },
  metaRow: { flexDirection: "row", gap: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted },
  posterRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.borderSoft,
  },
  posterAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  posterInitials: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.white },
  posterInfo: { flex: 1 },
  posterName: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.charcoal },
  posterEmail: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted },
  trustChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  trustChipText: { fontFamily: "Nunito_700Bold", fontSize: 10 },
  messageBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.ocean + "10", borderRadius: 12, paddingVertical: 12,
    borderWidth: 1.5, borderColor: Colors.ocean + "30",
  },
  messageBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.ocean },
  leasedBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.ponyo, borderRadius: 12, paddingVertical: 12, marginTop: 2,
  },
  leasedBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
  desktopGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 16,
  },
  desktopGridItem: {
    width: "48.5%" as any,
  },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontFamily: "Nunito_700Bold", fontSize: 20, color: Colors.charcoal },
  emptySub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center", paddingHorizontal: 20 },
  postFirstBtn: { backgroundColor: Colors.orange, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  postFirstBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
});
