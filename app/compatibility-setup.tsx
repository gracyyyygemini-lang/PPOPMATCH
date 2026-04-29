import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Platform, TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import {
  useApp, StarSign, MBTI, CollegeYear, GreekLife, VibeProfile,
} from "@/context/AppContext";
import { useResponsive } from "@/hooks/useResponsive";

const DARK_TEAL = "#2C555C";
const SUBTITLE_GREY = "#6B8A8F";
const SCREEN_BG = "#FBFBF9";
const SEAFOAM = "#D0F0E0";
const CHIP_BORDER = "#E0E8E9";

const STAR_SIGNS: { key: StarSign; emoji: string; label: string }[] = [
  { key: "aries", emoji: "♈️", label: "Aries" },
  { key: "taurus", emoji: "♉️", label: "Taurus" },
  { key: "gemini", emoji: "♊️", label: "Gemini" },
  { key: "cancer", emoji: "♋️", label: "Cancer" },
  { key: "leo", emoji: "♌️", label: "Leo" },
  { key: "virgo", emoji: "♍️", label: "Virgo" },
  { key: "libra", emoji: "♎️", label: "Libra" },
  { key: "scorpio", emoji: "♏️", label: "Scorpio" },
  { key: "sagittarius", emoji: "♐️", label: "Sagittarius" },
  { key: "capricorn", emoji: "♑️", label: "Capricorn" },
  { key: "aquarius", emoji: "♒️", label: "Aquarius" },
  { key: "pisces", emoji: "♓️", label: "Pisces" },
];

const MBTI_TYPES: MBTI[] = [
  "INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP", "idk",
];

const YEAR_OPTIONS: { key: CollegeYear; label: string }[] = [
  { key: "freshman", label: "Freshman" },
  { key: "sophomore", label: "Sophomore" },
  { key: "junior", label: "Junior" },
  { key: "senior", label: "Senior" },
  { key: "grad_phd", label: "Grad / PhD" },
];

const GREEK_OPTIONS: { key: GreekLife; label: string }[] = [
  { key: "independent", label: "Independent" },
  { key: "sorority", label: "Sorority" },
  { key: "fraternity", label: "Fraternity" },
  { key: "prof_frat", label: "Prof. Frat" },
];

const VICE_CHIPS = ["🚭 No Smoking", "🍻 Social Drinker", "🌿 420 Friendly"];
const PET_CHIPS = ["🚫 No Pets", "🐶 Bringing a Dog", "🐱 Bringing a Cat", "🤧 Allergic"];
const SLEEP_CHIPS = ["Early Bird 🌅", "Standard", "Vampire 🦇"];
const ALARM_CHIPS = ["1st Ring Waker", "Snooze Menace ⏰"];
const CLEAN_CHIPS = ["Neat Freak ✨", "Lived-In 🧺", "Disaster Zone 🌪️"];
const GROCERY_CHIPS = ["Share Everything 🍕", "Share Basics 🥚", "Strictly Separate 🛑"];
const GUEST_CHIPS = ["Always Hosting 🕺", "Weekends Only 🍻", "Text Me First 📱"];

const PROMPTS = [
  "A roommate is immediately disqualified if...",
  "You can bribe me to take out the trash with...",
  "My toxic living habit is...",
  "On a Thursday night, you can find me...",
];

function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionTitle}>{title}</Text>;
}

