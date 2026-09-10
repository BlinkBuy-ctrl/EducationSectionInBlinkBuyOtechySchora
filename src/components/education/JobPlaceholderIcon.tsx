/**
 * Custom illustrated placeholder shown when a job listing has no photo/logo.
 *
 * Design intent: a soft, rounded satchel (not a stiff rectangular briefcase),
 * a warm gold-to-emerald gradient, a glossy highlight for depth, a soft blurred
 * shadow underneath, and a small sprouting leaf detail — tying "job" to
 * "growth / new beginning" instead of reading as generic clipart.
 */
export function JobPlaceholderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="jobCaseGrad" x1="8" y1="14" x2="56" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FCD34D" />
          <stop offset="0.45" stopColor="#34D399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="jobLeafGrad" x1="34" y1="6" x2="50" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A7F3D0" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
        <filter id="jobSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" />
        </filter>
      </defs>

      {/* soft blurred shadow beneath the case */}
      <ellipse cx="32" cy="53" rx="16" ry="3.4" fill="#000" opacity="0.16" filter="url(#jobSoftShadow)" />

      {/* handle — soft rounded loop, slightly asymmetric */}
      <path
        d="M25 21v-3.4c0-3.3 2.6-6 6-6h2.4c3.3 0 6 2.7 6 6V21"
        stroke="url(#jobCaseGrad)"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />

      {/* body — generously rounded, pouch-like rather than boxy */}
      <rect x="9" y="20" width="46" height="29" rx="13" fill="url(#jobCaseGrad)" />

      {/* front seam, offset low to suggest a flap/pocket */}
      <path d="M9 33.5c6-1.6 40-1.6 46 0" stroke="#065F46" strokeOpacity="0.28" strokeWidth="1.6" strokeLinecap="round" fill="none" />

      {/* latch */}
      <rect x="27" y="27.5" width="10" height="7.5" rx="2.6" fill="#065F46" fillOpacity="0.85" />
      <circle cx="32" cy="31.2" r="1" fill="#D1FAE5" />

      {/* glossy highlight streak for depth */}
      <path
        d="M14 24c4-2.4 9-3.6 14-3.8"
        stroke="#FFFFFF"
        strokeOpacity="0.55"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />

      {/* sprouting leaves — "new opportunity / growth" motif */}
      <g>
        <path d="M41 18c-4.2-1-7.6-4.6-8.2-9 5 .2 9.4 3.4 10.2 8.2-.6.4-1.3.6-2 .8Z" fill="url(#jobLeafGrad)" />
        <path d="M43 17.4c1.6-4.2 5.6-7.4 10-7.8-.6 4.9-4.2 8.8-9 9.8-.4-.7-.7-1.4-1-2Z" fill="url(#jobLeafGrad)" fillOpacity="0.9" />
        <path d="M37.5 20.5c1.2-3 4-9.5 4-9.5" stroke="#065F46" strokeOpacity="0.4" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}
