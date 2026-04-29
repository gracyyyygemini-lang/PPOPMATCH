import React from "react";
import { View, Text, StyleSheet, Platform, FlatList, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useApp, Conversation, ConversationSource } from "@/context/AppContext";
import { useResponsive } from "@/hooks/useResponsive";
import CustomAvatar from "@/components/CustomAvatar";

const DARK_TEAL = "#2C555C";
const WARM_CREAM = "#FBFBF9";

const BADGE_CONFIG: Record<string, { bg: string; label: string; color: string }> = {
  crash_cash: { bg: "#FDECE8", label: "🚨 Urgent",    color: "#C0392B" },
  coseeker:   { bg: "#E8F6F3", label: "✨ Co-seeker", color: DARK_TEAL },
  sublease:   { bg: "#E8F0F1", label: "🔑 Sublease",  color: DARK_TEAL },
  market:     { bg: "#E4F1E9", label: "🛍️ Market",    color: "#4A8A5A" },
};

function inferSource(convo: Conversation): ConversationSource {
  if (convo.source) return convo.source;
  if (convo.listingId?.startsWith("match_")) return "coseeker";
  if (convo.listingBuilding?.startsWith("Crash")) return "crash_cash";
  return "sublease";
}

function formatTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ConversationRow({ convo }: { convo: Conversation }) {
  const src = inferSource(convo);
  const badge = BADGE_CONFIG[src];
  const buildingName = src === "sublease" && convo.listingBuilding ? convo.listingBuilding : null;

  return (
    <TouchableOpacity
      style={styles.convoRow}
      activeOpacity={0.7}
      onPress={() => router.push(`/chat?conversationId=${convo.id}&source=${src}`)}
    >
      <CustomAvatar
        name={convo.otherUserName || "?"}
        avatarColor={convo.otherUserAvatar || Colors.ocean}
        profileImage={convo.otherUserProfileImage}
        size={50}
      />
      <View style={styles.convoContent}>
        <View style={styles.convoHeader}>
          <Text style={styles.convoName} numberOfLines={1}>{convo.otherUserName || "User"}</Text>
          <Text style={styles.convoTime}>{formatTime(convo.lastMessageAt)}</Text>
        </View>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>
              {badge.label}{buildingName ? ` · ${buildingName}` : ""}
            </Text>
          </View>
        </View>

        {convo.lastMessage ? (
          <Text style={styles.convoPreview} numberOfLines={1}>{convo.lastMessage}</Text>
        ) : (
          <Text style={[styles.convoPreview, { fontStyle: "italic", color: Colors.textLight }]}>No messages yet</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const topPadding = Platform.OS === "web" ? (isDesktop ? 24 : 67) : insets.top;
  const { conversations } = useApp();

  const sorted = [...conversations].sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));

  return (
    <View style={[styles.container, { paddingTop: topPadding + 12 }]}>
      <View style={{ maxWidth: contentMaxWidth, alignSelf: "center" as const, width: "100%", flex: 1 }}>
        <Text style={styles.headerTitle}>Inbox</Text>
        {sorted.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={52} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySub}>
              Message someone about a listing to start a conversation.
            </Text>
          </View>
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <ConversationRow convo={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + (isDesktop ? 40 : 90) }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WARM_CREAM,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 28,
    color: DARK_TEAL,
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
    color: DARK_TEAL,
    marginTop: 8,
  },
  emptySub: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 20,
  },
  convoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: WARM_CREAM,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: "rgba(0,0,0,0.06)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  convoContent: {
    flex: 1,
    gap: 4,
  },
  convoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  convoName: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: DARK_TEAL,
    flex: 1,
  },
  convoTime: {
    fontFamily: "Nunito_400Regular",
    fontSize: 11,
    color: Colors.textLight,
    marginLeft: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
  },
  convoPreview: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
