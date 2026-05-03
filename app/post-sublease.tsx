import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Platform, KeyboardAvoidingView, Image, Alert, useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import {
  useApp, SubleasePost, LeaseType, Landlord, Zone, BreakType,
  KitchenType, BathroomType, CleaningFrequency, ShoePolicy, Amenities, DEFAULT_AMENITIES
} from "@/context/AppContext";
import { uploadImageUri, uploadImageUris } from "@/lib/uploadImage";

const LEASE_OPTIONS: { key: LeaseType; label: string; desc: string }[] = [
  { key: "full_year", label: "Full Year", desc: "Aug – Jul (12 months)" },
  { key: "fall_sublease", label: "Fall Sublease", desc: "Aug – Dec" },
  { key: "spring_sublease", label: "Spring Sublease", desc: "Jan – May" },
  { key: "summer_sublease", label: "Summer Sublease", desc: "May – Aug" },
];

const SHORT_TERM_EVENTS = [
  "Mom's Weekend", "Graduation", "August Gap", "Homecoming",
  "Dad's Weekend", "Thanksgiving", "Winter Break", "Other / Generic Short-Term",
];

const SUMMER_TIMELINE_OPTIONS: { key: string; label: string; desc: string }[] = [
  { key: "full_summer", label: "Full Summer", desc: "May – Aug" },
  { key: "early_summer", label: "Early Summer", desc: "May – Jun" },
  { key: "late_summer", label: "Late Summer", desc: "Jul – Aug" },
];

const LANDLORD_OPTIONS: { key: Landlord; label: string; color: string }[] = [
  { key: "jsm", label: "JSM", color: Colors.landlords.jsm },
  { key: "ugroup", label: "UGroup", color: Colors.landlords.ugroup },
  { key: "bailey", label: "Bailey", color: Colors.landlords.bailey },
  { key: "american", label: "American Campus", color: Colors.landlords.american },
  { key: "smile", label: "Smile", color: Colors.landlords.smile },
  { key: "cpm", label: "CPM", color: Colors.landlords.cpm },
  { key: "green_st_realty", label: "Green St Realty", color: Colors.landlords.green_st_realty },
  { key: "other", label: "Private / Other", color: Colors.landlords.other },
];

const LANDLORD_WARNINGS: Record<Landlord, { level: "info" | "warn" | "danger"; message: string } | null> = {
  jsm: { level: "info", message: "JSM charges a $50 sublease transfer fee and requires proof of Renter's Insurance from your replacement tenant." },
  ugroup: { level: "warn", message: "UGroup charges $125 transfer fee + mandatory 72-hour Move-In Condition Report. Document ALL damage with photos within 72 hours!" },
  bailey: { level: "warn", message: "Walk into the Bailey office TOGETHER with your replacement tenant — never separately. Landlord may try to cut you out." },
  american: { level: "danger", message: "ALERT: American Campus (Latitude, 212, Tower) charges up to $600 in Relet fees. Get everything in writing first." },
  smile: { level: "info", message: "Smile Properties: Verify sublease approval in writing before proceeding. Keep a copy of all agreements." },
  cpm: { level: "info", message: "CPM requires written approval for subleases. Contact their office directly to start the transfer process." },
  green_st_realty: { level: "info", message: "Green St Realty: Confirm sublease terms with management. Some properties have restrictions on subletting." },
  other: null,
};

const ZONE_OPTIONS: { key: Zone; label: string }[] = [
  { key: "campustown", label: "Campustown (Central Campus)" },
  { key: "north", label: "North Campus (Engineering / Midtown)" },
  { key: "south", label: "South Campus (Ikenberry / Seniorland)" },
  { key: "urbana", label: "Urbana (Gradland)" },
  { key: "downtown", label: "Downtown Champaign" },
];

const BREAK_OPTIONS: { key: BreakType; label: string }[] = [
  { key: "thanksgiving", label: "Thanksgiving" },
  { key: "spring_break", label: "Spring Break" },
  { key: "winter", label: "Winter Break" },
];

const AMENITY_SECTIONS: { title: string; items: { key: keyof Amenities; label: string; icon: keyof typeof Ionicons.glyphMap }[] }[] = [
  {
    title: "Foundational",
    items: [
      { key: "isFurnished", label: "Furnished", icon: "bed-outline" },
      { key: "hasLaundry", label: "Laundry", icon: "water-outline" },
      { key: "hasWifi", label: "WiFi", icon: "wifi-outline" },
      { key: "hasAC", label: "A/C", icon: "snow-outline" },
    ],
  },
  {
    title: "Collegiate",
    items: [
      { key: "hasStudyLounge", label: "Study Lounge", icon: "library-outline" },
      { key: "hasPrinting", label: "Printing", icon: "print-outline" },
      { key: "hasBikeStorage", label: "Bike Storage", icon: "bicycle-outline" },
      { key: "hasSecurity", label: "Security", icon: "shield-outline" },
    ],
  },
  {
    title: "Financial",
    items: [
      { key: "utilsIncluded", label: "Utils Included", icon: "flash-outline" },
      { key: "noDeposit", label: "No Deposit", icon: "cash-outline" },
      { key: "parkingIncluded", label: "Parking", icon: "car-outline" },
    ],
  },
  {
    title: "Building",
    items: [
      { key: "hasGym", label: "Gym", icon: "barbell-outline" },
      { key: "hasPool", label: "Pool", icon: "water-outline" },
      { key: "hasElevator", label: "Elevator", icon: "swap-vertical-outline" },
      { key: "hasRooftop", label: "Rooftop", icon: "sunny-outline" },
      { key: "hasLockers", label: "Lockers", icon: "lock-closed-outline" },
    ],
  },
];

const AVATAR_COLORS = ["#1A7AAF", "#CC5500", "#5A8A5A", "#9B59B6", "#E07B00", "#E0BC00"];

const DISABLED_BG = "#E0E8E9";
const DISABLED_TEXT = "#8A9FA3";

