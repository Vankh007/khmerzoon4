import { useNavigate } from 'react-router-dom';
import { Eye, Play, Flame } from 'lucide-react';

interface Short {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string;
  views: number;
  description: string | null;
  created_at: string;
}

interface ViralShortCardProps {
  short: Short;
  rank: number;
  formatViews: (views: number) => string;
}

const ViralShortCard = ({ short, rank, formatViews }: ViralShortCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/short');
  };

  return (
    <div
      className="relative group cursor-pointer"
      onClick={handleClick}
    >
      {/* Rank Badge for Top 10 */}
      {rank <= 10 && (
        <div className="absolute -left-2 -top-2 z-10 w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <span className="text-sm md:text-base font-bold text-primary-foreground">{rank}</span>
        </div>
      )}
      
      <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-muted">
        {short.thumbnail_url ? (
          <img
            src={short.thumbnail_url}
            alt={short.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
            <Flame className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        
        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-7 h-7 text-primary-foreground fill-current ml-0.5" />
          </div>
        </div>
        
        {/* Views count badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/60 rounded-full backdrop-blur-sm">
          <Eye className="w-3 h-3 text-white" />
          <span className="text-xs text-white font-medium">{formatViews(short.views)}</span>
        </div>
        
        {/* Content info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
          <p className="text-white text-sm md:text-base font-semibold line-clamp-2">
            {short.title}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ViralShortCard;
