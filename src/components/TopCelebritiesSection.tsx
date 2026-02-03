import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useInView } from "@/hooks/useInView";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsTablet } from "@/hooks/use-tablet";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

interface Celebrity {
  id: string;
  name: string;
  profile_path: string | null;
  tmdb_id: number | null;
  appearance_count?: number;
}

const CardWithFadeIn = ({ children, delay }: { children: React.ReactNode; delay: number }) => {
  const { ref, isInView } = useInView({ threshold: 0.1, triggerOnce: true });
  
  return (
    <div
      ref={ref}
      className="opacity-0 translate-y-8 transition-all duration-700 ease-out"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : 'translateY(2rem)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

interface TopCelebritiesSectionProps {
  className?: string;
}

export const TopCelebritiesSection = ({ className }: TopCelebritiesSectionProps) => {
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const fetchTopCelebrities = async () => {
      try {
        // Fetch from cast_members table with popularity
        const { data: castMembers, error } = await supabase
          .from('cast_members')
          .select('id, name, profile_path, tmdb_id, popularity')
          .not('profile_path', 'is', null)
          .order('popularity', { ascending: false })
          .limit(20);

        if (error) throw error;

        // Transform data, handling TMDB image paths
        const celebs: Celebrity[] = (castMembers || []).map(member => ({
          id: member.id,
          name: member.name,
          profile_path: member.profile_path 
            ? member.profile_path.startsWith('http') 
              ? member.profile_path 
              : `https://image.tmdb.org/t/p/w200${member.profile_path}`
            : null,
          tmdb_id: member.tmdb_id,
          appearance_count: Math.round(member.popularity || 0),
        }));

        setCelebrities(celebs);
      } catch (error) {
        console.error('Error fetching celebrities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopCelebrities();
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      checkScrollButtons();
      container.addEventListener('scroll', checkScrollButtons);
      window.addEventListener('resize', checkScrollButtons);
      return () => {
        container.removeEventListener('scroll', checkScrollButtons);
        window.removeEventListener('resize', checkScrollButtons);
      };
    }
  }, [celebrities]);

  if (loading) {
    return (
      <section className={`relative py-4 md:py-8 ${className || ''}`}>
        <div className="px-4 md:px-[15px]">
          <h2 className="text-2xl font-bold text-foreground mb-6">Popular Celebrities</h2>
          <div className="flex gap-4 overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-secondary animate-pulse" />
                <div className="w-20 h-4 bg-secondary animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (celebrities.length === 0) return null;

  return (
    <section className={`relative py-4 md:py-8 ${className || ''}`}>
      <div className="px-4 md:px-[15px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Star className="w-6 h-6 text-primary fill-primary" />
            Popular Celebrities
          </h2>
          
          {!isMobile && !isTablet && (
            <div className="flex gap-2">
              <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className="p-2 rounded-full bg-secondary/80 hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className="p-2 rounded-full bg-secondary/80 hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <div
          ref={scrollContainerRef}
          className="flex gap-5 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {celebrities.map((celeb, index) => {
            const handleClick = () => {
              navigate(`/celebrity/${celeb.tmdb_id || encodeURIComponent(celeb.name)}`);
            };
            
            const CardContent = (
              <div 
                className="group flex flex-col items-center gap-3 min-w-[100px] sm:min-w-[120px] md:min-w-[140px] scroll-snap-align-start cursor-pointer"
                onClick={handleClick}
              >
                {/* Profile Image */}
                <div className="relative">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden ring-2 ring-border group-hover:ring-primary transition-all duration-300">
                    <img
                      src={celeb.profile_path || '/placeholder.svg'}
                      alt={celeb.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  </div>
                  {/* Rank Badge */}
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-lg">
                    {index + 1}
                  </div>
                </div>
                
                {/* Name */}
                <div className="text-center">
                  <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {celeb.name}
                  </h3>
                  {celeb.appearance_count && celeb.appearance_count > 1 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {celeb.appearance_count} popularity
                    </p>
                  )}
                </div>
              </div>
            );

            return isMobile || isTablet ? (
              <div key={celeb.id} className="scroll-snap-align-start">
                {CardContent}
              </div>
            ) : (
              <CardWithFadeIn key={celeb.id} delay={index * 50}>
                {CardContent}
              </CardWithFadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TopCelebritiesSection;
