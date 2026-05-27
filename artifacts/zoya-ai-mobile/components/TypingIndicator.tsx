import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, Text } from "react-native";
import colors from "@/constants/colors";

export default function TypingIndicator() {
  const anims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const loops = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(anim, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 320, useNativeDriver: true }),
          Animated.delay((3 - i) * 150),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>Z</Text>
      </View>
      <View style={styles.bubble}>
        <View style={styles.dots}>
          {anims.map((anim, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                  transform: [
                    {
                      translateY: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -4, 0] }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 10, paddingHorizontal: 0 },
  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.light.primary, justifyContent: "center", alignItems: "center",
  },
  avatarText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 },
  bubble: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 18, borderBottomLeftRadius: 4, backgroundColor: colors.light.card,
  },
  dots: { flexDirection: "row", gap: 5, alignItems: "center", height: 14 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.light.primary },
});
