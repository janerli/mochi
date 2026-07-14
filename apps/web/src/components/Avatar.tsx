const AVATAR_COLORS = {
  pink: "linear-gradient(160deg, var(--lavender), var(--pink))",
  mint: "linear-gradient(160deg, var(--mint), var(--lavender))",
  lavender: "linear-gradient(160deg, var(--pink), var(--lavender))",
  butter: "linear-gradient(160deg, var(--butter), var(--mint))",
} as const;

type AvatarColor = keyof typeof AVATAR_COLORS;

export const AVATAR_PRESETS: { key: string; emoji: string; color: AvatarColor }[] = [
  { key: "bunny", emoji: "🐰", color: "pink" },
  { key: "cat", emoji: "🐱", color: "lavender" },
  { key: "panda", emoji: "🐼", color: "mint" },
  { key: "fox", emoji: "🦊", color: "butter" },
  { key: "bear", emoji: "🐻", color: "pink" },
  { key: "hamster", emoji: "🐹", color: "butter" },
  { key: "koala", emoji: "🐨", color: "lavender" },
  { key: "chick", emoji: "🐥", color: "mint" },
  { key: "frog", emoji: "🐸", color: "mint" },
  { key: "unicorn", emoji: "🦄", color: "lavender" },
  { key: "mochi", emoji: "🍡", color: "pink" },
  { key: "blossom", emoji: "🌸", color: "butter" },
];

const PRESET_BY_KEY = Object.fromEntries(AVATAR_PRESETS.map((p) => [p.key, p]));

interface Props {
  avatar?: string | null;
  fallbackLetter?: string;
  size?: number;
  title?: string;
}

export function Avatar({ avatar, fallbackLetter, size = 36, title }: Props) {
  const preset = avatar ? PRESET_BY_KEY[avatar] : undefined;

  return (
    <div
      className="avatar"
      title={title}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.55,
        background: AVATAR_COLORS[preset?.color ?? "pink"],
      }}
    >
      {preset ? preset.emoji : fallbackLetter?.trim().charAt(0).toUpperCase()}
    </div>
  );
}
