import { useCallback, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";
import { fetchMemories, addMemory, type Memory } from "../lib/memories";
import { categoryColor } from "../components/categoryIcons";
import { colors } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "POIDetails">;

export function POIDetailsScreen({ route, navigation }: Props) {
  const { poi } = route.params;
  const [memories, setMemories] = useState<Memory[]>([]);
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [posting, setPosting] = useState(false);

  const reload = useCallback(() => {
    fetchMemories(poi.id).then(setMemories).catch(() => {});
  }, [poi.id]);

  useFocusEffect(reload);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled) setPickedUri(result.assets[0].uri);
  }

  async function postPhoto() {
    if (!pickedUri) return;
    setPosting(true);
    try {
      await addMemory({ poiId: poi.id, photoUri: pickedUri, visibility });
      setPickedUri(null);
      reload();
    } finally {
      setPosting(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      {poi.photo_url ? (
        <Image source={{ uri: poi.photo_url }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]} />
      )}
      <SafeAreaView edges={["top"]} style={styles.backButtonArea}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <View style={styles.body}>
        <View style={[styles.categoryPill, { backgroundColor: `${categoryColor(poi.category)}22` }]}>
          <Text style={[styles.categoryPillText, { color: categoryColor(poi.category) }]}>{poi.category.replace("_", " ")}</Text>
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{poi.name}</Text>
          {poi.is_verified && (
            <View style={styles.verifiedBadge}>
              <Svg viewBox="0 0 24 24" width={10} height={10}>
                <Path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
          )}
        </View>
        <View style={styles.descRow}>
          {poi.description && <Text style={styles.description}>{poi.description}</Text>}
          <Image source={{ uri: "https://gomusafir.s3.us-east-1.amazonaws.com/mascot/musa-photographer.png" }} style={styles.mascot} />
        </View>

        <View style={styles.sectionLbl}>
          <Text style={styles.sectionLblText}>Community Memories</Text>
          <TouchableOpacity onPress={pickPhoto}>
            <Text style={styles.addPhoto}>+ Add Photo</Text>
          </TouchableOpacity>
        </View>

        {pickedUri && (
          <View style={styles.composer}>
            <Image source={{ uri: pickedUri }} style={styles.composerPreview} />
            <View style={styles.visibilityRow}>
              {(["public", "private"] as const).map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.visibilityChip, visibility === v && styles.visibilityChipActive]}
                  onPress={() => setVisibility(v)}
                >
                  <Text style={[styles.visibilityText, visibility === v && styles.visibilityTextActive]}>{v}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.postButton} onPress={postPhoto} disabled={posting}>
                {posting ? <ActivityIndicator color={colors.accentInk} /> : <Text style={styles.postText}>Post</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.grid}>
          {memories.map((m) => (
            <Image key={m.id} source={{ uri: m.photo_url }} style={styles.gridPhoto} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  photo: { width: "100%", height: 260 },
  photoPlaceholder: { backgroundColor: colors.line },
  backButtonArea: { position: "absolute", left: 0, right: 0, top: 0 },
  backButton: {
    marginLeft: 20,
    marginTop: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accentInk,
    borderWidth: 1.5,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { fontSize: 18, color: colors.ink },
  body: { padding: 22 },
  categoryPill: { alignSelf: "flex-start", borderRadius: 16, paddingVertical: 6, paddingHorizontal: 13 },
  categoryPillText: { fontSize: 10.5, fontWeight: "700", textTransform: "capitalize" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  title: { fontSize: 25, fontWeight: "700", color: colors.ink },
  verifiedBadge: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: colors.trail,
    alignItems: "center", justifyContent: "center",
  },
  descRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 12 },
  description: { flex: 1, fontSize: 14, lineHeight: 22, color: colors.inkSoft },
  mascot: { width: 64, height: 48, resizeMode: "contain", marginTop: -4 },
  sectionLbl: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 10,
  },
  sectionLblText: { fontSize: 11, fontWeight: "700", color: colors.inkSoft, textTransform: "uppercase", letterSpacing: 1 },
  addPhoto: { fontSize: 12, fontWeight: "700", color: colors.accent },
  composer: { marginBottom: 14, borderWidth: 1.5, borderColor: colors.line, borderRadius: 12, padding: 10 },
  composerPreview: { width: "100%", height: 160, borderRadius: 8, marginBottom: 10 },
  visibilityRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  visibilityChip: { borderWidth: 1.5, borderColor: colors.ink, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 },
  visibilityChipActive: { backgroundColor: colors.ink },
  visibilityText: { fontSize: 11, color: colors.ink },
  visibilityTextActive: { color: colors.paper },
  postButton: {
    marginLeft: "auto",
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  postText: { color: colors.accentInk, fontWeight: "700", fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  gridPhoto: { width: "31.5%", aspectRatio: 1, borderRadius: 10, backgroundColor: colors.line },
});
