/**
 * Avatar initials and styling helpers
 */

export const AVATAR_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-700", ring: "ring-blue-200" },
  { bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-200" },
  { bg: "bg-orange-100", text: "text-orange-700", ring: "ring-orange-200" },
  { bg: "bg-purple-100", text: "text-purple-700", ring: "ring-purple-200" },
  { bg: "bg-rose-100", text: "text-rose-700", ring: "ring-rose-200" },
];

export function getInitials(name = "") {
  return name
    .trim()
    .split(" ")
    .map((w) => w[0]?.toUpperCase() || "")
    .slice(0, 2)
    .join("");
}

export function getAvatarColor(name = "") {
  const charCode = name ? name.charCodeAt(0) : 0;
  const idx = charCode % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export default { AVATAR_COLORS, getInitials, getAvatarColor };
