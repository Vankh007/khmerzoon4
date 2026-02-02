import { Button } from '@/components/ui/button';
import { FastForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SkipButtonProps {
  label: string;
  onSkip: () => void;
  isVisible: boolean;
  className?: string;
}

/**
 * Reusable Skip Button component for intro/outro skipping
 * Transparent with primary color border and text, positioned above progress bar
 */
export const SkipButton = ({
  label,
  onSkip,
  isVisible,
  className = ''
}: SkipButtonProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSkip();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`absolute bottom-16 right-3 md:bottom-20 md:right-4 z-[55] ${className}`}
        >
          <Button
            onClick={handleClick}
            variant="outline"
            className="
              bg-transparent hover:bg-transparent text-primary
              border-2 border-primary
              font-semibold text-sm
              px-3 py-1.5
              h-auto
              rounded-md
              flex items-center gap-1.5
              transition-transform duration-200
              hover:scale-[1.02] active:scale-95
              shadow-lg
              scale-[0.50] origin-bottom-right
              md:scale-100
            "
          >
            <FastForward className="w-4 h-4" />
            <span>{label}</span>
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
