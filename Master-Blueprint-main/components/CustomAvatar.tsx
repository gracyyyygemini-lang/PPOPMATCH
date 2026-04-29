import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

interface CustomAvatarProps {
  name: string;
  avatarColor: string;
  profileImage?: string;
  size?: number;
  fontSize?: number;
}

export default function CustomAvatar({
  name,
  avatarColor,
  profileImage,
  size = 44,
  fontSize,
}: CustomAvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const computedFontSize = fontSize ?? Math.round(size * 0.38);
  const borderRadius = size / 2;

  if (profileImage) {
    return (
      <Image
        source={{ uri: profileImage }}
        resizeMode="cover"
        style={{ width: size, height: size, borderRadius }}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius, backgroundColor: avatarColor },
      ]}
    >
      <Text
        style={[
          styles.initials,
          { fontSize: computedFontSize },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: "cover",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#FFFFFF",
  },
});
