import React, {
  createContext, useContext, useState, useEffect,
  useMemo, useRef, ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { fn, db, rt } from "@/lib/supabaseClient";

// ─── Types (unchanged public API) ────────────────────────────
export type LeaseType = "full_year" | "fall_sublease" | "spring_sublease" | "summer_sublease";
export type GenderPref = "girls_only" | "boys_only" | "mixed";
export type Zone = "campustown" | "north" | "south" | "urbana" | "downtown";
export type Landlord = "jsm" | "ugroup" | "bailey" | "american" | "smile" | "cpm" | "green_st_realty" | "other";
export type BreakType = "thanksgiving" | "spring_break" | "winter";
export type Intent = "host" | "joiner" | "co_seeker" | "sublessor" | "sublessee";
export type CleaningFrequency = "daily" | "weekly" | "monthly";
export type ShoePolicy = "shoes_off" | "front_door" | "no_policy";
export type KitchenType = "private" | "communal";
export type BathroomType = "private" | "shared";

export interface Amenities {
  isFurnished: boolean; hasLaundry: boolean; hasWifi: boolean; hasAC: boolean;
  hasStudyLounge: boolean; hasPrinting: boolean; hasBikeStorage: boolean; hasSecurity: boolean;
  utilsIncluded: boolean; noDeposit: boolean; parkingIncluded: boolean;
  hasGym: boolean; hasPool: boolean; hasElevator: boolean; hasRooftop: boolean; hasLockers: boolean;
}

export const DEFAULT_AMENITIES: Amenities = {
  isFurnished: false, hasLaundry: false, hasWifi: false, hasAC: false,
  hasStudyLounge: false, hasPrinting: false, hasBikeStorage: false, hasSecurity: false,
  utilsIncluded: false, noDeposit: false, parkingIncluded: false,
  hasGym: false, hasPool: false, hasElevator: false, hasRooftop: false, hasLockers: false,
};

export type StarSign = "aries"|"taurus"|"gemini"|"cancer"|"leo"|"virgo"|"libra"|"scorpio"|"sagittarius"|"capricorn"|"aquarius"|"pisces";
export type MBTI = "INTJ"|"INTP"|"ENTJ"|"ENTP"|"INFJ"|"INFP"|"ENFJ"|"ENFP"|"ISTJ"|"ISFJ"|"ESTJ"|"ESFJ"|"ISTP"|"ISFP"|"ESTP"|"ESFP"|"idk";
export type CollegeYear = "freshman"|"sophomore"|"junior"|"senior"|"grad_phd";
export type GreekLife = "independent"|"sorority"|"fraternity"|"prof_frat";

export interface VibeProfile {
  identity: "girl"|"guy"|"nonbinary"; lookingFor: "girls"|"guys"|"coed";
  starSign?: StarSign; mbti?: MBTI; year?: CollegeYear; greekLife?: GreekLife;
  vices: string[]; pets: string[]; sleep?: string; alarms?: string;
  cleanlinessVibe?: string; groceries?: string; guests?: string;
  prompt?: string; promptAnswer?: string;
}

export interface UserProfile {
  id: string; name: string; email: string; major: string; bio: string;
  budget: number; gender: "female"|"male"|"nonbinary"; genderPref: GenderPref;
  cleanliness: number; noise: number; leaseType: LeaseType; zone: Zone;
  landlords: Landlord[]; staysThanksgiving: boolean; staysSpringBreak: boolean;
  avatarColor: string; profileImage?: string; college?: string;
  organizations?: string[]; intent?: Intent; vibeProfile?: VibeProfile;
}

export interface FriendRecord {
  email: string; name: string; avatarColor: string; major?: string;
  college?: string; organizations?: string[]; vouchedByMe: boolean; timestamp: number;
}

export interface MutualFriend { name: string; email: string; avatarColor: string; }

export interface SubleasePost {
  id: string; userId: string; userName: string; userEmail: string;
  buildingName: string; address: string; leaseType: LeaseType;
  pricePerMonth: number; landlords: Landlord[]; zone: Zone;
  availableDuringBreaks: boolean; breakTypes: BreakType[];
  description: string; avatarColor: string; timestamp: number;
  category?: string; kitchenType?: KitchenType; bathroomType?: BathroomType;
  unitType?: string; isPrivateBedroom?: boolean; isPrivateBathroom?: boolean;
  floorPlanUrl?: string; roomsAvailable?: number; currentResidentBio?: string;
  listingType?: "sublease"|"roommate"; moveInDate?: string; moveOutDate?: string;
  amenities?: Amenities; cleaningFrequency?: CleaningFrequency; shoePolicy?: ShoePolicy;
  images?: string[]; eventTag?: string; subCategory?: string;
  hasParking?: boolean; roommatePreference?: string;
}

export type ConversationSource = "sublease"|"coseeker"|"crash_cash"|"market";

export interface Conversation {
  id: string; participant1Id: string; participant2Id: string;
  listingId: string; listingBuilding: string; listingPrice: number;
  listingUnitType?: string; lastMessage?: string; lastMessageAt?: number;
  otherUserName?: string; otherUserAvatar?: string; otherUserEmail?: string;
  otherUserProfileImage?: string; source?: ConversationSource;
}

export interface ChatMessage {
  id: string; conversationId: string; senderId: string; content: string; createdAt: number;
}

export type CrashVibe = "sos"|"offering";
export type CrashCurrency = "cash"|"boba"|"lion_cover"|"food"|"favor";
export type CrashPostStatus = "active"|"completed";

export interface CrashPost {
  id: string; userId: string; userName: string; userEmail: string;
  avatarColor: string; vibe: CrashVibe; story: string; imageUrl: string;
  dates: string; targetDate: number; zone: Zone; currency: CrashCurrency;
  currencyLabel: string; timestamp: number; status: CrashPostStatus; approxLocation?: string;
}

export interface MatchRecord { userId: string; score: number; liked: boolean; timestamp: number; }

export interface TrustInfo {
  degree: 1|2|null; vouchedByFriend: string|null; sharedOrg: string|null;
  isFriend: boolean; mutualFriends: MutualFriend[];
}

// ─── DB row → frontend type mappers ──────────────────────────
function mapDbUser(row: any): UserProfile {
  const vibe = Array.isArray(row.user_vibe_profiles)
    ? row.user_vibe_profiles[0]
    : row.user_vibe_profiles;
  return {
    id:               row.id,
    name:             row.name,
    email:            row.email,
    major:            row.major ?? "",
    bio:              row.bio ?? "",
    budget:           row.budget ?? 800,
    gender:           row.gender ?? "nonbinary",
    genderPref:       row.gender_pref ?? "mixed",
    cleanliness:      row.cleanliness ?? 3,
    noise:            row.noise ?? 3,
    leaseType:        row.lease_type ?? "full_year",
    zone:             row.zone ?? "campustown",
    landlords:        (row.user_landlord_prefs ?? []).map((l: any) => l.landlord),
    staysThanksgiving: row.stays_thanksgiving ?? false,
    staysSpringBreak:  row.stays_spring_break ?? false,
    avatarColor:      row.avatar_color ?? "#005F73",
    profileImage:     row.profile_image_url ?? undefined,
    college:          row.college ?? "",
    organizations:    (row.user_organizations ?? []).map((o: any) => o.organization),
    intent:           row.intent ?? undefined,
    vibeProfile: vibe ? {
      identity:        vibe.identity,
      lookingFor:      vibe.looking_for,
      starSign:        vibe.star_sign ?? undefined,
      mbti:            vibe.mbti ?? undefined,
      year:            vibe.year ?? undefined,
      greekLife:       vibe.greek_life ?? undefined,
      vices:           (vibe.user_vibe_vices ?? []).map((v: any) => v.vice),
      pets:            (vibe.user_vibe_pets ?? []).map((p: any) => p.pet),
      sleep:           vibe.sleep ?? undefined,
      alarms:          vibe.alarms ?? undefined,
      cleanlinessVibe: vibe.cleanliness_vibe ?? undefined,
      groceries:       vibe.groceries ?? undefined,
      guests:          vibe.guests ?? undefined,
      prompt:          vibe.prompt ?? undefined,
      promptAnswer:    vibe.prompt_answer ?? undefined,
    } : undefined,
  };
}

function mapDbListing(row: any): SubleasePost {
  // PostgREST may return listing_amenities as an object or a single-element array
  const amenRow = Array.isArray(row.listing_amenities)
    ? row.listing_amenities[0]
    : row.listing_amenities;
  return {
    id:                   row.id,
    userId:               row.user_id,
    userName:             row.users?.name ?? "Unknown",
    userEmail:            row.users?.email ?? "",
    buildingName:         row.building_name,
    address:              row.address ?? "",
    leaseType:            row.lease_type,
    pricePerMonth:        row.price_per_month,
    landlords:            (row.listing_landlords ?? []).map((l: any) => l.landlord),
    zone:                 row.zone,
    availableDuringBreaks: row.available_during_breaks,
    breakTypes:           (row.listing_break_types ?? []).map((b: any) => b.break_type),
    description:          row.description ?? "",
    avatarColor:          row.users?.avatar_color ?? "#005F73",
    timestamp:            new Date(row.created_at).getTime(),
    category:             row.category,
    subCategory:          row.sub_category ?? undefined,
    kitchenType:          row.kitchen_type ?? undefined,
    bathroomType:         row.bathroom_type ?? undefined,
    unitType:             row.unit_type ?? undefined,
    isPrivateBedroom:     row.is_private_bedroom,
    isPrivateBathroom:    row.is_private_bathroom,
    floorPlanUrl:         row.floor_plan_url ?? undefined,
    roomsAvailable:       row.rooms_available ?? undefined,
    currentResidentBio:   row.current_resident_bio ?? undefined,
    listingType:          row.listing_type,
    moveInDate:           row.move_in_date ?? undefined,
    moveOutDate:          row.move_out_date ?? undefined,
    amenities: amenRow ? {
      isFurnished:     amenRow.is_furnished,   hasLaundry:   amenRow.has_laundry,
      hasWifi:         amenRow.has_wifi,        hasAC:        amenRow.has_ac,
      hasStudyLounge:  amenRow.has_study_lounge, hasPrinting: amenRow.has_printing,
      hasBikeStorage:  amenRow.has_bike_storage, hasSecurity: amenRow.has_security,
      utilsIncluded:   amenRow.utils_included,  noDeposit:   amenRow.no_deposit,
      parkingIncluded: amenRow.parking_included, hasGym:     amenRow.has_gym,
      hasPool:         amenRow.has_pool,        hasElevator: amenRow.has_elevator,
      hasRooftop:      amenRow.has_rooftop,     hasLockers:  amenRow.has_lockers,
    } : undefined,
    cleaningFrequency: row.cleaning_frequency ?? undefined,
    shoePolicy:        row.shoe_policy ?? undefined,
    images: (row.listing_images ?? [])
      .sort((a: any, b: any) => a.display_order - b.display_order)
      .map((i: any) => i.url),
    eventTag:          row.event_tag ?? undefined,
    hasParking:        row.has_parking,
    roommatePreference: row.roommate_preference ?? undefined,
  };
}

function mapDbConversation(row: any, myId: string): Conversation {
  const iAmP1 = row.participant1_id === myId;
  const other = iAmP1 ? row.p2 : row.p1;
  return {
    id:               row.id,
    participant1Id:   row.participant1_id,
    participant2Id:   row.participant2_id,
    listingId:        row.listing_ref ?? "",
    listingBuilding:  row.listing_building ?? "",
    listingPrice:     row.listing_price ?? 0,
    listingUnitType:  row.listing_unit_type ?? undefined,
    otherUserName:    other?.name,
    otherUserAvatar:  other?.avatar_color,
    otherUserEmail:   other?.email,
    otherUserProfileImage: other?.profile_image_url ?? undefined,
    source:           row.source ?? undefined,
  };
}

function mapDbMessage(row: any): ChatMessage {
  return {
    id:             row.id,
    conversationId: row.conversation_id,
    senderId:       row.sender_id,
    content:        row.content,
    createdAt:      new Date(row.created_at).getTime(),
  };
}

function mapDbCrashPost(row: any): CrashPost {
  return {
    id:           row.id,
    userId:       row.user_id,
    userName:     row.users?.name ?? "Unknown",
    userEmail:    row.users?.email ?? "",
    avatarColor:  row.users?.avatar_color ?? "#005F73",
    vibe:         row.vibe,
    story:        row.story,
    imageUrl:     row.image_url ?? "",
    dates:        row.dates ?? "",
    targetDate:   new Date(row.target_date).getTime(),
    zone:         row.zone,
    currency:     row.currency,
    currencyLabel: row.currency_label ?? "",
    timestamp:    new Date(row.created_at).getTime(),
    status:       row.status,
    approxLocation: row.approx_location ?? undefined,
  };
}

// ─── Mock users for Matchmaker (stay local, no real users to match yet) ──
export const MOCK_USERS: UserProfile[] = [
  {
    id:"u1",name:"Mei Lin",email:"meilin2@illinois.edu",major:"Computer Science",
    bio:"Early riser, love cooking Asian food. Looking for a quiet study buddy!",
    budget:850,gender:"female",genderPref:"girls_only",cleanliness:5,noise:2,
    leaseType:"fall_sublease",zone:"north",landlords:["jsm"],
    staysThanksgiving:false,staysSpringBreak:true,avatarColor:"#1A7AAF",
    college:"Grainger",organizations:["ACM@UIUC","WCS"],
    vibeProfile:{identity:"girl",lookingFor:"girls",starSign:"virgo",mbti:"INTJ",year:"junior",vices:["no_vices"],pets:["cats"],sleep:"early_bird",alarms:"one_alarm",cleanlinessVibe:"neat_freak",groceries:"meal_prep",guests:"occasional",prompt:"My toxic living habit is...",promptAnswer:"Reorganizing the entire kitchen at midnight."},
  },
  {
    id:"u2",name:"Priya Sharma",email:"psharma4@illinois.edu",major:"Finance",
    bio:"Coffee addict, gym rat. Weekend brunches and casual hangouts.",
    budget:950,gender:"female",genderPref:"girls_only",cleanliness:4,noise:3,
    leaseType:"spring_sublease",zone:"campustown",landlords:["bailey"],
    staysThanksgiving:true,staysSpringBreak:true,avatarColor:"#CC5500",
    college:"Gies",organizations:["Illini Finance Club","DECA"],
    vibeProfile:{identity:"girl",lookingFor:"girls",starSign:"leo",mbti:"ENFJ",year:"senior",greekLife:"sorority",vices:["social_smoker"],pets:["no_pets"],sleep:"night_owl",alarms:"multiple_alarms",cleanlinessVibe:"tidy",groceries:"takeout",guests:"love_hosting",prompt:"The way to my heart is...",promptAnswer:"Sunday brunch and a solid skincare routine."},
  },
  {
    id:"u3",name:"Jake Torres",email:"jtorres6@illinois.edu",major:"Mechanical Engineering",
    bio:"Night owl who loves gaming and pizza runs at 2am. Very chill.",
    budget:750,gender:"male",genderPref:"mixed",cleanliness:3,noise:4,
    leaseType:"full_year",zone:"north",landlords:["ugroup"],
    staysThanksgiving:true,staysSpringBreak:false,avatarColor:"#5A8A5A",
    college:"Grainger",organizations:["SWE","Tau Beta Pi"],
    vibeProfile:{identity:"guy",lookingFor:"coed",starSign:"sagittarius",mbti:"ISTP",year:"junior",vices:["420_friendly","drinks_socially"],pets:["no_pets"],sleep:"night_owl",alarms:"no_alarm",cleanlinessVibe:"organized_chaos",groceries:"snack_hoarder",guests:"love_hosting",prompt:"My toxic living habit is...",promptAnswer:"Leaving my gaming headset on the kitchen counter."},
  },
  {
    id:"u4",name:"Aisha Okonkwo",email:"aokonkwo@illinois.edu",major:"Psychology",
    bio:"Plant mom, sunset chaser, and podcast listener. Clean and organized.",
    budget:800,gender:"female",genderPref:"girls_only",cleanliness:5,noise:2,
    leaseType:"full_year",zone:"urbana",landlords:["other"],
    staysThanksgiving:false,staysSpringBreak:false,avatarColor:"#E07B00",
    college:"LAS",organizations:["BSA","Illini 4000"],
    vibeProfile:{identity:"girl",lookingFor:"girls",starSign:"pisces",mbti:"INFP",year:"sophomore",vices:["no_vices"],pets:["plants"],sleep:"early_bird",alarms:"one_alarm",cleanlinessVibe:"neat_freak",groceries:"meal_prep",guests:"occasional",prompt:"I need a roommate who...",promptAnswer:"Won't judge my 47 houseplants."},
  },
  {
    id:"u5",name:"Marcus Webb",email:"mwebb3@illinois.edu",major:"Architecture",
    bio:"Studio hours are late but I keep my space spotless. Love jazz.",
    budget:900,gender:"male",genderPref:"boys_only",cleanliness:4,noise:2,
    leaseType:"fall_sublease",zone:"downtown",landlords:["american"],
    staysThanksgiving:false,staysSpringBreak:false,avatarColor:"#9B59B6",
    college:"FAA",organizations:["AIAS"],
    vibeProfile:{identity:"guy",lookingFor:"guys",starSign:"capricorn",mbti:"INTJ",year:"senior",vices:["no_vices"],pets:["no_pets"],sleep:"night_owl",alarms:"one_alarm",cleanlinessVibe:"neat_freak",groceries:"meal_prep",guests:"rarely",prompt:"The way to my heart is...",promptAnswer:"Good jazz and a clean kitchen counter."},
  },
  {
    id:"u6",name:"Sofia Reyes",email:"sreyes2@illinois.edu",major:"Biology",
    bio:"Pre-med grind, but I make time for friends. Quiet during finals week!",
    budget:700,gender:"female",genderPref:"girls_only",cleanliness:4,noise:2,
    leaseType:"spring_sublease",zone:"south",landlords:["jsm"],
    staysThanksgiving:true,staysSpringBreak:true,avatarColor:"#5A8A5A",
    college:"LAS",organizations:["Illini Pre-Med","Phi Delta Epsilon"],
    vibeProfile:{identity:"girl",lookingFor:"girls",starSign:"cancer",mbti:"ISFJ",year:"junior",greekLife:"prof_frat",vices:["drinks_socially"],pets:["cats"],sleep:"early_bird",alarms:"multiple_alarms",cleanlinessVibe:"tidy",groceries:"meal_prep",guests:"occasional",prompt:"My toxic living habit is...",promptAnswer:"Studying in the living room until 3am during finals."},
  },
  {
    id:"u7",name:"Liam Park",email:"lpark9@illinois.edu",major:"Statistics",
    bio:"Data nerd by day, chef by night. My bibimbap will change your life.",
    budget:850,gender:"male",genderPref:"mixed",cleanliness:3,noise:3,
    leaseType:"full_year",zone:"campustown",landlords:["ugroup"],
    staysThanksgiving:false,staysSpringBreak:true,avatarColor:"#E0BC00",
    college:"LAS",organizations:["Korean Cultural Association","DataSci@UIUC"],
    vibeProfile:{identity:"guy",lookingFor:"coed",starSign:"gemini",mbti:"ENTP",year:"senior",vices:["drinks_socially"],pets:["no_pets"],sleep:"night_owl",alarms:"multiple_alarms",cleanlinessVibe:"organized_chaos",groceries:"snack_hoarder",guests:"love_hosting",prompt:"I need a roommate who...",promptAnswer:"Appreciates a home-cooked Korean meal at midnight."},
  },
  {
    id:"u8",name:"Zoe Mitchell",email:"zmitchell@illinois.edu",major:"Journalism",
    bio:"Always writing, always reading. I have a cat (hypoallergenic!).",
    budget:780,gender:"female",genderPref:"girls_only",cleanliness:4,noise:1,
    leaseType:"spring_sublease",zone:"urbana",landlords:["other"],
    staysThanksgiving:true,staysSpringBreak:false,avatarColor:"#CC5500",
    college:"Media",organizations:["Daily Illini","SPJ"],
    vibeProfile:{identity:"girl",lookingFor:"girls",starSign:"aquarius",mbti:"INFJ",year:"sophomore",vices:["no_vices"],pets:["cats"],sleep:"early_bird",alarms:"one_alarm",cleanlinessVibe:"tidy",groceries:"meal_prep",guests:"rarely",prompt:"The way to my heart is...",promptAnswer:"Quiet reading time with my cat on the couch."},
  },
];

function computeScore(a: UserProfile, b: UserProfile): number {
  const budgetDiff = (a.budget - b.budget) / 500;
  const cleanDiff  = (a.cleanliness - b.cleanliness) / 4;
  const noiseDiff  = (a.noise - b.noise) / 4;
  const zoneDiff   = a.zone === b.zone ? 0 : 1;
  const D = Math.sqrt(
    0.35*budgetDiff*budgetDiff + 0.25*cleanDiff*cleanDiff +
    0.20*noiseDiff*noiseDiff  + 0.20*zoneDiff*zoneDiff
  );
  return Math.max(0, Math.round((1 - D) * 100));
}

// ─── Context interface ────────────────────────────────────────
interface AppContextValue {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => Promise<void>;
  isOnboarded: boolean;
  setIsOnboarded: (v: boolean) => Promise<void>;
  otpVerifiedEmail: string;
  setOtpVerifiedEmail: (email: string) => void;
  mockUsers: UserProfile[];
  matches: MatchRecord[];
  addMatch: (record: MatchRecord) => Promise<void>;
  scamBannerDismissed: boolean;
  dismissScamBanner: () => void;
  likedUserIds: string[];
  passedUserIds: string[];
  addLiked: (id: string) => Promise<void>;
  addPassed: (id: string) => Promise<void>;
  computeScore: (a: UserProfile, b: UserProfile) => number;
  subleases: SubleasePost[];
  addSublease: (post: SubleasePost) => Promise<void>;
  removeSublease: (id: string) => Promise<void>;
  crashPosts: CrashPost[];
  addCrashPost: (post: CrashPost) => Promise<void>;
  updateCrashPost: (id: string, updates: Partial<CrashPost>) => Promise<void>;
  friends: FriendRecord[];
  addFriend: (friend: Omit<FriendRecord, "vouchedByMe"|"timestamp">) => Promise<void>;
  removeFriend: (email: string) => Promise<void>;
  toggleVouch: (email: string) => Promise<void>;
  getTrustInfo: (userEmail: string) => TrustInfo;
  conversations: Conversation[];
  startConversation: (
    targetUserId: string, targetName: string, targetAvatar: string, targetEmail: string,
    listingId: string, listingBuilding: string, listingPrice: number,
    listingUnitType?: string, targetProfileImage?: string, source?: ConversationSource
  ) => Promise<string>;
  startMatchConversation: (targetUser: UserProfile) => Promise<string>;
  sendMessage: (conversationId: string, content: string) => void;
  getMessages: (conversationId: string) => ChatMessage[];
  loadMessages: (conversationId: string) => Promise<void>;
  mockLikedByIds: string[];
}

const MOCK_LIKED_BY_IDS = ["u1", "u3", "u5", "u7"];
const AppContext = createContext<AppContextValue | null>(null);

// ─── Helper: get Firebase ID token ───────────────────────────
async function getToken(): Promise<string> {
  return auth.currentUser?.getIdToken() ?? "";
}

// ─── Provider ────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState]       = useState<UserProfile | null>(null);
  const [supabaseUserId, setSupabaseUserId]       = useState<string | null>(null);
  const [isOnboarded, setIsOnboardedState]        = useState(false);
  const [otpVerifiedEmail, setOtpVerifiedEmailState] = useState("");
  const [matches, setMatches]                     = useState<MatchRecord[]>([]);
  const [scamBannerDismissed, setScamBannerDismissed] = useState(false);
  const [likedUserIds, setLikedUserIds]           = useState<string[]>([]);
  const [passedUserIds, setPassedUserIds]         = useState<string[]>([]);
  const [subleases, setSubleases]                 = useState<SubleasePost[]>([]);
  const [crashPosts, setCrashPosts]               = useState<CrashPost[]>([]);
  const [friends, setFriends]                     = useState<FriendRecord[]>([]);
  const [conversations, setConversations]         = useState<Conversation[]>([]);
  const [chatMessages, setChatMessages]           = useState<Record<string, ChatMessage[]>>({});

  // Real-time cleanup refs
  const rtListings  = useRef<(() => void) | null>(null);
  const rtCrash     = useRef<(() => void) | null>(null);
  const rtConvos    = useRef<(() => void) | null>(null);
  const msgChannels = useRef<Record<string, () => void>>({});

  // ── Local-only preferences (device-only, not synced across devices) ──
  useEffect(() => {
    (async () => {
      try {
        const [onb, scam, liked, passed, storedMatches] = await Promise.all([
          AsyncStorage.getItem("@popmatch_onboarded"),
          AsyncStorage.getItem("@popmatch_scam"),
          AsyncStorage.getItem("@popmatch_liked"),
          AsyncStorage.getItem("@popmatch_passed"),
          AsyncStorage.getItem("@popmatch_matches"),
        ]);
        if (onb === "true")      setIsOnboardedState(true);
        if (scam === "true")     setScamBannerDismissed(true);
        if (liked)               setLikedUserIds(JSON.parse(liked));
        if (passed)              setPassedUserIds(JSON.parse(passed));
        if (storedMatches)       setMatches(JSON.parse(storedMatches));
      } catch {}
    })();
  }, []);

  // ── Load public data (listings + crash posts) on mount ────────
  useEffect(() => {
    loadListings();
    loadCrashPosts();

    // Real-time: listing changes
    rtListings.current = rt.onListingChange((event, listing) => {
      if (event === "INSERT") {
        // Will be fetched with full joins on next load; reload
        loadListings();
      } else if (event === "UPDATE" && listing.is_leased) {
        setSubleases(prev => prev.filter(s => s.id !== listing.id));
      }
    });

    // Real-time: crash post changes
    rtCrash.current = rt.onCrashChange((event, post) => {
      if (event === "INSERT") loadCrashPosts();
      else if (event === "UPDATE") {
        setCrashPosts(prev => prev.map(p =>
          p.id === post.id ? { ...p, status: post.status as CrashPostStatus } : p
        ));
      }
    });

    return () => {
      rtListings.current?.();
      rtCrash.current?.();
    };
  }, []);

  // ── Firebase auth state drives Supabase user load ──────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setCurrentUserState(null);
        setSupabaseUserId(null);
        setFriends([]);
        setConversations([]);
        rtConvos.current?.();
        return;
      }

      try {
        const row = await db.getUserByFirebaseUid(fbUser.uid);
        if (row) {
          const profile = mapDbUser(row);
          setCurrentUserState(profile);
          setSupabaseUserId(row.id);
          await loadUserData(row.id);
        }
      } catch (err) {
        console.warn("AppContext: failed to load Supabase user", err);
      }
    });
    return unsub;
  }, []);

  async function loadListings() {
    try {
      const rows = await db.getListings();
      setSubleases(rows.map(mapDbListing));
    } catch (err) {
      console.warn("loadListings failed", err);
    }
  }

  async function loadCrashPosts() {
    try {
      const rows = await db.getCrashPosts();
      setCrashPosts(rows.map(mapDbCrashPost));
    } catch (err) {
      console.warn("loadCrashPosts failed", err);
    }
  }

  async function loadUserData(uid: string) {
    try {
      const [friendRows, vouchRows, convoRows] = await Promise.all([
        db.getFriends(uid),
        db.getVouchesGiven(uid),
        db.getConversations(uid),
      ]);

      const vouchedIds = new Set(vouchRows.map((v: any) => v.vouchee_id));

      setFriends(friendRows.map((f: any) => ({
        email:         f.users?.email ?? "",
        name:          f.users?.name ?? "",
        avatarColor:   f.users?.avatar_color ?? "#005F73",
        major:         f.users?.major ?? "",
        college:       f.users?.college ?? "",
        organizations: (f.users?.user_organizations ?? []).map((o: any) => o.organization),
        vouchedByMe:   vouchedIds.has(f.friend_id),
        timestamp:     new Date(f.created_at ?? Date.now()).getTime(),
      })));

      setConversations(convoRows.map((r: any) => mapDbConversation(r, uid)));

      // Real-time: new conversations
      rtConvos.current?.();
      rtConvos.current = rt.onConversationChange(uid, (newConvo) => {
        setConversations(prev => {
          if (prev.some(c => c.id === newConvo.id)) return prev;
          return [mapDbConversation(newConvo, uid), ...prev];
        });
      });
    } catch (err) {
      console.warn("loadUserData failed", err);
    }
  }

  // ── Public actions ─────────────────────────────────────────

  const setCurrentUser = async (user: UserProfile | null) => {
    if (!user) {
      setCurrentUserState(null);
      setSupabaseUserId(null);
      return;
    }
    // Save to Supabase via Edge Function, then reload canonical version
    try {
      const token = await getToken();
      const { id } = await fn.upsertUser(token, {
        name:             user.name,
        major:            user.major,
        bio:              user.bio,
        budget:           user.budget,
        gender:           user.gender,
        genderPref:       user.genderPref,
        cleanliness:      user.cleanliness,
        noise:            user.noise,
        leaseType:        user.leaseType,
        zone:             user.zone,
        staysThanksgiving: user.staysThanksgiving,
        staysSpringBreak:  user.staysSpringBreak,
        avatarColor:      user.avatarColor,
        profileImageUrl:  user.profileImage,
        college:          user.college,
        intent:           user.intent,
        organizations:    user.organizations ?? [],
        landlords:        user.landlords,
        vibeProfile:      user.vibeProfile ? {
          identity:        user.vibeProfile.identity,
          lookingFor:      user.vibeProfile.lookingFor,
          starSign:        user.vibeProfile.starSign,
          mbti:            user.vibeProfile.mbti,
          year:            user.vibeProfile.year,
          greekLife:       user.vibeProfile.greekLife,
          vices:           user.vibeProfile.vices,
          pets:            user.vibeProfile.pets,
          sleep:           user.vibeProfile.sleep,
          alarms:          user.vibeProfile.alarms,
          cleanlinessVibe: user.vibeProfile.cleanlinessVibe,
          groceries:       user.vibeProfile.groceries,
          guests:          user.vibeProfile.guests,
          prompt:          user.vibeProfile.prompt,
          promptAnswer:    user.vibeProfile.promptAnswer,
        } : undefined,
      });

      setSupabaseUserId(id);
      // Reload the canonical version from DB
      const fresh = await db.getUserByFirebaseUid(auth.currentUser?.uid ?? "");
      if (fresh) {
        const profile = mapDbUser(fresh);
        setCurrentUserState(profile);
        await loadUserData(id);
      } else {
        setCurrentUserState({ ...user, id });
      }
    } catch (err) {
      console.error("setCurrentUser failed", err);
      // Optimistic fallback: set locally so UI doesn't break
      setCurrentUserState(user);
    }
  };

  const setIsOnboarded = async (v: boolean) => {
    setIsOnboardedState(v);
    await AsyncStorage.setItem("@popmatch_onboarded", v ? "true" : "false");
  };

  const setOtpVerifiedEmail = (email: string) => {
    setOtpVerifiedEmailState(email);
  };

  const dismissScamBanner = () => {
    setScamBannerDismissed(true);
    AsyncStorage.setItem("@popmatch_scam", "true");
  };

  const addMatch = async (record: MatchRecord) => {
    const updated = [...matches, record];
    setMatches(updated);
    await AsyncStorage.setItem("@popmatch_matches", JSON.stringify(updated));
    // record-swipe only works for real Supabase users.
    // Mock users (id = "u1".."u8") don't exist in the DB — skip silently.
    const isMockUser = /^u\d+$/.test(record.userId);
    if (!isMockUser) {
      try {
        const token = await getToken();
        if (token) await fn.recordSwipe(token, record.userId, record.liked, record.score);
      } catch {}
    }
  };

  const addLiked = async (id: string) => {
    const updated = [...likedUserIds, id];
    setLikedUserIds(updated);
    await AsyncStorage.setItem("@popmatch_liked", JSON.stringify(updated));
  };

  const addPassed = async (id: string) => {
    const updated = [...passedUserIds, id];
    setPassedUserIds(updated);
    await AsyncStorage.setItem("@popmatch_passed", JSON.stringify(updated));
  };

  const addSublease = async (post: SubleasePost) => {
    // Optimistic update
    setSubleases(prev => [post, ...prev]);
    try {
      const token = await getToken();
      const { id } = await fn.postListing(token, {
        buildingName:        post.buildingName,
        address:             post.address,
        listingType:         post.listingType ?? "sublease",
        category:            post.category ?? "semester_takeover",
        subCategory:         post.subCategory,
        leaseType:           post.leaseType,
        pricePerMonth:       post.pricePerMonth,
        zone:                post.zone,
        availableDuringBreaks: post.availableDuringBreaks,
        description:         post.description,
        unitType:            post.unitType,
        kitchenType:         post.kitchenType,
        bathroomType:        post.bathroomType,
        isPrivateBedroom:    post.isPrivateBedroom,
        isPrivateBathroom:   post.isPrivateBathroom,
        floorPlanUrl:        post.floorPlanUrl,
        roomsAvailable:      post.roomsAvailable,
        currentResidentBio:  post.currentResidentBio,
        moveInDate:          post.moveInDate,
        moveOutDate:         post.moveOutDate,
        eventTag:            post.eventTag,
        cleaningFrequency:   post.cleaningFrequency,
        shoePolicy:          post.shoePolicy,
        hasParking:          post.hasParking,
        roommatePreference:  post.roommatePreference,
        landlords:           post.landlords,
        breakTypes:          post.breakTypes,
        amenities:           post.amenities as Record<string, boolean> | undefined,
        images:              post.images,
      });
      // Replace optimistic entry with real Supabase ID
      setSubleases(prev => prev.map(s => s.id === post.id ? { ...s, id } : s));
    } catch (err) {
      console.error("addSublease failed", err);
      setSubleases(prev => prev.filter(s => s.id !== post.id));
      const msg = err instanceof Error ? err.message : (err as any)?.message ?? "Failed to save listing";
      throw new Error(msg);
    }
  };

  const removeSublease = async (id: string) => {
    setSubleases(prev => prev.filter(s => s.id !== id));
    try {
      const token = await getToken();
      await fn.markLeased(token, id);
    } catch (err) {
      console.error("removeSublease failed", err);
      // Re-load to restore state
      loadListings();
    }
  };

  const addCrashPost = async (post: CrashPost) => {
    setCrashPosts(prev => [post, ...prev]);
    try {
      const token = await getToken();
      const { id } = await fn.postCrash(token, {
        vibe:          post.vibe,
        story:         post.story,
        imageUrl:      post.imageUrl,
        dates:         post.dates,
        targetDate:    new Date(post.targetDate).toISOString(),
        zone:          post.zone,
        currency:      post.currency,
        currencyLabel: post.currencyLabel,
        approxLocation: post.approxLocation,
      });
      setCrashPosts(prev => prev.map(p => p.id === post.id ? { ...p, id } : p));
    } catch (err) {
      console.error("addCrashPost failed", err);
      setCrashPosts(prev => prev.filter(p => p.id !== post.id));
    }
  };

  const updateCrashPost = async (id: string, updates: Partial<CrashPost>) => {
    setCrashPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    if (updates.status) {
      try {
        const token = await getToken();
        await fn.updateCrashStatus(token, id, updates.status);
      } catch (err) {
        console.error("updateCrashPost failed", err);
        loadCrashPosts();
      }
    }
  };

  const addFriend = async (friendData: Omit<FriendRecord, "vouchedByMe"|"timestamp">) => {
    try {
      const token = await getToken();
      await fn.manageFriend(token, "add", friendData.email);
      // Reload friends from Supabase to get canonical state
      if (supabaseUserId) {
        const rows = await db.getFriends(supabaseUserId);
        const vouchRows = await db.getVouchesGiven(supabaseUserId);
        const vouchedIds = new Set(vouchRows.map((v: any) => v.vouchee_id));
        setFriends(rows.map((f: any) => ({
          email: f.users?.email ?? "", name: f.users?.name ?? "",
          avatarColor: f.users?.avatar_color ?? "#005F73",
          major: f.users?.major ?? "", college: f.users?.college ?? "",
          organizations: (f.users?.user_organizations ?? []).map((o: any) => o.organization),
          vouchedByMe: vouchedIds.has(f.friend_id),
          timestamp: new Date(f.created_at ?? Date.now()).getTime(),
        })));
      }
    } catch (err) {
      console.error("addFriend failed", err);
      throw err;
    }
  };

  const removeFriend = async (email: string) => {
    setFriends(prev => prev.filter(f => f.email !== email));
    try {
      const token = await getToken();
      await fn.manageFriend(token, "remove", email);
    } catch (err) {
      console.error("removeFriend failed", err);
      if (supabaseUserId) {
        const rows = await db.getFriends(supabaseUserId);
        setFriends(rows.map((f: any) => ({
          email: f.users?.email ?? "", name: f.users?.name ?? "",
          avatarColor: f.users?.avatar_color ?? "#005F73",
          major: f.users?.major ?? "", college: f.users?.college ?? "",
          organizations: [], vouchedByMe: false, timestamp: Date.now(),
        })));
      }
    }
  };

  const toggleVouch = async (email: string) => {
    // Optimistic toggle
    setFriends(prev => prev.map(f =>
      f.email === email ? { ...f, vouchedByMe: !f.vouchedByMe } : f
    ));
    try {
      const token = await getToken();
      await fn.toggleVouch(token, email);
    } catch (err) {
      console.error("toggleVouch failed", err);
      // Revert optimistic change
      setFriends(prev => prev.map(f =>
        f.email === email ? { ...f, vouchedByMe: !f.vouchedByMe } : f
      ));
    }
  };

  const startConversation = async (
    targetUserId: string, targetName: string, targetAvatar: string, targetEmail: string,
    listingId: string, listingBuilding: string, listingPrice: number,
    listingUnitType?: string, targetProfileImage?: string, source?: ConversationSource
  ): Promise<string> => {
    console.log("startConversation called", {
      currentUser: !!currentUser,
      supabaseUserId,
      targetUserId,
      listingId,
    });

    if (!currentUser) {
      console.warn("startConversation: no currentUser, aborting");
      return "";
    }

    // Use supabaseUserId when available, fall back to currentUser.id for local sessions
    const myId = supabaseUserId ?? currentUser.id;

    // Check for existing conversation locally first
    const existing = conversations.find(c =>
      c.listingId === listingId &&
      ((c.participant1Id === myId && c.participant2Id === targetUserId) ||
       (c.participant1Id === targetUserId && c.participant2Id === myId))
    );
    if (existing) {
      console.log("conversationId returned (existing local):", existing.id);
      return existing.id;
    }

    // If we have a real Supabase user ID, persist the conversation to the DB
    if (supabaseUserId) {
      try {
        const token = await getToken();
        const { id } = await fn.startConversation(token, {
          targetSupabaseId: targetUserId,
          listingRef:       listingId,
          listingBuilding,
          listingPrice,
          listingUnitType,
          source,
        });

        const newConvo: Conversation = {
          id,
          participant1Id:  supabaseUserId,
          participant2Id:  targetUserId,
          listingId,
          listingBuilding,
          listingPrice,
          listingUnitType,
          otherUserName:   targetName,
          otherUserAvatar: targetAvatar,
          otherUserEmail:  targetEmail,
          otherUserProfileImage: targetProfileImage,
          source,
        };
        setConversations(prev => {
          if (prev.some(c => c.id === id)) return prev;
          return [newConvo, ...prev];
        });
        console.log("conversationId returned (supabase):", id);
        return id;
      } catch (err) {
        console.error("startConversation Supabase call failed, using local fallback:", err);
      }
    }

    // Local fallback: works when Supabase user isn't loaded yet
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const fallbackConvo: Conversation = {
      id:              localId,
      participant1Id:  myId,
      participant2Id:  targetUserId,
      listingId,
      listingBuilding,
      listingPrice,
      listingUnitType,
      otherUserName:   targetName,
      otherUserAvatar: targetAvatar,
      otherUserEmail:  targetEmail,
      otherUserProfileImage: targetProfileImage,
      source,
    };
    setConversations(prev => {
      if (prev.some(c => c.id === localId)) return prev;
      return [fallbackConvo, ...prev];
    });
    console.log("conversationId returned (local fallback):", localId);
    return localId;
  };

  const startMatchConversation = async (targetUser: UserProfile): Promise<string> => {
    if (!currentUser) {
      console.warn("startMatchConversation: no currentUser");
      return "";
    }
    const myId = supabaseUserId ?? currentUser.id;
    const matchListingId = `match_${myId}_${targetUser.id}`;
    return startConversation(
      targetUser.id, targetUser.name, targetUser.avatarColor, targetUser.email,
      matchListingId, "Matchmaker", 0, "Roommate Match",
      targetUser.profileImage, "coseeker"
    );
  };

  const sendMessage = (conversationId: string, content: string) => {
    if (!currentUser) return;
    const myId = supabaseUserId ?? currentUser.id;

    // Optimistic update
    const optimisticMsg: ChatMessage = {
      id:             `opt_${Date.now()}`,
      conversationId,
      senderId:       myId,
      content,
      createdAt:      Date.now(),
    };
    setChatMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), optimisticMsg],
    }));
    setConversations(prev => prev.map(c =>
      c.id === conversationId ? { ...c, lastMessage: content, lastMessageAt: Date.now() } : c
    ));

    // Persist to Supabase
    getToken().then(token => fn.sendMessage(token, conversationId, content)).then(saved => {
      // Replace optimistic entry with real DB id
      setChatMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] ?? []).map(m =>
          m.id === optimisticMsg.id ? mapDbMessage(saved) : m
        ),
      }));
    }).catch(err => {
      console.error("sendMessage failed", err);
      // Remove optimistic entry on failure
      setChatMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] ?? []).filter(m => m.id !== optimisticMsg.id),
      }));
    });
  };

  const getMessages = (conversationId: string): ChatMessage[] => {
    return chatMessages[conversationId] ?? [];
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const rows = await db.getMessages(conversationId);
      const msgs = rows.map(mapDbMessage);
      setChatMessages(prev => ({ ...prev, [conversationId]: msgs }));

      // Subscribe to real-time for this conversation (once)
      if (!msgChannels.current[conversationId]) {
        const unsub = rt.onNewMessage(conversationId, (incoming) => {
          const mapped = mapDbMessage(incoming);
          setChatMessages(prev => {
            const existing = prev[conversationId] ?? [];
            // Don't duplicate (optimistic message already there)
            if (existing.some(m => m.id === mapped.id)) return prev;
            return { ...prev, [conversationId]: [...existing, mapped] };
          });
        });
        msgChannels.current[conversationId] = unsub;
      }
    } catch (err) {
      console.warn("loadMessages failed", err);
    }
  };

  const getTrustInfo = (userEmail: string): TrustInfo => {
    const directFriend = friends.find(f => f.email === userEmail);
    if (directFriend) {
      return {
        degree: 1, isFriend: true,
        vouchedByFriend: directFriend.vouchedByMe ? "You vouched for them" : null,
        sharedOrg: null, mutualFriends: [],
      };
    }

    const target = MOCK_USERS.find(u => u.email === userEmail);
    if (!target) {
      return { degree: null, isFriend: false, vouchedByFriend: null, sharedOrg: null, mutualFriends: [] };
    }

    const mutuals: MutualFriend[] = [];
    for (const friend of friends) {
      const fm = MOCK_USERS.find(u => u.email === friend.email);
      if (!fm) continue;
      const friendKnowsTarget = (fm.organizations ?? []).some(org =>
        (target.organizations ?? []).includes(org)
      );
      if (friendKnowsTarget) {
        mutuals.push({ name: friend.name, email: friend.email, avatarColor: friend.avatarColor });
      }
    }

    if (mutuals.length > 0) {
      const vouchedFriend = friends.find(f =>
        f.vouchedByMe && mutuals.some(m => m.email === f.email)
      );
      const sharedOrg = (currentUser?.organizations ?? []).find(org =>
        (target.organizations ?? []).includes(org)
      ) ?? null;
      return {
        degree: 2, isFriend: false,
        vouchedByFriend: vouchedFriend ? vouchedFriend.name : null,
        sharedOrg, mutualFriends: mutuals,
      };
    }

    const sharedOrg = (currentUser?.organizations ?? []).find(org =>
      (target.organizations ?? []).includes(org)
    ) ?? null;

    if (sharedOrg) {
      return { degree: null, isFriend: false, vouchedByFriend: null, sharedOrg, mutualFriends: [] };
    }
    return { degree: null, isFriend: false, vouchedByFriend: null, sharedOrg: null, mutualFriends: [] };
  };

  const value = useMemo(() => ({
    currentUser, setCurrentUser, isOnboarded, setIsOnboarded,
    otpVerifiedEmail, setOtpVerifiedEmail,
    mockUsers: MOCK_USERS, matches, addMatch, scamBannerDismissed, dismissScamBanner,
    likedUserIds, passedUserIds, addLiked, addPassed, computeScore,
    subleases, addSublease, removeSublease,
    crashPosts, addCrashPost, updateCrashPost,
    friends, addFriend, removeFriend, toggleVouch, getTrustInfo,
    conversations, startConversation, startMatchConversation,
    sendMessage, getMessages, loadMessages,
    mockLikedByIds: MOCK_LIKED_BY_IDS,
  }), [
    currentUser, isOnboarded, otpVerifiedEmail, matches, scamBannerDismissed,
    likedUserIds, passedUserIds, subleases, crashPosts, friends,
    conversations, chatMessages, supabaseUserId,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
