import React from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { ScamBanner } from "@/components/ScamBanner";
import { useResponsive } from "@/hooks/useResponsive";

const DARK_TEAL = "#2C555C";
const SUBTITLE_GREY = "#6B8A8F";
const SCREEN_BG = "#FBFBF9";

const CARD_TINTS: Record<string, string> = {
  roommate_openings: "#E2EAF4",
  semester_takeover: "#E4F1E9",
  summer_only: "#FDF0D5",
  short_term: "#E0F0F5",
};

const CARD_BORDERS: Record<string, string> = {
  roommate_openings: "#AEC4DE",
  semester_takeover: "#B1D4C0",
  summer_only: "#E8CFA6",
  short_term: "#A8D2DF",
};

const CATEGORIES: {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  iconBg: string;
  layout: "half" | "full";
}[] = [
  {
    id: "roommate_openings",
    title: "Find a Roommate",
    subtitle: "Join an existing lease & meet housemates",
    icon: "people",
    color: "#8B5CF6",
    iconBg: "#EDE9FE",
    layout: "half",
  },
  {
    id: "semester_takeover",
    title: "Semester & Year",
    subtitle: "Fall, Spring, or Full-Year subleases",
    icon: "calendar",
    color: Colors.grassGreen,
    iconBg: "#DCFCE7",
    layout: "half",
  },
  {
    id: "summer_only",
    title: "Summer Subleases",
    subtitle: "Mid-May to early August",
    icon: "sunny",
    color: Colors.orange,
    iconBg: "#FFF1EC",
    layout: "full",
  },
  {
    id: "short_term",
    title: "Short-Term & Gaps",
    subtitle: "August gaps, Spring Break, Thanksgiving Break & event weekends",
    icon: "timer",
    color: Colors.ocean,
    iconBg: "#E0F4F8",
    layout: "full",
  },
];

const FEATURES = [
  {
    route: "/matchmaker" as const,
    title: "Year-Long Matchmaker",
    subtitle: "Swipe & match for a full 12-month lease",
    icon: "heart" as const,
    color: Colors.ocean,
  },
  {
    route: "/crash-cash" as const,
    title: "Crash & Cash",
    subtitle: "Urgent couch for tonight — pay in cash, boba, or Lion cover",
    icon: "flash-outline" as const,
    color: "#FF8C69",
  },
];

function CrashSubtitle() {
  return (
    <Text style={ccStyles.sub}>
      Urgent couch for tonight — pay in{" "}
      <View style={[ccStyles.tag, { backgroundColor: "#A8DADC" }]}>
        <Text style={ccStyles.tagText}>cash</Text>
      </View>
      ,{" "}
      <View style={[ccStyles.tag, { backgroundColor: "#A2D2FF" }]}>
        <Text style={ccStyles.tagText}>boba</Text>
      </View>
      , or{" "}
      <View style={[ccStyles.tag, { backgroundColor: "#FEE440" }]}>
        <Text style={ccStyles.tagText}>Lion cover</Text>
      </View>
    </Text>
  );
}

