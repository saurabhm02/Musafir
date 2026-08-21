import React, { useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path } from "react-native-svg";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { RootStackParamList } from "../navigation";
import { supabase } from "../lib/supabase";

const { width, height } = Dimensions.get("window");

function PawIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 11.5C9.5 11.5 7.5 13.8 7.5 16.5C7.5 18.7 9.2 20.5 12 20.5C14.8 20.5 16.5 18.7 16.5 16.5C16.5 13.8 14.5 11.5 12 11.5Z"
        fill="#0D7C85"
      />
      <Circle cx="6.5" cy="10.5" r="2.2" fill="#0D7C85" />
      <Circle cx="10" cy="7.2" r="2.2" fill="#0D7C85" />
      <Circle cx="14" cy="7.2" r="2.2" fill="#0D7C85" />
      <Circle cx="17.5" cy="10.5" r="2.2" fill="#0D7C85" />
    </Svg>
  );
}

function ArrowRightIcon({ color = "#FFFFFF", size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12H19M19 12L13 6M19 12L13 18"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const SLIDES = [
  {
    id: "journey",
    imageUrl: "https://gomusafir.s3.us-east-1.amazonaws.com/mascot/musa-journey.png",
    title: "Your journey\nmatters",
    body: "Explore beautiful routes and hidden places curated by travelers like you.",
  },
  {
    id: "detour",
    imageUrl: "https://gomusafir.s3.us-east-1.amazonaws.com/mascot/musa-detour.png",
    title: "Places worth\nthe detour",
    body: "Discover cafés, viewpoints, dhabas, treks and more along the way.",
  },
  {
    id: "stories",
    imageUrl: "https://gomusafir.s3.us-east-1.amazonaws.com/mascot/musa-stories.png",
    title: "Real places.\nReal stories.",
    body: "See photos and memories from real travelers before you go.",
  },
  {
    id: "relive",
    imageUrl: "https://gomusafir.s3.us-east-1.amazonaws.com/mascot/musa-relive.png",
    title: "Track. Remember.\nRelive.",
    body: "Track your trips, capture memories and relive your stories anytime.",
  },
];

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

// Animated Slide Item Component
function SlideItem({
  slide,
  index,
  scrollX,
}: {
  slide: (typeof SLIDES)[0];
  index: number;
  scrollX: SharedValue<number>;
}) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const imageAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.82, 1, 0.82],
      Extrapolation.CLAMP
    );
    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [width * 0.28, 0, -width * 0.28],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.35, 1, 0.35],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateX }, { scale }],
      opacity,
    };
  });

  const titleAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [22, 0, -22],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  const bodyAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [30, 0, -30],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  return (
    <View style={[styles.slide, { width }]}>
      {/* Mascot Illustration with Parallax Scale */}
      <View style={styles.imageContainer}>
        <Animated.View style={[styles.imageWrapper, imageAnimatedStyle]}>
          <Image source={{ uri: slide.imageUrl }} style={styles.image} resizeMode="contain" />
        </Animated.View>
      </View>

      {/* Content Text with Animated Slide-up & Fade */}
      <View style={styles.textContainer}>
        <Animated.Text style={[styles.title, titleAnimatedStyle]}>
          {slide.title}
        </Animated.Text>
        <Animated.Text style={[styles.body, bodyAnimatedStyle]}>
          {slide.body}
        </Animated.Text>
      </View>
    </View>
  );
}

// Animated Pagination Dot Component
function PaginationDot({
  index,
  scrollX,
}: {
  index: number;
  scrollX: SharedValue<number>;
}) {
  const dotAnimatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const dotWidth = interpolate(
      scrollX.value,
      inputRange,
      [6.5, 18, 6.5],
      Extrapolation.CLAMP
    );

    const backgroundColor = interpolateColor(
      scrollX.value,
      inputRange,
      ["#E4E4E7", "#EA6C1E", "#E4E4E7"]
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.65, 1, 0.65],
      Extrapolation.CLAMP
    );

    return {
      width: dotWidth,
      backgroundColor,
      opacity,
    };
  });

  return <Animated.View style={[styles.dot, dotAnimatedStyle]} />;
}