function autoCategorize(moveIn: Date, moveOut: Date): LeaseType {
  const durationDays = Math.round((moveOut.getTime() - moveIn.getTime()) / (1000 * 60 * 60 * 24));
  if (durationDays <= 14) return "fall_sublease";
  const moveInMonth = moveIn.getMonth();
  if (durationDays >= 330) return "full_year";
  if (moveInMonth >= 4 && moveInMonth <= 6 && durationDays <= 140) return "summer_sublease";
  if (moveInMonth >= 0 && moveInMonth <= 1 && durationDays >= 90 && durationDays <= 180) return "spring_sublease";
  if (moveInMonth >= 7 && moveInMonth <= 8 && durationDays >= 90 && durationDays <= 180) return "fall_sublease";
  return "fall_sublease";
}

function getDurationDays(moveIn: Date | null, moveOut: Date | null): number {
  if (!moveIn || !moveOut) return 0;
  return Math.round((moveOut.getTime() - moveIn.getTime()) / (1000 * 60 * 60 * 24));
}

const TOTAL_STEPS = 4;

export default function PostSubleaseScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, addSublease, setCurrentUser } = useApp();
  const params = useLocalSearchParams<{ mode?: string; gateway?: string }>();
  const isHostMode = params.mode === "host";
  const isSublessorMode = params.mode === "sublessor";
  const isGateway = params.gateway === "1";
  const isSupplySide = isHostMode || isSublessorMode;
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);

  const [buildingName, setBuildingName] = useState("");
  const [address, setAddress] = useState("");
  const [leaseType, setLeaseType] = useState<LeaseType>("fall_sublease");
  const [price, setPrice] = useState("");
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [zone, setZone] = useState<Zone>("campustown");
  const [availableDuringBreaks, setAvailableDuringBreaks] = useState(false);
  const [selectedBreaks, setSelectedBreaks] = useState<BreakType[]>([]);
  const [description, setDescription] = useState("");

  const [kitchenType, setKitchenType] = useState<KitchenType>("private");
  const [bathroomType, setBathroomType] = useState<BathroomType>("private");
  const [unitType, setUnitType] = useState("");
  const [isPrivateBedroom, setIsPrivateBedroom] = useState(true);
  const [isPrivateBathroom, setIsPrivateBathroom] = useState(true);
  const [images, setImages] = useState<(string | null)[]>([null, null, null]);
  const [floorPlanImage, setFloorPlanImage] = useState<string | null>(null);
  const [roomsAvailable, setRoomsAvailable] = useState("1");
  const [currentResidentBio, setCurrentResidentBio] = useState("");
  const [roommatePreference, setRoommatePreference] = useState("");

  const [amenities, setAmenities] = useState<Amenities>({ ...DEFAULT_AMENITIES });
  const [eventTag, setEventTag] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [hasParking, setHasParking] = useState(false);

  const [cleaningFrequency, setCleaningFrequency] = useState<CleaningFrequency>("weekly");
  const [shoePolicy, setShoePolicy] = useState<ShoePolicy>("no_policy");
  const [moveInDate, setMoveInDate] = useState<Date | null>(null);
  const [moveOutDate, setMoveOutDate] = useState<Date | null>(null);
  const [showMoveInPicker, setShowMoveInPicker] = useState(false);
  const [showMoveOutPicker, setShowMoveOutPicker] = useState(false);

  const now = new Date();
  const [calMoveInMonth, setCalMoveInMonth] = useState(now.getMonth());
  const [calMoveInYear, setCalMoveInYear] = useState(now.getFullYear());
  const [calMoveOutMonth, setCalMoveOutMonth] = useState(now.getMonth());
  const [calMoveOutYear, setCalMoveOutYear] = useState(now.getFullYear());
  const [showMoveInYearPicker, setShowMoveInYearPicker] = useState(false);
  const [showMoveOutYearPicker, setShowMoveOutYearPicker] = useState(false);

  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const MIN_YEAR = now.getFullYear();
  const MAX_YEAR = 3000;

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfWeek = (year: number, month: number) => new Date(year, month, 1).getDay();

  const calendarPrevMonth = (type: "moveIn" | "moveOut") => {
    if (type === "moveIn") {
      if (calMoveInMonth === 0) { setCalMoveInMonth(11); setCalMoveInYear(y => y - 1); }
      else setCalMoveInMonth(m => m - 1);
    } else {
      if (calMoveOutMonth === 0) { setCalMoveOutMonth(11); setCalMoveOutYear(y => y - 1); }
      else setCalMoveOutMonth(m => m - 1);
    }
  };

  const calendarNextMonth = (type: "moveIn" | "moveOut") => {
    if (type === "moveIn") {
      if (calMoveInMonth === 11) { setCalMoveInMonth(0); setCalMoveInYear(y => y + 1); }
      else setCalMoveInMonth(m => m + 1);
    } else {
      if (calMoveOutMonth === 11) { setCalMoveOutMonth(0); setCalMoveOutYear(y => y + 1); }
      else setCalMoveOutMonth(m => m + 1);
    }
  };

  const isDateDisabled = (day: number, month: number, year: number, type: "moveIn" | "moveOut") => {
    const d = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) return true;
    if (type === "moveOut" && moveInDate) {
      return d <= moveInDate;
    }
    return false;
  };

  const handleDayPress = (day: number, month: number, year: number, type: "moveIn" | "moveOut") => {
    const selected = new Date(year, month, day, type === "moveIn" ? 14 : 12, 0, 0);
    Haptics.selectionAsync();
    if (type === "moveIn") {
      setMoveInDate(selected);
      setShowMoveInPicker(false);
      if (moveOutDate && moveOutDate <= selected) {
        setMoveOutDate(null);
      } else if (moveOutDate) {
        setLeaseType(autoCategorize(selected, moveOutDate));
      }
    } else {
      setMoveOutDate(selected);
      setShowMoveOutPicker(false);
      if (moveInDate) {
        setLeaseType(autoCategorize(moveInDate, selected));
      }
    }
  };

  const renderCalendar = (type: "moveIn" | "moveOut") => {
    const cMonth = type === "moveIn" ? calMoveInMonth : calMoveOutMonth;
    const cYear = type === "moveIn" ? calMoveInYear : calMoveOutYear;
    const showYearPicker = type === "moveIn" ? showMoveInYearPicker : showMoveOutYearPicker;
    const setShowYearPicker = type === "moveIn" ? setShowMoveInYearPicker : setShowMoveOutYearPicker;
    const setYear = type === "moveIn" ? setCalMoveInYear : setCalMoveOutYear;
    const selectedDate = type === "moveIn" ? moveInDate : moveOutDate;
    const daysInMonth = getDaysInMonth(cYear, cMonth);
    const firstDay = getFirstDayOfWeek(cYear, cMonth);
    const canGoPrev = cYear > MIN_YEAR || (cYear === MIN_YEAR && cMonth > 0);
    const canGoNext = cYear < MAX_YEAR || (cYear === MAX_YEAR && cMonth < 11);

    if (showYearPicker) {
      const decades: number[] = [];
      const startDecade = Math.floor(cYear / 20) * 20;
      for (let y = startDecade; y < startDecade + 20 && y <= MAX_YEAR; y++) {
        if (y >= MIN_YEAR) decades.push(y);
      }
      return (
        <View style={styles.calendarContainer}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => {
              const newStart = startDecade - 20;
              if (newStart >= MIN_YEAR) setYear(newStart);
            }}>
              <Ionicons name="chevron-back" size={20} color={startDecade > MIN_YEAR ? Colors.ocean : Colors.borderSoft} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowYearPicker(false)}>
              <Text style={styles.calendarTitle}>{startDecade} - {Math.min(startDecade + 19, MAX_YEAR)}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              const newStart = startDecade + 20;
              if (newStart <= MAX_YEAR) setYear(newStart);
            }}>
              <Ionicons name="chevron-forward" size={20} color={startDecade + 20 <= MAX_YEAR ? Colors.ocean : Colors.borderSoft} />
            </TouchableOpacity>
          </View>
          <View style={styles.yearGrid}>
            {decades.map(y => {
              const isSelected = y === cYear;
              return (
                <TouchableOpacity key={y} style={[styles.yearCell, isSelected && styles.yearCellActive]}
                  onPress={() => { setYear(y); setShowYearPicker(false); }}>
                  <Text style={[styles.yearCellText, isSelected && styles.yearCellTextActive]}>{y}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    const cells: React.ReactNode[] = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.calendarDayCell} />);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const disabled = isDateDisabled(d, cMonth, cYear, type);
      const isSelected = selectedDate &&
        selectedDate.getDate() === d &&
        selectedDate.getMonth() === cMonth &&
        selectedDate.getFullYear() === cYear;
      const isToday = d === now.getDate() && cMonth === now.getMonth() && cYear === now.getFullYear();
      cells.push(
        <TouchableOpacity key={d} style={[styles.calendarDayCell, isSelected && styles.calendarDayCellActive, isToday && !isSelected && styles.calendarDayCellToday]}
          onPress={() => !disabled && handleDayPress(d, cMonth, cYear, type)} disabled={disabled}>
          <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextActive, disabled && styles.calendarDayTextDisabled,
            isToday && !isSelected && styles.calendarDayTextToday]}>{d}</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => canGoPrev && calendarPrevMonth(type)} disabled={!canGoPrev}>
            <Ionicons name="chevron-back" size={20} color={canGoPrev ? Colors.ocean : Colors.borderSoft} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowYearPicker(true)}>
            <Text style={styles.calendarTitle}>{MONTH_NAMES[cMonth]} {cYear}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => canGoNext && calendarNextMonth(type)} disabled={!canGoNext}>
            <Ionicons name="chevron-forward" size={20} color={canGoNext ? Colors.ocean : Colors.borderSoft} />
          </TouchableOpacity>
        </View>
        <View style={styles.calendarDayHeaders}>
          {DAY_HEADERS.map(h => (
            <View key={h} style={styles.calendarDayHeaderCell}>
              <Text style={styles.calendarDayHeaderText}>{h}</Text>
            </View>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {cells}
        </View>
      </View>
    );
  };

  const warning = landlords.length === 1 ? LANDLORD_WARNINGS[landlords[0]] : undefined;

  const toggleLandlord = (key: Landlord) => {
    setLandlords(prev => prev.includes(key) ? prev.filter(l => l !== key) : [...prev, key]);
    Haptics.selectionAsync();
  };

  const toggleBreak = (b: BreakType) => {
    setSelectedBreaks(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
    Haptics.selectionAsync();
  };

  const toggleAmenity = (key: keyof Amenities) => {
    setAmenities(prev => ({ ...prev, [key]: !prev[key] }));
    Haptics.selectionAsync();
  };

  const imageLabels = [
    "Bedroom",
    isPrivateBathroom ? "Private Bathroom" : "Shared Bathroom",
    kitchenType === "private" ? "Private Kitchen" : "Communal Kitchen/Area",
  ];

  const pickImage = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const asset = result.assets[0];
      const mime = asset.mimeType ?? "image/jpeg";
      const newImages = [...images];
      newImages[index] = `data:${mime};base64,${asset.base64}`;
      setImages(newImages);
    }
  };

  const pickFloorPlan = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const asset = result.assets[0];
      const mime = asset.mimeType ?? "image/jpeg";
      setFloorPlanImage(`data:${mime};base64,${asset.base64}`);
    }
  };

  const allImagesUploaded = images.every(img => img !== null);
  const hasAtLeastOnePhoto = images.some(img => img !== null);

  const days = getDurationDays(moveInDate, moveOutDate);
  const isShortTerm = days > 0 && days <= 14;
  const isSummer = leaseType === "summer_sublease" && !isShortTerm;

  const canSubmit = !!(
    buildingName.trim() &&
    price.trim() && !isNaN(Number(price)) && Number(price) > 0 &&
    zone &&
    landlords.length > 0 &&
    moveInDate !== null && moveOutDate !== null &&
    (!isShortTerm || eventTag) &&
    (!isSummer || subCategory) &&
    (!isHostMode || roommatePreference)
  );

  // Debug: log exactly what's blocking the button
  if (__DEV__) {
    console.log("canSubmit debug:", {
      buildingName: !!buildingName.trim(),
      price: !!(price.trim() && !isNaN(Number(price)) && Number(price) > 0),
      zone: !!zone,
      landlords: landlords.length > 0,
      dates: moveInDate !== null && moveOutDate !== null,
      shortTermOk: !isShortTerm || !!eventTag,
      summerOk: !isSummer || !!subCategory,
      hostModeOk: !isHostMode || !!roommatePreference,
      canSubmit,
    });
  }

  const handleSubmit = async () => {
    if (!canSubmit || uploading) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Upload images to Storage before building the post
    let uploadedImages: string[] = [];
    let uploadedFloorPlan: string | undefined;
    try {
      setUploading(true);
      const localImgs = images.filter(Boolean) as string[];
      uploadedImages = localImgs.length > 0
        ? await uploadImageUris(localImgs, "listings")
        : [];
      if (floorPlanImage) {
        uploadedFloorPlan = await uploadImageUri(floorPlanImage, "listings");
      }
    } catch (err: any) {
      setUploading(false);
      Alert.alert("Upload failed", err?.message ?? "Could not upload photos. Please try again.");
      return;
    } finally {
      setUploading(false);
    }

    const finalCategory = isShortTerm ? "short_term"
      : leaseType === "summer_sublease" ? "summer"
      : leaseType === "spring_sublease" ? "spring"
      : leaseType === "fall_sublease" ? "fall"
      : "full_year";

    const post: SubleasePost = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      userId: currentUser?.id || "guest",
      userName: currentUser?.name || "Anonymous",
      userEmail: currentUser?.email || "student@illinois.edu",
      buildingName: buildingName.trim(),
      address: address.trim(),
      leaseType,
      pricePerMonth: Number(price),
      landlords,
      zone,
      availableDuringBreaks,
      breakTypes: selectedBreaks,
      description: description.trim(),
      avatarColor: currentUser?.avatarColor || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      timestamp: Date.now(),
      category: finalCategory,
      kitchenType,
      bathroomType,
      unitType: unitType.trim() || undefined,
      isPrivateBedroom,
      isPrivateBathroom,
      floorPlanUrl: uploadedFloorPlan,
      roomsAvailable: isHostMode && roomsAvailable ? Number(roomsAvailable) : undefined,
      currentResidentBio: isHostMode && currentResidentBio.trim() ? currentResidentBio.trim() : undefined,
      roommatePreference: roommatePreference || undefined,
      listingType: isHostMode ? "roommate" : "sublease",
      moveInDate: moveInDate!.toISOString(),
      moveOutDate: moveOutDate!.toISOString(),
      amenities,
      cleaningFrequency,
      shoePolicy,
      images: uploadedImages,
      eventTag: isShortTerm ? eventTag : undefined,
      subCategory: isSummer ? subCategory : undefined,
      hasParking: isSummer ? hasParking : undefined,
    };

    try {
      await addSublease(post);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to post listing. Please try again.";
      Alert.alert("Couldn't post listing", msg);
      return;
    }

    if (currentUser) {
      await setCurrentUser({
        ...currentUser,
        zone,
        leaseType,
      });
    }

    if (isHostMode) {
      router.replace("/marketplace?category=roommate_openings");
    } else if (finalCategory === "short_term") {
      router.replace("/marketplace?category=short_term");
    } else if (finalCategory === "summer") {
      router.replace(`/marketplace?category=summer_only${subCategory ? `&subFilter=${subCategory}` : ""}`);
    } else {
      router.replace(`/marketplace?category=semester_takeover`);
    }
  };

  const { width: winWidth } = useWindowDimensions();
  const isDesktopPs = Platform.OS === "web" && winWidth >= 1024;
  const contentMaxWidthPs = isDesktopPs ? 720 : winWidth;
  const topPadding = Platform.OS === "web" ? (isDesktopPs ? 24 : 67) : insets.top;

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  };
  const goBack = () => {
    if (step === 0) {
      if (isGateway) return;
      router.canGoBack() ? router.back() : router.replace("/(tabs)");
      return;
    }
    setStep(s => s - 1);
  };

  const stepValid = (s: number) => {
    if (s === 0) return !!(buildingName.trim() && price.trim() && !isNaN(Number(price)) && Number(price) > 0 && landlords.length > 0 && roommatePreference);
    if (s === 1) {
      if (!hasAtLeastOnePhoto) return false;
      if (isHostMode && !unitType.trim()) return false;
      return true;
    }
    if (s === 2) return true;
    if (s === 3) return (
      moveInDate !== null && moveOutDate !== null &&
      (!isShortTerm || !!eventTag) &&
      (!isSummer || !!subCategory)
    );
    return true;
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: Colors.warmCream }, isDesktopPs && { maxWidth: contentMaxWidthPs, alignSelf: "center" as const, width: "100%" }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        {isGateway && step === 0 ? (
          <View style={styles.backBtn} />
        ) : (
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <Ionicons name={step === 0 ? "close" : "arrow-back"} size={20} color={Colors.darkTeal} />
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{isHostMode ? "Post My Apartment" : "Post My Sublease"}</Text>
          <Text style={styles.headerSub}>Step {step + 1} of {TOTAL_STEPS}{isGateway ? " — complete to continue" : ""}</Text>
        </View>
        <View style={styles.stepDots}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={[styles.stepDot, i <= step && styles.stepDotActive]} />
          ))}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, {
        paddingBottom: insets.bottom + 80
      }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {isGateway && step === 0 && (
          <View style={styles.gatewayBanner}>
            <Ionicons name="lock-closed-outline" size={16} color={Colors.darkTeal} />
            <Text style={styles.gatewayBannerText}>
              Complete your listing to unlock PopMatch. All fields marked * are required.
            </Text>
          </View>
        )}

        {step === 0 && (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Building Name *</Text>
              <TextInput style={styles.input}
                value={buildingName} onChangeText={setBuildingName}
                placeholder="e.g. Hub Champaign, 707, Fairview"
                placeholderTextColor={Colors.textLight} />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Street Address</Text>
              <TextInput style={styles.input} value={address} onChangeText={setAddress}
                placeholder="e.g. 210 E Green St, Champaign"
                placeholderTextColor={Colors.textLight} />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Monthly Price ($/mo) *</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceDollar}>$</Text>
                <TextInput style={styles.priceInput}
                  value={price} onChangeText={setPrice}
                  placeholder="0" placeholderTextColor={Colors.textLight}
                  keyboardType="numeric" />
                <Text style={styles.priceMonth}>/mo</Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Lease Type *</Text>
              {LEASE_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.key} style={[styles.optionCard, leaseType === opt.key && styles.optionCardActive]}
                  onPress={() => { setLeaseType(opt.key); setEventTag(""); Haptics.selectionAsync(); }}>
                  <View style={styles.optionLeft}>
                    <Text style={[styles.optionLabel, leaseType === opt.key && styles.optionLabelActive]}>{opt.label}</Text>
                    <Text style={styles.optionDesc}>{opt.desc}</Text>
                  </View>
                  {leaseType === opt.key && <Ionicons name="checkmark-circle" size={20} color={Colors.ocean} />}
                </TouchableOpacity>
              ))}

              {leaseType === "summer_sublease" && (
                <View style={styles.summerSubmenu}>
                  <Text style={[styles.label, { marginBottom: 8 }]}>Summer Timeline *</Text>
                  {SUMMER_TIMELINE_OPTIONS.map(opt => (
                    <TouchableOpacity key={opt.key}
                      style={[styles.optionCard, subCategory === opt.key && styles.optionCardActive]}
                      onPress={() => { setSubCategory(opt.key); Haptics.selectionAsync(); }}>
                      <View style={styles.optionLeft}>
                        <Text style={[styles.optionLabel, subCategory === opt.key && styles.optionLabelActive]}>{opt.label}</Text>
                        <Text style={styles.optionDesc}>{opt.desc}</Text>
                      </View>
                      {subCategory === opt.key && <Ionicons name="checkmark-circle" size={20} color={Colors.ocean} />}
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity style={styles.parkingToggle}
                    onPress={() => { setHasParking(!hasParking); Haptics.selectionAsync(); }}>
                    <Text style={styles.parkingLabel}>🚗 Parking Included</Text>
                    <View style={[styles.toggle, hasParking && { backgroundColor: "#2C555C" }]}>
                      <Text style={[styles.toggleText, hasParking && styles.toggleTextOn]}>
                        {hasParking ? "Yes" : "No"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Landlord(s) *</Text>
              {LANDLORD_OPTIONS.map(opt => {
                const isSelected = landlords.includes(opt.key);
                return (
                  <TouchableOpacity key={opt.key} style={[styles.optionCard, isSelected && styles.optionCardActive]}
                    onPress={() => toggleLandlord(opt.key)}>
                    <View style={[styles.landlordDot, { backgroundColor: opt.color }]} />
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>{opt.label}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={Colors.ocean} />}
                  </TouchableOpacity>
                );
              })}
              {warning && (
                <View style={[styles.warningBox, {
                  backgroundColor: warning.level === "danger" ? "#FFF0F0" : warning.level === "warn" ? "#FFF4E6" : "#EFF8FF",
                  borderLeftColor: warning.level === "danger" ? Colors.alertRed : warning.level === "warn" ? Colors.alertOrange : Colors.ocean
                }]}>
                  <Ionicons
                    name={warning.level === "danger" ? "alert-circle" : warning.level === "warn" ? "warning-outline" : "information-circle-outline"}
                    size={16}
                    color={warning.level === "danger" ? Colors.alertRed : warning.level === "warn" ? Colors.alertOrange : Colors.ocean}
                  />
                  <Text style={styles.warningText}>{warning.message}</Text>
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Zone / Area *</Text>
              <View style={styles.chipRow}>
                {ZONE_OPTIONS.map(opt => (
                  <TouchableOpacity key={opt.key} style={[styles.chip, zone === opt.key && styles.chipActive]}
                    onPress={() => { setZone(opt.key); Haptics.selectionAsync(); }}>
                    <Text style={[styles.chipText, zone === opt.key && styles.chipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <TouchableOpacity style={styles.toggleRow}
                onPress={() => { setAvailableDuringBreaks(!availableDuringBreaks); Haptics.selectionAsync(); }}>
                <View>
                  <Text style={styles.toggleTitle}>Available During Breaks?</Text>
                  <Text style={styles.toggleDesc}>Unit can be used during university breaks</Text>
                </View>
                <View style={[styles.toggle, availableDuringBreaks && styles.toggleOn]}>
                  <Text style={[styles.toggleText, availableDuringBreaks && styles.toggleTextOn]}>
                    {availableDuringBreaks ? "Yes" : "No"}
                  </Text>
                </View>
              </TouchableOpacity>
              {availableDuringBreaks && (
                <View style={styles.breakOptions}>
                  <Text style={styles.breakOptionsLabel}>Which breaks?</Text>
                  <View style={styles.chipRow}>
                    {BREAK_OPTIONS.map(b => (
                      <TouchableOpacity key={b.key}
                        style={[styles.chip, selectedBreaks.includes(b.key) && styles.chipActive]}
                        onPress={() => toggleBreak(b.key)}>
                        <Text style={[styles.chipText, selectedBreaks.includes(b.key) && styles.chipTextActive]}>
                          {b.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Roommate Preference <Text style={{ color: "#FF6B4E" }}>*</Text></Text>
              <View style={styles.chipRow}>
                {["Girls Only", "Guys Only", "Co-ed", "Grainger Grind"].map(pref => (
                  <TouchableOpacity key={pref} style={[styles.chip, roommatePreference === pref && styles.chipActive]}
                    onPress={() => { setRoommatePreference(roommatePreference === pref ? "" : pref); Haptics.selectionAsync(); }}>
                    <Text style={[styles.chipText, roommatePreference === pref && styles.chipTextActive]}>{pref}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldHint}>Helps seekers filter by vibe</Text>
            </View>

            {isHostMode && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Spots Available *</Text>
                  <View style={styles.chipRow}>
                    {["1", "2", "3", "4"].map(n => (
                      <TouchableOpacity key={n} style={[styles.chip, roomsAvailable === n && styles.chipActive]}
                        onPress={() => { setRoomsAvailable(n); Haptics.selectionAsync(); }}>
                        <Text style={[styles.chipText, roomsAvailable === n && styles.chipTextActive]}>{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Who Already Lives There?</Text>
                  <TextInput style={[styles.input, styles.textArea]} value={currentResidentBio} onChangeText={setCurrentResidentBio}
                    placeholder="e.g. 2 junior CS majors, clean and quiet. We cook together on weekends."
                    placeholderTextColor={Colors.textLight} multiline numberOfLines={3} textAlignVertical="top" />
                  <Text style={styles.fieldHint}>Help joiners know who they'd be living with</Text>
                </View>
              </>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription}
                placeholder={isHostMode
                  ? "Describe the room, common spaces, house rules..."
                  : "Describe the unit, amenities, furniture situation..."}
                placeholderTextColor={Colors.textLight} multiline numberOfLines={3} textAlignVertical="top" />
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.sectionTitle}>Unit Details & Photos</Text>
            <Text style={styles.sectionSub}>Describe your unit layout, privacy options, then upload photos.</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Unit Type</Text>
              <TextInput style={styles.input}
                value={unitType} onChangeText={setUnitType}
                placeholder="e.g. 2B2B, 3B3B, Studio, 1B1B"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="characters" />
              <Text style={styles.fieldHint}>Format: [Bedrooms]B[Bathrooms]B or Studio</Text>
            </View>

            <View style={styles.field}>
              <TouchableOpacity style={styles.toggleRow}
                onPress={() => { setIsPrivateBedroom(!isPrivateBedroom); Haptics.selectionAsync(); }}>
                <View>
                  <Text style={styles.toggleTitle}>Private Bedroom?</Text>
                  <Text style={styles.toggleDesc}>The bedroom is not shared with another person</Text>
                </View>
                <View style={[styles.toggle, isPrivateBedroom && styles.toggleOn]}>
                  <Text style={[styles.toggleText, isPrivateBedroom && styles.toggleTextOn]}>
                    {isPrivateBedroom ? "Yes" : "No"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <TouchableOpacity style={styles.toggleRow}
                onPress={() => { setIsPrivateBathroom(!isPrivateBathroom); setBathroomType(isPrivateBathroom ? "shared" : "private"); Haptics.selectionAsync(); }}>
                <View>
                  <Text style={styles.toggleTitle}>Private Bathroom?</Text>
                  <Text style={styles.toggleDesc}>Your unit has its own private bathroom</Text>
                </View>
                <View style={[styles.toggle, isPrivateBathroom && styles.toggleOn]}>
                  <Text style={[styles.toggleText, isPrivateBathroom && styles.toggleTextOn]}>
                    {isPrivateBathroom ? "Yes" : "No"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Kitchen Type *</Text>
              <View style={styles.chipRow}>
                {(["private", "communal"] as KitchenType[]).map(k => (
                  <TouchableOpacity key={k} style={[styles.chip, kitchenType === k && styles.chipActive]}
                    onPress={() => { setKitchenType(k); Haptics.selectionAsync(); }}>
                    <Ionicons name={k === "private" ? "restaurant-outline" : "people-outline"} size={14}
                      color={kitchenType === k ? Colors.white : Colors.textMuted} />
                    <Text style={[styles.chipText, kitchenType === k && styles.chipTextActive]}>
                      {k === "private" ? "Private Kitchen" : "Communal Kitchen"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Upload Photos * (at least 1 required)</Text>
              <View style={styles.photoGrid}>
                {imageLabels.map((label, idx) => (
                  <TouchableOpacity key={label} style={styles.photoSlot} onPress={() => pickImage(idx)}>
                    {images[idx] ? (
                      <Image source={{ uri: images[idx]! }} style={styles.photoImage} />
                    ) : (
                      <View style={styles.photoEmpty}>
                        <Ionicons name="camera-outline" size={28} color={Colors.textLight} />
                        <Text style={styles.photoLabel}>{label}</Text>
                      </View>
                    )}
                    {images[idx] && (
                      <View style={styles.photoLabelOverlay}>
                        <Text style={styles.photoLabelOverlayText}>{label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              {!hasAtLeastOnePhoto && (
                <Text style={styles.photoHint}>Tap a slot to upload. At least 1 photo is required.</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Floor Plan (Optional)</Text>
              <TouchableOpacity style={styles.floorPlanSlot} onPress={pickFloorPlan}>
                {floorPlanImage ? (
                  <Image source={{ uri: floorPlanImage }} style={styles.floorPlanImage} />
                ) : (
                  <View style={styles.floorPlanEmpty}>
                    <Ionicons name="map-outline" size={28} color={Colors.textLight} />
                    <Text style={styles.photoLabel}>Floor Plan</Text>
                  </View>
                )}
                {floorPlanImage && (
                  <View style={styles.photoLabelOverlay}>
                    <Text style={styles.photoLabelOverlayText}>Floor Plan</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <Text style={styles.sectionSub}>Toggle each amenity for your listing.</Text>

            {AMENITY_SECTIONS.map(section => (
              <View key={section.title} style={styles.amenitySection}>
                <Text style={styles.amenitySectionTitle}>{section.title}</Text>
                <View style={styles.amenityGrid}>
                  {section.items.map(item => {
                    const active = amenities[item.key];
                    return (
                      <TouchableOpacity key={item.key}
                        style={[styles.amenityToggle, active && styles.amenityToggleActive]}
                        onPress={() => toggleAmenity(item.key)}>
                        <Ionicons name={item.icon} size={18} color={active ? Colors.white : Colors.textMuted} />
                        <Text style={[styles.amenityToggleText, active && styles.amenityToggleTextActive]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.sectionTitle}>Cleanliness & Handoff</Text>
            <Text style={styles.sectionSub}>Set cleaning habits and exact move-in/out times.</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Cleaning Frequency</Text>
              <View style={styles.chipRow}>
                {(["daily", "weekly", "monthly"] as CleaningFrequency[]).map(f => (
                  <TouchableOpacity key={f} style={[styles.chip, cleaningFrequency === f && styles.chipActive]}
                    onPress={() => { setCleaningFrequency(f); Haptics.selectionAsync(); }}>
                    <Text style={[styles.chipText, cleaningFrequency === f && styles.chipTextActive]}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Shoe Policy</Text>
              <View style={styles.chipRow}>
                {([
                  { key: "shoes_off" as ShoePolicy, label: "Shoes Off" },
                  { key: "front_door" as ShoePolicy, label: "Front Door" },
                  { key: "no_policy" as ShoePolicy, label: "No Policy" },
                ]).map(p => (
                  <TouchableOpacity key={p.key} style={[styles.chip, shoePolicy === p.key && styles.chipActive]}
                    onPress={() => { setShoePolicy(p.key); Haptics.selectionAsync(); }}>
                    <Text style={[styles.chipText, shoePolicy === p.key && styles.chipTextActive]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Move-In Date *</Text>
              <TouchableOpacity style={styles.datePickerBtn} onPress={() => { setShowMoveInPicker(!showMoveInPicker); setShowMoveOutPicker(false); }}>
                <Ionicons name="calendar-outline" size={18} color={moveInDate ? Colors.ocean : Colors.textLight} />
                <Text style={[styles.datePickerText, !moveInDate && { color: Colors.textLight }]}>
                  {moveInDate ? moveInDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "Select move-in date"}
                </Text>
                <Ionicons name={showMoveInPicker ? "chevron-up" : "chevron-down"} size={16} color={Colors.textMuted} />
              </TouchableOpacity>
              {showMoveInPicker && renderCalendar("moveIn")}
              <Text style={styles.fieldHint}>Date for key handoff</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Move-Out Date *</Text>
              <TouchableOpacity style={styles.datePickerBtn} onPress={() => { setShowMoveOutPicker(!showMoveOutPicker); setShowMoveInPicker(false); }}>
                <Ionicons name="calendar-outline" size={18} color={moveOutDate ? Colors.ocean : Colors.textLight} />
                <Text style={[styles.datePickerText, !moveOutDate && { color: Colors.textLight }]}>
                  {moveOutDate ? moveOutDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "Select move-out date"}
                </Text>
                <Ionicons name={showMoveOutPicker ? "chevron-up" : "chevron-down"} size={16} color={Colors.textMuted} />
              </TouchableOpacity>
              {showMoveOutPicker && renderCalendar("moveOut")}
              {moveInDate && !moveOutDate && showMoveOutPicker && (
                <Text style={[styles.fieldHint, { color: Colors.alertOrange }]}>Must be after {moveInDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Text>
              )}
              <Text style={styles.fieldHint}>Date for key return</Text>
            </View>

            {moveInDate && moveOutDate && (
              <View style={[styles.warningBox, { backgroundColor: Colors.ocean + "12", borderLeftColor: Colors.ocean }]}>
                <Ionicons name="pricetag-outline" size={16} color={Colors.ocean} />
                <Text style={styles.warningText}>
                  {getDurationDays(moveInDate, moveOutDate) <= 14
                    ? `Short-Term (${getDurationDays(moveInDate, moveOutDate)} days) — select an event tag below`
                    : `Auto-tagged as: ${LEASE_OPTIONS.find(o => o.key === leaseType)?.label || leaseType} (${getDurationDays(moveInDate, moveOutDate)} days)`}
                </Text>
              </View>
            )}

            {isSummer && (
              <View style={styles.field}>
                <Text style={styles.label}>Summer Timeline <Text style={{ color: "#FF6B4E" }}>*</Text></Text>
                <Text style={[styles.fieldHint, { marginBottom: 4 }]}>Required for summer listings</Text>
                {SUMMER_TIMELINE_OPTIONS.map(opt => (
                  <TouchableOpacity key={opt.key}
                    style={[styles.optionCard, subCategory === opt.key && styles.optionCardActive]}
                    onPress={() => { setSubCategory(opt.key); Haptics.selectionAsync(); }}>
                    <View style={styles.optionLeft}>
                      <Text style={[styles.optionLabel, subCategory === opt.key && styles.optionLabelActive]}>{opt.label}</Text>
                      <Text style={styles.optionDesc}>{opt.desc}</Text>
                    </View>
                    {subCategory === opt.key && <Ionicons name="checkmark-circle" size={20} color={Colors.ocean} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {moveInDate && moveOutDate && getDurationDays(moveInDate, moveOutDate) > 0 && getDurationDays(moveInDate, moveOutDate) <= 14 && (
              <View style={styles.field}>
                <Text style={styles.label}>Event / Category <Text style={{ color: "#FF6B4E" }}>*</Text></Text>
                <Text style={[styles.fieldHint, { marginBottom: 8 }]}>Short stay ({getDurationDays(moveInDate, moveOutDate)} days) — select the event</Text>
                <View style={styles.chipRow}>
                  {SHORT_TERM_EVENTS.map(evt => (
                    <TouchableOpacity key={evt} style={[styles.chip, eventTag === evt && styles.chipActive]}
                      onPress={() => { setEventTag(evt); Haptics.selectionAsync(); }}>
                      <Text style={[styles.chipText, eventTag === evt && styles.chipTextActive]}>{evt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 12 }]}>
        {step < TOTAL_STEPS - 1 ? (
          <TouchableOpacity
            style={[styles.nextBtn, !stepValid(step) && { backgroundColor: DISABLED_BG, elevation: 0, shadowOpacity: 0 }]}
            onPress={goNext}
            disabled={!stepValid(step)}
          >
            <Text style={[styles.nextBtnText, !stepValid(step) && { color: DISABLED_TEXT }]}>Next</Text>
            <Ionicons name="arrow-forward" size={18} color={stepValid(step) ? Colors.white : DISABLED_TEXT} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitBtn, (canSubmit && !uploading) ? { backgroundColor: Colors.coral } : { backgroundColor: DISABLED_BG, elevation: 0, shadowOpacity: 0 }]}
            onPress={handleSubmit}
            disabled={!canSubmit || uploading}
          >
            <Ionicons name="sparkles" size={20} color={(canSubmit && !uploading) ? Colors.white : DISABLED_TEXT} />
            <Text style={[styles.submitBtnText, (!canSubmit || uploading) && { color: DISABLED_TEXT }]}>
              {uploading ? "Uploading photos…" : "Publish Listing ✨"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.cardBg,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontFamily: "Nunito_700Bold", fontSize: 17, color: Colors.darkTeal },
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  stepDots: { flexDirection: "row", gap: 5 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.borderSoft },
  stepDotActive: { backgroundColor: Colors.ocean },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  sectionTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.darkTeal },
  sectionSub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, marginTop: -8 },
  field: { gap: 8 },
  label: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  fieldHint: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textLight },
  input: {
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.borderSoft,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Nunito_400Regular",
    fontSize: 15, color: Colors.charcoal,
  },
  textArea: { height: 90, paddingTop: 12 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  priceDollar: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.ocean },
  priceInput: {
    flex: 1, backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.ocean,
  },
  priceMonth: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textMuted },
  optionCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 12,
  },
  optionCardActive: { borderColor: Colors.ocean, backgroundColor: Colors.ocean + "10" },
  optionLeft: { flex: 1 },
  optionLabel: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  optionLabelActive: { color: Colors.ocean },
  optionDesc: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  landlordDot: { width: 12, height: 12, borderRadius: 6 },
  warningBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderLeftWidth: 3, borderRadius: 10, padding: 12, marginTop: 4,
  },
  warningText: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.charcoal, flex: 1, lineHeight: 18 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  chipActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  chipText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.textMuted },
  chipTextActive: { color: Colors.white },
  toggleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 14,
  },
  toggleTitle: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  toggleDesc: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  toggle: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
    backgroundColor: Colors.sandDark, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  toggleOn: { backgroundColor: Colors.grassGreen, borderColor: Colors.grassGreen },
  toggleText: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.textMuted },
  toggleTextOn: { color: Colors.white },
  summerSubmenu: {
    backgroundColor: "rgba(44, 85, 92, 0.05)",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  parkingToggle: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  parkingLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#2C555C",
  },
  breakOptions: { gap: 8 },
  breakOptionsLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted },
  photoGrid: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  photoSlot: {
    width: "31%", aspectRatio: 3 / 4, borderRadius: 14, overflow: "hidden",
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  photoEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  photoLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 11, color: Colors.textLight, textAlign: "center" },
  photoImage: { width: "100%", height: "100%", resizeMode: "cover" },
  photoLabelOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.55)", paddingVertical: 4, alignItems: "center",
  },
  photoLabelOverlayText: { fontFamily: "Nunito_700Bold", fontSize: 10, color: Colors.white },
  photoHint: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textLight, marginTop: 4 },
  floorPlanSlot: {
    width: "100%", aspectRatio: 16 / 9, borderRadius: 14, overflow: "hidden",
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
    borderStyle: "dashed" as const,
  },
  floorPlanEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  floorPlanImage: { width: "100%", height: "100%", resizeMode: "cover" as const },
  amenitySection: { gap: 8, marginBottom: 8 },
  amenitySectionTitle: {
    fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  amenityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenityToggle: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12,
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  amenityToggleActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  amenityToggleText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted },
  amenityToggleTextActive: { color: Colors.white },
  datePickerBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, paddingHorizontal: 14, paddingVertical: 13,
  },
  datePickerText: {
    flex: 1, fontFamily: "Nunito_600SemiBold", fontSize: 15, color: Colors.ocean,
  },
  calendarContainer: {
    backgroundColor: Colors.cardBg, borderRadius: 14, padding: 12, marginTop: 4,
    borderWidth: 1, borderColor: Colors.borderSoft,
  },
  calendarHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 12, paddingHorizontal: 4,
  },
  calendarTitle: {
    fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.ocean,
  },
  calendarDayHeaders: {
    flexDirection: "row",
  },
  calendarDayHeaderCell: {
    flex: 1, alignItems: "center", paddingVertical: 4,
  },
  calendarDayHeaderText: {
    fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted,
  },
  calendarGrid: {
    flexDirection: "row", flexWrap: "wrap",
  },
  calendarDayCell: {
    width: "14.28%" as any, aspectRatio: 1, alignItems: "center" as const, justifyContent: "center" as const,
  },
  calendarDayCellActive: {
    backgroundColor: Colors.ocean, borderRadius: 20,
  },
  calendarDayCellToday: {
    borderWidth: 1.5, borderColor: Colors.ocean, borderRadius: 20,
  },
  calendarDayText: {
    fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.charcoal,
  },
  calendarDayTextActive: { color: Colors.white },
  calendarDayTextDisabled: { color: Colors.borderSoft },
  calendarDayTextToday: { color: Colors.ocean },
  yearGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center",
  },
  yearCell: {
    width: 70, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.sand, borderWidth: 1, borderColor: Colors.borderSoft,
  },
  yearCellActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  yearCellText: { fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.charcoal },
  yearCellTextActive: { color: Colors.white },
  footer: {
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: Colors.warmCream, borderTopWidth: 1, borderTopColor: Colors.borderSoft,
  },
  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.ocean, borderRadius: 14, paddingVertical: 14,
  },
  nextBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.white },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.coral, borderRadius: 14, paddingVertical: 14,
  },
  submitBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.white },
  gatewayBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.darkTeal + "12", borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: Colors.darkTeal + "25", marginBottom: 4,
  },
  gatewayBannerText: {
    fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.darkTeal, flex: 1, lineHeight: 18,
  },
});
