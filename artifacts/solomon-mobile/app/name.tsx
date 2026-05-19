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
  const styles = makeStyles(colors);
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.iconWrap}>
          <Feather name="book-open" size={36} color={colors.primary} />
        </View>

        <Text style={styles.title}>Welcome, Seeker</Text>
        <Text style={styles.subtitle}>
          Before we begin, Solomon would like to know your name so he may address you personally.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Your name</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
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
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, upsertProfile.isPending && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={upsertProfile.isPending}
        >
          {upsertProfile.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Begin My Journey</Text>
          )}
        </Pressable>

        <Text style={styles.verse}>
          "Ask and it will be given to you; seek and you will find." — Matthew 7:7
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary + "18",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    title: {
      fontFamily: "IM_Fell_English",
      fontSize: 28,
      color: colors.foreground,
      textAlign: "center",
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 15,
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 36,
    },
    form: {
      width: "100%",
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.foreground,
      marginBottom: 8,
    },
    input: {
      width: "100%",
      height: 48,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 14,
      fontSize: 16,
      color: colors.foreground,
      backgroundColor: colors.card,
    },
    inputError: {
      borderColor: colors.destructive,
    },
    errorText: {
      color: colors.destructive,
      fontSize: 12,
      marginTop: 6,
    },
    button: {
      width: "100%",
      height: 50,
      backgroundColor: colors.primary,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 32,
    },
    buttonPressed: {
      opacity: 0.85,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    verse: {
      fontFamily: "IM_Fell_English_Italic",
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: "center",
      fontStyle: "italic",
      paddingHorizontal: 16,
    },
  });
}
