import React from "react";
import { StyleSheet, Text, View } from "react-native";
import colors from "@/constants/colors";
import type { Message } from "@/app/chat";

interface Props {
  message: Message;
  userInitial: string;
}

export default function MessageBubble({ message, userInitial }: Props) {
  const isUser = message.role === "user";
  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowZoya]}>
      {!isUser && (
        <View style={styles.zoyaAvatar}>
          <Text style={styles.zoyaAvatarText}>Z</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleZoya,
        ]}
      >
        <Text style={[styles.text, isUser ? styles.textUser : styles.textZoya]}>
          {message.content}
        </Text>
      </View>
      {isUser && (
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>{userInitial}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 10,
    gap: 8,
    maxWidth: "100%",
  },
  rowUser: { justifyContent: "flex-end" },
  rowZoya: { justifyContent: "flex-start" },
  zoyaAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.light.primary, justifyContent: "center", alignItems: "center", flexShrink: 0,
  },
  zoyaAvatarText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 },
  userAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.light.secondary, justifyContent: "center", alignItems: "center", flexShrink: 0,
  },
  userAvatarText: { color: colors.light.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  bubble: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, maxWidth: "76%",
  },
  bubbleUser: { backgroundColor: colors.light.primary, borderBottomRightRadius: 4 },
  bubbleZoya: { backgroundColor: colors.light.card, borderBottomLeftRadius: 4 },
  text: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 },
  textUser: { color: "#fff" },
  textZoya: { color: colors.light.foreground },
});
