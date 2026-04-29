import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Animated, Easing, ActivityIndicator, Dimensions, Image
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { useApp, UserProfile, LeaseType, GenderPref, Zone, Landlord, Intent } from "@/context/AppContext";
import { getApiUrl } from "@/lib/query-client";

const MAJORS = [
  "Accountancy", "Aerospace Engineering", "Agricultural & Biological Engineering",
  "Animal Sciences", "Architecture", "Astronomy", "Biochemistry", "Biology",
  "Bioengineering", "Business (Undeclared)", "Chemical Engineering",
  "Chemistry", "Civil Engineering", "Communications", "Computer Engineering",
  "Computer Science", "Computer Science + X", "Crop Sciences",
  "Economics", "Education", "Electrical Engineering",
  "Finance", "Food Science", "Graphic Design",
  "History", "Industrial Engineering", "Information Sciences",
  "Integrative Biology", "Journalism", "Kinesiology",
  "Landscape Architecture", "Linguistics", "Materials Science & Engineering",
  "Mathematics", "Mechanical Engineering", "Molecular & Cellular Biology",
  "Music", "Nuclear Engineering", "Nursing",
  "Philosophy", "Physics", "Political Science",
  "Pre-Medicine", "Psychology", "Social Work",
  "Sociology", "Statistics", "Supply Chain Management",
  "Theatre", "Urban Planning", "Other",
];

const ZONES: { key: Zone; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { key: "campustown", label: "Campustown (Central Campus)", icon: "storefront-outline", desc: "Green St buzz & Main Quad" },
  { key: "north", label: "North Campus (Engineering / Midtown)", icon: "hardware-chip-outline", desc: "Engineering & STEM hub" },
  { key: "south", label: "South Campus (Ikenberry / Seniorland)", icon: "football-outline", desc: "Ikenberry, ARC, Stadium" },
  { key: "urbana", label: "Urbana (Gradland)", icon: "leaf-outline", desc: "Quiet, trees, budget-friendly" },
  { key: "downtown", label: "Downtown Champaign", icon: "business-outline", desc: "Professional & dining scene" },
];

const LANDLORDS: { key: Landlord; label: string; color: string }[] = [
  { key: "jsm", label: "JSM", color: Colors.landlords.jsm },
  { key: "ugroup", label: "UGroup", color: Colors.landlords.ugroup },
  { key: "bailey", label: "Bailey", color: Colors.landlords.bailey },
  { key: "american", label: "American Campus", color: Colors.landlords.american },
  { key: "smile", label: "Smile", color: Colors.landlords.smile },
  { key: "cpm", label: "CPM", color: Colors.landlords.cpm },
  { key: "green_st_realty", label: "Green St Realty", color: Colors.landlords.green_st_realty },
  { key: "other", label: "Private / Other", color: Colors.landlords.other },
];

