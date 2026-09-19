import { useTheme } from "@usesend/ui";

export function useColors() {
  const { resolvedTheme } = useTheme();

  const lightColors = {
    delivered: "#e8825e",
    bounced: "#dc2626",
    complained: "#d97706",
    opened: "#8b5cf6",
    clicked: "#3b82f6",
    rate: "#e8825e",
    xaxis: "#8a8580",
  };

  const darkColors = {
    delivered: "#f0977a",
    bounced: "#f87171",
    complained: "#fbbf24",
    opened: "#a78bfa",
    clicked: "#60a5fa",
    rate: "#f0977a",
    xaxis: "#a8a29e",
  };

  const currentColors = resolvedTheme === "dark" ? darkColors : lightColors;

  return currentColors;
}
