import { useWindowDimensions, Platform } from "react-native";

export type LayoutMode = "mobile" | "tablet" | "desktop";

export interface ResponsiveInfo {
  width: number;
  height: number;
  mode: LayoutMode;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWeb: boolean;
  contentMaxWidth: number;
  columns: number;
  sidebarWidth: number;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === "web";

  let mode: LayoutMode = "mobile";
  if (width >= 1024) mode = "desktop";
  else if (width >= 768) mode = "tablet";

  const contentMaxWidth = mode === "desktop" ? 720 : mode === "tablet" ? 600 : width;
  const columns = mode === "desktop" ? 3 : mode === "tablet" ? 2 : 2;
  const sidebarWidth = mode === "desktop" ? 240 : 0;

  return {
    width,
    height,
    mode,
    isMobile: mode === "mobile",
    isTablet: mode === "tablet",
    isDesktop: mode === "desktop",
    isWeb,
    contentMaxWidth,
    columns,
    sidebarWidth,
  };
}
