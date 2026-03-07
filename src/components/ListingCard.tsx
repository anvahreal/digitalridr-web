import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Listing } from "@/types/listing";
import { cn, formatNaira } from "@/lib/utils";

interface ListingCardProps {
  listing: Listing;
  className?: string;
}

export function ListingCard({ listing, className }: ListingCardProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImage((prev) => (prev + 1) % listing.images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImage((prev) => (prev - 1 + listing.images.length) % listing.images.length);
  };

  const toggleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  return (
    <Link
      to={`/listing/${listing.id}`}
      className={cn("group block", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Carousel */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        <img
          src={listing.images[currentImage]}
          alt={listing.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Like button */}
        <button
          onClick={toggleLike}
          className="absolute right-3 top-3 z-10 transition-transform hover:scale-110 active:scale-95"
        >
          <Heart
            className={cn(
              "h-6 w-6 drop-shadow-md transition-colors",
              isLiked ? "fill-primary text-primary" : "fill-black/30 text-white"
            )}
          />
        </button>

        {/* Navigation arrows */}
        {listing.images.length > 1 && isHovered && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:scale-105 dark:bg-black/60 dark:text-white dark:hover:bg-black/80"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:scale-105 dark:bg-black/60 dark:text-white dark:hover:bg-black/80"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Dots indicator */}
        {listing.images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {listing.images.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-all",
                  index === currentImage
                    ? "bg-white w-2"
                    : "bg-white/60"
                )}
              />
            ))}
          </div>
        )}

        {/* Superhost badge */}
        {listing.is_superhost && (
          <div className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-1 text-xs font-bold shadow-sm backdrop-blur-sm dark:bg-black/60 dark:text-white">
            Superhost
          </div>
        )}

        {/* Host Logo Badge */}
        {listing.host_logo && (
          <div className="absolute right-3 bottom-3 h-10 w-10 overflow-hidden rounded-lg bg-white shadow-md">
            <img
              src={listing.host_logo}
              alt="Host Logo"
              className="h-full w-full object-contain p-1"
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-3 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground line-clamp-1">
            {listing.location}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <Star className="h-4 w-4 fill-foreground text-foreground" />
            <span className="text-sm font-medium">{listing.rating}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-1">
          {listing.title}
        </p>
        <p className="text-sm text-muted-foreground">
          {listing.bedrooms} bedroom{listing.bedrooms > 1 ? "s" : ""} · {listing.beds} bed{listing.beds > 1 ? "s" : ""}
        </p>
        <p className="pt-1">
          <span className="font-semibold">{formatNaira(listing.price_per_night)}</span>
          <span className="text-muted-foreground"> night</span>
        </p>
      </div>
    </Link>
  );
}