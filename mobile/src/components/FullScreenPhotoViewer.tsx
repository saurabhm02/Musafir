import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { colors } from "../theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function CloseIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export type PhotoItem = {
  id: string;
  url: string;
  source?: string;
  attribution?: string | null;
};

interface Props {
  visible: boolean;
  photos: PhotoItem[];
  initialIndex?: number;
  poiName: string;
  locationText?: string | null;
  onClose: () => void;
}

export function FullScreenPhotoViewer({
  visible,
  photos,
  initialIndex = 0,
  poiName,
  locationText,
  onClose,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);
  const thumbnailListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      const idx = Math.min(Math.max(0, initialIndex), Math.max(0, photos.length - 1));
      setActiveIndex(idx);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: idx, animated: false });
        thumbnailListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
      }, 50);
    }
  }, [visible, initialIndex, photos.length]);

  if (!visible || photos.length === 0) return null;

  const currentPhoto = photos[activeIndex] || photos[0];

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIdx = Math.round(offsetX / SCREEN_WIDTH);
    if (newIdx >= 0 && newIdx < photos.length && newIdx !== activeIndex) {
      setActiveIndex(newIdx);
      thumbnailListRef.current?.scrollToIndex({ index: newIdx, animated: true, viewPosition: 0.5 });
    }
  };

  const handleSelectThumbnail = (index: number) => {
    setActiveIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
    thumbnailListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#09090B" />

        {/* Top Header Bar */}
        <SafeAreaView style={styles.topBar} edges={["top"]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <CloseIcon size={20} />
          </TouchableOpacity>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {activeIndex + 1} / {photos.length}
            </Text>
          </View>
        </SafeAreaView>

        {/* Main Swipeable Image FlatList */}
        <FlatList
          ref={flatListRef}
          data={photos}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <Image source={{ uri: item.url }} style={styles.mainImage} resizeMode="contain" />
            </View>
          )}
        />

        {/* Bottom Details & Thumbnail Selector */}
        <SafeAreaView style={styles.bottomOverlay} edges={["bottom"]}>
          <View style={styles.infoContainer}>
            <Text style={styles.placeTitle}>{poiName}</Text>
            {locationText ? <Text style={styles.placeLocation}>{locationText}</Text> : null}
            {currentPhoto.attribution ? (
              <Text style={styles.attributionText}>Photo by {currentPhoto.attribution}</Text>
            ) : currentPhoto.source ? (
              <Text style={styles.attributionText}>Source: {currentPhoto.source}</Text>
            ) : null}
          </View>

          {/* Thumbnail Bar */}
          {photos.length > 1 && (
            <FlatList
              ref={thumbnailListRef}
              data={photos}
              keyExtractor={(item) => `thumb-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailList}
              getItemLayout={(_, index) => ({
                length: 64,
                offset: 64 * index,
                index,
              })}
              renderItem={({ item, index }) => {
                const isActive = index === activeIndex;
                return (
                  <TouchableOpacity
                    onPress={() => handleSelectThumbnail(index)}
                    activeOpacity={0.8}
                    style={[styles.thumbnailWrapper, isActive && styles.thumbnailActive]}
                  >
                    <Image source={{ uri: item.url }} style={styles.thumbnailImg} resizeMode="cover" />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090B",
    justifyContent: "space-between",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 20 : 6,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  counterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  counterText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  mainImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.72,
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(9, 9, 11, 0.85)",
    paddingTop: 16,
    paddingBottom: Platform.OS === "android" ? 20 : 10,
    zIndex: 20,
  },
  infoContainer: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  placeTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  placeLocation: {
    color: "#D1D5DB",
    fontSize: 13.5,
    fontWeight: "500",
    marginBottom: 4,
  },
  attributionText: {
    color: "#9CA3AF",
    fontSize: 11.5,
    fontStyle: "italic",
  },
  thumbnailList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  thumbnailWrapper: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    opacity: 0.65,
  },
  thumbnailActive: {
    borderColor: colors.accent,
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  thumbnailImg: {
    width: "100%",
    height: "100%",
  },
});