function ChipRow({
  chips,
  selected,
  onSelect,
  multiSelect = false,
}: {
  chips: string[];
  selected: string | string[];
  onSelect: (chip: string) => void;
  multiSelect?: boolean;
}) {
  const selectedArr = Array.isArray(selected) ? selected : [selected];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipScroll}>
      {chips.map(chip => {
        const isActive = selectedArr.includes(chip);
        return (
          <Pressable key={chip} onPress={() => { onSelect(chip); Haptics.selectionAsync(); }}>
            {({ pressed }) => (
              <View style={[s.chip, isActive && s.chipActive, pressed && !isActive && { backgroundColor: "#F2F7F7" }]}>
                {isActive && multiSelect && <Ionicons name="checkmark" size={14} color={DARK_TEAL} style={{ marginRight: 2 }} />}
                <Text style={[s.chipText, isActive && s.chipTextActive]}>{chip}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function DropdownSelect<T extends string>({
  options,
  selected,
  onSelect,
  placeholder,
  renderLabel,
}: {
  options: T[];
  selected: T | undefined;
  onSelect: (v: T) => void;
  placeholder: string;
  renderLabel?: (v: T) => string;
}) {
  const [open, setOpen] = useState(false);
  const label = renderLabel || ((v: T) => v);
  return (
    <View>
      <TouchableOpacity style={s.dropdown} onPress={() => setOpen(!open)}>
        <Text style={[s.dropdownText, !selected && { color: SUBTITLE_GREY }]}>
          {selected ? label(selected) : placeholder}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={15} color={SUBTITLE_GREY} />
      </TouchableOpacity>
      {open && (
        <View style={s.dropdownList}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[s.dropdownItem, selected === opt && s.dropdownItemActive]}
              onPress={() => { onSelect(opt); setOpen(false); Haptics.selectionAsync(); }}
            >
              <Text style={[s.dropdownItemText, selected === opt && { color: Colors.teal, fontFamily: "Nunito_700Bold" }]}>
                {label(opt)}
              </Text>
              {selected === opt && <Ionicons name="checkmark-circle" size={16} color={Colors.teal} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function CompatibilitySetupScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, setCurrentUser } = useApp();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const topPadding = Platform.OS === "web" ? (isDesktop ? 24 : 67) : insets.top;

  const [identity, setIdentity] = useState<"girl" | "guy" | "nonbinary">(
    currentUser?.gender === "female" ? "girl" : currentUser?.gender === "male" ? "guy" : "nonbinary"
  );
  const [lookingFor, setLookingFor] = useState<"girls" | "guys" | "coed">("coed");
  const [starSign, setStarSign] = useState<StarSign | undefined>(undefined);
  const [mbti, setMbti] = useState<MBTI | undefined>(undefined);
  const [year, setYear] = useState<CollegeYear | undefined>(undefined);
  const [greekLife, setGreekLife] = useState<GreekLife | undefined>("independent");

  const [vices, setVices] = useState<string[]>([]);
  const [pets, setPets] = useState<string[]>([]);
  const [sleep, setSleep] = useState<string>("");
  const [alarms, setAlarms] = useState<string>("");
  const [cleanVibe, setCleanVibe] = useState<string>("");
  const [groceries, setGroceries] = useState<string>("");
  const [guests, setGuests] = useState<string>("");

  const [selectedPrompt, setSelectedPrompt] = useState<string>("");
  const [promptAnswer, setPromptAnswer] = useState("");
  const [showPromptPicker, setShowPromptPicker] = useState(false);

  const DISABLED_BG = "#E0E8E9";
  const DISABLED_TEXT = "#8A9FA3";

  const isFormComplete =
    !!starSign &&
    !!mbti &&
    !!year &&
    vices.length > 0 &&
    pets.length > 0 &&
    sleep.length > 0 &&
    alarms.length > 0 &&
    cleanVibe.length > 0 &&
    groceries.length > 0 &&
    guests.length > 0 &&
    selectedPrompt.length > 0 &&
    promptAnswer.trim().length > 0;

  const toggleMulti = (arr: string[], setArr: (v: string[]) => void, chip: string) => {
    setArr(arr.includes(chip) ? arr.filter(c => c !== chip) : [...arr, chip]);
  };

  const handleFinish = async () => {
    if (!currentUser || !isFormComplete) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const vibeProfile: VibeProfile = {
      identity, lookingFor, starSign, mbti, year, greekLife,
      vices, pets, sleep: sleep || undefined, alarms: alarms || undefined,
      cleanlinessVibe: cleanVibe || undefined, groceries: groceries || undefined,
      guests: guests || undefined,
      prompt: selectedPrompt || undefined,
      promptAnswer: promptAnswer.trim() || undefined,
    };
    await setCurrentUser({ ...currentUser, vibeProfile });
    router.replace("/matchmaker");
  };

  return (
    <View style={[s.container, { backgroundColor: SCREEN_BG }]}>
      <View style={[s.header, { paddingTop: topPadding + 8 }, isDesktop && { maxWidth: contentMaxWidth, alignSelf: "center" as const, width: "100%" }]}>
        <View style={s.headerTextWrap}>
          <Text style={s.headerTitle}>Build Your Vibe</Text>
          <Text style={s.headerSub}>Let's find your perfect UIUC housemate.</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.scrollContent, {
          maxWidth: isDesktop ? 640 : contentMaxWidth,
          alignSelf: "center" as const, width: "100%",
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
        }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SectionHeader title="The Vitals" />

        <Text style={s.label}>My Identity</Text>
        <View style={s.chipRowWrap}>
          {(["girl", "guy", "nonbinary"] as const).map(opt => (
            <TouchableOpacity key={opt} style={[s.vitalsChip, identity === opt && s.vitalsChipActive]}
              onPress={() => { setIdentity(opt); Haptics.selectionAsync(); }}>
              <Text style={[s.vitalsChipText, identity === opt && s.vitalsChipTextActive]}>
                {opt === "nonbinary" ? "Non-binary" : opt === "girl" ? "Girl" : "Guy"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Looking For</Text>
        <View style={s.chipRowWrap}>
          {([
            { k: "girls" as const, l: "Girls" },
            { k: "guys" as const, l: "Guys" },
            { k: "coed" as const, l: "Co-ed / Any" },
          ]).map(({ k, l }) => (
            <TouchableOpacity key={k} style={[s.vitalsChip, lookingFor === k && s.vitalsChipActive]}
              onPress={() => { setLookingFor(k); Haptics.selectionAsync(); }}>
              <Text style={[s.vitalsChipText, lookingFor === k && s.vitalsChipTextActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Star Sign</Text>
        <DropdownSelect
          options={STAR_SIGNS.map(ss => ss.key)}
          selected={starSign}
          onSelect={setStarSign}
          placeholder="Select your sign..."
          renderLabel={(k) => {
            const found = STAR_SIGNS.find(ss => ss.key === k);
            return found ? `${found.emoji} ${found.label}` : k;
          }}
        />

        <Text style={s.label}>MBTI</Text>
        <DropdownSelect
          options={MBTI_TYPES}
          selected={mbti}
          onSelect={setMbti}
          placeholder="Select your type..."
          renderLabel={(k) => k === "idk" ? "I don't know" : k}
        />

        <Text style={s.label}>Year</Text>
        <View style={s.chipRowWrap}>
          {YEAR_OPTIONS.map(({ key, label }) => (
            <TouchableOpacity key={key} style={[s.vitalsChip, year === key && s.vitalsChipActive]}
              onPress={() => { setYear(key); Haptics.selectionAsync(); }}>
              <Text style={[s.vitalsChipText, year === key && s.vitalsChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Greek Life</Text>
        <View style={s.chipRowWrap}>
          {GREEK_OPTIONS.map(({ key, label }) => (
            <TouchableOpacity key={key} style={[s.vitalsChip, greekLife === key && s.vitalsChipActive]}
              onPress={() => { setGreekLife(key); Haptics.selectionAsync(); }}>
              <Text style={[s.vitalsChipText, greekLife === key && s.vitalsChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.divider} />
        <SectionHeader title="Dealbreakers & Habits" />

        <Text style={s.label}>Vices</Text>
        <ChipRow chips={VICE_CHIPS} selected={vices} onSelect={(c) => toggleMulti(vices, setVices, c)} multiSelect />

        <Text style={s.label}>Pets</Text>
        <ChipRow chips={PET_CHIPS} selected={pets} onSelect={(c) => toggleMulti(pets, setPets, c)} multiSelect />

        <Text style={s.label}>Sleep Schedule</Text>
        <ChipRow chips={SLEEP_CHIPS} selected={sleep} onSelect={setSleep} />

        <Text style={s.label}>Alarms</Text>
        <ChipRow chips={ALARM_CHIPS} selected={alarms} onSelect={setAlarms} />

        <Text style={s.label}>Cleanliness</Text>
        <ChipRow chips={CLEAN_CHIPS} selected={cleanVibe} onSelect={setCleanVibe} />

        <Text style={s.label}>Groceries</Text>
        <ChipRow chips={GROCERY_CHIPS} selected={groceries} onSelect={setGroceries} />

        <Text style={s.label}>Guests</Text>
        <ChipRow chips={GUEST_CHIPS} selected={guests} onSelect={setGuests} />

        <View style={s.divider} />
        <SectionHeader title="Icebreaker Prompt" />

        {!selectedPrompt ? (
          <TouchableOpacity style={s.promptPickerBtn} onPress={() => setShowPromptPicker(true)}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.teal} />
            <Text style={s.promptPickerBtnText}>Select a Prompt</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.promptCard}>
            <TouchableOpacity style={s.promptChangeBtn} onPress={() => setShowPromptPicker(true)}>
              <Text style={s.promptChangeText}>Change</Text>
            </TouchableOpacity>
            <Text style={s.promptQuestion}>{selectedPrompt}</Text>
            <TextInput
              style={s.promptInput}
              placeholder="Your answer..."
              placeholderTextColor={SUBTITLE_GREY}
              value={promptAnswer}
              onChangeText={setPromptAnswer}
              multiline
              maxLength={200}
            />
          </View>
        )}

        {showPromptPicker && (
          <View style={s.promptList}>
            {PROMPTS.map(p => (
              <TouchableOpacity key={p} style={s.promptOption}
                onPress={() => { setSelectedPrompt(p); setShowPromptPicker(false); Haptics.selectionAsync(); }}>
                <Text style={s.promptOptionText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[s.footer, {
        paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 12,
        maxWidth: isDesktop ? 640 : contentMaxWidth,
        alignSelf: "center" as const, width: "100%",
      }]}>
        <TouchableOpacity
          style={[s.finishBtn, !isFormComplete && { backgroundColor: DISABLED_BG, elevation: 0, shadowOpacity: 0 }]}
          onPress={handleFinish}
          disabled={!isFormComplete}
        >
          <Text style={[s.finishBtnText, !isFormComplete && { color: DISABLED_TEXT }]}>
            Generate My Profile ✨
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTextWrap: {},
  headerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 28, color: DARK_TEAL },
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 14, color: SUBTITLE_GREY, marginTop: 2 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, gap: 6 },
  sectionTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: DARK_TEAL, marginTop: 8, marginBottom: 2 },
  label: { fontFamily: "Nunito_700Bold", fontSize: 13, color: SUBTITLE_GREY, marginTop: 8 },
  chipRowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  vitalsChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: CHIP_BORDER,
  },
  vitalsChipActive: { backgroundColor: Colors.teal, borderColor: Colors.teal },
  vitalsChipText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: DARK_TEAL },
  vitalsChipTextActive: { color: Colors.white },
  chipScroll: { gap: 8, paddingVertical: 4 },
  chip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: CHIP_BORDER,
  },
  chipActive: { backgroundColor: SEAFOAM, borderColor: SEAFOAM },
  chipText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: DARK_TEAL },
  chipTextActive: { fontFamily: "Nunito_700Bold" },
  dropdown: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1.5, borderColor: CHIP_BORDER,
    paddingHorizontal: 14, paddingVertical: 13, marginTop: 4,
  },
  dropdownText: { fontFamily: "Nunito_400Regular", fontSize: 14, color: DARK_TEAL },
  dropdownList: {
    backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1.5, borderColor: CHIP_BORDER,
    marginTop: 4, overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: "#F0F5F5",
  },
  dropdownItemActive: { backgroundColor: Colors.teal + "0E" },
  dropdownItemText: { fontFamily: "Nunito_400Regular", fontSize: 14, color: DARK_TEAL },
  divider: { height: 1, backgroundColor: CHIP_BORDER, marginVertical: 12 },
  promptPickerBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1.5, borderColor: CHIP_BORDER,
    paddingVertical: 16, marginTop: 4,
  },
  promptPickerBtnText: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.teal },
  promptCard: {
    backgroundColor: SEAFOAM, borderRadius: 16, padding: 16, marginTop: 4, gap: 8,
  },
  promptChangeBtn: { alignSelf: "flex-end" },
  promptChangeText: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.teal },
  promptQuestion: { fontFamily: "Nunito_700Bold", fontSize: 14, color: DARK_TEAL },
  promptInput: {
    fontFamily: "Nunito_400Regular", fontSize: 14, color: DARK_TEAL,
    backgroundColor: Colors.white, borderRadius: 12, padding: 12, minHeight: 70,
    textAlignVertical: "top",
  },
  promptList: {
    backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1.5, borderColor: CHIP_BORDER,
    marginTop: 8, overflow: "hidden",
  },
  promptOption: {
    paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: "#F0F5F5",
  },
  promptOptionText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: DARK_TEAL },
  footer: {
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: SCREEN_BG, borderTopWidth: 1, borderTopColor: CHIP_BORDER,
  },
  finishBtn: {
    backgroundColor: Colors.ponyo, borderRadius: 16, paddingVertical: 16,
    alignItems: "center", justifyContent: "center",
  },
  finishBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 17, color: Colors.white },
});
