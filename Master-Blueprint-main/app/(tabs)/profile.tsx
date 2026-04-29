import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform,
  TextInput, FlatList, Animated, Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { useResponsive } from "@/hooks/useResponsive";
import BottomSheetModal from "@/components/BottomSheetModal";
import CustomAvatar from "@/components/CustomAvatar";
import type { LeaseType, Zone, Landlord, GenderPref, UserProfile } from "@/context/AppContext";

type SheetType = "avatar" | "name" | "bio" | "budget" | "major" | "leaseType" | "zone" | "landlord" | "genderPref" | "gender" | null;

const SEAFOAM = "rgba(208,240,224,1)";
const SEAFOAM_BG = "rgba(208,240,224,0.35)";
const CORAL = "#FF6B4E";

const LEASE_LABELS: Record<string, string> = {
  full_year: "Full Year (Aug – Jul)",
  fall_sublease: "Fall Only (Aug – Dec)",
  spring_sublease: "Spring Only (Jan – May)",
  summer_sublease: "Summer Only (May – Aug)",
};

const GENDER_LABELS: Record<string, string> = {
  girls_only: "Girls Only",
  boys_only: "Boys Only",
  mixed: "No Preference",
};

const ZONE_LABELS: Record<string, string> = {
  campustown: "Campustown (Central Campus)",
  north: "North Campus (Engineering / Midtown)",
  south: "South Campus (Ikenberry / Seniorland)",
  urbana: "Urbana (Gradland)",
  downtown: "Downtown Champaign",
};

const LANDLORD_LABELS: Record<string, string> = {
  jsm: "JSM",
  ugroup: "UGroup",
  bailey: "Bailey",
  american: "American Campus",
  smile: "Smile",
  cpm: "CPM",
  green_st_realty: "Green St Realty",
  other: "Private / Other",
};

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

const AVATAR_COLORS = [
  "#005F73", "#1A9BB5", "#4A8A5A", "#6AAB7A", "#FF6B4E",
  "#FF8570", "#FFD966", "#E8C14E", "#9B59B6", "#E06800",
  "#C62828", "#5A7A82", "#2E86AB", "#A23B72",
];

const GENDER_OPTIONS: { key: "female" | "male" | "nonbinary"; label: string }[] = [
  { key: "female", label: "Woman" },
  { key: "male", label: "Man" },
  { key: "nonbinary", label: "Non-binary" },
];

function OptionRow({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity
      style={[sh.optionRow, selected && { backgroundColor: SEAFOAM_BG }]}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <Text style={[sh.optionText, selected && { color: Colors.ocean, fontFamily: "Nunito_700Bold" }]}>
        {label}
      </Text>
      {selected && <Ionicons name="checkmark-circle" size={20} color={color || Colors.ocean} />}
    </TouchableOpacity>
  );
}

