import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Platform, KeyboardAvoidingView, ScrollView, Animated, ActivityIndicator
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, ChatMessage } from "@/context/AppContext";
import { useResponsive } from "@/hooks/useResponsive";
import CustomAvatar from "@/components/CustomAvatar";

const DARK_TEAL = "#2C555C";
const WARM_CREAM = "#FBFBF9";
const SENT_CORAL = "#FF8C69";
const RECEIVED_SEAFOAM = "#E8F6F3";

const CRASH_CASH_CHIPS: { label: string; bg: string; border: string }[] = [
  { label: "Still available? 👀", bg: "#FDECE8", border: "#F4A89A" },
  { label: "When can I pull up? ⌚", bg: "#E8F6F3", border: "#7CC9AA" },
  { label: "Venmo or Cash? 💸", bg: "#EDF6FA", border: "#8AC4DA" },
  { label: "Guest parking? 🚗", bg: "#FFEDE8", border: "#E8997A" },
];

const COSEEKER_CHIPS: { label: string; bg: string; border: string }[] = [
  { label: "Hey! Love your profile ✨", bg: "#E8F6F3", border: "#7CC9AA" },
  { label: "What is your major?", bg: "#FFF5E6", border: "#F0C87A" },
  { label: "Are you a night owl? 🦇", bg: "#EDF6FA", border: "#8AC4DA" },
  { label: "Wanna grab coffee and chat? ☕", bg: "#FFEDE8", border: "#E8997A" },
];

const SUBLEASE_CHIPS: { label: string; bg: string; border: string }[] = [
  { label: "Is this still available? 🔑", bg: "#E8F0F1", border: "#9AB8BE" },
  { label: "Are utilities included? 💡", bg: "#EDF6FA", border: "#8AC4DA" },
  { label: "Can I schedule a tour? 📅", bg: "#FFF5E6", border: "#F0C87A" },
  { label: "Is it furnished? 🛋️", bg: "#E8F6F3", border: "#7CC9AA" },
];

const MARKET_CHIPS: { label: string; bg: string; border: string }[] = [
  { label: "Is this still available? 👀", bg: "#E4F1E9", border: "#B1D4C0" },
  { label: "Can we meet on campus? 📍", bg: "#E2EAF4", border: "#AEC4DE" },
  { label: "Can I see more photos? 📸", bg: "#FDF0D5", border: "#E8CFA6" },
  { label: "Would you take less? 💬", bg: "#FDEAE4", border: "#DEAEA4" },
];

function IcebreakerChip({ item, onPress }: { item: typeof CRASH_CASH_CHIPS[0]; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 50, bounciness: 0 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 14 }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handlePress}
        style={[icStyles.chip, { backgroundColor: item.bg, borderColor: item.border }]}
      >
        <Text style={icStyles.chipText}>{item.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const icStyles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    alignItems: "center",
    backgroundColor: WARM_CREAM,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    color: DARK_TEAL,
  },
});

