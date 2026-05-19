import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useUpsertProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";

export default function NameScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const upsertProfile = useUpsertProfile();

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter your name so Solomon may address you.");
      return;
    }
    setError("");
    upsertProfile.mutate(
      { data: { displayName: trimmed } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
          router.replace("/");
        },
        onError: () => {
          setError("Something went wrong. Please try again.");
        },
      }
    );
  }

  const s = StyleSheet.create({
    outer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    inner: {
      flex: 1,
      paddingHorizontal: 32,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: insets.top + 40,
      paddingBottom: insets.bottom + 24,
    },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary + "18",
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: 24,
    },
    title: {
      fontFamily: "Inter_700Bold",
      fontSize: 26,
      color: colors.foreground,
      textAlign: "center" as const,
      marginBottom: 12,
    },
    subtitle: {
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      lineHeight: 22,
      marginBottom: 36,
    },
    form: {
      width: "100%" as const,
      marginBottom: 20,
    },
    label: {
      fontFamily: "Inter_500Medium",
      fontSize: 14,
      color: colors.foreground,
      marginBottom: 8,
    },
    input: {
      width: "100%" as const,
      height: 48,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 14,
      fontSize: 16,
      color: colors.foreground,
      backgroundColor: colors.card,
      fontFamily: "Inter_400Regular",
    },
    inputError: {
      borderColor: colors.destructive,
    },
    errorText: {
      fontFamily: "Inter_400Regular",
      color: colors.destructive,
      fontSize: 12,
      marginTop: 6,
    },
    button: {
      width: "100%" as const,
      height: 50,
      backgroundColor: colors.primary,
      borderRadius: 8,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: 32,
    },
    buttonPressed: {
      opacity: 0.85,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
      fontSize: 16,
    },
    verse: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      fontStyle: "italic" as const,
      paddingHorizontal: 16,
    },
  });

  return (
    <KeyboardAvoidingView
      style={s.outer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={s.inner}>
        <View style={s.iconWrap}>
          <Feather name="book-open" size={36} color={colors.primary} />
        </View>

        <Text style={s.title}>Welcome, Seeker</Text>
        <Text style={s.subtitle}>
          Before we begin, Solomon would like to know your name so he may address you personally.
        </Text>

        <View style={s.form}>
          <Text style={s.label}>Your name</Text>
          <TextInput
            style={[s.input, error ? s.inputError : undefined]}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name…"
            placeholderTextColor={colors.mutedForeground}
            autoFocus
            maxLength={100}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            autoCapitalize="words"
          />
          {error ? <Text style={s.errorText}>{error}</Text> : null}
        </View>

        <Pressable
          style={({ pressed }) => [
            s.button,
            pressed && s.buttonPressed,
            upsertProfile.isPending && s.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={upsertProfile.isPending}
        >
          {upsertProfile.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.buttonText}>Begin My Journey</Text>
          )}
        </Pressable>

        <Text style={s.verse}>
          "Ask and it will be given to you; seek and you will find." — Matthew 7:7
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
