import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import { useAuth } from "@clerk/expo";
import { useGetOpenaiConversation, useListOpenaiMessages } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

let msgCounter = 0;
function uid(): string {
  msgCounter++;
  return `msg-${Date.now()}-${msgCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const inputRef = useRef<TextInput>(null);
  const styles = makeStyles(colors);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const initialized = useRef(false);

  const { data: conversation } = useGetOpenaiConversation(Number(id));
  const { data: serverMessages } = useListOpenaiMessages(Number(id));

  // Load existing messages once on mount
  useEffect(() => {
    if (serverMessages && !initialized.current) {
      initialized.current = true;
      setMessages(
        serverMessages.map((m) => ({
          id: uid(),
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      );
    }
  }, [serverMessages]);

  const domain = process.env.EXPO_PUBLIC_DOMAIN;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentMessages = [...messages];
    setMessages((prev) => [...prev, { id: uid(), role: "user", content: text }]);
    setInput("");
    setIsStreaming(true);
    setShowTyping(true);

    try {
      const token = await getToken();
      const response = await fetch(`https://${domain}/api/openai/conversations/${id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: text }),
      });

      if (!response.ok) throw new Error("Request failed");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let assistantAdded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          try {
            const parsed = JSON.parse(raw);
            if (parsed.content) {
              fullContent += parsed.content;
              if (!assistantAdded) {
                setShowTyping(false);
                setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: fullContent }]);
                assistantAdded = true;
              } else {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullContent,
                  };
                  return updated;
                });
              }
            }
          } catch {}
        }
      }
    } catch {
      setShowTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
      inputRef.current?.focus();
    }
  };

  const reversed = [...messages].reverse();
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: topPad }]} behavior="padding" keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {conversation?.title ?? "Solomon"}
          </Text>
          <Text style={styles.headerSub}>AI Biblical Counselor</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Messages */}
      <FlatList
        data={reversed}
        keyExtractor={(item) => item.id}
        inverted={messages.length > 0}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
        ListHeaderComponent={showTyping ? <TypingIndicator colors={colors} /> : null}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <View style={styles.solomonBadge}>
              <Feather name="book-open" size={28} color={colors.primaryForeground} />
            </View>
            <Text style={styles.emptyChatTitle}>Ask Solomon</Text>
            <Text style={styles.emptyChatText}>
              Seek wisdom, biblical counsel, or scripture on any topic.
            </Text>
          </View>
        }
        renderItem={({ item }) => <MessageBubble message={item} colors={colors} />}
      />

      {/* Input */}
      <View style={[styles.inputRow, { paddingBottom: botPad + 8 }]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Seek counsel…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendBtn,
            (!input.trim() || isStreaming) && styles.sendBtnDisabled,
            pressed && styles.pressed,
          ]}
          onPress={handleSend}
          disabled={!input.trim() || isStreaming}
        >
          {isStreaming
            ? <ActivityIndicator size="small" color={colors.primaryForeground} />
            : <Feather name="send" size={18} color={colors.primaryForeground} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message, colors }: { message: Message; colors: ReturnType<typeof useColors> }) {
  const isUser = message.role === "user";
  return (
    <View style={[bubbleStyles.row, isUser && bubbleStyles.rowUser]}>
      {!isUser && (
        <View style={[bubbleStyles.avatar, { backgroundColor: colors.primary }]}>
          <Feather name="book-open" size={13} color={colors.primaryForeground} />
        </View>
      )}
      <View
        style={[
          bubbleStyles.bubble,
          isUser
            ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
            : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
        ]}
      >
        <Text
          style={[
            bubbleStyles.text,
            { color: isUser ? colors.primaryForeground : colors.foreground },
          ]}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}

function TypingIndicator({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={bubbleStyles.row}>
      <View style={[bubbleStyles.avatar, { backgroundColor: colors.primary }]}>
        <Feather name="book-open" size={13} color={colors.primaryForeground} />
      </View>
      <View style={[bubbleStyles.bubble, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
        <Text style={{ color: colors.mutedForeground, fontSize: 18, letterSpacing: 2 }}>•••</Text>
      </View>
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", marginBottom: 10, gap: 8 },
  rowUser: { flexDirection: "row-reverse" },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bubble: { maxWidth: "78%", borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 },
  text: { fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular" },
});

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
    headerCenter: { flex: 1 },
    headerTitle: { fontSize: 16, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    headerSub: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingVertical: 60, gap: 12 },
    solomonBadge: {
      width: 64, height: 64, borderRadius: 32,
      alignItems: "center", justifyContent: "center",
      backgroundColor: colors.primary, marginBottom: 4,
    },
    emptyChatTitle: { fontSize: 20, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    emptyChatText: { fontSize: 14, color: colors.mutedForeground, textAlign: "center", fontFamily: "Inter_400Regular" },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.foreground,
      backgroundColor: colors.card,
      fontFamily: "Inter_400Regular",
    },
    sendBtn: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
    },
    sendBtnDisabled: { opacity: 0.4 },
    pressed: { opacity: 0.8 },
  });
}