function formatTimestamp(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function MessageBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
  return (
    <View style={[styles.bubbleRow, isOwn && styles.bubbleRowOwn]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>{msg.content}</Text>
        <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>{formatTimestamp(msg.createdAt)}</Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ conversationId: string; source?: string }>();
  const { conversations, currentUser, getMessages, sendMessage, loadMessages } = useApp();
  const [text, setText] = useState("");
  // Race-condition guard: setConversations fires before router.push, but the
  // state update may not flush until after the chat screen mounts on web.
  // Wait up to 800 ms before declaring the conversation missing.
  const [convoReady, setConvoReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setConvoReady(true), 800);
    return () => clearTimeout(t);
  }, []);
  const source = params.source || "sublease";
  const activeChips = source === "crash_cash" ? CRASH_CASH_CHIPS
    : source === "coseeker" ? COSEEKER_CHIPS
    : source === "market" ? MARKET_CHIPS
    : SUBLEASE_CHIPS;
  const flatListRef = useRef<FlatList>(null);

  // Load messages from Supabase when conversation opens (also sets up real-time)
  useEffect(() => {
    if (params.conversationId) {
      loadMessages(params.conversationId);
    }
  }, [params.conversationId]);

  const convo = conversations.find(c => c.id === params.conversationId);
  const messages = getMessages(params.conversationId || "");
  const invertedMessages = [...messages].reverse();

  const { isDesktop, contentMaxWidth } = useResponsive();
  const topPadding = Platform.OS === "web" ? (isDesktop ? 24 : 67) : insets.top;

  const handleSend = useCallback(() => {
    if (!text.trim() || !params.conversationId) return;
    sendMessage(params.conversationId, text.trim());
    setText("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [text, params.conversationId, sendMessage]);

  if (!convo && !convoReady) {
    // State update from startConversation hasn't flushed yet — show spinner
    return (
      <View style={[styles.container, styles.centered, { paddingTop: topPadding + 12 }]}>
        <ActivityIndicator size="large" color={DARK_TEAL} />
      </View>
    );
  }

  if (!convo) {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={DARK_TEAL} />
        </TouchableOpacity>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Conversation not found</Text>
        </View>
      </View>
    );
  }

  const contextLabel = source === "crash_cash" ? "🚨 Crash & Cash"
    : source === "coseeker" ? "✨ Co-seeker Match"
    : convo.listingBuilding ? `🔑 ${convo.listingBuilding}` : "🔑 Sublease";

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDesktop && { maxWidth: contentMaxWidth, alignSelf: "center" as const, width: "100%" }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={DARK_TEAL} />
        </TouchableOpacity>
        <CustomAvatar
          name={convo.otherUserName || "?"}
          avatarColor={convo.otherUserAvatar || Colors.ocean}
          profileImage={convo.otherUserProfileImage}
          size={38}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{convo.otherUserName}</Text>
          <Text style={styles.headerContext} numberOfLines={1}>{contextLabel}</Text>
        </View>
      </View>

      {source === "sublease" && convo.listingPrice > 0 && (
        <View style={styles.listingPreview}>
          <Ionicons name="home-outline" size={16} color={DARK_TEAL} />
          <Text style={styles.listingPreviewText} numberOfLines={1}>
            {convo.listingUnitType
              ? `${convo.listingUnitType} — $${convo.listingPrice}/mo`
              : convo.listingBuilding}
          </Text>
          {!convo.listingUnitType && (
            <Text style={styles.listingPreviewPrice}>${convo.listingPrice}/mo</Text>
          )}
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={invertedMessages}
        inverted={messages.length > 0}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <MessageBubble msg={item} isOwn={item.senderId === currentUser?.id} />
        )}
        contentContainerStyle={[styles.messageList, messages.length === 0 && styles.messageListEmpty]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <Ionicons name="chatbubble-ellipses-outline" size={36} color={Colors.textLight} />
            <Text style={styles.emptyMessagesText}>Start the conversation</Text>
          </View>
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={icStyles.row}
        style={{ flexGrow: 0, borderTopWidth: 1, borderTopColor: "#EDF2F2", backgroundColor: WARM_CREAM }}
      >
        {activeChips.map((ic, idx) => (
          <IcebreakerChip
            key={idx}
            item={ic}
            onPress={() => {
              if (params.conversationId) {
                sendMessage(params.conversationId, ic.label);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
          />
        ))}
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 8 }]}>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textLight}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && { opacity: 0.4 }]}
          onPress={handleSend}
          disabled={!text.trim()}
        >
          <Ionicons name="send" size={18} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WARM_CREAM,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: WARM_CREAM,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F2",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E8F0F1",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: DARK_TEAL,
  },
  headerContext: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    color: Colors.textMuted,
  },
  listingPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: "#E8F0F1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  listingPreviewText: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    color: DARK_TEAL,
    flex: 1,
  },
  listingPreviewPrice: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
    color: DARK_TEAL,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  messageListEmpty: {
    flex: 1,
    justifyContent: "center",
  },
  emptyMessages: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 40,
  },
  emptyMessagesText: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
    color: Colors.textLight,
  },
  bubbleRow: {
    flexDirection: "row",
    marginBottom: 8,
    justifyContent: "flex-start",
  },
  bubbleRowOwn: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleOwn: {
    backgroundColor: SENT_CORAL,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: RECEIVED_SEAFOAM,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: DARK_TEAL,
    lineHeight: 21,
  },
  bubbleTextOwn: {
    color: Colors.white,
  },
  bubbleTime: {
    fontFamily: "Nunito_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
    alignSelf: "flex-end",
  },
  bubbleTimeOwn: {
    color: "rgba(255,255,255,0.7)",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: WARM_CREAM,
    borderTopWidth: 1,
    borderTopColor: "#EDF2F2",
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: DARK_TEAL,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: DARK_TEAL + "30",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DARK_TEAL,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 16,
    color: Colors.textMuted,
  },
});
