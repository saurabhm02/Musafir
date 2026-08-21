import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path } from "react-native-svg";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import type { RootStackParamList } from "../navigation";
import { ensureSession, signIn, signUp } from "../lib/supabase";

const { width } = Dimensions.get("window");

const AUTH_MASCOTS = {
  signup: "https://gomusafir.s3.us-east-1.amazonaws.com/mascot/fe-assets/musa-auth.png",
  login: "https://gomusafir.s3.us-east-1.amazonaws.com/mascot/musa-auth-signup.png",
};

// SVG Icons
function PawIcon({ size = 19 }: { size?: number }) {
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

function ArrowBackIcon({ color = "#18181B", size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M5 12L12 19M5 12L12 5"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UserIcon({ color = "#9CA3AF", size = 19 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MailIcon({ color = "#9CA3AF", size = 19 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 6L12 13L2 6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LockIcon({ color = "#9CA3AF", size = 19 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function EyeIcon({ color = "#9CA3AF", size = 20, visible = false }: { color?: string; size?: number; visible?: boolean }) {
  if (visible) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12A18.45 18.45 0 0 1 5.06 6.06L17.94 17.94Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.9 4.24A9.12 9.12 0 0 1 12 4C19 4 23 12 23 12A18.5 18.5 0 0 1 19.82 16.14L9.9 4.24Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M1 1L23 23" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function GoogleIcon({ size = 19 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </Svg>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "Auth">;
type Mode = "signup" | "signin";

export function AuthScreen({ navigation }: Props) {
  const [mode, setMode] = useState<Mode>("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const btnScale = useSharedValue(1);

  async function onSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Please enter your email and password");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUp(email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
      navigation.replace("Dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function onGuest() {
    setLoading(true);
    try {
      await ensureSession();
      navigation.replace("Dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleAuth() {
    Alert.alert("Google Sign In", "Google authentication will connect with your Supabase auth provider.", [
      { text: "Continue as Guest", onPress: onGuest },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function handleForgotPassword() {
    Alert.alert("Forgot Password", "Please enter your email to receive a password reset link.", [
      { text: "Send Reset Link", onPress: () => Alert.alert("Reset Link Sent", "Check your email for reset instructions.") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function toggleMode() {
    setError(null);
    setMode((prev) => (prev === "signup" ? "signin" : "signup"));
  }

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Onboarding");
    }
  }

  const btnAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const isSignup = mode === "signup";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAF8" />

      {/* Top Header Navigation */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <ArrowBackIcon color="#18181B" size={22} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={onGuest}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Brand & Prominent Mascot Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroLeft}>
              {/* Brand Header */}
              <View style={styles.brandRow}>
                <Text style={styles.brandTitle}>Musa</Text>
                <View style={styles.pawBadge}>
                  <PawIcon size={20} />
                </View>
              </View>

              {/* Dynamic Title */}
              <Text style={styles.headline}>
                {isSignup ? "Create your\naccount" : "Welcome\nback!"}
              </Text>

              {/* Subtitle */}
              <Text style={styles.subheadline}>
                Travel more. Share more.{"\n"}Remember forever.
              </Text>
            </View>

            {/* Large Mascot Illustration with Scenic Backdrop */}
            <View style={styles.heroRight}>
              <Animated.View
                key={mode}
                entering={FadeIn.duration(280)}
                exiting={FadeOut.duration(200)}
                style={styles.mascotWrapper}
              >
                <Image
                  source={{ uri: isSignup ? AUTH_MASCOTS.signup : AUTH_MASCOTS.login }}
                  style={styles.mascotImage}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.formContainer}>
            {/* Full Name Input (Signup only) */}
            {isSignup && (
              <View style={styles.inputWrapper}>
                <View style={styles.inputIcon}>
                  <UserIcon color="#9CA3AF" size={19} />
                </View>
                <TextInput
                  style={styles.inputField}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Full name"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* Email Input */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <MailIcon color="#9CA3AF" size={19} />
              </View>
              <TextInput
                style={styles.inputField}
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <LockIcon color="#9CA3AF" size={19} />
              </View>
              <TextInput
                style={styles.inputField}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <EyeIcon color="#9CA3AF" size={20} visible={showPassword} />
              </TouchableOpacity>
            </View>

            {/* Forgot Password Link (Signin only) */}
            {!isSignup && (
              <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {/* Error message */}
            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Main Action Button */}
            <TouchableOpacity
              onPress={onSubmit}
              onPressIn={() => (btnScale.value = withSpring(0.96, { damping: 15, stiffness: 350 }))}
              onPressOut={() => (btnScale.value = withSpring(1, { damping: 12, stiffness: 300 }))}
              disabled={loading}
              activeOpacity={0.88}
              style={styles.btnTouch}
            >
              <Animated.View style={[styles.mainBtn, btnAnimatedStyle]}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.mainBtnText}>{isSignup ? "Sign up" : "Log in"}</Text>
                )}
              </Animated.View>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Continue with Google */}
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={handleGoogleAuth}
              activeOpacity={0.8}
            >
              <GoogleIcon size={19} />
              <Text style={styles.socialBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Continue with Email / Guest */}
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={onGuest}
              activeOpacity={0.8}
            >
              <MailIcon color="#4B5563" size={18} />
              <Text style={styles.socialBtnText}>Continue with Email</Text>
            </TouchableOpacity>

            {/* Footer Mode Switcher */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>
                {isSignup ? "Already have an account? " : "Don't have an account? "}
              </Text>
              <TouchableOpacity onPress={toggleMode} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
                <Text style={styles.footerLink}>
                  {isSignup ? "Log in" : "Sign up"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAF8",
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 14 : 8,
    paddingBottom: 4,
    minHeight: 48,
    zIndex: 10,
  },
  backBtn: {
    padding: 6,
    borderRadius: 12,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  skipText: {
    color: "#71717A",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 36,
  },
  heroSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 18,
    minHeight: 175,
  },
  heroLeft: {
    width: "48%",
    paddingRight: 4,
    justifyContent: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  brandTitle: {
    fontSize: 27,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.6,
  },
  pawBadge: {
    marginLeft: 2,
    marginTop: 1,
  },
  headline: {
    fontSize: 23,
    fontWeight: "800",
    color: "#18181B",
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  subheadline: {
    fontSize: 12.5,
    color: "#71717A",
    lineHeight: 18,
    marginTop: 8,
    fontWeight: "500",
  },
  heroRight: {
    width: "52%",
    height: 180,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  mascotWrapper: {
    width: "100%",
    height: "100%",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  mascotImage: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.08 }],
  },
  formContainer: {
    marginTop: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 13,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputField: {
    flex: 1,
    fontSize: 14.5,
    color: "#18181B",
    paddingVertical: 0,
    fontWeight: "500",
  },
  eyeBtn: {
    padding: 6,
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginTop: -2,
    marginBottom: 16,
    paddingVertical: 4,
  },
  forgotText: {
    color: "#EA6C1E",
    fontSize: 13,
    fontWeight: "600",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12.5,
    marginBottom: 10,
    marginLeft: 2,
    fontWeight: "500",
  },
  btnTouch: {
    marginTop: 2,
  },
  mainBtn: {
    backgroundColor: "#18181B",
    borderRadius: 16,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },
  mainBtnText: {
    color: "#FFFFFF",
    fontSize: 15.5,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    marginHorizontal: 14,
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "500",
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    height: 52,
    marginBottom: 12,
    gap: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  socialBtnText: {
    color: "#18181B",
    fontSize: 14.5,
    fontWeight: "600",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: {
    color: "#71717A",
    fontSize: 13.5,
    fontWeight: "500",
  },
  footerLink: {
    color: "#EA6C1E",
    fontSize: 13.5,
    fontWeight: "700",
  },
});