function InfoRow({
  icon,
  label,
  value,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color?: string;
  onPress?: () => void;
}) {
  const inner = (pressed: boolean) => (
    <View style={[styles.infoRow, pressed && { backgroundColor: SEAFOAM_BG }]}>
      <View style={[styles.infoIcon, { backgroundColor: (color || Colors.ocean) + "18" }]}>
        <Ionicons name={icon} size={15} color={color || Colors.ocean} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={14} color={Colors.textLight} />}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${label}`}
      >
        {({ pressed }) => inner(pressed)}
      </Pressable>
    );
  }
  return inner(false);
}

function BreakBadgeRow({
  icon,
  label,
  staying,
  onToggle,
  accessLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  staying: boolean;
  onToggle: () => void;
  accessLabel: string;
}) {
  const animVal = useRef(new Animated.Value(staying ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: staying ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [staying]);

  const badgeBg = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: [CORAL + "20", SEAFOAM],
  });
  const badgeColor = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: [CORAL, Colors.grassGreen],
  });

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityLabel={accessLabel}
      accessibilityState={{ checked: staying }}
    >
      {({ pressed }) => (
        <View style={[styles.breakRow, pressed && { backgroundColor: SEAFOAM_BG }]}>
          <View style={styles.breakLeft}>
            <Ionicons name={icon} size={15} color={staying ? Colors.grassGreen : Colors.textLight} />
            <Text style={styles.breakLabel}>{label}</Text>
          </View>
          <Animated.View style={[styles.breakBadge, { backgroundColor: badgeBg }]}>
            <Animated.Text style={[styles.breakBadgeText, { color: badgeColor }]}>
              {staying ? "Staying" : "Leaving"}
            </Animated.Text>
          </Animated.View>
        </View>
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, matches, likedUserIds, subleases, friends, setCurrentUser, setIsOnboarded } = useApp();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const topPadding = Platform.OS === "web" ? (isDesktop ? 24 : 67) : insets.top;
  const mySubleases = subleases.filter(s => s.userId === currentUser?.id);
  const [versionTaps, setVersionTaps] = useState(0);
  const versionTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sheetType, setSheetType] = useState<SheetType>(null);
  const [editText, setEditText] = useState("");
  const [majorSearch, setMajorSearch] = useState("");
  const [algoModalVisible, setAlgoModalVisible] = useState(false);

  const openSheet = (type: SheetType) => {
    setSheetType(type);
    if (type === "name") setEditText(currentUser?.name || "");
    else if (type === "bio") setEditText(currentUser?.bio || "");
    else if (type === "budget") setEditText(currentUser?.budget?.toString() || "");
    else if (type === "major") setMajorSearch("");
    Haptics.selectionAsync();
  };

  const closeSheet = () => setSheetType(null);

  const updateField = <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => {
    if (!currentUser) return;
    setCurrentUser({ ...currentUser, [field]: value });
    Haptics.selectionAsync();
  };

  const handleVersionTap = () => {
    const next = versionTaps + 1;
    setVersionTaps(next);
    if (versionTapTimer.current) clearTimeout(versionTapTimer.current);
    if (next >= 5) {
      setVersionTaps(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push("/admin");
    } else {
      versionTapTimer.current = setTimeout(() => setVersionTaps(0), 3000);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "You'll need to verify your @illinois.edu email to sign back in.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await AsyncStorage.multiRemove(["@popmatch_user", "@popmatch_onboarded"]);
            await setCurrentUser(null);
            await setIsOnboarded(false);
            router.replace("/onboarding");
          }
        }
      ]
    );
  };

  const handleReset = () => {
    Alert.alert(
      "Reset All Data",
      "This clears your profile, matches, listings, and connections — everything starts fresh.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Everything",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await AsyncStorage.multiRemove([
              "@popmatch_user", "@popmatch_onboarded", "@popmatch_matches",
              "@popmatch_liked", "@popmatch_passed", "@popmatch_scam",
              "@popmatch_subleases", "@popmatch_breaks", "@popmatch_friends"
            ]);
            await setCurrentUser(null);
            await setIsOnboarded(false);
            router.replace("/onboarding");
          }
        }
      ]
    );
  };

  if (!currentUser) {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 16 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.noProfile}>
          <Ionicons name="person-outline" size={40} color={Colors.textLight} />
          <Text style={styles.noProfileText}>No profile found</Text>
        </View>
      </View>
    );
  }

  const initials = currentUser.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const filteredMajors = majorSearch
    ? MAJORS.filter(m => m.toLowerCase().includes(majorSearch.toLowerCase()))
    : MAJORS;

  const renderSheet = () => {
    if (!sheetType) return null;

    if (sheetType === "avatar") {
      return (
        <BottomSheetModal visible title="Avatar Color" onClose={closeSheet}>
          <View style={sh.colorGrid}>
            {AVATAR_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[sh.colorCircle, { backgroundColor: c }, currentUser.avatarColor === c && sh.colorCircleActive]}
                onPress={() => { updateField("avatarColor", c); closeSheet(); }}
              />
            ))}
          </View>
        </BottomSheetModal>
      );
    }

    if (sheetType === "name") {
      return (
        <BottomSheetModal visible title="Edit Name" onClose={closeSheet}>
          <TextInput
            style={sh.textInput}
            value={editText}
            onChangeText={setEditText}
            placeholder="Your name"
            placeholderTextColor={Colors.textLight}
            autoFocus
          />
          <TouchableOpacity
            style={sh.saveBtn}
            onPress={() => { if (editText.trim()) { updateField("name", editText.trim()); closeSheet(); } }}
          >
            <Text style={sh.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </BottomSheetModal>
      );
    }

    if (sheetType === "bio") {
      return (
        <BottomSheetModal visible title="Edit Bio" onClose={closeSheet}>
          <TextInput
            style={[sh.textInput, { height: 80, textAlignVertical: "top" }]}
            value={editText}
            onChangeText={setEditText}
            placeholder="Tell potential roommates about yourself..."
            placeholderTextColor={Colors.textLight}
            multiline
            autoFocus
          />
          <TouchableOpacity
            style={sh.saveBtn}
            onPress={() => { updateField("bio", editText.trim()); closeSheet(); }}
          >
            <Text style={sh.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </BottomSheetModal>
      );
    }

    if (sheetType === "budget") {
      return (
        <BottomSheetModal visible title="Monthly Budget" onClose={closeSheet}>
          <TextInput
            style={sh.textInput}
            value={editText}
            onChangeText={setEditText}
            placeholder="e.g. 800"
            placeholderTextColor={Colors.textLight}
            keyboardType="numeric"
            autoFocus
          />
          <TouchableOpacity
            style={sh.saveBtn}
            onPress={() => {
              const val = parseInt(editText);
              if (!isNaN(val) && val > 0) { updateField("budget", val); closeSheet(); }
            }}
          >
            <Text style={sh.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </BottomSheetModal>
      );
    }

    if (sheetType === "major") {
      return (
        <BottomSheetModal visible title="Select Major" onClose={closeSheet}>
          <TextInput
            style={sh.textInput}
            value={majorSearch}
            onChangeText={setMajorSearch}
            placeholder="Search majors..."
            placeholderTextColor={Colors.textLight}
          />
          <FlatList
            data={filteredMajors}
            keyExtractor={i => i}
            style={{ maxHeight: 260 }}
            renderItem={({ item }) => (
              <OptionRow
                label={item}
                selected={currentUser.major === item}
                onPress={() => { updateField("major", item); closeSheet(); }}
              />
            )}
          />
        </BottomSheetModal>
      );
    }

    if (sheetType === "leaseType") {
      return (
        <BottomSheetModal visible title="Lease Type" onClose={closeSheet}>
          {(Object.entries(LEASE_LABELS) as [LeaseType, string][]).map(([key, label]) => (
            <OptionRow
              key={key}
              label={label}
              selected={currentUser.leaseType === key}
              onPress={() => { updateField("leaseType", key); closeSheet(); }}
            />
          ))}
        </BottomSheetModal>
      );
    }

    if (sheetType === "zone") {
      return (
        <BottomSheetModal visible title="Preferred Zone" onClose={closeSheet}>
          {(Object.entries(ZONE_LABELS) as [Zone, string][]).map(([key, label]) => (
            <OptionRow
              key={key}
              label={label}
              selected={currentUser.zone === key}
              onPress={() => { updateField("zone", key); closeSheet(); }}
              color={Colors.grassGreen}
            />
          ))}
        </BottomSheetModal>
      );
    }

    if (sheetType === "landlord") {
      return (
        <BottomSheetModal visible title="Landlord(s)" onClose={closeSheet}>
          {(Object.entries(LANDLORD_LABELS) as [Landlord, string][]).map(([key, label]) => (
            <OptionRow
              key={key}
              label={label}
              selected={(currentUser.landlords || []).includes(key)}
              onPress={() => {
                const current = currentUser.landlords || [];
                const updated = current.includes(key) ? current.filter(l => l !== key) : [...current, key];
                updateField("landlords", updated);
              }}
              color={Colors.orange}
            />
          ))}
        </BottomSheetModal>
      );
    }

    if (sheetType === "genderPref") {
      return (
        <BottomSheetModal visible title="Roommate Preference" onClose={closeSheet}>
          {(Object.entries(GENDER_LABELS) as [GenderPref, string][]).map(([key, label]) => (
            <OptionRow
              key={key}
              label={label}
              selected={currentUser.genderPref === key}
              onPress={() => { updateField("genderPref", key); closeSheet(); }}
              color={Colors.goldDark}
            />
          ))}
        </BottomSheetModal>
      );
    }

    if (sheetType === "gender") {
      return (
        <BottomSheetModal visible title="Gender Identity" onClose={closeSheet}>
          {GENDER_OPTIONS.map(({ key, label }) => (
            <OptionRow
              key={key}
              label={label}
              selected={currentUser.gender === key}
              onPress={() => { updateField("gender", key); closeSheet(); }}
            />
          ))}
        </BottomSheetModal>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.sand }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Ionicons name="log-out-outline" size={17} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, {
        paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + (isDesktop ? 40 : 90),
        maxWidth: contentMaxWidth,
        alignSelf: "center" as const,
        width: "100%",
      }]} showsVerticalScrollIndicator={false}>

        <View style={styles.profileCard}>
          <Pressable onPress={() => openSheet("avatar")} accessibilityRole="button" accessibilityLabel="Change avatar color">
            {({ pressed }) => (
              <View style={[{ opacity: pressed ? 0.8 : 1 }]}>
                <CustomAvatar
                  name={currentUser.name}
                  avatarColor={currentUser.avatarColor}
                  profileImage={currentUser.profileImage}
                  size={72}
                  fontSize={28}
                />
                <View style={styles.editBadge}>
                  <Ionicons name="color-palette-outline" size={10} color={Colors.white} />
                </View>
              </View>
            )}
          </Pressable>

          <Pressable onPress={() => openSheet("name")} style={styles.editableRow}>
            {({ pressed }) => (
              <View style={[styles.editableRow, pressed && { backgroundColor: SEAFOAM_BG, borderRadius: 8 }]}>
                <Text style={styles.profileName}>{currentUser.name}</Text>
                <Ionicons name="pencil-outline" size={12} color={Colors.textLight} />
              </View>
            )}
          </Pressable>

          <Text style={styles.profileEmail}>{currentUser.email}</Text>

          <Pressable onPress={() => openSheet("major")}>
            {({ pressed }) => (
              <View style={[styles.majorTag, pressed && { backgroundColor: SEAFOAM_BG }]}>
                <Ionicons name="school-outline" size={12} color={Colors.ocean} />
                <Text style={styles.majorTagText}>{currentUser.major || "Add major"}</Text>
                <Ionicons name="chevron-forward" size={11} color={Colors.ocean} />
              </View>
            )}
          </Pressable>

          <Pressable onPress={() => openSheet("bio")} style={{ width: "100%" }}>
            {({ pressed }) => (
              <View style={[pressed && { backgroundColor: SEAFOAM_BG, borderRadius: 8 }]}>
                <Text style={styles.bio}>
                  {currentUser.bio || "Tap to add a bio..."}
                </Text>
                <View style={styles.editHint}>
                  <Ionicons name="pencil-outline" size={10} color={Colors.textLight} />
                </View>
              </View>
            )}
          </Pressable>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{friends.length}</Text>
              <Text style={styles.statLabel}>Circle</Text>
            </View>
            <Pressable style={[styles.statBox, styles.statBoxMid]} onPress={() => openSheet("budget")}>
              {({ pressed }) => (
                <View style={[styles.statBox, styles.statBoxMid, pressed && { backgroundColor: SEAFOAM_BG }]}>
                  <Text style={[styles.statNum, { color: Colors.ocean }]}>${currentUser.budget}</Text>
                  <Text style={styles.statLabel}>Budget/mo</Text>
                  <Ionicons name="pencil-outline" size={9} color={Colors.textLight} style={{ position: "absolute", top: 6, right: 6 }} />
                </View>
              )}
            </Pressable>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{mySubleases.length}</Text>
              <Text style={styles.statLabel}>Listings</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Housing Details</Text>
          <View style={styles.detailCard}>
            <InfoRow icon="calendar-outline" label="Lease Type" value={LEASE_LABELS[currentUser.leaseType]} color={Colors.ocean} onPress={() => openSheet("leaseType")} />
            <View style={styles.divider} />
            <InfoRow icon="location-outline" label="Preferred Zone" value={ZONE_LABELS[currentUser.zone]} color={Colors.grassGreen} onPress={() => openSheet("zone")} />
            <View style={styles.divider} />
            <InfoRow icon="business-outline" label="Landlord" value={(currentUser.landlords || []).map(l => LANDLORD_LABELS[l]).join(", ") || "Not set"} color={Colors.orange} onPress={() => openSheet("landlord")} />
            <View style={styles.divider} />
            <InfoRow icon="people-outline" label="Roommate Pref" value={GENDER_LABELS[currentUser.genderPref]} color={Colors.goldDark} onPress={() => openSheet("genderPref")} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lifestyle</Text>
          <View style={styles.detailCard}>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Cleanliness</Text>
              <View style={styles.dots}>
                {[1,2,3,4,5].map(n => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => updateField("cleanliness", n)}
                    activeOpacity={0.6}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Set cleanliness to ${n}`}
                    accessibilityState={{ selected: n <= currentUser.cleanliness }}
                  >
                    <View style={[styles.dot, {
                      backgroundColor: n <= currentUser.cleanliness ? Colors.grassGreen : Colors.borderSoft,
                      transform: [{ scale: n <= currentUser.cleanliness ? 1 : 0.85 }],
                    }]} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Noise & Social</Text>
              <View style={styles.dots}>
                {[1,2,3,4,5].map(n => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => updateField("noise", n)}
                    activeOpacity={0.6}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Set noise level to ${n}`}
                    accessibilityState={{ selected: n <= currentUser.noise }}
                  >
                    <View style={[styles.dot, {
                      backgroundColor: n <= currentUser.noise ? Colors.ocean : Colors.borderSoft,
                      transform: [{ scale: n <= currentUser.noise ? 1 : 0.85 }],
                    }]} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.divider} />
            <Pressable onPress={() => openSheet("gender")} accessibilityRole="button" accessibilityLabel="Edit gender identity">
              {({ pressed }) => (
                <View style={[styles.ratingRow, pressed && { backgroundColor: SEAFOAM_BG }]}>
                  <Text style={styles.ratingLabel}>I identify as</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.ratingValue}>
                      {currentUser.gender === "female" ? "Woman" : currentUser.gender === "male" ? "Man" : "Non-binary"}
                    </Text>
                    <Ionicons name="chevron-forward" size={12} color={Colors.textLight} />
                  </View>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Break Plans</Text>
          <View style={styles.detailCard}>
            <BreakBadgeRow
              icon="home-outline"
              label="Thanksgiving Break"
              staying={currentUser.staysThanksgiving}
              accessLabel="Thanksgiving Break"
              onToggle={() => {
                updateField("staysThanksgiving", !currentUser.staysThanksgiving);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
            <View style={styles.divider} />
            <BreakBadgeRow
              icon="sunny-outline"
              label="Spring Break"
              staying={currentUser.staysSpringBreak}
              accessLabel="Spring Break"
              onToggle={() => {
                updateField("staysSpringBreak", !currentUser.staysSpringBreak);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How Matching Works</Text>
          <Pressable onPress={() => { setAlgoModalVisible(true); Haptics.selectionAsync(); }}>
            {({ pressed }) => (
              <View style={[styles.algoCard, pressed && { backgroundColor: SEAFOAM_BG }]}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={styles.algoDesc}>Weighted Euclidean Distance formula</Text>
                  <Ionicons name="information-circle-outline" size={18} color={Colors.ocean} />
                </View>
                {[
                  { label: "Budget compatibility", weight: "35%", color: Colors.ocean },
                  { label: "Cleanliness match", weight: "25%", color: Colors.grassGreen },
                  { label: "Noise & social level", weight: "20%", color: Colors.orange },
                  { label: "Zone proximity", weight: "20%", color: Colors.goldDark },
                ].map(({ label, weight, color }) => (
                  <View key={label} style={styles.algoRow}>
                    <View style={[styles.algoDot, { backgroundColor: color }]} />
                    <Text style={styles.algoLabel}>{label}</Text>
                    <Text style={[styles.algoWeight, { color }]}>{weight}</Text>
                  </View>
                ))}
              </View>
            )}
          </Pressable>
        </View>

        <TouchableOpacity style={styles.signOutFullBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={15} color={Colors.ocean} />
          <Text style={styles.signOutFullBtnText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetFullBtn} onPress={handleReset}>
          <Ionicons name="trash-outline" size={15} color={Colors.errorRed} />
          <Text style={styles.resetFullBtnText}>Reset All Data</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleVersionTap} activeOpacity={1} style={styles.versionLabel}>
          <Text style={styles.versionText}>
            PopMatch v1.0.0{versionTaps > 0 ? ` (${5 - versionTaps} more)` : ""}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {renderSheet()}

      <BottomSheetModal visible={algoModalVisible} title="How PopMatch Finds Your Roommate" onClose={() => setAlgoModalVisible(false)} maxHeight="85%">
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={sh.algoModalBody}>
            We use a Weighted Euclidean Distance formula to calculate how compatible two students are. Think of it like measuring "distance" between your preferences — the closer you are, the better the match!
          </Text>
          <View style={sh.algoModalSection}>
            <Text style={sh.algoModalSubtitle}>Weight Breakdown</Text>
            {[
              { label: "Budget", pct: "35%", desc: "Financial compatibility is the biggest factor — you need to agree on rent.", color: Colors.ocean },
              { label: "Cleanliness", pct: "25%", desc: "Living with someone at a similar tidiness level avoids daily friction.", color: Colors.grassGreen },
              { label: "Noise & Social", pct: "20%", desc: "Night owl vs. early bird? Party vs. quiet? This matters.", color: Colors.orange },
              { label: "Zone", pct: "20%", desc: "Preferring the same neighborhood makes apartment hunting easier.", color: Colors.goldDark },
            ].map(({ label, pct, desc, color }) => (
              <View key={label} style={sh.algoModalRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={[sh.algoModalDot, { backgroundColor: color }]} />
                  <Text style={sh.algoModalLabel}>{label}</Text>
                  <Text style={[sh.algoModalPct, { color }]}>{pct}</Text>
                </View>
                <Text style={sh.algoModalDesc}>{desc}</Text>
              </View>
            ))}
          </View>
          <Text style={sh.algoModalFooter}>
            Lower distance = higher compatibility. A 95%+ match means you and your potential roommate are really in sync!
          </Text>
        </ScrollView>
        <TouchableOpacity style={sh.saveBtn} onPress={() => setAlgoModalVisible(false)}>
          <Text style={sh.saveBtnText}>Got It</Text>
        </TouchableOpacity>
      </BottomSheetModal>
    </View>
  );
}

const sh = StyleSheet.create({
  optionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 13, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4,
  },
  optionText: {
    fontFamily: "Nunito_600SemiBold", fontSize: 15, color: Colors.charcoal,
  },
  textInput: {
    fontFamily: "Nunito_400Regular", fontSize: 15, color: Colors.charcoal,
    backgroundColor: Colors.sandDark, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 14, marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: Colors.ocean, borderRadius: 12, paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: {
    fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.white,
  },
  colorGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", paddingVertical: 8,
  },
  colorCircle: {
    width: 44, height: 44, borderRadius: 22,
  },
  colorCircleActive: {
    borderWidth: 3, borderColor: Colors.charcoal,
  },
  algoModalBody: {
    fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textMuted, lineHeight: 21, marginBottom: 16,
  },
  algoModalSection: { gap: 12, marginBottom: 16 },
  algoModalSubtitle: {
    fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.charcoal,
  },
  algoModalRow: { gap: 3 },
  algoModalDot: { width: 10, height: 10, borderRadius: 5 },
  algoModalLabel: {
    fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.charcoal, flex: 1,
  },
  algoModalPct: { fontFamily: "Nunito_700Bold", fontSize: 14 },
  algoModalDesc: {
    fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted, lineHeight: 17, paddingLeft: 18,
  },
  algoModalFooter: {
    fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, lineHeight: 19,
    fontStyle: "italic", marginBottom: 16,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.sand },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 28, color: Colors.ocean },
  signOutBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.cardBg,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.borderSoft,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  profileCard: {
    backgroundColor: Colors.cardBg, borderRadius: 20, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 20, alignItems: "center", gap: 8,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontFamily: "Nunito_800ExtraBold", fontSize: 28, color: Colors.white },
  editBadge: {
    position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.charcoal, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: Colors.white,
  },
  editableRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  profileName: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.charcoal },
  profileEmail: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
  majorTag: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.ocean + "18", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  majorTagText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.ocean },
  bio: {
    fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted,
    textAlign: "center", lineHeight: 19,
  },
  editHint: {
    position: "absolute", right: 0, top: 0,
  },
  statsRow: { flexDirection: "row", width: "100%", gap: 8, marginTop: 4 },
  statBox: { flex: 1, backgroundColor: Colors.sandDark, borderRadius: 12, padding: 12, alignItems: "center", gap: 2 },
  statBoxMid: { backgroundColor: Colors.ocean + "15" },
  statNum: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: Colors.charcoal },
  statLabel: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted },
  section: { gap: 8 },
  sectionTitle: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.charcoal, paddingHorizontal: 2 },
  detailCard: { backgroundColor: Colors.cardBg, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.borderSoft, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  infoIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoContent: { flex: 1 },
  infoLabel: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted },
  infoValue: { fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.charcoal },
  divider: { height: 1, backgroundColor: Colors.sandDark, marginLeft: 60 },
  ratingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  ratingLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.charcoal },
  ratingValue: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.textMuted },
  dots: { flexDirection: "row", gap: 5 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  breakRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  breakLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  breakLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.charcoal },
  breakBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  breakBadgeText: { fontFamily: "Nunito_700Bold", fontSize: 12 },
  algoCard: { backgroundColor: Colors.cardBg, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.borderSoft, padding: 16, gap: 10 },
  algoDesc: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted, lineHeight: 18, flex: 1 },
  algoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  algoDot: { width: 9, height: 9, borderRadius: 5 },
  algoLabel: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.charcoal, flex: 1 },
  algoWeight: { fontFamily: "Nunito_700Bold", fontSize: 13 },
  signOutFullBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.ocean + "12", borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.ocean + "30", paddingVertical: 13,
  },
  signOutFullBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.ocean },
  resetFullBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.errorRed + "10", borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.errorRed + "30", paddingVertical: 13,
  },
  resetFullBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.errorRed },
  noProfile: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  noProfileText: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textMuted },
  versionLabel: { alignItems: "center", paddingVertical: 12 },
  versionText: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textLight },
});
