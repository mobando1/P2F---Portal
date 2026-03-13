interface LingoMascotProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: 20,
  md: 24,
  lg: 48,
};

export function LingoMascot({ size = "sm", className = "" }: LingoMascotProps) {
  const px = sizes[size];

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Lingo mascot"
    >
      {/* Body - rounded owl shape */}
      <ellipse cx="32" cy="38" rx="20" ry="18" fill="#F59E0B" />
      <ellipse cx="32" cy="38" rx="20" ry="18" fill="url(#bodyGrad)" />

      {/* Belly */}
      <ellipse cx="32" cy="42" rx="12" ry="11" fill="#FEF3C7" />

      {/* Eyes - big and expressive */}
      <circle cx="24" cy="34" r="8" fill="white" />
      <circle cx="40" cy="34" r="8" fill="white" />
      <circle cx="25" cy="33" r="4.5" fill="#1E293B" />
      <circle cx="41" cy="33" r="4.5" fill="#1E293B" />
      {/* Eye highlights */}
      <circle cx="26.5" cy="31.5" r="1.5" fill="white" />
      <circle cx="42.5" cy="31.5" r="1.5" fill="white" />

      {/* Beak */}
      <path d="M29 38L32 42L35 38" fill="#EA580C" stroke="#EA580C" strokeWidth="1" strokeLinejoin="round" />

      {/* Eyebrows - friendly */}
      <path d="M17 28C19 26 22 26 24 27" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M47 28C45 26 42 26 40 27" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" />

      {/* Ear tufts */}
      <path d="M16 26L14 18L22 24" fill="#F59E0B" />
      <path d="M48 26L50 18L42 24" fill="#F59E0B" />

      {/* Graduation cap - board */}
      <rect x="14" y="14" width="36" height="3" rx="1" fill="#1C7BB1" />
      {/* Cap top */}
      <path d="M20 14L32 8L44 14" fill="#0A4A6E" />
      {/* Tassel */}
      <line x1="44" y1="14" x2="48" y2="22" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="48" cy="23" r="2" fill="#F59E0B" />

      {/* Wings - small, friendly */}
      <path d="M12 40C8 38 7 34 10 32" stroke="#D97706" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M52 40C56 38 57 34 54 32" stroke="#D97706" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Feet */}
      <path d="M24 55L22 58M24 55L24 58M24 55L26 58" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M40 55L38 58M40 55L40 58M40 55L42 58" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round" />

      <defs>
        <linearGradient id="bodyGrad" x1="32" y1="20" x2="32" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24" stopOpacity="0.4" />
          <stop offset="1" stopColor="#D97706" stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  );
}
