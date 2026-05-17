import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { ListingCard } from "@/components/ListingCard";
import { Footer } from "@/components/Footer";
import { useListings } from "@/hooks/useListings";
import { ArrowRight, ShieldCheck, Headphones, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { listings, loading } = useListings();

  const neighborhoods = [
    {
      name: "Ikoyi",
      count: "120+ stays",
      img: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400",
    },
    {
      name: "Lekki Phase 1",
      count: "340+ stays",
      img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400",
    },
    {
      name: "Victoria Island",
      count: "80+ stays",
      img: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=400",
    },
    {
      name: "Surulere",
      count: "45+ stays",
      img: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />

        {/* Horizontal Scrolling Sections */}
        <div className="space-y-4 pb-16">
          {/* New on DigitalRidr */}
          <ListingSection
            title="New on Digital Ridr"
            subtitle="Freshly added apartments"
            items={listings.slice(0, 8)}
            loading={loading}
          />

          {/* Guest Favorites */}
          <ListingSection
            title="Guest favorites"
            subtitle="Top rated homes loved by guests"
            items={listings.filter(l => l.rating >= 4.8).slice(0, 8)}
            loading={loading}
          />

          {/* Dynamic Location Sections */}
          {[...new Set(listings.map(l => l.location))].sort().map((loc) => (
            <ListingSection
              key={loc}
              title={`Stays in ${loc}`}
              items={listings.filter(l => l.location === loc).slice(0, 8)}
              loading={loading}
            />
          ))}

          {/* Browse by Neighborhood (Restored/Static) */}
          <section className="py-6">
            <div className="container px-4">
              <h2 className="text-xl font-bold mb-6">Explore Top Neighborhoods</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {neighborhoods.map((n) => (
                  <Link to={`/search?location=${n.name}`} key={n.name} className="relative group overflow-hidden rounded-2xl aspect-[4/3]">
                    <img src={n.img} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" alt={n.name} />
                    <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-4">
                      <p className="text-white font-bold">{n.name}</p>
                      <p className="text-white/80 text-xs">{n.count}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {!loading && listings.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground font-medium">No listings found yet.</p>
            </div>
          )}
        </div>


        {/* Become a Host CTA - Updated colors for better UI contrast */}
        <section className="py-10">
          <div className="container px-4">
            <div className="relative overflow-hidden rounded-[40px] bg-slate-900 p-8 text-white md:p-16">
              <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[#F48221]/20 to-transparent pointer-events-none" />
              <div className="relative z-10 max-w-xl">
                <h2 className="text-3xl font-black md:text-5xl tracking-tighter leading-tight">
                  Share your space, <br /> earn extra income.
                </h2>
                <p className="mt-6 text-lg text-slate-400 font-medium">
                  Join thousands of hosts in Lagos earning monthly by renting
                  out their apartments and studios.
                </p>
                <Link to="/host">
                  <Button
                    size="lg"
                    className="mt-8 bg-[#F48221] hover:bg-orange-600 text-white font-bold h-14 px-10 rounded-2xl"
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        {/* New: Trust Bar - Essential for User UI */}
        <section className="bg-card border-y border-border py-6">
          <div className="container px-4 flex flex-wrap justify-between gap-6 md:gap-0">
            {[
              { icon: ShieldCheck, text: "Verified Listings", sub: "Hand-picked for quality" },
              { icon: CreditCard, text: "Secure Payments", sub: "Safe transactions via Paystack" },
              { icon: Headphones, text: "24/7 Support", sub: "We're here to help anytime" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center text-[#F48221]">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{item.text}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

const ListingSection = ({ title, subtitle, items, loading }: { title: string, subtitle?: string, items: any[], loading: boolean }) => {
  if (!loading && items.length === 0) return null;

  return (
    <section className="py-6 md:py-8">
      <div className="container px-4">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{title}</h2>
            {subtitle && <p className="text-muted-foreground text-sm font-medium">{subtitle}</p>}
          </div>
          <Link to={`/search`} className="hidden md:flex items-center gap-1 text-sm font-bold text-foreground hover:opacity-70 transition-opacity">
            Show all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex gap-4 md:gap-5 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar snap-x snap-mandatory touch-pan-x">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[240px] md:w-[280px] flex-none snap-center space-y-3">
                <div className="aspect-square w-full bg-muted rounded-xl animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-2/3 bg-muted rounded-lg animate-pulse" />
                  <div className="h-4 w-1/2 bg-muted rounded-lg animate-pulse" />
                </div>
              </div>
            ))
          ) : (
            items.map((listing) => (
              <div key={listing.id} className="w-[240px] md:w-[280px] flex-none snap-center">
                <ListingCard listing={listing} className="h-full" />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

export default Index;
