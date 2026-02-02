import { ReactNode } from 'react';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

type EmbedPlatform = 'vk' | 'okru' | 'yandex' | 'generic';

interface PreviewOnlyEmbedProps {
  /** The embed URL for the iframe */
  src: string;
  /** Platform type for styling/labeling */
  platform?: EmbedPlatform;
  /** Custom title for the embed */
  title?: string;
  /** Aspect ratio class (default: 16:9) */
  aspectRatio?: string;
  /** Show "Preview Only" badge */
  showBadge?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Children to render instead of iframe (for custom embeds) */
  children?: ReactNode;
}

const platformLabels: Record<EmbedPlatform, string> = {
  vk: 'VK Video',
  okru: 'OK.ru',
  yandex: 'Яндекс',
  generic: 'Video',
};

/**
 * PreviewOnlyEmbed - Renders embeds as non-interactive previews
 * 
 * Features:
 * - Transparent overlay blocks all clicks/interactions
 * - Sandbox attribute restricts iframe capabilities
 * - Accessible labeling for screen readers
 * - Visual badge indicates preview-only status
 */
const PreviewOnlyEmbed = ({
  src,
  platform = 'generic',
  title,
  aspectRatio = 'aspect-video',
  showBadge = true,
  className,
  children,
}: PreviewOnlyEmbedProps) => {
  const displayTitle = title || platformLabels[platform];

  // Detect platform from URL if not specified
  const detectedPlatform = detectPlatform(src) || platform;

  return (
    <div
      className={cn(
        'preview-only-embed relative w-full overflow-hidden rounded-lg bg-black',
        aspectRatio,
        className
      )}
      role="img"
      aria-label={`${displayTitle} preview (non-interactive)`}
    >
      {/* The iframe or custom content */}
      {children ? (
        <div className="absolute inset-0 pointer-events-none select-none">
          {children}
        </div>
      ) : (
        <iframe
          src={src}
          title={`${displayTitle} preview`}
          className="absolute inset-0 w-full h-full border-0 pointer-events-none"
          // Sandbox restricts iframe capabilities - no scripts, no navigation
          sandbox="allow-same-origin"
          // Prevent iframe from navigating parent
          referrerPolicy="no-referrer"
          loading="lazy"
          // Accessibility: indicate this is decorative/preview only
          aria-hidden="true"
          tabIndex={-1}
        />
      )}

      {/* Transparent overlay to block ALL interactions */}
      <div
        className="absolute inset-0 z-10 cursor-not-allowed"
        aria-hidden="true"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />

      {/* Preview Only badge */}
      {showBadge && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm text-white/90 text-xs font-medium select-none pointer-events-none">
          <Eye className="h-3 w-3" />
          <span>Preview Only</span>
        </div>
      )}

      {/* Platform indicator (bottom-left) */}
      <div className="absolute bottom-2 left-2 z-20 px-2 py-0.5 rounded bg-black/60 text-white/80 text-[10px] font-medium uppercase tracking-wider select-none pointer-events-none">
        {platformLabels[detectedPlatform]}
      </div>

      {/* Screen reader text */}
      <span className="sr-only">
        This is a non-interactive preview of {displayTitle} content. 
        The video cannot be played directly here.
      </span>
    </div>
  );
};

/**
 * Detect platform from embed URL
 */
function detectPlatform(url: string): EmbedPlatform | null {
  if (!url) return null;
  
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('vk.com') || lowerUrl.includes('vkvideo.ru')) {
    return 'vk';
  }
  if (lowerUrl.includes('ok.ru') || lowerUrl.includes('odnoklassniki')) {
    return 'okru';
  }
  if (lowerUrl.includes('yandex') || lowerUrl.includes('zen.')) {
    return 'yandex';
  }
  
  return null;
}

/**
 * CSS to add to your global styles if needed:
 * 
 * .preview-only-embed iframe {
 *   pointer-events: none !important;
 *   user-select: none !important;
 * }
 */

export default PreviewOnlyEmbed;

// Also export a hook for detecting Russian video platforms
export function isRussianVideoPlatform(url: string): boolean {
  if (!url) return false;
  const platforms = [
    'vk.com', 'vkvideo.ru',
    'ok.ru', 'odnoklassniki',
    'yandex', 'zen.yandex', 'dzen.ru'
  ];
  const lowerUrl = url.toLowerCase();
  return platforms.some(p => lowerUrl.includes(p));
}