export function OnboardingScreen({ navigation }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<Animated.ScrollView>(null);

  const scrollX = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const arrowTranslateX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
      const page = Math.round(event.contentOffset.x / width);
      if (page >= 0 && page < SLIDES.length) {
        runOnJS(setCurrentIndex)(page);
      }
    },
  });

  async function finish() {
    await AsyncStorage.setItem("onboarded", "1");
    const { data } = await supabase.auth.getSession();
    const loggedIn = !!data.session && !data.session.user.is_anonymous;
    navigation.replace(loggedIn ? "Dashboard" : "Auth");
  }

  function handleNext() {
    // Arrow kick & bounce micro-interaction
    arrowTranslateX.value = withSequence(
      withTiming(6, { duration: 90 }),
      withSpring(0, { damping: 14, stiffness: 240 })
    );

    if (currentIndex === SLIDES.length - 1) {
      return finish();
    }
    const nextIdx = currentIndex + 1;
    scrollRef.current?.scrollTo({ x: width * nextIdx, animated: true });
    setCurrentIndex(nextIdx);
  }

  function handlePressIn() {
    buttonScale.value = withSpring(0.96, { damping: 15, stiffness: 350 });
  }

  function handlePressOut() {
    buttonScale.value = withSpring(1, { damping: 12, stiffness: 300 });
  }

  // Header Logo animated style (fades out gracefully as we leave Slide 1)
  const headerLogoAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      [0, width * 0.45],
      [1, 0],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollX.value,
      [0, width * 0.45],
      [0, -8],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  // Action Button Morphing Style based on scroll position reaching final slide
  const lastIndex = SLIDES.length - 1;
  const buttonMorphRange = [(lastIndex - 0.7) * width, lastIndex * width];

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      scrollX.value,
      buttonMorphRange,
      ["#FFFFFF", "#18181B"]
    );
    const borderColor = interpolateColor(
      scrollX.value,
      buttonMorphRange,
      ["#E4E4E7", "#18181B"]
    );

    return {
      backgroundColor,
      borderColor,
      transform: [{ scale: buttonScale.value }],
    };
  });

  const nextTextAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      buttonMorphRange,
      [1, 0],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollX.value,
      buttonMorphRange,
      [0, -10],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const getStartedTextAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      buttonMorphRange,
      [0, 1],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollX.value,
      buttonMorphRange,
      [10, 0],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const arrowCircleAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      scrollX.value,
      buttonMorphRange,
      ["#18181B", "#27272A"]
    );
    return {
      backgroundColor,
      transform: [{ translateX: arrowTranslateX.value }],
    };
  });

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAF8" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        {/* Musa Logo on First Slide with Smooth Fade Animation */}
        <Animated.View style={[styles.headerLeft, headerLogoAnimatedStyle]}>
          <View style={styles.logoContainer}>
            <View style={styles.logoRow}>
              <Text style={styles.logoText}>Musa</Text>
              <View style={styles.pawBadge}>
                <PawIcon size={19} />
              </View>
            </View>
            <Text style={styles.logoSubtitle}>Your travel buddy</Text>
          </View>
        </Animated.View>

        {/* Skip button */}
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={finish}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Animated Carousel */}
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {SLIDES.map((slide, i) => (
          <SlideItem
            key={slide.id}
            slide={slide}
            index={i}
            scrollX={scrollX}
          />
        ))}
      </Animated.ScrollView>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        {/* Animated Pagination Indicator */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <PaginationDot key={i} index={i} scrollX={scrollX} />
          ))}
        </View>

        {/* Morphing Interactive Action Button */}
        <TouchableOpacity
          onPress={handleNext}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <Animated.View style={[styles.actionBtn, buttonAnimatedStyle]}>
            {/* "Next" Text (Slide 1-3) */}
            <Animated.View style={[styles.btnTextWrapper, nextTextAnimatedStyle]}>
              <Text style={styles.nextBtnText}>Next</Text>
            </Animated.View>

            {/* "Get started" Text (Slide 4) */}
            <Animated.View style={[styles.btnTextWrapper, getStartedTextAnimatedStyle]}>
              <Text style={styles.finalBtnText}>Get started</Text>
            </Animated.View>

            {/* Circular Arrow Badge with Spring Animation */}
            <Animated.View style={[styles.arrowCircle, arrowCircleAnimatedStyle]}>
              <ArrowRightIcon color="#FFFFFF" size={15} />
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const mascotHeight = Math.min(height * 0.42, 330);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAF8",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "android" ? 14 : 8,
    minHeight: 58,
    zIndex: 10,
  },
  headerLeft: {
    flex: 1,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "flex-start",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  logoText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.5,
  },
  pawBadge: {
    marginLeft: 2,
    marginTop: 2,
  },
  logoSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#71717A",
    marginTop: -1,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  skipText: {
    color: "#71717A",
    fontSize: 13.5,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  imageContainer: {
    flex: 1,
    width: "100%",
    maxHeight: mascotHeight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 10,
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: 28,
    marginTop: 14,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#18181B",
    textAlign: "center",
    lineHeight: 33,
    letterSpacing: -0.4,
  },
  body: {
    fontSize: 13.5,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 20.5,
    paddingHorizontal: 12,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "android" ? 20 : 12,
    paddingTop: 10,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    marginBottom: 20,
  },
  dot: {
    height: 6.5,
    borderRadius: 3.25,
  },
  actionBtn: {
    height: 54,
    borderRadius: 27,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingHorizontal: 20,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  btnTextWrapper: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtnText: {
    color: "#18181B",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    cursor: "pointer",
  },
  finalBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    cursor: "pointer",
  },
  arrowCircle: {
    position: "absolute",
    right: 8,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
