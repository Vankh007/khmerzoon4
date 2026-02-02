import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FastForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SkipIntroButtonProps {
  currentTime: number;
  introStartTime?: number;  // When intro starts (usually 0)
  introEndTime?: number;    // When intro ends (skip target)
  onSkipIntro: () => void;
  isVisible?: boolean;      // External visibility control
  className?: string;
}

export const SkipIntroButton = ({
  currentTime,
  introStartTime = 0,
  introEndTime,
  onSkipIntro,
  isVisible = true,
  className = ''
}: SkipIntroButtonProps) => {
  const [shouldShow, setShouldShow] = useState(false);

  // Determine if button should be visible based on current playback time
  useEffect(() => {
    if (!introEndTime || introEndTime <= 0) {
      setShouldShow(false);
      return;
    }

    // Show button when currentTime is within intro range
    // Buffer: show a bit before intro ends (introEndTime - 2 seconds)
    const isWithinIntroRange = 
      currentTime >= introStartTime && 
      currentTime < introEndTime - 0.5; // Hide just before it would skip anyway

    setShouldShow(isWithinIntroRange && isVisible);
  }, [currentTime, introStartTime, introEndTime, isVisible]);

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSkipIntro();
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`absolute bottom-24 right-3 md:bottom-20 md:right-4 z-50 ${className}`}
        >
          <Button
            onClick={handleSkip}
            variant="outline"
            className="
              bg-transparent hover:bg-primary/10 text-primary
              border-2 border-primary
              font-semibold text-xs md:text-sm
              px-1.5 py-0.5 md:px-2 md:py-1
              h-auto
              rounded-md
              flex items-center gap-1
              transition-all duration-200
              hover:scale-[1.02] active:scale-95
              scale-75 origin-bottom-right
            "
          >
            <FastForward className="w-3 h-3 md:w-4 md:h-4" />
            <span>Skip Intro</span>
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
