import { TextStyle } from "react-native";

export const typography = {
  h1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
  } as TextStyle,
  h2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600",
  } as TextStyle,
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
  } as TextStyle,
  h4: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  } as TextStyle,
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
  } as TextStyle,
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  } as TextStyle,
  bodyBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  } as TextStyle,
  small: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
  } as TextStyle,
  smallMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  } as TextStyle,
  tiny: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "500",
  } as TextStyle,
} as const;
