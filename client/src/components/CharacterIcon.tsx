/**
 * Character icon component displaying gender and age with SVG icons.
 * Colors: Blue for male, Pink for female
 * Sizes: Adult (full figure) or Child (smaller with distinctive features)
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
    // Adult figure - tall and proportioned
    return (
      <svg
        viewBox="0 0 100 120"
        className={className}
        aria-label={title || `Personnage ${isMale ? "homme" : "femme"} adulte`}
        fill={color}
      >
        {/* Head */}
        <circle cx="50" cy="18" r="12" />
        {/* Body - longer for adult */}
        <rect x="40" y="32" width="20" height="35" />
        {/* Left arm */}
        <rect x="20" y="38" width="20" height="7" rx="3.5" />
        {/* Right arm */}
        <rect x="60" y="38" width="20" height="7" rx="3.5" />
        {/* Left leg */}
        <rect x="35" y="70" width="8" height="40" rx="4" />
        {/* Right leg */}
        <rect x="57" y="70" width="8" height="40" rx="4" />
        {/* Skirt for female */}
        {!isMale && (
          <path d="M 40 68 L 30 110 L 70 110 L 60 68 Z" fill={color} />
        )}
      </svg>
    );
  }

  if (isChild) {
    // Child figure - shorter, rounder, with distinctive hair
    return (
      <svg
        viewBox="0 0 100 120"
        className={className}
        aria-label={title || `Personnage ${isMale ? "garçon" : "fille"} enfant`}
        fill={color}
      >
        {/* Head - rounder and larger relative to body */}
        <circle cx="50" cy="20" r="14" />
        
        {/* Hair/Pigtails for female child */}
        {!isMale && (
          <>
            {/* Left pigtail */}
            <circle cx="28" cy="18" r="7" />
            {/* Right pigtail */}
            <circle cx="72" cy="18" r="7" />
          </>
        )}
        
        {/* Hair for male child - spiky */}
        {isMale && (
          <>
            <polygon points="50,6 55,10 50,8 45,10" fill={color} />
            <polygon points="60,8 63,12 61,10 64,14" fill={color} />
            <polygon points="40,8 37,12 39,10 36,14" fill={color} />
          </>
        )}
        
        {/* Body - shorter and rounder */}
        <rect x="42" y="36" width="16" height="24" rx="2" />
        
        {/* Left arm - thinner */}
        <rect x="25" y="40" width="17" height="6" rx="3" />
        {/* Right arm - thinner */}
        <rect x="58" y="40" width="17" height="6" rx="3" />
        
        {/* Left leg - shorter and thinner */}
        <rect x="40" y="62" width="6" height="32" rx="3" />
        {/* Right leg - shorter and thinner */}
        <rect x="54" y="62" width="6" height="32" rx="3" />
        
        {/* Skirt for female child - more pronounced */}
        {!isMale && (
          <path d="M 42 60 L 35 94 L 65 94 L 58 60 Z" fill={color} />
        )}
      </svg>
    );
  }

  // Unknown age - generic adult figure
  return (
    <svg
      viewBox="0 0 100 120"
      className={className}
      aria-label={title || `Personnage ${isMale ? "homme" : "femme"}`}
      fill={color}
    >
      {/* Head */}
      <circle cx="50" cy="20" r="12" />
      {/* Body */}
      <rect x="40" y="34" width="20" height="30" />
      {/* Left arm */}
      <rect x="20" y="40" width="20" height="7" rx="3.5" />
      {/* Right arm */}
      <rect x="60" y="40" width="20" height="7" rx="3.5" />
      {/* Left leg */}
      <rect x="35" y="66" width="8" height="38" rx="4" />
      {/* Right leg */}
      <rect x="57" y="66" width="8" height="38" rx="4" />
    </svg>
  );
}
