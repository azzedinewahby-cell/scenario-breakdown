/**
 * Character icon component displaying gender and age with SVG icons.
 * Colors: Blue for male, Pink for female
 * Sizes: Adult (full figure) or Child (smaller with pigtails/hair)
 */

export interface CharacterIconProps {
  gender?: "male" | "female" | "unknown";
  age?: "adult" | "child" | "unknown";
  className?: string;
  title?: string;
}

export function CharacterIcon({
  gender = "unknown",
  age = "unknown",
  className = "h-6 w-6",
  title,
}: CharacterIconProps) {
  const isMale = gender === "male";
  const isAdult = age === "adult";
  const isChild = age === "child";

  // Colors
  const maleColor = "#3B82F6"; // Blue
  const femaleColor = "#EC4899"; // Pink

  const color = isMale ? maleColor : femaleColor;

  if (isAdult) {
    // Adult figure
    return (
      <svg
        viewBox="0 0 100 100"
        className={className}
        aria-label={title || `Personnage ${isMale ? "homme" : "femme"} adulte`}
        fill={color}
      >
        {/* Head */}
        <circle cx="50" cy="20" r="12" />
        {/* Body */}
        <rect x="40" y="35" width="20" height="25" />
        {/* Left arm */}
        <rect x="25" y="40" width="15" height="8" rx="4" />
        {/* Right arm */}
        <rect x="60" y="40" width="15" height="8" rx="4" />
        {/* Left leg */}
        <rect x="35" y="62" width="8" height="28" rx="4" />
        {/* Right leg */}
        <rect x="57" y="62" width="8" height="28" rx="4" />
        {/* Skirt for female */}
        {!isMale && (
          <path d="M 40 60 L 35 90 L 65 90 L 60 60 Z" fill={color} />
        )}
      </svg>
    );
  }

  if (isChild) {
    // Child figure with pigtails/hair
    return (
      <svg
        viewBox="0 0 100 100"
        className={className}
        aria-label={title || `Personnage ${isMale ? "garçon" : "fille"} enfant`}
        fill={color}
      >
        {/* Head */}
        <circle cx="50" cy="18" r="10" />
        {/* Pigtails/Hair for female */}
        {!isMale && (
          <>
            <circle cx="30" cy="15" r="6" />
            <circle cx="70" cy="15" r="6" />
          </>
        )}
        {/* Body */}
        <rect x="42" y="30" width="16" height="20" />
        {/* Left arm */}
        <rect x="28" y="35" width="14" height="6" rx="3" />
        {/* Right arm */}
        <rect x="58" y="35" width="14" height="6" rx="3" />
        {/* Left leg */}
        <rect x="40" y="52" width="6" height="22" rx="3" />
        {/* Right leg */}
        <rect x="54" y="52" width="6" height="22" rx="3" />
        {/* Skirt for female child */}
        {!isMale && (
          <path d="M 42 50 L 38 74 L 62 74 L 58 50 Z" fill={color} />
        )}
      </svg>
    );
  }

  // Unknown age - simple icon
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-label={title || `Personnage ${isMale ? "homme" : "femme"}`}
      fill={color}
    >
      {/* Head */}
      <circle cx="50" cy="25" r="12" />
      {/* Body */}
      <rect x="40" y="40" width="20" height="25" rx="2" />
      {/* Left arm */}
      <rect x="25" y="45" width="15" height="8" rx="4" />
      {/* Right arm */}
      <rect x="60" y="45" width="15" height="8" rx="4" />
      {/* Left leg */}
      <rect x="38" y="67" width="8" height="25" rx="4" />
      {/* Right leg */}
      <rect x="54" y="67" width="8" height="25" rx="4" />
    </svg>
  );
}
