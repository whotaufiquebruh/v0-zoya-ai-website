import { Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import colors from "@/constants/colors";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
    inputRef.current?.focus();
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        value={text}
        onChangeText={setText}
        placeholder="Kuch bolo Zoya se…"
        placeholderTextColor={colors.light.mutedForeground}
        style={styles.input}
        multiline
        blurOnSubmit={false}
        onSubmitEditing={handleSend}
        editable={!disabled}
        maxLength={1000}
        returnKeyType="send"
      />
      <Pressable
        onPress={handleSend}
        disabled={!canSend}
        style={({ pressed }) => [
          styles.sendBtn,
          !canSend && styles.sendBtnDisabled,
          pressed && { opacity: 0.8 },
        ]}
      >
        {disabled ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Feather name="send" size={17} color="#fff" />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120,
    paddingHorizontal: 16, paddingVertical: 11,
    backgroundColor: colors.light.card,
    borderWidth: 1, borderColor: colors.light.border,
    borderRadius: 22,
    fontFamily: "Inter_400Regular", fontSize: 14,
    color: colors.light.foreground,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.light.primary,
    justifyContent: "center", alignItems: "center",
    shadowColor: colors.light.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  sendBtnDisabled: { opacity: 0.35, shadowOpacity: 0 },
});
