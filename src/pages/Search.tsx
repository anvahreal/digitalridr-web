import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ListingCard } from "@/components/ListingCard";
import { useListings } from "@/hooks/useListings";
import { formatNaira } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { SlidersHorizontal, MapPin, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AMENITIES } from "@/constants/amenities";

// ... imports

const Search = () => {
  const [searchParams] = useSearchParams();
  const locationParam = searchParams.get("location") || "";

  const { listings, loading, filters, setFilters } = useListings();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Sync location param to filters
  useEffect(() => {
    if (locationParam) {
      setFilters(prev => ({ ...prev, location: locationParam }));
    }
  }, [locationParam, setFilters]);

  const [localPriceRange, setLocalPriceRange] = useState<number[]>([filters.priceMin, filters.priceMax]);

  // Sync local price range when filters change externally (e.g. clear filters)
  useEffect(() => {
    setLocalPriceRange([filters.priceMin, filters.priceMax]);
  }, [filters.priceMin, filters.priceMax]);

  // Handler for Price Range (Slider returns number[])
  const handlePriceCommit = (value: number[]) => {
    setFilters(prev => ({ ...prev, priceMin: value[0], priceMax: value[1] }));
  };

  // Handler for Bedrooms
  const handleBedroomsChange = (val: number) => {
    setFilters(prev => ({ ...prev, bedrooms: val }));
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);



  const clearFilters = () => {
    setFilters(prev => ({ ...prev, priceMin: 0, priceMax: 1000, bedrooms: 0 }));
    setSelectedAmenities([]);
  };

  // Filter listings by amenities client-side
  const finalListings = useMemo(() => {
    if (!selectedAmenities.length) return listings;
    return listings.filter(l => selectedAmenities.every(a => l.amenities?.includes(a)));
  }, [listings, selectedAmenities]);

  const hasActiveFilters = filters.priceMin > 0 || filters.priceMax < 1000 || filters.bedrooms > 0 || selectedAmenities.length > 0;

  const FiltersContent = () => (
    <div className="space-y-8">
      {/* Price Range */}
      <div>
        <h3 className="mb-4 font-bold text-foreground">Price range</h3>
        <p className="mb-4 text-sm font-medium text-muted-foreground">{formatNaira(localPriceRange[0])} - {formatNaira(localPriceRange[1])}+ per night</p>
        <Slider
          value={localPriceRange}
          onValueChange={setLocalPriceRange}
          onValueCommit={handlePriceCommit}
          min={0}
          max={1000000}
          step={5000}
          className="w-full [&_.bg-primary]:bg-[#F48221] [&_.bg-secondary]:bg-muted"
        />
      </div>

      {/* Bedrooms */}
      <div>
        <h3 className="mb-4 font-bold text-foreground">Bedrooms</h3>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4, 5].map((num) => (
            <Button
              key={num}
              variant={filters.bedrooms === num ? "default" : "outline"}
              size="sm"
              onClick={() => handleBedroomsChange(num)}
              className={`min-w-[48px] rounded-full font-bold ${filters.bedrooms === num ? 'bg-[#F48221] hover:bg-[#E36D0B] text-white border-none' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              {num === 0 ? "Any" : num === 5 ? "5+" : num}
            </Button>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div>
        <h3 className="mb-4 font-bold text-foreground">Amenities</h3>
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
          {AMENITIES.map((amenity) => (
            <label
              key={amenity}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border p-4 transition-all hover:bg-muted/50 hover:border-border/80 min-h-[56px] group"
            >
              <Checkbox
                checked={selectedAmenities.includes(amenity)}
                onCheckedChange={() => toggleAmenity(amenity)}
                className="data-[state=checked]:bg-[#F48221] data-[state=checked]:border-[#F48221] border-muted-foreground/30 shrink-0 h-5 w-5 rounded-md"
              />
              <span className="text-sm font-medium leading-tight text-foreground group-hover:text-foreground/80">{amenity}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-sans transition-colors duration-300">
      <Header />
      <main className="py-6 md:py-10">
        <div className="container px-4">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-foreground md:text-3xl flex items-center gap-2 tracking-tight">
                {locationParam && <MapPin className="h-6 w-6 text-[#F48221]" />}
                {locationParam ? `Stays in ${locationParam}` : "All stays"}
              </h1>
              <p className="text-sm font-medium text-muted-foreground ml-1">
                {loading ? "Searching best places..." : `${finalListings.length} places found`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="flex-1 gap-2 rounded-full lg:hidden border-border bg-card text-foreground font-bold shadow-sm">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters {hasActiveFilters && `(Active)`}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0 flex flex-col overflow-hidden bg-background border-t border-border">
                  <SheetHeader className="p-6 border-b border-border shrink-0 bg-card">
                    <SheetTitle className="text-foreground">Filters</SheetTitle>
                  </SheetHeader>

                  <div className="flex-1 overflow-y-auto p-6 pb-32">
                    {FiltersContent()}
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-card p-4 pb-8 flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-xl border-border font-bold" onClick={clearFilters}>Clear all</Button>
                    <Button className="flex-1 rounded-xl bg-[#F48221] hover:bg-[#E36D0B] font-bold text-white" onClick={() => setIsFiltersOpen(false)}>
                      Show {finalListings.length} places
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="flex gap-10">
            <aside className="hidden w-80 shrink-0 lg:block">
              <div className="sticky top-28 rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
                  <h2 className="font-bold text-lg text-foreground">Filters</h2>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-[#F48221] hover:text-[#E36D0B] hover:bg-[#F48221]/10 font-bold h-8 px-2">Clear all</Button>
                  )}
                </div>
                {FiltersContent()}
              </div>
            </aside>

            <div className="flex-1">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="aspect-square w-full rounded-2xl bg-muted/20 animate-pulse border border-border/40" />
                  ))}
                </div>
              ) : finalListings.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                  {finalListings.map((listing, index) => (
                    <div key={listing.id} className="animate-in fade-in zoom-in-50 duration-500" style={{ animationDelay: `${index * 0.05}s` }}>
                      <ListingCard listing={listing} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-3xl border border-dashed border-border mt-10">
                  <div className="mb-4 text-6xl opacity-50">🏠</div>
                  <h3 className="text-xl font-black text-foreground">No exact matches</h3>
                  <p className="text-muted-foreground mb-6 max-w-xs mx-auto mt-2">Try changing your filters or searching for a different location.</p>
                  <Button onClick={clearFilters} className="bg-[#F48221] hover:bg-[#E36D0B] rounded-full font-bold px-8">Clear all filters</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Search;