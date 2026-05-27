import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import colors from "@/constants/colors";
import SignInScreen from "@/components/SignInScreen";

export default function IndexScreen() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.light.card }}>
        <ActivityIndicator size="large" color={colors.light.primary} />
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/chat" />;
  }

  return <SignInScreen />;
}
