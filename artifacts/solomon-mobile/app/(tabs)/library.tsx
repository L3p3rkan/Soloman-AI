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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useListBibleVersions,
  useDeleteBibleVersion,
  useGetBibleStats,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);

  const { data: versions = [], isLoading, refetch } = useListBibleVersions();
  const { data: stats } = useGetBibleStats();
  const deleteVersion = useDeleteBibleVersion();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleDelete = (versionId: string, name: string) => {
    Alert.alert("Remove Bible Version", `Remove "${name}" from Solomon's library?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          deleteVersion.mutate({ versionId });
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bible Library</Text>
        <Text style={styles.headerSub}>Solomon's scripture sources</Text>
      </View>

      {/* Stats bar */}
      {stats && stats.totalVersions > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.totalVersions}</Text>
            <Text style={styles.statLabel}>Versions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.totalBooks}</Text>
            <Text style={styles.statLabel}>Books</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.totalVerses.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Verses</Text>
          </View>
        </View>
      )}

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Feather name="info" size={14} color={colors.mutedForeground} />
        <Text style={styles.infoText}>Upload Bible versions from the web app to add them here.</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : versions.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="book" size={48} color={colors.border} />
          <Text style={styles.emptyTitle}>No Bible versions</Text>
          <Text style={styles.emptyText}>
            Visit the web app to upload Bible versions for Solomon to search.
          </Text>
        </View>
      ) : (
        <FlatList
          data={versions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: botPad + 90, paddingHorizontal: 16, paddingTop: 8 }}
          onRefresh={refetch}
          refreshing={isLoading}
          scrollEnabled={!!versions.length}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.versionCard}>
              <View style={styles.versionIcon}>
                <Feather name="book-open" size={20} color={colors.primary} />
              </View>
              <View style={styles.versionContent}>
                <Text style={styles.versionName}>{item.name}</Text>
                <Text style={styles.versionMeta}>
                  {item.abbreviation} · {item.bookCount} books · {item.verseCount.toLocaleString()} verses
                </Text>
              </View>
              <Pressable
                onPress={() => handleDelete(item.id, item.name)}
                style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
              >
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </Pressable>
            </View>
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
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 22, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    headerSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, fontFamily: "Inter_400Regular" },
    statsBar: {
      flexDirection: "row",
      backgroundColor: colors.card,
      margin: 16,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    statItem: { flex: 1, alignItems: "center" },
    statNum: { fontSize: 20, fontWeight: "700", color: colors.primary, fontFamily: "Inter_700Bold" },
    statLabel: { fontSize: 11, color: colors.mutedForeground, marginTop: 2, fontFamily: "Inter_400Regular" },
    statDivider: { width: 1, backgroundColor: colors.border },
    infoBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    infoText: { fontSize: 12, color: colors.mutedForeground, flex: 1, fontFamily: "Inter_400Regular" },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 12 },
    emptyTitle: { fontSize: 20, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    emptyText: { fontSize: 14, color: colors.mutedForeground, textAlign: "center", fontFamily: "Inter_400Regular" },
    versionCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    versionIcon: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.muted,
      alignItems: "center", justifyContent: "center",
      marginRight: 12,
    },
    versionContent: { flex: 1 },
    versionName: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    versionMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, fontFamily: "Inter_400Regular" },
    deleteBtn: { padding: 8 },
  });
}
