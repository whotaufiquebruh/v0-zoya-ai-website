import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";
import { apiUrl } from "@/lib/api";

type Status = "idle" | "recording" | "processing" | "speaking";

interface Props {
  onClose: () => void;
  onZoyaReply: (text: string) => void;
  getToken: () => Promise<string | null>;
}

export default function VoiceOverlay({ onClose, onZoyaReply, getToken }: Props) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const startPulse = useCallback(() => {
    pulseLoop.current?.stop();
    Animated.setValue(pulseAnim, 1);
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseLoop.current?.stop();
    Animated.setValue(pulseAnim, 1);
  }, [pulseAnim]);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { setError("Microphone permission nahi mili 😕"); return; }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      setStatus("recording");
      setTranscript("");
      setReply("");
      startPulse();
    } catch {
      setError("Recording start nahi hui, dobara try karo");
    }
  }, [startPulse]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    stopPulse();
    setStatus("processing");

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) { setError("Recording URI nahi mili"); setStatus("idle"); return; }

      const authHeaders = await getAuthHeaders();

      const formData = new FormData();
      formData.append("audio", {
        uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
        type: "audio/m4a",
        name: "voice.m4a",
      } as unknown as Blob);

      const sttResp = await fetch(apiUrl("/api/voice/stt"), {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });
      const sttData = await sttResp.json();
      const userText: string = sttData.transcript || "";
      setTranscript(userText);

      if (!userText.trim()) { setError("Kuch sunai nahi diya, dobara bolo"); setStatus("idle"); return; }

      const chatResp = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ message: userText, voice: true }),
      });
      const chatData = await chatResp.json();
      const zoyaReply: string = chatData.reply || "";
      setReply(zoyaReply);
      onZoyaReply(zoyaReply);

      if (zoyaReply) {
        setStatus("speaking");
        await playTTS(zoyaReply, authHeaders);
      }
      setStatus("idle");
    } catch {
      setError("Kuch problem aayi… dobara try karo 🥺");
      setStatus("idle");
    }
  }, [stopPulse, getAuthHeaders, onZoyaReply]);

  const playTTS = async (text: string, authHeaders: Record<string, string>) => {
    try {
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;

      const ttsResp = await fetch(apiUrl("/api/voice/tts"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ text }),
      });

      if (!ttsResp.ok) return;

      const arrayBuf = await ttsResp.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuf);
      let binary = "";
      const chunk = 8192;
      for (let i = 0; i < uint8.length; i += chunk) {
        binary += String.fromCharCode(...uint8.subarray(i, i + chunk));
      }
      const base64 = btoa(binary);
      const fileUri = (FileSystem.cacheDirectory ?? "") + "zoya_voice.mp3";
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: fileUri });
      soundRef.current = sound;

      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((s) => {
          if (s.isLoaded && s.didJustFinish) resolve();
        });
        sound.playAsync().catch(resolve);
      });
      await sound.unloadAsync();
      soundRef.current = null;
    } catch {
    }
  };

  const handleMicPress = () => {
    if (status === "idle") startRecording();
    else if (status === "recording") stopRecording();
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const isRecording = status === "recording";
  const isProcessing = status === "processing" || status === "speaking";

  return (
    <View style={[styles.overlay, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      {/* Close */}
      <View style={styles.topBar}>
        <Text style={styles.callLabel}>
          {status === "idle" ? "Voice Call" : status === "recording" ? "Listening…" : status === "processing" ? "Processing…" : "Zoya is speaking…"}
        </Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={colors.light.mutedForeground} />
        </Pressable>
      </View>

      <View style={styles.body}>
        {/* Pulse ring + avatar */}
        <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
        <View style={[styles.bigAvatar, isRecording && styles.bigAvatarActive]}>
          <Text style={styles.bigAvatarText}>Z</Text>
        </View>

        <Text style={styles.name}>Zoya</Text>
        <Text style={styles.statusText}>
          {status === "idle" ? "Tap to speak" : status === "recording" ? "Tap again to stop" : status === "processing" ? "Thinking…" : "Speaking…"}
        </Text>

        {transcript ? (
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptLabel}>You said</Text>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
        ) : null}

        {reply ? (
          <View style={styles.replyBox}>
            <Text style={styles.replyLabel}>Zoya</Text>
            <Text style={styles.replyText}>{reply}</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      {/* Mic button */}
      <View style={styles.controls}>
        <Pressable
          onPress={handleMicPress}
          disabled={isProcessing}
          style={({ pressed }) => [
            styles.micBtn,
            isRecording && styles.micBtnRecording,
            isProcessing && styles.micBtnProcessing,
            pressed && !isProcessing && { opacity: 0.85 },
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <Ionicons
              name={isRecording ? "stop" : "mic"}
              size={32}
              color="#fff"
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fff",
    zIndex: 100,
    flexDirection: "column",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  callLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.light.foreground },
  closeBtn: { padding: 6 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  pulseRing: {
    position: "absolute",
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: colors.light.primary,
    opacity: 0.1,
  },
  bigAvatar: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: colors.light.primary,
    justifyContent: "center", alignItems: "center",
    shadowColor: colors.light.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
    marginBottom: 20,
  },
  bigAvatarActive: { shadowOpacity: 0.5 },
  bigAvatarText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 44 },
  name: { fontFamily: "Inter_700Bold", fontSize: 22, color: colors.light.foreground, marginBottom: 6 },
  statusText: { fontFamily: "Inter_400Regular", fontSize: 14, color: colors.light.mutedForeground, marginBottom: 24 },
  transcriptBox: {
    backgroundColor: colors.light.card, borderRadius: 16, padding: 14, marginBottom: 12,
    width: "100%", maxWidth: 320, borderWidth: 1, borderColor: colors.light.border,
  },
  transcriptLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: colors.light.mutedForeground, marginBottom: 4 },
  transcriptText: { fontFamily: "Inter_400Regular", fontSize: 14, color: colors.light.foreground, lineHeight: 20 },
  replyBox: {
    backgroundColor: colors.light.primary + "15", borderRadius: 16, padding: 14,
    width: "100%", maxWidth: 320, borderWidth: 1, borderColor: colors.light.primary + "30",
  },
  replyLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: colors.light.primary, marginBottom: 4 },
  replyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: colors.light.foreground, lineHeight: 20 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.light.destructive, marginTop: 12, textAlign: "center" },
  controls: { paddingBottom: 32, paddingHorizontal: 24, alignItems: "center" },
  micBtn: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.light.primary,
    justifyContent: "center", alignItems: "center",
    shadowColor: colors.light.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  micBtnRecording: { backgroundColor: colors.light.destructive },
  micBtnProcessing: { backgroundColor: colors.light.muted },
});
