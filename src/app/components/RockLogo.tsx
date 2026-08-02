interface RockLogoProps {
  size?: number;
  className?: string;
}

/**
 * ROCK Delivery brand logo — faithful recreation of the Golden Rock
 * Logistics SPC circular emblem: reversed-R + black sphere mascot +
 * C + K, bow-tie, and curved brand text.
 * Brand: #D71920 red, #111111 black, white.
 */
export default function RockLogo({
  size = 100,
  className = "",
}: RockLogoProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ROCK Delivery"
      role="img"
    >
      <defs>
        {/* Top arc for "golden" text */}
        <path id="rl-topArc"  d="M 40 100 A 60 60 0 0 1 160 100" />
        {/* Bottom arc for "golden rock company" text */}
        <path id="rl-botArc"  d="M 30 112 A 70 70 0 0 0 170 112" />
      </defs>

      {/* ── White background circle ── */}
      <circle cx="100" cy="100" r="99"  fill="#ffffff" />
      <circle cx="100" cy="100" r="95"  fill="none" stroke="#cccccc" strokeWidth="1.5" />

      {/* ── Curved "golden" text at top ── */}
      <text fontSize="10" fontWeight="800" fill="#D71920" fontFamily="Arial,sans-serif" letterSpacing="3">
        <textPath href="#rl-topArc" startOffset="14%">golden</textPath>
      </text>

      {/* ── Curved "golden rock company" text at bottom ── */}
      <text fontSize="9" fontWeight="700" fill="#D71920" fontFamily="Arial,sans-serif" letterSpacing="2">
        <textPath href="#rl-botArc" startOffset="4%">golden rock company</textPath>
      </text>

      {/* ── Я  (mirrored/reversed R, red) ── */}
      {/* We draw it as a reflected path so it renders as Я */}
      <g transform="translate(18, 60)">
        {/* Upright R, then flip horizontally around its center */}
        <text
          fontSize="72"
          fontWeight="900"
          fill="#D71920"
          fontFamily="Arial Black, Arial, sans-serif"
          transform="scale(-1,1) translate(-54,0)"
        >
          R
        </text>
      </g>

      {/* ── Black sphere — the mascot "O" ── */}
      <circle cx="100" cy="93" r="36" fill="#111111" />
      {/* Sphere highlight */}
      <ellipse cx="87" cy="78" rx="10" ry="7" fill="rgba(255,255,255,0.14)" />

      {/* White eyes */}
      <circle cx="87"  cy="89" r="10.5" fill="#ffffff" />
      <circle cx="113" cy="89" r="10.5" fill="#ffffff" />
      {/* Pupils */}
      <circle cx="90"  cy="91"  r="6"   fill="#111111" />
      <circle cx="116" cy="91"  r="6"   fill="#111111" />
      {/* Eye shine */}
      <circle cx="91.5" cy="88.5" r="2.2" fill="#ffffff" />
      <circle cx="117.5" cy="88.5" r="2.2" fill="#ffffff" />

      {/* Smile */}
      <path
        d="M 86 104 Q 100 116 114 104"
        stroke="#ffffff"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── C  (red) ── */}
      <g transform="translate(138, 60)">
        <text
          fontSize="72"
          fontWeight="900"
          fill="#D71920"
          fontFamily="Arial Black, Arial, sans-serif"
        >
          C
        </text>
      </g>

      {/* ── K  (black) ── */}
      <g transform="translate(158, 60)">
        <text
          fontSize="72"
          fontWeight="900"
          fill="#111111"
          fontFamily="Arial Black, Arial, sans-serif"
        >
          K
        </text>
      </g>

      {/* ── Black bow-tie below sphere ── */}
      <polygon points="76,132 90,124 100,132 90,140" fill="#111111" />
      <polygon points="124,132 110,124 100,132 110,140" fill="#111111" />
      <circle cx="100" cy="132" r="5" fill="#111111" />
    </svg>
  );
}

/**
 * Compact badge-style logo for tight spaces (sidebar, mobile header).
 * Sphere mascot on red gradient background.
 */
export function RockLogoBadge({ size = 44 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 44 44"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ROCK"
      role="img"
    >
      <defs>
        <linearGradient id="rlbg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8202A" />
          <stop offset="100%" stopColor="#A50F15" />
        </linearGradient>
      </defs>

      {/* Red rounded-square background */}
      <rect width="44" height="44" rx="12" fill="url(#rlbg)" />

      {/* White inner circle area */}
      <circle cx="22" cy="18" r="14" fill="rgba(255,255,255,0.92)" />
      <circle cx="22" cy="18" r="13" fill="none" stroke="#ddd" strokeWidth="0.5" />

      {/* Black sphere */}
      <circle cx="22" cy="17" r="10" fill="#111111" />
      <ellipse cx="18.5" cy="12.5" rx="3" ry="2" fill="rgba(255,255,255,0.15)" />

      {/* White eyes */}
      <circle cx="18.5" cy="15.5" r="3.2" fill="#ffffff" />
      <circle cx="25.5" cy="15.5" r="3.2" fill="#ffffff" />
      {/* Pupils */}
      <circle cx="19.5" cy="16.2" r="1.9" fill="#111111" />
      <circle cx="26.5" cy="16.2" r="1.9" fill="#111111" />
      {/* Shine */}
      <circle cx="20.2" cy="15.4" r="0.8" fill="#ffffff" />
      <circle cx="27.2" cy="15.4" r="0.8" fill="#ffffff" />

      {/* Smile */}
      <path d="M 18.5 20.5 Q 22 24.5 25.5 20.5" stroke="#ffffff" strokeWidth="1.8" fill="none" strokeLinecap="round" />

      {/* Bow tie (black) */}
      <polygon points="15,29.5 18.5,26.5 22,29.5 18.5,32.5" fill="#111111" />
      <polygon points="29,29.5 25.5,26.5 22,29.5 25.5,32.5" fill="#111111" />
      <circle cx="22" cy="29.5" r="2" fill="#111111" />

      {/* ROCK text */}
      <text
        x="22"
        y="42"
        textAnchor="middle"
        fontSize="5.5"
        fontWeight="900"
        letterSpacing="1.5"
        fill="rgba(255,255,255,0.9)"
        fontFamily="Arial,sans-serif"
      >
        ROCK
      </text>
    </svg>
  );
}


