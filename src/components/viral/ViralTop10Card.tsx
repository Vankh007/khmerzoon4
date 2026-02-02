import { useNavigate } from 'react-router-dom';
import { Play, Star } from 'lucide-react';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

interface Content {
  id: string;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  content_type: string;
  overview: string | null;
  release_date: string | null;
  popularity: number | null;
  tmdb_id: number | null;
  genre?: string;
  access_type?: 'free' | 'purchase' | 'membership';
  recent_episode?: string;
}

interface ViralTop10CardProps {
  content: Content;
  rank: number;
}

// Helper to get proper image URL without duplication
const getImageUrl = (path: string | null, size: string = 'w780'): string | null => {
  if (!path) return null;
  // If it's already a full URL, return as-is
  if (path.startsWith('http')) return path;
  // Otherwise construct the TMDB URL
  return `${TMDB_IMAGE_BASE}/${size}${path.startsWith('/') ? path : `/${path}`}`;
};

const ViralTop10Card = ({ content, rank }: ViralTop10CardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    const type = content.content_type === 'movie' ? 'movie' : 'series';
    const id = content.tmdb_id || content.id;
    navigate(`/watch/${type}/${id}`);
  };

  const backdropUrl = getImageUrl(content.backdrop_path, 'w780') 
    || getImageUrl(content.poster_path, 'w500');

  return (
    <div
      className="relative flex-shrink-0 cursor-pointer group"
      onClick={handleClick}
    >
      {/* Large Rank Number - positioned to overlap with card */}
      <div className="absolute -left-4 md:-left-6 bottom-0 z-20 pointer-events-none">
        <span 
          className="font-black text-transparent bg-clip-text leading-none"
          style={{
            fontSize: 'clamp(4rem, 8vw, 7rem)',
            backgroundImage: 'linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.5) 50%, hsl(var(--primary)/0.2) 100%)',
            WebkitTextStroke: '2px hsl(var(--primary)/0.4)',
            textShadow: '0 4px 30px hsl(var(--primary)/0.5)',
          }}
        >
          {rank}
        </span>
      </div>

      {/* Card Container */}
      <div 
        className="relative w-[280px] md:w-[400px] lg:w-[480px] aspect-video rounded-xl overflow-hidden ml-8 md:ml-12"
        style={{ marginLeft: rank === 10 ? '2.5rem' : undefined }}
      >
        {/* Backdrop Image */}
        {backdropUrl ? (
          <img
            src={backdropUrl}
            alt={content.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
            <Play className="w-12 h-12 text-muted-foreground" />
          </div>
        )}

        {/* Overlay Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

        {/* Content Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <span className="px-2 py-1 text-xs font-medium bg-primary/90 text-primary-foreground rounded-md uppercase">
            {content.content_type}
          </span>
          {content.access_type === 'membership' && (
            <span className="px-2 py-1 text-xs font-medium bg-yellow-500/90 text-black rounded-md flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" />
              VIP
            </span>
          )}
        </div>

        {/* Content Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
          <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-white line-clamp-1 mb-1">
            {content.title}
          </h3>
          {content.genre && (
            <p className="text-xs md:text-sm text-white/70 line-clamp-1">
              {content.genre}
            </p>
          )}
          {content.recent_episode && (
            <p className="text-xs text-primary mt-1">
              {content.recent_episode}
            </p>
          )}
        </div>

        {/* Play Button Overlay on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground fill-current ml-1" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViralTop10Card;
