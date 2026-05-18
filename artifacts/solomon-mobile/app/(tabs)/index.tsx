import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useListOpenaiConversations,
  useCreateOpenaiConversation,
  useDeleteOpenaiConversation,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth, useUser } from "@clerk/expo";

export default function CounselScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();
  const styles = makeStyles(colors);

  const { data: conversations = [], isLoading, refetch } = useListOpenaiConversations();
  const createConversation = useCreateOpenaiConversation();
  const deleteConversation = useDeleteOpenaiConversation();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleNew = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createConversation.mutate(
      { data: { title: "New Conversation" } },
      {
        onSuccess: (conv) => {
          router.push(`/chat/${conv.id}`);
        },
      }
    );
  };

  const handleDelete = (id: number, title: string) => {
    Alert.alert("Delete Conversation", `Remove "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          deleteConversation.mutate({ id }, { onSuccess: () => refetch() });
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Solomon</Text>
          <Text style={styles.headerSub}>
            {user?.primaryEmailAddress?.emailAddress ?? "AI Biblical Counselor"}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.iconBtn} onPress={handleNew} disabled={createConversation.isPending}>
            {createConversation.isPending
              ? <ActivityIndicator size="small" color={colors.primaryForeground} />
              : <Feather name="plus" size={22} color={colors.primaryForeground} />}
          </Pressable>
          <Pressable style={styles.iconBtnGhost} onPress={() => signOut()}>
            <Feather name="log-out" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="book-open" size={48} color={colors.border} />
          <Text style={styles.emptyTitle}>Begin seeking wisdom</Text>
          <Text style={styles.emptyText}>Tap + to start a conversation with Solomon</Text>
          <Pressable style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]} onPress={handleNew}>
            <Text style={styles.startBtnText}>Start Conversation</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={[...conversations].reverse()}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: botPad + 90, paddingHorizontal: 16, paddingTop: 8 }}
          onRefresh={refetch}
          refreshing={isLoading}
          scrollEnabled={!!conversations.length}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.convCard, pressed && styles.pressed]}
              onPress={() => router.push(`/chat/${item.id}`)}
              onLongPress={() => handleDelete(item.id, item.title)}
            >
              <View style={styles.convIcon}>
                <Feather name="message-circle" size={18} color={colors.primary} />
              </View>
              <View style={styles.convContent}>
                <Text style={styles.convTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.convDate}>
                  {new Date(item.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 22, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    headerSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, fontFamily: "Inter_400Regular" },
    headerRight: { flexDirection: "row", gap: 8, alignItems: "center" },
    iconBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
    },
    iconBtnGhost: {
      width: 40, height: 40, borderRadius: 20,
      alignItems: "center", justifyContent: "center",
    },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 12 },
    emptyTitle: { fontSize: 20, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    emptyText: { fontSize: 14, color: colors.mutedForeground, textAlign: "center", fontFamily: "Inter_400Regular" },
    startBtn: {
      marginTop: 8, paddingHorizontal: 24, paddingVertical: 14,
      backgroundColor: colors.primary, borderRadius: 8,
    },
    startBtnText: { color: colors.primaryForeground, fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
    convCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    convIcon: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.muted,
      alignItems: "center", justifyContent: "center",
      marginRight: 12,
    },
    convContent: { flex: 1 },
    convTitle: { fontSize: 15, fontWeight: "500", color: colors.foreground, fontFamily: "Inter_500Medium" },
    convDate: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, fontFamily: "Inter_400Regular" },
    pressed: { opacity: 0.75 },
  });
}