function RatingSelector({ value, onChange, color }: { value: number; onChange: (v: number) => void; color: string }) {
  return (
    <View style={styles.ratingRow}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity key={n} onPress={() => { Haptics.selectionAsync(); onChange(n); }}
          style={[styles.ratingDot, { backgroundColor: n <= value ? color : Colors.foamDark }]}>
          <Text style={[styles.ratingNum, { color: n <= value ? Colors.white : Colors.textMuted }]}>{n}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const WAVE_COUNT = 22;

function PonyoProgress({ step, total }: { step: number; total: number }) {
  const progress = step / (total - 1);
  const fishPx = useRef(new Animated.Value(0)).current;
  const bobY = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(260);

  const FISH_SIZE = 28;
  const BUCKET_SIZE = 28;

  useEffect(() => {
    const target = progress * Math.max(0, trackWidth - FISH_SIZE);
    Animated.spring(fishPx, {
      toValue: target,
      tension: 55,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [step, trackWidth]);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bobY, {
          toValue: -4, duration: 850,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(bobY, {
          toValue: 4, duration: 850,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const atHome = step === total - 1;

  return (
    <View style={pStyles.wrapper}>
      <View
        style={pStyles.trackContainer}
        onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}>
        <View style={pStyles.waveRow}>
          {Array.from({ length: WAVE_COUNT }, (_, i) => (
            <View key={i} style={[pStyles.waveBump, { marginTop: i % 2 === 0 ? 0 : 6 }]} />
          ))}
        </View>
        <Animated.View style={[pStyles.fishWrap, { transform: [{ translateX: fishPx }] }]}>
          <Animated.View style={{ transform: [{ translateY: bobY }] }}>
            <Ionicons
              name="fish"
              size={FISH_SIZE}
              color={Colors.ponyo}
              style={{ transform: [{ scaleX: -1 }] }}
            />
          </Animated.View>
        </Animated.View>
      </View>
      <View style={[pStyles.bucket, { opacity: atHome ? 1 : 0.32 }]}>
        <View style={[pStyles.bucketInner, { backgroundColor: atHome ? Colors.ponyo + "22" : Colors.teal + "14" }]}>
          <Ionicons name="home" size={18} color={atHome ? Colors.ponyo : Colors.teal} />
        </View>
      </View>
    </View>
  );
}

function OtpDigitInput({ value, onChange, onSubmit }: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.padEnd(6, " ").split("").slice(0, 6);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  return (
    <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()}>
      <View style={otp.row}>
        {digits.map((d, i) => (
          <View key={i} style={[
            otp.box,
            value.length === i && otp.boxActive,
            d.trim() && otp.boxFilled,
          ]}>
            <Text style={otp.digit}>{d.trim()}</Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        style={otp.hidden}
        value={value}
        onChangeText={t => { onChange(t.replace(/\D/g, "").slice(0, 6)); }}
        keyboardType="number-pad"
        maxLength={6}
        onSubmitEditing={onSubmit}
      />
    </TouchableOpacity>
  );
}

const otp = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, justifyContent: "center" },
  box: {
    width: 46, height: 56, borderRadius: 14,
    backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.borderSoft,
    alignItems: "center", justifyContent: "center",
  },
  boxActive: { borderColor: Colors.teal },
  boxFilled: { backgroundColor: Colors.teal + "0E", borderColor: Colors.teal },
  digit: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.charcoal },
  hidden: { position: "absolute", opacity: 0, width: 0, height: 0 },
});

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { setCurrentUser, setIsOnboarded, setOtpVerifiedEmail } = useApp();
  const [step, setStep] = useState(0);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [name, setName] = useState("");
  const [major, setMajor] = useState("");
  const [bio, setBio] = useState("");
  const [budget, setBudget] = useState(800);
  const [gender, setGender] = useState<"female" | "male" | "nonbinary">("female");
  const [genderPref, setGenderPref] = useState<GenderPref>("mixed");
  const [cleanliness, setCleanliness] = useState(3);
  const [noise, setNoise] = useState(3);
  const [leaseType, setLeaseType] = useState<LeaseType>("full_year");
  const [zone, setZone] = useState<Zone>("campustown");
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [staysThanksgiving, setStaysThanksgiving] = useState(false);
  const [staysSpringBreak, setStaysSpringBreak] = useState(false);
  const [showMajorPicker, setShowMajorPicker] = useState(false);
  const [intent, setIntent] = useState<Intent>("joiner");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const isSupplySide = intent === "host" || intent === "sublessor";
  const STEPS = isSupplySide ? 3 : 6;

  const startCountdown = (seconds = 60) => {
    setCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith("@illinois.edu")) {
      setEmailError("Must be a valid UIUC email.");
      return;
    }
    setEmailError("");
    setSendingOtp(true);
    try {
      const url = new URL("/api/auth/send-otp", getApiUrl()).toString();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        setEmailError(data.error || "Failed to send code. Try again.");
      } else {
        setEmail(trimmed);
        setOtpSent(true);
        setOtpCode("");
        setOtpError("");
        startCountdown(60);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      setEmailError("Network error. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setOtpError("Please enter the full 6-digit code.");
      return;
    }
    setVerifyingOtp(true);
    setOtpError("");
    try {
      const url = new URL("/api/auth/verify-otp", getApiUrl()).toString();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode }),
      });
      if (!res.ok) {
        const data = await res.json();
        setOtpError(data.error || "Incorrect code. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        setOtpVerifiedEmail(email);
        if (countdownRef.current) clearInterval(countdownRef.current);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setOtpSent(false);
        setStep(1);
      }
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setProfileImage(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const DISABLED_BG = "#E0E8E9";
  const DISABLED_TEXT = "#8A9FA3";
  const ACTIVE_BG = Colors.ponyo;

  const isStepComplete = (s: number): boolean => {
    switch (s) {
      case 1: return !!intent;
      case 2: return name.trim().length > 0 && !!profileImage && !!major && bio.trim().length > 0;
      case 3: return true;
      case 4: return true;
      case 5: return landlords.length > 0;
      default: return true;
    }
  };

  const isFormComplete = isStepComplete(step);

  const handleNext = () => {
    if (!isFormComplete) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isSupplySide && step === 2) {
      handleFinish();
      return;
    }
    setStep(s => Math.min(s + 1, STEPS - 1));
  };

  const toggleLandlord = (key: Landlord) => {
    setLandlords(prev =>
      prev.includes(key) ? prev.filter(l => l !== key) : [...prev, key]
    );
    Haptics.selectionAsync();
  };

  const handleFinish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const avatarColors = [Colors.tealLight, Colors.ponyo, Colors.grassGreen, "#9B59B6", Colors.yellowDark, Colors.teal];
    const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
    const user: UserProfile = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      name: name.trim(), email: email.toLowerCase().trim(),
      major: major || "Undeclared", bio: bio.trim(),
      budget: isSupplySide ? 0 : budget,
      gender, genderPref: isSupplySide ? "mixed" : genderPref,
      cleanliness: isSupplySide ? 3 : cleanliness,
      noise: isSupplySide ? 3 : noise,
      leaseType: isSupplySide ? "full_year" : leaseType,
      zone: isSupplySide ? "campustown" : zone,
      landlords: isSupplySide ? [] : landlords,
      staysThanksgiving: isSupplySide ? false : staysThanksgiving,
      staysSpringBreak: isSupplySide ? false : staysSpringBreak,
      avatarColor, intent,
      ...(profileImage ? { profileImage } : {}),
    };
    await setCurrentUser(user);
    await setIsOnboarded(true);
    switch (intent) {
      case "host":
        router.replace("/post-sublease?mode=host&gateway=1");
        break;
      case "joiner":
        router.replace("/marketplace?category=roommate_openings");
        break;
      case "co_seeker":
        router.replace("/compatibility-setup");
        break;
      case "sublessor":
        router.replace("/post-sublease?mode=sublessor&gateway=1");
        break;
      case "sublessee": {
        const sublesseeRoutes: Record<string, string> = {
          spring_sublease: "/marketplace?category=semester_takeover&subFilter=Spring (Dec/Jan – May)",
          fall_sublease: "/marketplace?category=semester_takeover&subFilter=Fall (Aug – Dec)",
          full_year: "/marketplace?category=semester_takeover&subFilter=Full Year (Aug – Jul)",
          summer_sublease: "/marketplace?category=summer_only",
        };
        router.replace(sublesseeRoutes[leaseType] || "/marketplace?category=short_term");
        break;
      }
      default:
        router.replace("/(tabs)");
        break;
    }
  };

  const budgetStep = (dir: number) => {
    Haptics.selectionAsync();
    setBudget(b => Math.min(2000, Math.max(400, b + dir * 50)));
  };

  const onbWidth = Dimensions.get("window").width;
  const isDesktopOnb = Platform.OS === "web" && onbWidth >= 1024;
  const contentMaxWidthOnb = isDesktopOnb ? 720 : onbWidth;
  const topPadding = Platform.OS === "web" ? (isDesktopOnb ? 24 : 67) : insets.top;

  if (step === 0 && otpSent) {
    return (
      <KeyboardAvoidingView
        style={[styles.container]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.header, { paddingTop: topPadding + 20 }]}>
          <PonyoProgress step={0} total={STEPS} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail" size={38} color={Colors.teal} />
            </View>
            <Text style={styles.stepTitle}>Check your email</Text>
            <Text style={styles.stepSubtitle}>
              We sent a 6-digit code to{"\n"}
              <Text style={{ fontFamily: "Nunito_700Bold", color: Colors.charcoal }}>{email}</Text>
            </Text>

            <View style={{ marginVertical: 8 }}>
              <OtpDigitInput
                value={otpCode}
                onChange={v => { setOtpCode(v); setOtpError(""); }}
                onSubmit={handleVerifyOtp}
              />
            </View>

            {otpError ? (
              <View style={styles.errorRow}>
                <Ionicons name="warning-outline" size={13} color={Colors.errorRed} />
                <Text style={styles.errorText}>{otpError}</Text>
              </View>
            ) : null}

            <View style={styles.codeInfoBox}>
              <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.codeInfoText}>Code is valid for 10 minutes</Text>
            </View>

            <TouchableOpacity
              style={[styles.verifyBtn, (verifyingOtp || otpCode.length < 6) && { opacity: 0.6 }]}
              onPress={handleVerifyOtp}
              disabled={verifyingOtp || otpCode.length < 6}
            >
              {verifyingOtp ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Text style={styles.verifyBtnText}>Verify Code</Text>
                  <Ionicons name="checkmark" size={18} color={Colors.white} />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.resendRow}>
              <Text style={styles.resendHint}>Didn't receive it? </Text>
              {countdown > 0 ? (
                <Text style={styles.resendCountdown}>Resend in {countdown}s</Text>
              ) : (
                <TouchableOpacity onPress={handleSendOtp}>
                  <Text style={styles.resendLink}>Resend code</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity onPress={() => { setOtpSent(false); setOtpCode(""); setOtpError(""); }}
              style={styles.changeEmailBtn}>
              <Ionicons name="arrow-back" size={14} color={Colors.textMuted} />
              <Text style={styles.changeEmailText}>Change email</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: Colors.foam }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>

      <View style={[styles.header, { paddingTop: topPadding + 20 }]}>
        <PonyoProgress step={step} total={STEPS} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {step === 0 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="school" size={38} color={Colors.teal} />
            </View>
            <Text style={styles.stepTitle}>Welcome to PopMatch</Text>
            <Text style={styles.stepSubtitle}>UIUC's student-first housing matchmaker</Text>

            <Text style={styles.label}>Illinois Email</Text>
            <TextInput style={[styles.input, emailError ? styles.inputError : null]}
              value={email} onChangeText={t => { setEmail(t); setEmailError(""); }}
              placeholder="yournetid@illinois.edu" placeholderTextColor={Colors.textLight}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              returnKeyType="send" onSubmitEditing={handleSendOtp} />
            {emailError ? (
              <View style={styles.errorRow}>
                <Ionicons name="warning-outline" size={13} color={Colors.errorRed} />
                <Text style={styles.errorText}>{emailError}</Text>
              </View>
            ) : null}

            <View style={styles.gateBox}>
              <Ionicons name="shield-checkmark-outline" size={15} color={Colors.grassGreen} />
              <Text style={styles.gateText}>Only @illinois.edu emails accepted — we'll verify with a code</Text>
            </View>

            <TouchableOpacity
              style={[styles.otpSendBtn, sendingOtp && { opacity: 0.7 }]}
              onPress={handleSendOtp}
              disabled={sendingOtp}
            >
              {sendingOtp ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color={Colors.white} />
                  <Text style={styles.otpSendBtnText}>Send Verification Code</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="compass" size={38} color={Colors.teal} />
            </View>
            <Text style={styles.stepTitle}>What's Your Role?</Text>
            <Text style={styles.stepSubtitle}>Tell us how you want to use PopMatch</Text>

            {([
              { key: "host" as Intent, label: "Host", icon: "home-outline" as const, desc: "I have a place and need a roommate" },
              { key: "joiner" as Intent, label: "Joiner", icon: "person-add-outline" as const, desc: "I'm looking for an open room to join" },
              { key: "co_seeker" as Intent, label: "Co-Seeker", icon: "people-outline" as const, desc: "I want to find a place with someone" },
              { key: "sublessor" as Intent, label: "Sublessor", icon: "swap-horizontal-outline" as const, desc: "I need to sublease my current spot" },
              { key: "sublessee" as Intent, label: "Sublessee", icon: "search-outline" as const, desc: "I'm looking for a sublease to pick up" },
            ]).map(({ key, label, icon, desc }) => (
              <TouchableOpacity key={key} style={[styles.optionCard, intent === key && styles.optionCardActive]}
                onPress={() => { setIntent(key); Haptics.selectionAsync(); }}>
                <View style={[styles.zoneIcon, { backgroundColor: Colors.teal + "18" }]}>
                  <Ionicons name={icon} size={18} color={intent === key ? Colors.teal : Colors.charcoal} />
                </View>
                <View style={styles.optionLeft}>
                  <Text style={[styles.optionLabel, intent === key && styles.optionLabelActive]}>{label}</Text>
                  <Text style={styles.optionDesc}>{desc}</Text>
                </View>
                {intent === key && <Ionicons name="checkmark-circle" size={18} color={Colors.teal} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="person" size={38} color={Colors.teal} />
            </View>
            <Text style={styles.stepTitle}>About You</Text>
            <Text style={styles.stepSubtitle}>Help future roommates get to know you</Text>

            <Text style={styles.label}>Profile Picture</Text>
            <TouchableOpacity style={styles.avatarPicker} onPress={pickProfileImage} activeOpacity={0.7}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="camera" size={32} color={Colors.teal} />
                  <Text style={styles.avatarHint}>Tap to add photo</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Your Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName}
              placeholder="Full name" placeholderTextColor={Colors.textLight}
              autoCapitalize="words" returnKeyType="next" />
            {!name.trim() && (
              <Text style={styles.fieldHint}>Required to continue</Text>
            )}

            <Text style={styles.label}>Major</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowMajorPicker(!showMajorPicker)}>
              <Text style={[styles.selectText, { color: major ? Colors.charcoal : Colors.textLight }]}>
                {major || "Select your major"}
              </Text>
              <Ionicons name={showMajorPicker ? "chevron-up" : "chevron-down"} size={15} color={Colors.textMuted} />
            </TouchableOpacity>
            {showMajorPicker && (
              <View style={styles.majorList}>
                {MAJORS.map(m => (
                  <TouchableOpacity key={m} style={[styles.majorItem, major === m && styles.majorSelected]}
                    onPress={() => { setMajor(m); setShowMajorPicker(false); Haptics.selectionAsync(); }}>
                    <Text style={[styles.majorText, major === m && styles.majorTextSelected]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Short Bio</Text>
            <TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio}
              placeholder="Tell future roommates about yourself..."
              placeholderTextColor={Colors.textLight} multiline numberOfLines={3} textAlignVertical="top" />

            <Text style={styles.label}>I identify as</Text>
            <View style={styles.chipRow}>
              {(["female", "male", "nonbinary"] as const).map(g => (
                <TouchableOpacity key={g} style={[styles.chip, gender === g && styles.chipActive]}
                  onPress={() => { setGender(g); Haptics.selectionAsync(); }}>
                  <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>
                    {g === "female" ? "Woman" : g === "male" ? "Man" : "Non-binary"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="home" size={38} color={Colors.teal} />
            </View>
            <Text style={styles.stepTitle}>Housing Preferences</Text>
            <Text style={styles.stepSubtitle}>What kind of living situation do you want?</Text>

            <Text style={styles.label}>Monthly Budget</Text>
            <View style={styles.budgetRow}>
              <TouchableOpacity style={styles.budgetBtn} onPress={() => budgetStep(-1)}>
                <Ionicons name="remove" size={22} color={Colors.charcoal} />
              </TouchableOpacity>
              <View style={styles.budgetDisplay}>
                <Text style={styles.budgetValue}>${budget}</Text>
                <Text style={styles.budgetSub}>per month</Text>
              </View>
              <TouchableOpacity style={styles.budgetBtn} onPress={() => budgetStep(1)}>
                <Ionicons name="add" size={22} color={Colors.charcoal} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Roommate Gender Preference</Text>
            <View style={styles.chipRow}>
              {([
                { k: "girls_only" as GenderPref, l: "Girls Only" },
                { k: "boys_only" as GenderPref, l: "Boys Only" },
                { k: "mixed" as GenderPref, l: "No Preference" }
              ]).map(({ k, l }) => (
                <TouchableOpacity key={k} style={[styles.chip, genderPref === k && styles.chipActive]}
                  onPress={() => { setGenderPref(k); Haptics.selectionAsync(); }}>
                  <Text style={[styles.chipText, genderPref === k && styles.chipTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Lease Type</Text>
            {([
              { k: "full_year" as LeaseType, l: "Full Year", d: "Aug – Jul (12 months)" },
              { k: "fall_sublease" as LeaseType, l: "Fall Sublease", d: "Aug – Dec" },
              { k: "spring_sublease" as LeaseType, l: "Spring Sublease", d: "Jan – May" },
              { k: "summer_sublease" as LeaseType, l: "Summer Sublease", d: "May – Aug" },
            ]).map(({ k, l, d }) => (
              <TouchableOpacity key={k} style={[styles.optionCard, leaseType === k && styles.optionCardActive]}
                onPress={() => { setLeaseType(k); Haptics.selectionAsync(); }}>
                <View style={styles.optionLeft}>
                  <Text style={[styles.optionLabel, leaseType === k && styles.optionLabelActive]}>{l}</Text>
                  <Text style={styles.optionDesc}>{d}</Text>
                </View>
                {leaseType === k && <Ionicons name="checkmark-circle" size={18} color={Colors.teal} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="map" size={38} color={Colors.teal} />
            </View>
            <Text style={styles.stepTitle}>Location & Lifestyle</Text>
            <Text style={styles.stepSubtitle}>Where in Champaign-Urbana do you want to live?</Text>

            {ZONES.map(z => (
              <TouchableOpacity key={z.key} style={[styles.optionCard, zone === z.key && styles.optionCardActive]}
                onPress={() => { setZone(z.key); Haptics.selectionAsync(); }}>
                <View style={[styles.zoneIcon, { backgroundColor: Colors.zones[z.key] + "22" }]}>
                  <Ionicons name={z.icon} size={18} color={Colors.charcoal} />
                </View>
                <View style={styles.optionLeft}>
                  <Text style={[styles.optionLabel, zone === z.key && styles.optionLabelActive]}>{z.label}</Text>
                  <Text style={styles.optionDesc}>{z.desc}</Text>
                </View>
                {zone === z.key && <Ionicons name="checkmark-circle" size={18} color={Colors.teal} />}
              </TouchableOpacity>
            ))}

            <Text style={styles.label}>Cleanliness Level</Text>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabel}>Relaxed</Text>
              <Text style={styles.scaleLabel}>Spotless</Text>
            </View>
            <RatingSelector value={cleanliness} onChange={setCleanliness} color={Colors.grassGreen} />

            <Text style={styles.label}>Noise & Social Level</Text>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabel}>Very Quiet</Text>
              <Text style={styles.scaleLabel}>Party Mode</Text>
            </View>
            <RatingSelector value={noise} onChange={setNoise} color={Colors.teal} />
          </View>
        )}

        {step === 5 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="calendar" size={38} color={Colors.teal} />
            </View>
            <Text style={styles.stepTitle}>Breaks & Landlord</Text>
            <Text style={styles.stepSubtitle}>Helps split utilities & coordinate with roommates</Text>

            <Text style={styles.label}>Break Plans</Text>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>Staying Thanksgiving Break?</Text>
                <Text style={styles.toggleDesc}>Nov 27 – Dec 1</Text>
              </View>
              <TouchableOpacity style={[styles.toggle, staysThanksgiving && styles.toggleOn]}
                onPress={() => { setStaysThanksgiving(!staysThanksgiving); Haptics.selectionAsync(); }}>
                <Text style={[styles.toggleText, staysThanksgiving && styles.toggleTextOn]}>
                  {staysThanksgiving ? "Yes" : "No"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>Staying Spring Break?</Text>
                <Text style={styles.toggleDesc}>Mar 15 – 23</Text>
              </View>
              <TouchableOpacity style={[styles.toggle, staysSpringBreak && styles.toggleOn]}
                onPress={() => { setStaysSpringBreak(!staysSpringBreak); Haptics.selectionAsync(); }}>
                <Text style={[styles.toggleText, staysSpringBreak && styles.toggleTextOn]}>
                  {staysSpringBreak ? "Yes" : "No"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Your Landlord(s)</Text>
            <Text style={styles.fieldHint}>Select all that apply</Text>
            {LANDLORDS.map(l => {
              const isSelected = landlords.includes(l.key);
              return (
                <TouchableOpacity key={l.key} style={[styles.optionCard, isSelected && styles.optionCardActive]}
                  onPress={() => toggleLandlord(l.key)}>
                  <View style={[styles.landlordDot, { backgroundColor: l.color }]} />
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>{l.label}</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color={Colors.teal} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 12 }]}>
        {step > 1 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => { setStep(s => s - 1); Haptics.selectionAsync(); }}>
            <Ionicons name="arrow-back" size={20} color={Colors.charcoal} />
          </TouchableOpacity>
        )}
        {step > 0 && (
          <TouchableOpacity
            style={[
              styles.nextBtn,
              !isFormComplete && { backgroundColor: DISABLED_BG, elevation: 0, shadowOpacity: 0 },
            ]}
            onPress={step === STEPS - 1 || (isSupplySide && step === 2) ? handleFinish : handleNext}
            disabled={!isFormComplete}
          >
            <Text style={[styles.nextBtnText, !isFormComplete && { color: DISABLED_TEXT }]}>
              {isSupplySide && step === 2
                ? intent === "host" ? "Post My Apartment" : "Post My Sublease"
                : step === STEPS - 1
                  ? "Find My Match"
                  : "Continue"}
            </Text>
            <Ionicons
              name={isSupplySide && step === 2 ? "home" : step === STEPS - 1 ? "heart" : "arrow-forward"}
              size={17}
              color={isFormComplete ? Colors.white : DISABLED_TEXT}
            />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const pStyles = StyleSheet.create({
  wrapper: {
    flexDirection: "row", alignItems: "center", gap: 2, paddingBottom: 4,
  },
  trackContainer: {
    flex: 1, height: 48, position: "relative", justifyContent: "center",
  },
  waveRow: {
    flexDirection: "row", alignItems: "center", gap: 4,
    position: "absolute", bottom: 8, left: 0, right: 0,
  },
  waveBump: {
    width: 9, height: 5, borderRadius: 5,
    borderWidth: 1.5, borderColor: Colors.tealLight + "55", backgroundColor: "transparent",
  },
  fishWrap: { position: "absolute", bottom: 12 },
  bucket: { alignItems: "center", justifyContent: "center" },
  bucketInner: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.foam },
  header: { paddingHorizontal: 20, paddingBottom: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 8 },
  stepContainer: { gap: 12 },
  iconCircle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: Colors.teal + "15",
    alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 4,
    borderWidth: 2, borderColor: Colors.teal + "28",
  },
  stepTitle: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 27, color: Colors.teal,
    textAlign: "center", lineHeight: 34,
  },
  stepSubtitle: {
    fontFamily: "Nunito_400Regular", fontSize: 15, color: Colors.textMuted,
    textAlign: "center", marginBottom: 6,
  },
  label: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal, marginTop: 6 },
  input: {
    backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.borderSoft,
    paddingHorizontal: 14, paddingVertical: 13, fontFamily: "Nunito_400Regular",
    fontSize: 15, color: Colors.charcoal, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
  },
  inputError: { borderColor: Colors.errorRed },
  textArea: { height: 90, paddingTop: 13 },
  selectText: { fontFamily: "Nunito_400Regular", fontSize: 15 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  errorText: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.errorRed },
  fieldHint: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textLight },
  gateBox: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: Colors.grassGreen + "18", borderRadius: 12, padding: 11,
  },
  gateText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.grassGreen, flex: 1 },
  otpSendBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.teal, borderRadius: 14, paddingVertical: 16, marginTop: 4,
  },
  otpSendBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.white },
  verifyBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.teal, borderRadius: 14, paddingVertical: 16, marginTop: 8,
  },
  verifyBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.white },
  codeInfoBox: {
    flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 4,
  },
  codeInfoText: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  resendRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 4 },
  resendHint: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
  resendCountdown: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.textLight },
  resendLink: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.teal },
  changeEmailBtn: {
    flexDirection: "row", alignItems: "center", gap: 5, justifyContent: "center", marginTop: 8,
  },
  changeEmailText: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  avatarPicker: { alignSelf: "center", marginVertical: 8 },
  avatarImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: "#D0F0E0" },
  avatarPlaceholder: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: "#D0F0E0",
    alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: Colors.teal + "30",
    borderStyle: "dashed",
  },
  avatarHint: { fontFamily: "Nunito_600SemiBold", fontSize: 11, color: Colors.teal, marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  chipActive: { backgroundColor: Colors.teal, borderColor: Colors.teal },
  chipText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.textMuted },
  chipTextActive: { color: Colors.white },
  budgetRow: { flexDirection: "row", alignItems: "center", gap: 16, justifyContent: "center", marginVertical: 4 },
  budgetBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.white,
    borderWidth: 1.5, borderColor: Colors.borderSoft, alignItems: "center", justifyContent: "center",
  },
  budgetDisplay: { alignItems: "center", minWidth: 110 },
  budgetValue: { fontFamily: "Nunito_800ExtraBold", fontSize: 36, color: Colors.teal },
  budgetSub: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  optionCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 13,
  },
  optionCardActive: { borderColor: Colors.teal, backgroundColor: Colors.teal + "0E" },
  optionLeft: { flex: 1 },
  optionLabel: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  optionLabelActive: { color: Colors.teal },
  optionDesc: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  zoneIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  ratingRow: { flexDirection: "row", gap: 10, justifyContent: "center", marginVertical: 6 },
  ratingDot: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  ratingNum: { fontFamily: "Nunito_800ExtraBold", fontSize: 17 },
  scaleLabels: { flexDirection: "row", justifyContent: "space-between" },
  scaleLabel: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textLight },
  toggleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 14,
  },
  toggleInfo: { flex: 1 },
  toggleTitle: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  toggleDesc: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  toggle: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
    backgroundColor: Colors.foamDark, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  toggleOn: { backgroundColor: Colors.grassGreen, borderColor: Colors.grassGreen },
  toggleText: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.textMuted },
  toggleTextOn: { color: Colors.white },
  landlordDot: { width: 12, height: 12, borderRadius: 6 },
  majorList: {
    backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, overflow: "hidden",
  },
  majorItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.foamDark },
  majorSelected: { backgroundColor: Colors.teal + "14" },
  majorText: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.charcoal },
  majorTextSelected: { fontFamily: "Nunito_700Bold", color: Colors.teal },
  footer: {
    flexDirection: "row", gap: 12, paddingHorizontal: 24, paddingTop: 12,
    backgroundColor: Colors.foam, borderTopWidth: 1, borderTopColor: Colors.borderSoft,
  },
  backBtn: {
    width: 50, height: 54, borderRadius: 15, backgroundColor: Colors.white,
    borderWidth: 1.5, borderColor: Colors.borderSoft, alignItems: "center", justifyContent: "center",
  },
  nextBtn: {
    flex: 1, height: 54, borderRadius: 15, backgroundColor: Colors.ponyo,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  nextBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.white },
});
