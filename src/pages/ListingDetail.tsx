import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useListing } from "@/hooks/useListings";
import { useAuth } from "@/hooks/useAuth"; // Added useAuth
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Star,
  Heart,
  Share,
  MapPin,
  Users,
  Wifi,
  Car,
  Waves,
  Flame,
  Wind,
  ChefHat,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Calendar as CalendarIcon,
  MessageCircle
} from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useMessages } from "@/hooks/useMessages";
import { format, differenceInDays } from "date-fns";
import { cn, formatNaira } from "@/lib/utils";
import { toast } from "sonner";

const getYoutubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const amenityIcons: Record<string, any> = {
  WiFi: Wifi,
  Parking: Car,
  Pool: Waves,
  "Hot Tub": Waves,
  "Beach Access": Waves,
  Fireplace: Flame,
  "Air Conditioning": Wind,
  Kitchen: ChefHat,
};

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  // const listing = mockListings.find((l) => l.id === id); // OLD
  const { listing, loading, error } = useListing(id);
  const { isFavorite, toggleFavorite } = useFavorites();

  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState(1);
  const [currentImage, setCurrentImage] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [disabledDates, setDisabledDates] = useState<Date[]>([]);

  // Reviews State
  const { user } = useAuth();
  const { startConversation } = useMessages();
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewContent, setNewReviewContent] = useState("");
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Fetch Reviews
  useEffect(() => {
    if (!id) return;
    const fetchReviews = async () => {
      // 1. Fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('listing_id', id)
        .order('created_at', { ascending: false });

      if (reviewsError) {
        console.error("Error fetching reviews:", reviewsError);
        setReviewsLoading(false);
        return;
      }

      if (!reviewsData || reviewsData.length === 0) {
        setReviews([]);
        setReviewsLoading(false);
        return;
      }

      // 2. Fetch profiles for these reviews
      const guestIds = [...new Set(reviewsData.map(r => r.guest_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', guestIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      // 3. Map profiles to reviews
      const enrichedReviews = reviewsData.map(review => ({
        ...review,
        guest: profilesData?.find(p => p.id === review.guest_id) || null
      }));

      setReviews(enrichedReviews);
      setReviewsLoading(false);
    };
    fetchReviews();
  }, [id]);

  const handleSubmitReview = async () => {
    if (!user) {
      toast.error("Please login to verify your stay and leave a review.");
      navigate("/auth");
      return;
    }

    if (!newReviewContent.trim()) {
      toast.error("Please write a few words about your stay.");
      return;
    }

    try {
      const { error } = await supabase.from('reviews').insert({
        listing_id: id,
        guest_id: user.id,
        rating: newReviewRating,
        content: newReviewContent
      });

      if (error) throw error;

      toast.success("Review submitted! Thank you.");
      setIsReviewOpen(false);
      setNewReviewContent("");
      // Refresh reviews
      const { data: newReviewsData } = await supabase
        .from('reviews')
        .select('*')
        .eq('listing_id', id)
        .order('created_at', { ascending: false });

      if (newReviewsData && newReviewsData.length > 0) {
        const guestIds = [...new Set(newReviewsData.map(r => r.guest_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', guestIds);

        const enrichedReviews = newReviewsData.map(review => ({
          ...review,
          guest: profilesData?.find(p => p.id === review.guest_id) || null
        }));
        setReviews(enrichedReviews);
      } else {
        setReviews([]);
      }

    } catch (e: any) {
      console.error("Review Error:", e);
      toast.error("Failed to submit review.");
    }
  };



  // Handle Contact Host
  const handleContactHost = async () => {
    if (!user) {
      toast.error("Please login to contact the host");
      navigate('/auth');
      return;
    }

    if (user.id === listing.host_id) {
      toast.error("You cannot message yourself!");
      return;
    }

    try {
      const conversationId = await startConversation(listing.host_id, listing.id);
      toast.dismiss(); // Dismiss loading toast
      navigate('/host/messages', { state: { selectedChatId: conversationId } });
    } catch (err) {
      console.error("Contact Host Error:", err);
      toast.dismiss();
      toast.error("Failed to open conversation");
    }
  };

  const isLiked = listing ? isFavorite(listing.id) : false;

  // Fetch blocked dates
  useEffect(() => {
    if (!listing?.id) return;
    async function fetchBlockedDates() {
      try {
        // Safe RPC call
        const { data, error } = await supabase
          .rpc('get_blocked_dates', { listing_id_input: listing!.id });

        if (error) {
          console.error("Error fetching availability (RPC):", error);
          // Fallback or just ignore (dates won't be blocked, but page won't crash)
          return;
        }

        if (data) {
          const dates: Date[] = [];
          // Ensure data is an array before iterating
          if (Array.isArray(data)) {
            data.forEach((booking: any) => {
              if (!booking.check_in || !booking.check_out) return;
              let current = new Date(booking.check_in);
              const end = new Date(booking.check_out);
              // Simple sanity check to prevent infinite loops if data is bad
              if (isNaN(current.getTime()) || isNaN(end.getTime())) return;

              while (current <= end) {
                dates.push(new Date(current));
                current.setDate(current.getDate() + 1);
              }
            });
          }
          setDisabledDates(dates);
        }
      } catch (err) {
        console.error("Crash prevented in fetchBlockedDates:", err);
      }
    }
    fetchBlockedDates();
  }, [listing?.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="container flex flex-1 flex-col items-center justify-center py-16 text-center">
          <div className="space-y-4 w-full max-w-4xl">
            <div className="h-96 w-full bg-slate-200 rounded-[2.5rem] animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="col-span-2 space-y-4">
                <div className="h-10 w-3/4 bg-slate-200 rounded-xl animate-pulse" />
                <div className="h-4 w-1/2 bg-slate-200 rounded-xl animate-pulse" />
                <div className="h-32 w-full bg-slate-200 rounded-xl animate-pulse" />
              </div>
              <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="container flex flex-1 flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 text-6xl">🏠</div>
          <h1 className="mb-4 text-2xl font-bold">Listing not found</h1>
          <p className="text-slate-500 mb-6">{error || "The property you are looking for does not exist."}</p>
          <Link to="/">
            <Button className="bg-[#F48221] hover:bg-[#E36D0B]">Back to home</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;
  const subtotal = nights * listing.price_per_night;
  const securityDeposit = listing.security_deposit || 0;
  // Service fee is borne by host, so it's not added to guest total
  const total = subtotal + securityDeposit;

  const handleReserve = () => {
    if (!checkIn || !checkOut) {
      toast.error("Please select check-in and check-out dates");
      return;
    }

    // Double Booking Check: Ensure no disabled dates fall within the selected range
    const isRangeBlocked = disabledDates.some(disabledDate => {
      const date = new Date(disabledDate);
      return date >= checkIn && date <= checkOut;
    });

    if (isRangeBlocked) {
      toast.error("Some dates in your range are already booked. Please select different dates.");
      return;
    }

    const params = new URLSearchParams({
      listing: listing.id,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      guests: guests.toString(),
    });
    toast.success("Redirecting to checkout...");
    navigate(`/checkout?${params.toString()}`);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleReviewsClick = () => {
    // Scroll to reviews section
    const element = document.getElementById('reviews');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="py-6 md:py-8">
        <div className="container max-w-6xl px-4 md:px-6">
          {/* Header Section */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {listing.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1 cursor-pointer hover:opacity-80" onClick={handleReviewsClick}>
                  <Star className="h-4 w-4 fill-[#F48221] text-[#F48221]" />
                  <span className="font-semibold">{listing.rating}</span>
                  <span className="text-muted-foreground underline">
                    ({listing.review_count} reviews)
                  </span>
                </div>
                <span className="text-muted">•</span>
                <div className="flex items-center gap-1 font-medium text-muted-foreground">
                  <MapPin className="h-4 w-4 text-[#00AEEF]" />
                  <span className="underline">{listing.location}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="rounded-full hover:bg-accent" onClick={handleShare}>
                  <Share className="mr-2 h-4 w-4" /> Share
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full hover:bg-accent"
                  onClick={() => listing && toggleFavorite(listing.id)}
                >
                  <Heart className={cn("mr-2 h-4 w-4", isLiked && "fill-red-500 text-red-500")} />
                  {isLiked ? "Saved" : "Save"}
                </Button>
              </div>
            </div>

            {/* Map Toggle & Preview */}
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMap(!showMap)}
                className="text-muted-foreground hover:text-foreground text-xs h-8 px-2"
              >
                <MapPin className="mr-2 h-3.5 w-3.5" />
                {showMap ? "Hide Map" : "Show Map"}
              </Button>

              {showMap && (listing.address || listing.location) && (
                <div className="w-full mt-2 h-64 rounded-2xl overflow-hidden border border-border animate-in fade-in-0 slide-in-from-top-2 duration-300">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(`${listing.address || ''}, ${listing.location || ''}, Lagos, Nigeria`)}&output=embed`}
                    title="Location"
                    className="w-full h-full border-0"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Luxury Image Gallery */}
          <div className="relative mb-10 overflow-hidden rounded-2xl border bg-secondary shadow-sm">
            {/* Mobile Carousel */}
            <div className="flex md:hidden overflow-x-auto snap-x snap-mandatory no-scrollbar h-72">
              {(listing.images || []).map((image, index) => (
                <Dialog key={index}>
                  <div className="min-w-full snap-center relative">
                    <DialogTrigger asChild>
                      <img
                        src={image}
                        alt={`${listing.title} ${index + 1}`}
                        className="h-full w-full object-cover cursor-zoom-in"
                      />
                    </DialogTrigger>
                    <div className="absolute bottom-4 right-4 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-md pointer-events-none">
                      {index + 1} / {listing.images.length}
                    </div>
                  </div>
                  <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-transparent border-none shadow-none">
                    <img src={image} className="w-full h-auto rounded-lg shadow-2xl" alt="Full view" />
                  </DialogContent>
                </Dialog>
              ))}
            </div>

            {/* Desktop Grid - Constrained Height */}
            <div className="hidden md:grid gap-2 md:grid-cols-4 md:grid-rows-2 h-[50vh] max-h-[550px] min-h-[400px]">
              <Dialog>
                <DialogTrigger asChild>
                  <div className="relative col-span-2 row-span-2 overflow-hidden rounded-l-xl cursor-zoom-in group">
                    <img
                      src={listing.images?.[0] || '/placeholder-image.jpg'}
                      alt={listing.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-transparent border-none shadow-none">
                  <img src={listing.images[0]} className="w-full h-auto rounded-lg shadow-2xl" alt="Full view" />
                </DialogContent>
              </Dialog>

              {(listing.images || []).slice(1, 5).map((image, index) => (
                <Dialog key={index}>
                  <DialogTrigger asChild>
                    <div className="relative hidden overflow-hidden md:block first:rounded-tr-none last:rounded-br-xl cursor-zoom-in group">
                      <img
                        src={image}
                        alt={`${listing.title} ${index + 2}`}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-transparent border-none shadow-none">
                    <img src={image} className="w-full h-auto rounded-lg shadow-2xl" alt="Full view" />
                  </DialogContent>
                </Dialog>
              ))}
            </div>

            <Button
              variant="secondary"
              className="absolute bottom-4 right-4 hidden border-border bg-background/90 font-semibold shadow-sm md:flex"
              onClick={() => setCurrentImage(0)}
            >
              Show all photos
            </Button>
          </div>

          <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
            {/* Left Column: Details */}
            <div className="space-y-8">
              <div className="flex items-start justify-between border-b pb-8">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">
                    Entire place hosted by {listing.host_name}
                  </h2>
                  <p className="mt-1 text-muted-foreground">
                    {listing.max_guests} guests · {listing.bedrooms} bedroom{listing.bedrooms > 1 ? "s" : ""} · {listing.beds} bed{listing.beds > 1 ? "s" : ""} · {listing.bathrooms} bath
                  </p>
                </div>
                <div className="relative shrink-0">
                  {listing.host_logo ? (
                    <div className="h-16 w-16 overflow-hidden rounded-xl bg-white shadow-sm border border-border flex items-center justify-center">
                      <img
                        src={listing.host_logo}
                        alt={listing.host_name}
                        className="h-full w-full object-contain p-1"
                      />
                    </div>
                  ) : (
                    <img
                      src={listing.host_avatar}
                      alt={listing.host_name}
                      className="h-14 w-14 rounded-full border-2 border-background object-cover shadow-md"
                    />
                  )}
                  {listing.is_superhost && (
                    <div className="absolute -bottom-2 -right-2 rounded-full bg-background p-0.5 shadow-sm">
                      <ShieldCheck className="h-6 w-6 text-[#F48221]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Virtual Tour Section */}
              {listing.video_url && getYoutubeId(listing.video_url) && (
                <div className="border-b pb-8">
                  <h3 className="mb-6 text-xl font-semibold">Virtual Tour</h3>
                  <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${getYoutubeId(listing.video_url)}`}
                      title="Virtual Tour"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0"
                    />
                  </div>
                </div>
              )}

              {/* Unique Selling Points */}
              <div className="space-y-6 border-b pb-8 text-muted-foreground">
                <div className="flex gap-4">
                  <Users className="mt-1 h-6 w-6 text-muted-foreground" />
                  <div>
                    <p className="font-semibold text-foreground">Self check-in</p>
                    <p className="text-sm text-muted-foreground">Check yourself in with the keypad.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CalendarIcon className="mt-1 h-6 w-6 text-muted-foreground" />
                  <div>
                    <p className="font-semibold text-foreground">Free cancellation for 48 hours</p>
                    <p className="text-sm text-muted-foreground">Full refund if you change your mind.</p>
                  </div>
                </div>
              </div>

              <div className="border-b pb-8">
                <h3 className="mb-4 text-xl font-semibold">About this space</h3>
                <p className="leading-relaxed text-muted-foreground">{listing.description}</p>
              </div>

              <div className="border-b pb-8">
                <h3 className="mb-6 text-xl font-semibold">What this place offers</h3>
                <div className="grid gap-y-4 sm:grid-cols-2">
                  {(listing.amenities || []).map((amenity) => {
                    const Icon = amenityIcons[amenity] || Wifi;
                    return (
                      <div key={amenity} className="flex items-center gap-4 text-muted-foreground">
                        <Icon className="h-6 w-6 text-muted-foreground" />
                        <span className="text-md">{amenity}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Reviews Section */}
              <div className="border-b pb-8" id="reviews">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Star className="h-5 w-5 fill-[#F48221] text-[#F48221]" />
                    {listing.rating > 0 ? listing.rating : "New"} · {reviews.length} reviews
                  </h3>

                  <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="border-foreground text-foreground font-semibold hover:bg-muted">Write a Review</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <div className="grid gap-4 py-4">
                        <h2 className="text-lg font-bold">How was your stay?</h2>
                        <div className="space-y-2">
                          <Label>Rating</Label>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setNewReviewRating(star)}
                                className="focus:outline-none transition-transform active:scale-95"
                              >
                                <Star
                                  className={cn(
                                    "h-8 w-8 cursor-pointer transition-colors",
                                    star <= newReviewRating ? "fill-[#F48221] text-[#F48221]" : "text-muted-foreground/30"
                                  )}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Comments</Label>
                          <Textarea
                            placeholder="Share your experience..."
                            value={newReviewContent}
                            onChange={(e) => setNewReviewContent(e.target.value)}
                            className="h-32"
                          />
                        </div>
                        <Button onClick={handleSubmitReview} className="w-full bg-[#F48221] text-white font-bold hover:bg-[#E36D0B]">
                          Submit Review
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {reviewsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
                  </div>
                ) : reviews.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {reviews.slice(0, 6).map((review) => (
                      <div key={review.id} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={review.guest?.avatar_url} />
                            <AvatarFallback>{review.guest?.full_name?.[0] || 'G'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">{review.guest?.full_name || "Guest"}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(review.created_at), 'MMMM yyyy')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-foreground text-foreground" />
                          ))}
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">{review.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No reviews yet. Be the first to share your experience!</p>
                )}
              </div>
            </div>

            {/* Right Column: Booking Widget */}
            <div className="relative">
              <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-xl">
                <div className="mb-6 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-bold text-foreground">{formatNaira(listing.price_per_night)}</span>
                    <span className="text-muted-foreground"> / night</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold">
                    <Star className="h-3 w-3 fill-foreground text-foreground" />
                    {listing.rating}
                  </div>
                </div>

                {/* Booking Interface */}
                <div className="mb-4 overflow-hidden rounded-xl border border-border">


                  <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="flex flex-col p-3 text-left transition-colors hover:bg-accent">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Check-in</span>
                          <span className={cn("text-sm", !checkIn && "text-muted-foreground")}>
                            {checkIn ? format(checkIn, "dd/MM/yyyy") : "Add date"}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={checkIn}
                          onSelect={setCheckIn}
                          disabled={(date) => date < new Date() || disabledDates.some(d => d.toDateString() === date.toDateString())}
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="flex flex-col p-3 text-left transition-colors hover:bg-accent">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Checkout</span>
                          <span className={cn("text-sm", !checkOut && "text-muted-foreground")}>
                            {checkOut ? format(checkOut, "dd/MM/yyyy") : "Add date"}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={checkOut}
                          onSelect={setCheckOut}
                          disabled={(date) => {
                            // 1. Basic checks: Past dates, before check-in, or explicitly disabled
                            if (date < (checkIn || new Date()) || disabledDates.some(d => d.toDateString() === date.toDateString())) {
                              return true;
                            }

                            // 2. Prevent selecting a checkout date that would span across a booked period
                            if (checkIn) {
                              // Find the first blocked date *after* check-in
                              const nextBlockedDate = disabledDates
                                .map(d => new Date(d))
                                .sort((a, b) => a.getTime() - b.getTime())
                                .find(d => d > checkIn);

                              // If such a date exists, disable everything after it
                              if (nextBlockedDate && date > nextBlockedDate) {
                                return true;
                              }
                            }

                            return false;
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Guests</span>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-sm text-foreground">{guests} guest{guests > 1 ? "s" : ""}</span>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setGuests(Math.max(1, guests - 1))} disabled={guests <= 1}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setGuests(Math.min(listing.max_guests, guests + 1))} disabled={guests >= listing.max_guests}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <Button className="w-full rounded-xl bg-[#F48221] py-6 text-lg font-bold text-white shadow-lg transition-all hover:bg-[#E36D0B] active:scale-[0.98]" onClick={handleReserve}>
                  Reserve Now
                </Button>

                <p className="mt-4 text-center text-xs text-muted-foreground font-medium">No payment required yet</p>

                {nights > 0 && (
                  <div className="mt-6 space-y-3 border-t pt-6">
                    <div className="flex justify-between text-muted-foreground">
                      <span className="underline decoration-border underline-offset-4">{formatNaira(listing.price_per_night)} × {nights} nights</span>
                      <span>{formatNaira(subtotal)}</span>
                    </div>
                    {securityDeposit > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span className="underline decoration-border underline-offset-4">Security Deposit</span>
                        <span>{formatNaira(securityDeposit)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-3 text-lg font-bold text-foreground">
                      <span>Total</span>
                      <span>{formatNaira(total)}</span>
                    </div>
                  </div>
                )}
                {listing.security_deposit > 0 && nights === 0 && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Includes refundable security deposit of {formatNaira(listing.security_deposit)}
                  </p>
                )}

                <div className="mt-4 pt-4 border-t border-border/50 text-center">
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground hover:bg-muted font-semibold text-sm h-auto py-2"
                    onClick={async () => {
                      if (!user) {
                        toast.error("Please login to contact the host");
                        return;
                      }
                      try {
                        // Import usage dynamically or use hook at top level
                        toast.loading("Opening chat...");
                        // Note: useMessages hook needs to be instantiated at top level
                        // We'll call the handleContactHost function we'll define in the component body
                        handleContactHost();
                      } catch (err) {
                        console.error(err);
                        toast.error("Failed to start chat");
                      }
                    }}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Contact Host regarding this Listing
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main >
      <Footer />
    </div >
  );
};

export default ListingDetail;