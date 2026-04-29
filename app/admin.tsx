import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator, Dimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

interface AdminData {
  users: number;
  activeListings: number;
  leasedListings: number;
  stats: Record<string, number>;
  feedback: {
    totals: { rating: string; count: string }[];
    totalCount: number;
    topIssues: { issue_category: string; count: string }[];
    recent: { user_email: string; rating: string; issue_category: string; issue_detail: string; created_at: string }[];
  };
}

const RATING_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  smooth: { emoji: "🌊", color: Colors.ocean, label: "Smooth sailing" },
  bumpy: { emoji: "🛶", color: Colors.goldDark, label: "A bit bumpy" },
  rescue: { emoji: "🦈", color: Colors.ponyo, label: "Needs rescue" },
};

function StatCard({ icon, value, label, color }: {
  icon: keyof typeof Ionicons.glyphMap; value: number | string; label: string; color: string
}) {
  return (
    <View style={[s.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function BarChart({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? value / max : 0;
  return (
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color }]} />
    </View>
  );
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const isDesktopAdm = Platform.OS === "web" && Dimensions.get("window").width >= 1024;
  const topPadding = Platform.OS === "web" ? (isDesktopAdm ? 24 : 67) : insets.top;
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const url = new URL("/api/admin/stats", getApiUrl()).toString();
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Could not load admin data.");
    } finally {
      setLoading(false);
    }
  };

  const totalFeedback = data?.feedback.totalCount ?? 0;
  const ratingMap: Record<string, number> = {};
  data?.feedback.totals.forEach(r => { ratingMap[r.rating] = parseInt(r.count); });

  return (
    <View style={[s.container]}>
      <View style={[s.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Admin Dashboard</Text>
          <Text style={s.subtitle}>PopMatch Internal</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={loadData}>
          <Ionicons name="refresh" size={18} color={Colors.ocean} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={Colors.ocean} />
          <Text style={s.loadingText}>Loading stats...</Text>
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Ionicons name="warning-outline" size={44} color={Colors.ponyo} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadData}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : data ? (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.content, {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20
          }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.sectionTitle}>Live Stats</Text>
          <View style={s.statsRow}>
            <StatCard icon="people-outline" value={data.users} label="Total Users" color={Colors.ocean} />
            <StatCard icon="home-outline" value={data.activeListings} label="Active Listings" color={Colors.grassGreen} />
            <StatCard icon="checkmark-circle-outline" value={data.leasedListings} label="Leases Signed" color={Colors.ponyo} />
          </View>

          {data.stats.successful_subleases !== undefined && (
            <View style={s.infoCard}>
              <Ionicons name="trophy-outline" size={20} color={Colors.goldDark} />
              <View style={{ flex: 1 }}>
                <Text style={s.infoValue}>{data.stats.successful_subleases}</Text>
                <Text style={s.infoLabel}>Subleases marked as leased (via app)</Text>
              </View>
            </View>
          )}

          <Text style={s.sectionTitle}>Feedback Overview</Text>

          {totalFeedback === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>No feedback collected yet.</Text>
            </View>
          ) : (
            <>
              <Text style={s.totalFeedback}>{totalFeedback} total response{totalFeedback !== 1 ? "s" : ""}</Text>
              {["smooth", "bumpy", "rescue"].map(key => {
                const cfg = RATING_CONFIG[key];
                const count = ratingMap[key] ?? 0;
                const pct = totalFeedback > 0 ? Math.round((count / totalFeedback) * 100) : 0;
                return (
                  <View key={key} style={s.ratingRow}>
                    <Text style={s.ratingEmoji}>{cfg.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={s.ratingLabelRow}>
                        <Text style={[s.ratingLabel, { color: cfg.color }]}>{cfg.label}</Text>
                        <Text style={s.ratingPct}>{pct}% ({count})</Text>
                      </View>
                      <BarChart value={count} max={totalFeedback} color={cfg.color} />
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {data.feedback.topIssues.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Top Complaints</Text>
              {data.feedback.topIssues.map((issue, i) => (
                <View key={issue.issue_category} style={s.issueRow}>
                  <View style={[s.issueBadge, { backgroundColor: Colors.ponyo + "18" }]}>
                    <Text style={[s.issueBadgeNum, { color: Colors.ponyo }]}>#{i + 1}</Text>
                  </View>
                  <Text style={s.issueName}>{issue.issue_category}</Text>
                  <Text style={s.issueCount}>{issue.count} reports</Text>
                </View>
              ))}
            </>
          )}

          {data.feedback.recent.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Recent Feedback</Text>
              {data.feedback.recent.map((fb, i) => {
                const cfg = RATING_CONFIG[fb.rating] ?? { emoji: "?", color: Colors.textMuted };
                return (
                  <View key={i} style={s.feedbackCard}>
                    <View style={s.feedbackHeader}>
                      <Text style={s.feedbackEmoji}>{cfg.emoji}</Text>
                      <Text style={s.feedbackEmail} numberOfLines={1}>{fb.user_email}</Text>
                      <Text style={s.feedbackDate}>
                        {new Date(fb.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    {fb.issue_category ? (
                      <Text style={s.feedbackIssue}>{fb.issue_category}</Text>
                    ) : null}
                    {fb.issue_detail ? (
                      <Text style={s.feedbackDetail}>{fb.issue_detail}</Text>
                    ) : null}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.sand },
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: Colors.cardBg,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSoft,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.sand,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontFamily: "Nunito_700Bold", fontSize: 18, color: Colors.ocean },
  subtitle: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  refreshBtn: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.ocean + "15",
    alignItems: "center", justifyContent: "center",
  },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textMuted },
  errorText: { fontFamily: "Nunito_600SemiBold", fontSize: 15, color: Colors.ponyo, textAlign: "center" },
  retryBtn: { backgroundColor: Colors.ocean, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
  sectionTitle: {
    fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.ocean,
    marginTop: 8, marginBottom: 2,
  },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, backgroundColor: Colors.cardBg, borderRadius: 14,
    padding: 14, gap: 4, alignItems: "center",
    shadowColor: Colors.charcoal, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statValue: { fontFamily: "Nunito_800ExtraBold", fontSize: 24 },
  statLabel: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted, textAlign: "center" },
  infoCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.cardBg, borderRadius: 14, padding: 14,
    borderLeftWidth: 4, borderLeftColor: Colors.goldDark,
  },
  infoValue: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: Colors.charcoal },
  infoLabel: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  emptyCard: {
    backgroundColor: Colors.cardBg, borderRadius: 14, padding: 20, alignItems: "center",
  },
  emptyText: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textMuted },
  totalFeedback: {
    fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.textMuted, marginBottom: 8,
  },
  ratingRow: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8,
  },
  ratingEmoji: { fontSize: 24, width: 32 },
  ratingLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  ratingLabel: { fontFamily: "Nunito_700Bold", fontSize: 13 },
  ratingPct: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  barTrack: {
    height: 8, backgroundColor: Colors.borderSoft, borderRadius: 4, overflow: "hidden",
  },
  barFill: { height: 8, borderRadius: 4 },
  issueRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.cardBg, borderRadius: 12, padding: 12,
  },
  issueBadge: {
    width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center",
  },
  issueBadgeNum: { fontFamily: "Nunito_800ExtraBold", fontSize: 12 },
  issueName: { fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.charcoal, flex: 1 },
  issueCount: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  feedbackCard: {
    backgroundColor: Colors.cardBg, borderRadius: 12, padding: 12, gap: 4,
    borderLeftWidth: 3, borderLeftColor: Colors.borderSoft,
  },
  feedbackHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  feedbackEmoji: { fontSize: 18 },
  feedbackEmail: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.charcoal, flex: 1 },
  feedbackDate: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted },
  feedbackIssue: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.ponyo },
  feedbackDetail: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
});