const ccStyles = StyleSheet.create({
  sub: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    color: DARK_TEAL,
    lineHeight: 22,
    marginTop: 2,
  },
  tag: {
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tagText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    color: DARK_TEAL,
  },
});

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, friends, subleases } = useApp();
  const { isDesktop, isTablet, contentMaxWidth } = useResponsive();
  const topPadding = Platform.OS === "web" ? (isDesktop ? 24 : 67) : insets.top;

  const firstName = currentUser?.name.split(" ")[0] ?? "there";

  const navigateToCategory = (catId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/marketplace?category=${catId}` as any);
  };

  const halfCards = CATEGORIES.filter(c => c.layout === "half");
  const fullCards = CATEGORIES.filter(c => c.layout === "full");

  const renderFeatureCard = (f: typeof FEATURES[0], pressed: boolean) => {
    if (f.route === "/matchmaker") {
      return (
        <View style={[styles.matchmakerCard, pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 }]}>
          <View style={styles.watermarkWrap}>
            <Ionicons name="heart" size={120} color="rgba(255,255,255,0.1)" />
          </View>
          <View style={styles.matchmakerIcon}>
            <Ionicons name="heart" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.matchmakerTitle}>{f.title}</Text>
            <Text style={styles.matchmakerSub}>{f.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color="rgba(255,255,255,0.7)" />
        </View>
      );
    }

    return (
      <View style={[styles.crashCard, pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 }]}>
        <View style={styles.crashWatermarkWrap}>
          <Ionicons name="flash" size={100} color="rgba(255,255,255,0.2)" />
        </View>
        <View style={styles.crashIcon}>
          <Ionicons name="flash" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.featureText}>
          <Text style={styles.crashTitle}>{f.title}</Text>
          <CrashSubtitle />
        </View>
        <Ionicons name="chevron-forward" size={17} color={DARK_TEAL + "80"} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: SCREEN_BG }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + (isDesktop ? 40 : 90),
            maxWidth: contentMaxWidth,
            alignSelf: "center" as const,
            width: "100%",
            paddingHorizontal: isDesktop ? 32 : 16,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: topPadding + 12, paddingHorizontal: 0 }]}>
          <View>
            <Text style={styles.greeting}>Hey, {firstName}</Text>
            <Text style={styles.tagline}>UIUC Housing — Find your match</Text>
          </View>
          {!isDesktop && (
            <View style={styles.logoMark}>
              <Ionicons name="home" size={22} color={Colors.ocean} />
            </View>
          )}
        </View>

        <ScamBanner />

        <Text style={styles.sectionLabel}>Browse by housing type</Text>

        <View style={styles.catColumn}>
          <View style={styles.catTopRow}>
            {halfCards.map((cat) => (
              <Pressable
                key={cat.id}
                style={{ flex: 1 }}
                onPress={() => navigateToCategory(cat.id)}
              >
                {({ pressed }) => (
                  <View style={[
                    styles.categoryCard,
                    styles.halfCard,
                    { backgroundColor: CARD_TINTS[cat.id] || "rgba(200,200,200,0.1)", borderColor: CARD_BORDERS[cat.id] || "#E0E0E0" },
                    pressed && styles.cardPressed,
                  ]}>
                    <View style={[styles.catIconWrap, { backgroundColor: cat.iconBg }]}>
                      <Ionicons name={cat.icon} size={20} color={cat.color} />
                    </View>
                    <Text style={styles.catTitle}>{cat.title}</Text>
                    <Text style={styles.catSubtitle}>{cat.subtitle}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {fullCards.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => navigateToCategory(cat.id)}
            >
              {({ pressed }) => (
                <View style={[
                  styles.categoryCard,
                  styles.fullCard,
                  { backgroundColor: CARD_TINTS[cat.id] || "rgba(200,200,200,0.1)", borderColor: CARD_BORDERS[cat.id] || "#E0E0E0" },
                  pressed && styles.cardPressed,
                ]}>
                  <View style={[styles.catIconWrap, { backgroundColor: cat.iconBg }]}>
                    <Ionicons name={cat.icon} size={20} color={cat.color} />
                  </View>
                  <View style={styles.fullCardText}>
                    <Text style={styles.catTitle}>{cat.title}</Text>
                    <Text style={styles.catSubtitle}>{cat.subtitle}</Text>
                  </View>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {isDesktop ? (
          <View style={styles.desktopFeaturesRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionLabel}>Other features</Text>
              {FEATURES.map((f) => (
                <Pressable
                  key={f.route}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push(f.route);
                  }}
                  style={{ marginBottom: 10 }}
                >
                  {({ pressed }) => renderFeatureCard(f, pressed)}
                </Pressable>
              ))}
            </View>
            <View style={{ width: 20 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionLabel}>Your stats</Text>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{friends.length}</Text>
                  <Text style={styles.statLabel}>Circle</Text>
                </View>
                <View style={[styles.statBox, styles.statBoxMid]}>
                  <Text style={styles.statNum}>{subleases.length}</Text>
                  <Text style={styles.statLabel}>Listings</Text>
                </View>
              </View>
              <View style={[styles.trustCard, { marginTop: 10 }]}>
                <View style={styles.trustHeader}>
                  <Ionicons name="shield-checkmark" size={16} color={Colors.ocean} />
                  <Text style={styles.trustTitle}>PopMatch Protection</Text>
                </View>
                {[
                  "Only @illinois.edu verified students",
                  "Social Trust Graph — see mutual connections",
                  "Landlord-specific warnings (JSM, UGroup, Bailey, American)",
                  "Weighted Euclidean matching for compatibility",
                ].map((tip) => (
                  <View key={tip} style={styles.tipRow}>
                    <View style={styles.tipDot} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Other features</Text>

            {FEATURES.map((f) => (
              <Pressable
                key={f.route}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(f.route);
                }}
              >
                {({ pressed }) => renderFeatureCard(f, pressed)}
              </Pressable>
            ))}

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{friends.length}</Text>
                <Text style={styles.statLabel}>Circle</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxMid]}>
                <Text style={styles.statNum}>{subleases.length}</Text>
                <Text style={styles.statLabel}>Listings</Text>
              </View>
            </View>

            <View style={styles.trustCard}>
              <View style={styles.trustHeader}>
                <Ionicons name="shield-checkmark" size={16} color={Colors.ocean} />
                <Text style={styles.trustTitle}>PopMatch Protection</Text>
              </View>
              {[
                "Only @illinois.edu verified students",
                "Social Trust Graph — see mutual connections",
                "Landlord-specific warnings (JSM, UGroup, Bailey, American)",
                "Weighted Euclidean matching for compatibility",
              ].map((tip) => (
                <View key={tip} style={styles.tipRow}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, paddingBottom: 16, backgroundColor: SCREEN_BG,
  },
  greeting: { fontFamily: "Nunito_800ExtraBold", fontSize: 28, color: Colors.ocean },
  tagline: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
  logoMark: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.ocean + "18",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: Colors.ocean + "30",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  sectionLabel: {
    fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8, marginTop: 4,
  },
  catColumn: {
    gap: 16,
  },
  catTopRow: {
    flexDirection: "row", gap: 16,
  },
  desktopFeaturesRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  categoryCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    shadowColor: "#1A2F33",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  halfCard: {
    gap: 8,
  },
  fullCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  fullCardText: {
    flex: 1,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  catIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  catTitle: { fontFamily: "Nunito_700Bold", fontSize: 15, color: DARK_TEAL },
  catSubtitle: { fontFamily: "Nunito_400Regular", fontSize: 12, color: SUBTITLE_GREY, lineHeight: 17 },

  matchmakerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#D96C5B",
    borderRadius: 20,
    padding: 14,
    overflow: "hidden" as const,
    borderWidth: 0,
    shadowColor: "#1A2F33",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  watermarkWrap: {
    position: "absolute" as const,
    right: -20,
    bottom: -20,
  },
  matchmakerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  matchmakerTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  matchmakerSub: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 17,
    marginTop: 2,
  },

  crashCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#EBAE61",
    borderRadius: 20,
    padding: 14,
    overflow: "hidden" as const,
    borderWidth: 0,
    shadowColor: "#1A2F33",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  crashWatermarkWrap: {
    position: "absolute" as const,
    right: -10,
    bottom: -10,
  },
  crashIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(44, 85, 92, 0.2)",
  },
  crashTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 15,
    color: DARK_TEAL,
  },

  featureText: { flex: 1 },
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1, backgroundColor: "#FFFFFF", borderRadius: 14,
    padding: 14, alignItems: "center", gap: 2,
    shadowColor: "#8FAFB2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 1,
  },
  statBoxMid: { backgroundColor: Colors.ocean + "12" },
  statNum: { fontFamily: "Nunito_800ExtraBold", fontSize: 24, color: Colors.ocean },
  statLabel: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted },
  trustCard: {
    backgroundColor: Colors.ocean + "10",
    borderRadius: 16,
    padding: 16, gap: 10,
  },
  trustHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  trustTitle: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.ocean },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.ocean, marginTop: 6 },
  tipText: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.charcoal, flex: 1, lineHeight: 19 },
});
