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
import { useSignUp, useSSO } from "@clerk/expo";
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

export default function SignUpScreen() {
  useWarmUpBrowser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp, errors, fetchStatus } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [verifyCode, setVerifyCode] = React.useState("");
  const [ssoLoading, setSsoLoading] = React.useState(false);

  const styles = makeStyles(colors);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isVerifying =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  const handleSignUp = async () => {
    const { error } = await signUp.password({ emailAddress: email, password });
    if (error) return;
    await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    await signUp.verifications.verifyEmailCode({ code: verifyCode });
    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl("/");
          if (url.startsWith("http")) {
            if (typeof window !== "undefined") window.location.href = url;
          } else {
            router.replace("/(tabs)");
          }
        },
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

  if (isVerifying) {
    return (
      <View style={[styles.container, { paddingTop: topPad + 20, paddingBottom: botPad + 20, paddingHorizontal: 24 }]}>
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Feather name="mail" size={28} color={colors.primaryForeground} />
          </View>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>We sent a code to {email}</Text>
        </View>
        <TextInput
          style={styles.input}
          value={verifyCode}
          onChangeText={setVerifyCode}
          placeholder="6-digit code"
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
            : <Text style={styles.primaryBtnText}>Verify Email</Text>}
        </Pressable>
        <Pressable onPress={() => signUp.verifications.sendEmailCode()} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnText}>Resend code</Text>
        </Pressable>
        <View nativeID="clerk-captcha" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: topPad + 32, paddingBottom: botPad + 32, paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Feather name="book-open" size={32} color={colors.primaryForeground} />
          </View>
          <Text style={styles.appName}>Solomon</Text>
          <Text style={styles.tagline}>Begin your journey</Text>
        </View>

        <Text style={styles.title}>Create account</Text>

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
        {errors.fields?.emailAddress ? <Text style={styles.error}>{errors.fields.emailAddress.message}</Text> : null}

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
          onPress={handleSignUp}
          disabled={!email || !password || fetchStatus === "fetching"}
        >
          {fetchStatus === "fetching"
            ? <ActivityIndicator color={colors.primaryForeground} />
            : <Text style={styles.primaryBtnText}>Create Account</Text>}
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
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in">
            <Text style={styles.link}>Sign in</Text>
          </Link>
        </View>

        <View nativeID="clerk-captcha" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    logoArea: { alignItems: "center", marginBottom: 32 },
    logoCircle: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
      marginBottom: 12,
    },
    appName: { fontSize: 28, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    tagline: { fontSize: 14, color: colors.mutedForeground, marginTop: 4, fontFamily: "Inter_400Regular" },
    title: { fontSize: 26, fontWeight: "700", color: colors.foreground, marginBottom: 4, fontFamily: "Inter_700Bold" },
    subtitle: { fontSize: 14, color: colors.mutedForeground, marginBottom: 24, fontFamily: "Inter_400Regular" },
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
    ghostBtn: { alignItems: "center", marginTop: 16 },
    ghostBtnText: { color: colors.primary, fontSize: 14, fontFamily: "Inter_400Regular" },
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
