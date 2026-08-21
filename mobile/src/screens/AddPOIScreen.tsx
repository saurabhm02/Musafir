import { useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";
import { createPoi } from "../lib/pois";
import { colors } from "../theme";

const CATEGORIES = ["food", "cafe", "viewpoint", "temple", "trek", "rest_stop"];

type Props = NativeStackScreenProps<RootStackParamList, "AddPOI">;

export function AddPOIScreen({ route, navigation }: Props) {
  const { lat, lon } = route.params;
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function onSave() {
    if (!name.trim()) return Alert.alert("Name is required");
    setSaving(true);
    try {
      await createPoi({ name, category, lat, lon, photoUri: photoUri ?? undefined });
      navigation.goBack();
    } catch (e) {
      Alert.alert("Couldn't save this place", e instanceof Error ? e.message : "something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Text style={styles.title}>Add a place</Text>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Place name"
        placeholderTextColor={colors.inkSoft}
      />

      <View style={styles.chipRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, category === c && styles.chipActive]}
            onPress={() => setCategory(c)}
          >
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
        ) : (
          <Text style={styles.photoPickerText}>+ Add a photo</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.saveButton} onPress={onSave} disabled={saving}>
        {saving ? <ActivityIndicator color={colors.accentInk} /> : <Text style={styles.saveText}>Save place</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: 22 },
  title: { fontSize: 21, fontWeight: "700", color: colors.ink, marginBottom: 18 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 14,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  chip: { borderWidth: 1.5, borderColor: colors.ink, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  chipActive: { backgroundColor: colors.ink },
  chipText: { fontSize: 12, color: colors.ink },
  chipTextActive: { color: colors.paper },
  photoPicker: {
    height: 140,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderStyle: "dashed",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    overflow: "hidden",
  },
  photoPickerText: { color: colors.inkSoft, fontSize: 13 },
  photoPreview: { width: "100%", height: "100%" },
  saveButton: { backgroundColor: colors.accent, borderRadius: 14, padding: 16, alignItems: "center" },
  saveText: { color: colors.accentInk, fontWeight: "700", fontSize: 15 },
});
