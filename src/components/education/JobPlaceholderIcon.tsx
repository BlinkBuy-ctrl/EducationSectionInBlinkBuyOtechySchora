/**
 * Custom illustrated placeholder shown when a job listing has no photo/logo.
 * Replaces the plain lucide Briefcase icon with a distinct, gradient-filled
 * briefcase-and-spark illustration so unbranded listings still feel designed.
 */
export function JobPlaceholderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="jobIconGrad" x1="4" y1="6" x2="44" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* handle */}
      <path
        d="M18.5 14v-2.2a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4V14"
        stroke="url(#jobIconGrad)"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />

      {/* body */}
      <rect x="7" y="14" width="34" height="23" rx="6.5" fill="url(#jobIconGrad)" fillOpacity="0.16" />
      <rect x="7" y="14" width="34" height="23" rx="6.5" stroke="url(#jobIconGrad)" strokeWidth="2.4" />

      {/* front seam */}
      <path d="M7 24.5h34" stroke="url(#jobIconGrad)" strokeWidth="2" strokeOpacity="0.55" />

      {/* latch */}
      <rect x="20.5" y="21.7" width="7" height="5.6" rx="1.8" fill="url(#jobIconGrad)" />

      {/* spark badge — signals "new opportunity" */}
      <circle cx="37.5" cy="11" r="5.5" fill="#0d9488" />
      <path d="M37.5 8.1v5.8M34.6 11h5.8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
