import React, { useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSignIn, useSSO } from "@clerk/expo";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { Link, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);
}

export default function SignInScreen() {
  useWarmUpBrowser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [verifyCode, setVerifyCode] = React.useState("");
  const [showVerify, setShowVerify] = React.useState(false);
  const [ssoLoading, setSsoLoading] = React.useState(false);

  const styles = makeStyles(colors);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleEmailSignIn = async () => {
    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) return;
    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl("/");
          if (url.startsWith("http")) {
            if (typeof window !== "undefined") window.location.href = url;
          } else {
            router.replace("/(tabs)");
          }
        },
      });
    } else if (signIn.status === "needs_client_trust") {
      await signIn.mfa.sendEmailCode();
      setShowVerify(true);
    }
  };

  const handleVerify = async () => {
    await signIn.mfa.verifyEmailCode({ code: verifyCode });
    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: () => { router.replace("/(tabs)"); },
      });
    }
  };

  const handleGoogle = useCallback(async () => {
    setSsoLoading(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({
          session: createdSessionId,
          navigate: () => { router.replace("/(tabs)"); },
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSsoLoading(false);
    }
  }, [startSSOFlow, router]);

  if (showVerify) {
    return (
      <View style={[styles.container, { paddingTop: topPad + 20, paddingBottom: botPad + 20 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setShowVerify(false)} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>Enter the verification code we sent you</Text>
        </View>
        <TextInput
          style={styles.input}
          value={verifyCode}
          onChangeText={setVerifyCode}
          placeholder="Enter code"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numeric"
          autoFocus
        />
        {errors.fields?.code ? <Text style={styles.error}>{errors.fields.code.message}</Text> : null}
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={handleVerify}
          disabled={fetchStatus === "fetching"}
        >
          {fetchStatus === "fetching"
            ? <ActivityIndicator color={colors.primaryForeground} />
            : <Text style={styles.primaryBtnText}>Verify</Text>}
        </Pressable>
        <Pressable onPress={() => signIn.mfa.sendEmailCode()} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnText}>Resend code</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        style={[styles.container]}
        contentContainerStyle={{ paddingTop: topPad + 32, paddingBottom: botPad + 32, paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Feather name="book-open" size={32} color={colors.primaryForeground} />
          </View>
          <Text style={styles.appName}>Solomon</Text>
          <Text style={styles.tagline}>Wisdom grounded in scripture</Text>
        </View>

        <Text style={styles.title}>Welcome back</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {errors.fields?.identifier ? <Text style={styles.error}>{errors.fields.identifier.message}</Text> : null}

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry
        />
        {errors.fields?.password ? <Text style={styles.error}>{errors.fields.password.message}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            (!email || !password || fetchStatus === "fetching") && styles.disabled,
            pressed && styles.pressed,
          ]}
          onPress={handleEmailSignIn}
          disabled={!email || !password || fetchStatus === "fetching"}
        >
          {fetchStatus === "fetching"
            ? <ActivityIndicator color={colors.primaryForeground} />
            : <Text style={styles.primaryBtnText}>Sign In</Text>}
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed]}
          onPress={handleGoogle}
          disabled={ssoLoading}
        >
          {ssoLoading
            ? <ActivityIndicator color={colors.foreground} />
            : <>
                <Feather name="chrome" size={18} color={colors.foreground} style={{ marginRight: 8 }} />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </>}
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/sign-up">
            <Text style={styles.link}>Sign up</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    logoArea: { alignItems: "center", marginBottom: 40 },
    logoCircle: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
      marginBottom: 12,
    },
    appName: { fontSize: 28, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    tagline: { fontSize: 14, color: colors.mutedForeground, marginTop: 4, fontFamily: "Inter_400Regular" },
    header: { marginBottom: 32 },
    backBtn: { marginBottom: 16 },
    title: { fontSize: 26, fontWeight: "700", color: colors.foreground, marginBottom: 8, fontFamily: "Inter_700Bold" },
    subtitle: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    label: { fontSize: 13, fontWeight: "600", color: colors.foreground, marginBottom: 6, marginTop: 16, fontFamily: "Inter_600SemiBold" },
    input: {
      height: 52, borderWidth: 1, borderColor: colors.border,
      borderRadius: 8, paddingHorizontal: 14,
      backgroundColor: colors.card, color: colors.foreground,
      fontSize: 15, fontFamily: "Inter_400Regular",
    },
    error: { color: colors.destructive, fontSize: 12, marginTop: 4, fontFamily: "Inter_400Regular" },
    primaryBtn: {
      height: 52, backgroundColor: colors.primary,
      borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 24,
    },
    primaryBtnText: { color: colors.primaryForeground, fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.82 },
    divider: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { marginHorizontal: 12, color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" },
    googleBtn: {
      height: 52, borderWidth: 1, borderColor: colors.border,
      borderRadius: 8, alignItems: "center", justifyContent: "center",
      backgroundColor: colors.card, flexDirection: "row",
    },
    googleBtnText: { color: colors.foreground, fontSize: 15, fontWeight: "500", fontFamily: "Inter_500Medium" },
    footer: { flexDirection: "row", justifyContent: "center", marginTop: 28 },
    footerText: { color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" },
    link: { color: colors.primary, fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  });
}
