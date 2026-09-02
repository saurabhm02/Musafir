import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import {
  Map as MapView,
  Camera,
  GeoJSONSource,
  Layer,
  Marker,
  type CameraRef,
  type MapRef,
} from "@maplibre/maplibre-react-native";
import type { RootStackParamList } from "../navigation";
import { uploadMemory } from "../lib/memories";
import {
  BackArrowIcon,
  CheckmarkIcon,
  LayerIcon,
  RecenterGpsIcon,
  CameraPinIcon,
  GlobeIcon,
  LockIcon,
  ChevronDownIcon,
} from "../components/TrekMemoriesIcons";
import { colors } from "../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

type Props = NativeStackScreenProps<RootStackParamList, "AddMemory">;

export function AddMemoryScreen({ navigation, route }: Props) {
  const { trekId, trekName, routeId, trekSessionId, initialLat, initialLon } = route.params;

  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);

  const [pinCoord, setPinCoord] = useState<[number, number]>([
    initialLon ?? 77.3898,
    initialLat ?? 31.5396,
  ]);
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [altitudeM, setAltitudeM] = useState<number>(3650);
  const [capturedTimeStr, setCapturedTimeStr] = useState<string>("Today, 11:42 AM");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Get current GPS location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          setPinCoord([loc.coords.longitude, loc.coords.latitude]);
          if (loc.coords.altitude) {
            setAltitudeM(Math.round(loc.coords.altitude));
          }
        }
      } catch {}

      // Format time
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setCapturedTimeStr(`Today, ${timeStr}`);
    })();
  }, []);

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow access to your photo library.");
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
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow camera access.");
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
      Alert.alert("Error", err.message || "Failed to take photo");
    }
  };

  const handleRecenter = () => {
    cameraRef.current?.flyTo({
      center: pinCoord,
      zoom: 14.5,
      duration: 500,
    });
  };

  const handleSaveMemory = async () => {
    if (!selectedAsset) {
      Alert.alert("Select a Photo", "Please pick or capture a photo first to pin your memory.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("Uploading memory directly to storage...");

    try {
      const mimeType = selectedAsset.mimeType || (selectedAsset.uri.endsWith(".png") ? "image/png" : "image/jpeg");
      const fileSize = selectedAsset.fileSize || 1024 * 1024;

      await uploadMemory({
        trekId,
        trekRouteId: routeId,
        trekSessionId,
        uri: selectedAsset.uri,
        caption: caption.trim() || undefined,
        visibility,
        mimeType,
        fileSize,
      });

      setIsSubmitting(false);
      Alert.alert("Memory Added!", "Your photo memory has been pinned to the trail.", [
        {
          text: "View on Map",
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert("Upload Failed", err.message || "Could not upload memory. Please try again.");
    }
  };

  const quickTags = ["#raghupurfort", "#trekking", "#nature", "#himalayas"];

  const handleAddTag = (tag: string) => {
    if (!caption.includes(tag)) {
      setCaption((prev) => (prev ? `${prev} ${tag}` : tag));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <BackArrowIcon size={22} color="#18181B" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Add Memory</Text>

        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: "#FFF5ED" }]}
          onPress={handleSaveMemory}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <CheckmarkIcon size={20} color={colors.accent} />
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Interactive Map on Trail (Top half) */}
        <View style={styles.mapArea}>
          <MapView ref={mapRef} style={StyleSheet.absoluteFill} mapStyle={MAP_STYLE}>
            <Camera
              ref={cameraRef}
              initialViewState={{
                center: pinCoord,
                zoom: 14.2,
              }}
            />

            {/* Pulsing Blue Location Dot */}
            <Marker lngLat={pinCoord} anchor="center">
              <View style={styles.pulsingUserDotWrap}>
                <View style={styles.pulsingUserDotPulse} />
                <View style={styles.pulsingUserDotCore} />
              </View>
            </Marker>

            {/* Pinned Green Camera Marker */}
            <Marker lngLat={pinCoord} anchor="bottom">
              <View style={styles.cameraMarkerBubble}>
                <CameraPinIcon size={26} color="#16A34A" />
              </View>
            </Marker>
          </MapView>

          {/* Floating Controls */}
          <View style={styles.floatingControls}>
            <TouchableOpacity style={styles.floatingBtn} onPress={handleRecenter} activeOpacity={0.8}>
              <RecenterGpsIcon size={20} color="#18181B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.floatingBtn} activeOpacity={0.8}>
              <LayerIcon size={20} color="#18181B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Form Sheet (Bottom half) */}
        <View style={styles.bottomFormSheet}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
            {/* Header: Title & Visibility Selector */}
            <View style={styles.formHeaderRow}>
              <Text style={styles.formHeaderTitle}>Add to this location</Text>

              <TouchableOpacity
                style={styles.visibilityChip}
                onPress={() => setVisibility((v) => (v === "public" ? "private" : "public"))}
                activeOpacity={0.8}
              >
                {visibility === "public" ? (
                  <>
                    <GlobeIcon size={13} color="#16A34A" />
                    <Text style={[styles.visibilityChipText, { color: "#16A34A" }]}>Public</Text>
                  </>
                ) : (
                  <>
                    <LockIcon size={13} color="#71717A" />
                    <Text style={[styles.visibilityChipText, { color: "#71717A" }]}>Private</Text>
                  </>
                )}
                <ChevronDownIcon size={12} color="#71717A" />
              </TouchableOpacity>
            </View>

            {/* Photo Selection Row */}
            <View style={styles.photoPickerRow}>
              {selectedAsset ? (
                <TouchableOpacity
                  style={styles.photoThumbWrap}
                  onPress={handlePickPhoto}
                  activeOpacity={0.88}
                >
                  <Image source={{ uri: selectedAsset.uri }} style={styles.photoThumb} resizeMode="cover" />
                </TouchableOpacity>
              ) : null}

              {/* Add / Capture Box */}
              <TouchableOpacity
                style={styles.addPhotoBox}
                onPress={() => {
                  Alert.alert("Add Photo", "Choose photo source:", [
                    { text: "Photo Library", onPress: handlePickPhoto },
                    { text: "Camera", onPress: handleTakePhoto },
                    { text: "Cancel", style: "cancel" },
                  ]);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.addPhotoPlus}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Caption Input */}
            <View style={styles.captionInputWrap}>
              <Text style={styles.captionLabel}>Caption (optional)</Text>
              <TextInput
                style={styles.captionInput}
                placeholder="Add a note about this moment..."
                placeholderTextColor="#A1A1AA"
                value={caption}
                onChangeText={setCaption}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Quick Hashtag Chips */}
            <View style={styles.tagsRow}>
              {quickTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={styles.tagChip}
                  onPress={() => handleAddTag(tag)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tagText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Metadata Info Row */}
            <View style={styles.metaInfoRow}>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Altitude</Text>
                <Text style={styles.metaValue}>{altitudeM.toLocaleString()} m</Text>
              </View>

              <View style={styles.metaDivider} />

              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Captured at</Text>
                <Text style={styles.metaValue}>{capturedTimeStr}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#18181B",
  },
  mapArea: {
    flex: 1,
    position: "relative",
  },
  floatingControls: {
    position: "absolute",
    top: 14,
    right: 14,
    gap: 10,
  },
  floatingBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  pulsingUserDotWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  pulsingUserDotPulse: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(37, 99, 235, 0.25)",
  },
  pulsingUserDotCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#2563EB",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },
  cameraMarkerBubble: {
    marginBottom: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  bottomFormSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
    maxHeight: 340,
  },
  formScroll: {
    paddingBottom: 16,
  },
  formHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  formHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#18181B",
  },
  visibilityChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F4F5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  visibilityChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  photoPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  photoThumbWrap: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#18181B",
  },
  photoThumb: {
    width: "100%",
    height: "100%",
  },
  addPhotoBox: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#D4D4D8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
  },
  addPhotoPlus: {
    fontSize: 24,
    color: "#71717A",
    fontWeight: "400",
  },
  captionInputWrap: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    padding: 10,
    marginBottom: 12,
  },
  captionLabel: {
    fontSize: 11,
    color: "#A1A1AA",
    fontWeight: "500",
    marginBottom: 4,
  },
  captionInput: {
    fontSize: 13,
    color: "#18181B",
    minHeight: 48,
    textAlignVertical: "top",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
  tagChip: {
    backgroundColor: "#F4F4F5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#71717A",
  },
  metaInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#F4F4F5",
  },
  metaCol: {
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 11,
    color: "#71717A",
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#18181B",
  },
  metaDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E4E4E7",
  },
});
