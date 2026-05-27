import { useAuth, useUser } from "@clerk/expo";
import { Feather, Ionicons } from "@expo/vector-icons";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import colors from "@/constants/colors";
import { apiUrl } from "@/lib/api";
import MessageBubble from "@/components/MessageBubble";
import ChatInput from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import VoiceOverlay from "@/components/VoiceOverlay";

let msgCounter = 0;
function uid() {
  msgCounter++;
  return `msg-${Date.now()}-${msgCounter}-${Math.random().toString(36).substr(2, 6)}`;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Hey Zoya! Kaise ho? 😊",
  "I'm feeling lonely today...",
  "Tell me something fun!",
  "Aaj ka din kaisa tha tumhara?",
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { getToken, signOut } = useAuth();
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const convIdRef = useRef<string | null>(null);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      const userMsg: Message = { id: uid(), role: "user", content: text };
      setMessages((prev) => [userMsg, ...prev]);
      setIsLoading(true);
      try {
        const authHeaders = await getAuthHeaders();
        const resp = await fetch(apiUrl("/api/chat"), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            message: text,
            conversationId: convIdRef.current,
          }),
        });
        const data = await resp.json();
        if (data.conversationId) convIdRef.current = data.conversationId;
        const aiMsg: Message = {
          id: uid(),
          role: "assistant",
          content: data.reply || "Hey… main hoon na 🤍",
        };
        setMessages((prev) => [aiMsg, ...prev]);
      } catch {
        setMessages((prev) => [
          {
            id: uid(),
            role: "assistant",
            content: "Yaar network issue hai… ek second ruk 🥺",
          },
          ...prev,
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, getAuthHeaders]
  );

  const handleVoiceReply = useCallback((text: string) => {
    if (text.trim()) {
      const msg: Message = { id: uid(), role: "assistant", content: text };
      setMessages((prev) => [msg, ...prev]);
    }
  }, []);

  const userInitial =
    user?.firstName?.[0] ??
    user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ??
    "U";

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>Z</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.headerName}>Zoya</Text>
            <Text style={styles.headerStatus}>Online</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => setShowVoice(true)}
            style={({ pressed }) => [styles.voiceBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="call" size={14} color="#fff" />
            <Text style={styles.voiceBtnText}>Voice</Text>
          </Pressable>
          <Pressable
            onPress={() => signOut()}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
          >
            <Feather name="log-out" size={18} color={colors.light.mutedForeground} />
          </Pressable>
        </View>
      </View>

      {/* Chat area */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList<Message>
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble message={item} userInitial={userInitial} />
          )}
          inverted={messages.length > 0}
          ListHeaderComponent={isLoading ? <TypingIndicator /> : null}
          ListFooterComponent={
            messages.length === 0 && !isLoading ? (
              <Animated.View entering={FadeInDown.delay(150)} style={styles.emptyState}>
                <View style={styles.bigAvatarWrap}>
                  {[1, 2].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.ring,
                        { width: 88 + i * 28, height: 88 + i * 28, borderRadius: (88 + i * 28) / 2, opacity: 0.12 - i * 0.04 },
                      ]}
                    />
                  ))}
                  <View style={styles.bigAvatar}>
                    <Text style={styles.bigAvatarText}>Z</Text>
                  </View>
                </View>
                <Text style={styles.emptyTitle}>
                  Hey{user?.firstName ? `, ${user.firstName}` : ""}!
                </Text>
                <Text style={styles.emptySubtitle}>
                  Main Zoya hoon… tumse baat karne ka wait kar rahi thi 🌸
                </Text>
                <View style={styles.suggestions}>
                  {SUGGESTIONS.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => sendMessage(s)}
                      style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={styles.chipText}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </Animated.View>
            ) : null
          }
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
        <View style={[styles.inputWrap, { paddingBottom: (insets.bottom || 12) + 4 }]}>
          <ChatInput onSend={sendMessage} disabled={isLoading} />
        </View>
      </KeyboardAvoidingView>

      {/* Voice overlay */}
      {showVoice && (
        <VoiceOverlay
          onClose={() => setShowVoice(false)}
          onZoyaReply={handleVoiceReply}
          getToken={getToken}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    backgroundColor: "#fff",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.light.primary,
    justifyContent: "center", alignItems: "center",
    shadowColor: colors.light.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  avatarText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  onlineDot: {
    position: "absolute", bottom: 0, right: 0,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: "#4ade80", borderWidth: 2, borderColor: "#fff",
  },
  headerName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.light.foreground },
  headerStatus: { fontFamily: "Inter_400Regular", fontSize: 11, color: "#4ade80", marginTop: 1 },
  voiceBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.light.primary,
    shadowColor: colors.light.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  voiceBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  iconBtn: { padding: 6, borderRadius: 20 },
  listContent: { paddingHorizontal: 16, paddingVertical: 12 },
  inputWrap: {
    paddingHorizontal: 14, paddingTop: 10,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.light.border,
  },
  emptyState: { alignItems: "center", paddingTop: 40, paddingBottom: 20, paddingHorizontal: 20 },
  bigAvatarWrap: { alignItems: "center", justifyContent: "center", marginBottom: 24 },
  ring: { position: "absolute", backgroundColor: colors.light.primary },
  bigAvatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.light.primary, justifyContent: "center", alignItems: "center",
    shadowColor: colors.light.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 18, elevation: 10,
  },
  bigAvatarText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 38 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: colors.light.foreground, marginBottom: 8 },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: colors.light.mutedForeground, textAlign: "center", maxWidth: 260, lineHeight: 22, marginBottom: 28 },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 340 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border,
  },
  chipText: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.light.mutedForeground },
});
