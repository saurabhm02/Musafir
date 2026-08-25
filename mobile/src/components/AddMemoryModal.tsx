import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import * as ImagePicker from "expo-image-picker";
import { uploadMemory, type Memory } from "../lib/memories";
import { colors } from "../theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

function CloseIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke="#18181B" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CameraIcon({ size = 22, color = colors.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function PhotoLibraryIcon({ size = 22, color = colors.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth={2} />
      <Circle cx="8.5" cy="8.5" r="1.5" fill={color} />
      <Path d="M21 15l-5-5L5 21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function GlobeIcon({ size = 18, color = "#18181B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function LockIcon({ size = 18, color = "#18181B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

type Props = {
  visible: boolean;
  poiId?: string;
  tripId?: string;
  placeName?: string;
  onClose: () => void;
  onSuccess: (memory: Memory) => void;
};

export function AddMemoryModal({ visible, poiId, tripId, placeName, onClose, onSuccess }: Props) {
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState("");

  const handlePickLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Please allow photo library access to upload a travel memory.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.88,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets?.[0]) {
        setSelectedAsset(result.assets[0]);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to pick image");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Please allow camera access to capture a travel memory.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.88,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets?.[0]) {
        setSelectedAsset(result.assets[0]);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to open camera");
    }
  };

  const handleSaveMemory = async () => {
    if (!selectedAsset) {
      Alert.alert("Select a Photo", "Please pick or capture a photo first.");
      return;
    }

    setIsUploading(true);
    setUploadStatusText("Connecting directly to cloud storage...");

    try {
      const mimeType = selectedAsset.mimeType || (selectedAsset.uri.endsWith(".png") ? "image/png" : "image/jpeg");
      const fileSize = selectedAsset.fileSize || 1024 * 1024;

      setUploadStatusText("Uploading photo directly to S3...");
      const memory = await uploadMemory({
        poiId,
        tripId,
        uri: selectedAsset.uri,
        caption: caption.trim() || undefined,
        visibility,
        mimeType,
        fileSize,
      });

      setUploadStatusText("Success!");
      // Reset state and notify parent
      setSelectedAsset(null);
      setCaption("");
      setVisibility("public");
      setIsUploading(false);
      onSuccess(memory);
      onClose();
    } catch (err: any) {
      setIsUploading(false);
      Alert.alert("Upload Failed", err.message || "Could not upload memory. Please try again.");
    }
  };

  const handleDismiss = () => {
    if (isUploading) return;
    setSelectedAsset(null);
    setCaption("");
    setVisibility("public");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleDismiss}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={handleDismiss}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Add Traveler Memory</Text>
              {placeName ? (
                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  {placeName}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn} disabled={isUploading}>
              <CloseIcon size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Image Selection / Preview Card */}
            {selectedAsset ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: selectedAsset.uri }} style={styles.previewImage} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.changePhotoBadge}
                  onPress={handlePickLibrary}
                  disabled={isUploading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.changePhotoText}>Change Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pickCard}>
                <Text style={styles.pickTitle}>Share a Real Photo of this Place</Text>
                <Text style={styles.pickSubtitle}>
                  Help fellow travelers see the current beauty, trail conditions, or atmosphere.
                </Text>
                <View style={styles.pickButtonsRow}>
                  <TouchableOpacity style={styles.pickOptionBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
                    <View style={styles.pickIconWrap}>
                      <CameraIcon size={22} color={colors.accent} />
                    </View>
                    <Text style={styles.pickBtnText}>Camera</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.pickOptionBtn} onPress={handlePickLibrary} activeOpacity={0.8}>
                    <View style={styles.pickIconWrap}>
                      <PhotoLibraryIcon size={22} color={colors.accent} />
                    </View>
                    <Text style={styles.pickBtnText}>Photo Library</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Caption Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Caption (Optional)</Text>
                <Text style={styles.charCount}>{caption.length} / 300</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="What was this moment like? Mention trail status, best spot, etc."
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={300}
                value={caption}
                onChangeText={setCaption}
                editable={!isUploading}
              />
            </View>

            {/* Visibility Selector */}
            <View style={styles.visibilityGroup}>
              <Text style={styles.inputLabel}>Visibility</Text>
              <View style={styles.visibilityRow}>
                <TouchableOpacity
                  style={[styles.visibilityCard, visibility === "public" && styles.visibilityCardActive]}
                  onPress={() => setVisibility("public")}
                  disabled={isUploading}
                  activeOpacity={0.8}
                >
                  <View style={styles.visibilityTopRow}>
                    <GlobeIcon size={18} color={visibility === "public" ? colors.accent : "#71717A"} />
                    <Text style={[styles.visibilityTitle, visibility === "public" && styles.visibilityTitleActive]}>
                      Public
                    </Text>
                  </View>
                  <Text style={styles.visibilityDesc}>Visible to all travelers visiting this place</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.visibilityCard, visibility === "private" && styles.visibilityCardActive]}
                  onPress={() => setVisibility("private")}
                  disabled={isUploading}
                  activeOpacity={0.8}
                >
                  <View style={styles.visibilityTopRow}>
                    <LockIcon size={18} color={visibility === "private" ? colors.accent : "#71717A"} />
                    <Text style={[styles.visibilityTitle, visibility === "private" && styles.visibilityTitleActive]}>
                      Private
                    </Text>
                  </View>
                  <Text style={styles.visibilityDesc}>Only you can see this memory in your travel logs</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Upload Button & Status */}
            <View style={styles.actionContainer}>
              {isUploading ? (
                <View style={styles.uploadingBox}>
                  <ActivityIndicator color={colors.accent} size="small" />
                  <Text style={styles.uploadStatusText}>{uploadStatusText}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.submitBtn, !selectedAsset && styles.submitBtnDisabled]}
                  onPress={handleSaveMemory}
                  disabled={!selectedAsset || isUploading}
                  activeOpacity={0.85}
                >
                  <Text style={styles.submitBtnText}>Save Traveler Memory</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.88,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: "#71717A",
    fontWeight: "500",
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 20,
  },
  pickCard: {
    backgroundColor: "#FAFAFA",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  pickTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#18181B",
    marginBottom: 4,
  },
  pickSubtitle: {
    fontSize: 12.5,
    color: "#71717A",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  pickButtonsRow: {
    flexDirection: "row",
    gap: 14,
    width: "100%",
  },
  pickOptionBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  pickIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  pickBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#18181B",
  },
  previewContainer: {
    width: "100%",
    height: 220,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 20,
    position: "relative",
    backgroundColor: "#18181B",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  changePhotoBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  changePhotoText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#374151",
  },
  charCount: {
    fontSize: 11.5,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: "#18181B",
    minHeight: 80,
    textAlignVertical: "top",
  },
  visibilityGroup: {
    marginBottom: 24,
  },
  visibilityRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  visibilityCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 12,
  },
  visibilityCardActive: {
    borderColor: colors.accent,
    backgroundColor: "#FFF7ED",
  },
  visibilityTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  visibilityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#71717A",
  },
  visibilityTitleActive: {
    color: colors.accent,
  },
  visibilityDesc: {
    fontSize: 11.5,
    color: "#6B7280",
    lineHeight: 16,
  },
  actionContainer: {
    marginTop: 6,
    marginBottom: 10,
  },
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15.5,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  uploadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    height: 52,
    borderWidth: 1.2,
    borderColor: colors.accent,
  },
  uploadStatusText: {
    fontSize: 13.5,
    color: colors.accent,
    fontWeight: "600",
  },
});
