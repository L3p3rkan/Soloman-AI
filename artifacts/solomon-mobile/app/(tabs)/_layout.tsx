import { useEffect, useState } from "react";
import { BlurView } from "expo-blur";
import { Redirect, Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useAuth } from "@clerk/expo";
import { setAuthTokenGetter, useGetProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export default function TabsLayout() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  // Track when the auth token getter has been registered so we don't fire
  // the profile query before it's ready (would get a 401 on every first load).
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    setTokenReady(true);
  }, [getToken]);

  const {
    data: profile,
    isLoading: profileLoading,
    isSuccess: profileLoaded,
  } = useGetProfile({
    query: {
      enabled: isLoaded && !!isSignedIn && tokenReady,
      queryKey: getGetProfileQueryKey(),
    },
  });

  // Still resolving auth state
  if (!isLoaded) return null;

  // Not signed in → go to auth
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  // Waiting for token registration or profile fetch
  if (!tokenReady || profileLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Profile confirmed no name → collect it first
  if (profileLoaded && !profile?.displayName) {
    return <Redirect href="/name" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Counsel",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="bubble.left" tintColor={color} size={24} />
            ) : (
              <Feather name="message-circle" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="books.vertical" tintColor={color} size={24} />
            ) : (
              <Feather name="book" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}
