import { useOAuth } from "@clerk/expo";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch {
      setError("Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <View style={styles.content}>
        {/* Avatar with rings */}
        <View style={styles.avatarOuter}>
          <View style={[styles.ring, { width: 144, height: 144, borderRadius: 72, opacity: 0.1 }]} />
          <View style={[styles.ring, { width: 116, height: 116, borderRadius: 58, opacity: 0.14 }]} />
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>Z</Text>
          </View>
        </View>

        <Text style={styles.title}>Meet Zoya</Text>
        <Text style={styles.subtitle}>
          Tumhari caring Hinglish companion{"\n"}jo hamesha sunti hai 🌸
        </Text>

        <View style={styles.features}>
          {([
            ["Hinglish Conversations", "💬"],
            ["Voice Calls", "🎙️"],
            ["Remembers You", "🧠"],
          ] as [string, string][]).map(([label, icon]) => (
            <View key={label} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{icon}</Text>
              <Text style={styles.featureLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={handleGoogleSignIn}
          disabled={loading}
          style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.82 }]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.light.primary} />
          ) : (
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          )}
        </Pressable>

        {error != null && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.footnote}>
          By continuing, you agree to our Terms of Service
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.card },
  blob1: {
    position: "absolute", top: -80, right: -80,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: colors.light.primary, opacity: 0.07,
  },
  blob2: {
    position: "absolute", bottom: -40, left: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: colors.light.primary, opacity: 0.05,
  },
  content: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 28 },
  avatarOuter: { alignItems: "center", justifyContent: "center", width: 144, height: 144, marginBottom: 28 },
  ring: { position: "absolute", backgroundColor: colors.light.primary },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.light.primary, justifyContent: "center", alignItems: "center",
    shadowColor: colors.light.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 10,
  },
  avatarLetter: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 40 },
  title: { fontFamily: "Inter_700Bold", fontSize: 30, color: colors.light.foreground, marginBottom: 10, textAlign: "center" },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 15, color: colors.light.mutedForeground, textAlign: "center", lineHeight: 24, marginBottom: 32 },
  features: { gap: 12, marginBottom: 36, width: "100%", maxWidth: 260 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: { fontSize: 20, width: 28, textAlign: "center" },
  featureLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: colors.light.foreground },
  googleBtn: {
    width: "100%", maxWidth: 320, minHeight: 52, paddingVertical: 15, paddingHorizontal: 20,
    borderRadius: 24, backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: colors.light.border,
  },
  googleBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.light.foreground },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.light.destructive, marginTop: 14, textAlign: "center" },
  footnote: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.light.mutedForeground, marginTop: 20, textAlign: "center" },
});
