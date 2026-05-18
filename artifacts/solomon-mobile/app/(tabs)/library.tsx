import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import {
  useListBibleVersions,
  useDeleteBibleVersion,
  useGetBibleStats,
  useGetAdminCheck,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { getApiBaseUrl } from "@/lib/api";
import { useAuth } from "@clerk/expo";

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const { getToken } = useAuth();

  const { data: versions = [], isLoading, refetch } = useListBibleVersions();
  const { data: stats } = useGetBibleStats();
  const { data: adminData } = useGetAdminCheck();
  const isAdmin = adminData?.isAdmin ?? false;
  const deleteVersion = useDeleteBibleVersion();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [pickedFile, setPickedFile] = useState<{ name: string; uri: string; mimeType?: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
          deleteVersion.mutate({ versionId }, { onSuccess: () => refetch() });
        },
      },
    ]);
  };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/json", "text/plain"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setPickedFile({ name: asset.name, uri: asset.uri, mimeType: asset.mimeType });
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!pickedFile || !versionName.trim() || !abbreviation.trim()) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("bible", {
        uri: pickedFile.uri,
        name: pickedFile.name,
        type: pickedFile.mimeType ?? (pickedFile.name.endsWith(".txt") ? "text/plain" : "application/json"),
      } as unknown as Blob);
      formData.append("name", versionName.trim());
      formData.append("abbreviation", abbreviation.trim().toUpperCase());

      const response = await fetch(`${getApiBaseUrl()}/api/bible/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let detail = "Upload failed.";
        try {
          const body = await response.json();
          if (body?.error) detail = body.error;
        } catch {}
        setUploadError(detail);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUploadOpen(false);
      setVersionName("");
      setAbbreviation("");
      setPickedFile(null);
      refetch();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const closeUpload = () => {
    setUploadOpen(false);
    setVersionName("");
    setAbbreviation("");
    setPickedFile(null);
    setUploadError(null);
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Bible Library</Text>
          <Text style={styles.headerSub}>Solomon's scripture sources</Text>
        </View>
        {isAdmin && (
          <Pressable
            style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.7 }]}
            onPress={() => setUploadOpen(true)}
          >
            <Feather name="upload" size={14} color="#fff" />
            <Text style={styles.uploadBtnText}>Upload</Text>
          </Pressable>
        )}
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

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : versions.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="book" size={48} color={colors.border} />
          <Text style={styles.emptyTitle}>No Bible versions</Text>
          <Text style={styles.emptyText}>
            {isAdmin
              ? "Tap Upload to add a Bible version (.json or .txt)."
              : "No Bible versions have been added yet."}
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
              {isAdmin && (
                <Pressable
                  onPress={() => handleDelete(item.id, item.name)}
                  style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
                >
                  <Feather name="trash-2" size={16} color={colors.destructive} />
                </Pressable>
              )}
            </View>
          )}
        />
      )}

      {/* Upload Modal (admin only) */}
      <Modal visible={uploadOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeUpload}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            style={[styles.modalContainer, { paddingTop: insets.top + 16 }]}
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Library</Text>
              <Pressable onPress={closeUpload} style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.6 }]}>
                <Feather name="x" size={22} color={colors.foreground} />
              </Pressable>
            </View>

            <Text style={styles.modalSub}>Upload a Bible file (.json or .txt) to expand Solomon's wisdom.</Text>

            <Text style={styles.fieldLabel}>Version Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. King James Version"
              placeholderTextColor={colors.mutedForeground}
              value={versionName}
              onChangeText={setVersionName}
              autoCapitalize="words"
            />

            <Text style={styles.fieldLabel}>Abbreviation</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. KJV"
              placeholderTextColor={colors.mutedForeground}
              value={abbreviation}
              onChangeText={setAbbreviation}
              autoCapitalize="characters"
              maxLength={10}
            />

            <Text style={styles.fieldLabel}>Bible File</Text>
            <Pressable
              style={({ pressed }) => [styles.filePicker, pressed && { opacity: 0.7 }]}
              onPress={handlePickFile}
            >
              <Feather name="file" size={18} color={pickedFile ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.filePickerText, pickedFile && { color: colors.foreground }]}>
                {pickedFile ? pickedFile.name : "Choose .json or .txt file…"}
              </Text>
            </Pressable>

            {uploadError && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={styles.errorText}>{uploadError}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                (!pickedFile || !versionName.trim() || !abbreviation.trim() || isUploading) && styles.submitBtnDisabled,
                pressed && { opacity: 0.8 },
              ]}
              onPress={handleUpload}
              disabled={!pickedFile || !versionName.trim() || !abbreviation.trim() || isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="upload-cloud" size={16} color="#fff" />
                  <Text style={styles.submitBtnText}>Upload Version</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
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
      flexDirection: "row",
      alignItems: "center",
    },
    headerTitle: { fontSize: 22, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    headerSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, fontFamily: "Inter_400Regular" },
    uploadBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    uploadBtnText: { color: "#fff", fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
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

    // Modal styles
    modalContainer: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
    modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    modalTitle: { fontSize: 20, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    modalClose: { padding: 4 },
    modalSub: { fontSize: 13, color: colors.mutedForeground, marginBottom: 24, fontFamily: "Inter_400Regular" },
    fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.foreground, marginBottom: 6, fontFamily: "Inter_600SemiBold" },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.foreground,
      marginBottom: 16,
      fontFamily: "Inter_400Regular",
    },
    filePicker: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 20,
    },
    filePickerText: { fontSize: 14, color: colors.mutedForeground, flex: 1, fontFamily: "Inter_400Regular" },
    errorBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      backgroundColor: `${colors.destructive}15`,
      borderWidth: 1,
      borderColor: `${colors.destructive}30`,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    errorText: { flex: 1, fontSize: 13, color: colors.destructive, fontFamily: "Inter_400Regular" },
    submitBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 14,
    },
    submitBtnDisabled: { opacity: 0.45 },
    submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  });
}
