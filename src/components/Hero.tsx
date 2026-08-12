import { SearchBar } from "./SearchBar";
import { Star, ShieldCheck, MapPin } from "lucide-react";

export function Hero() {
  // We duplicate the array to ensure the marquee loop is seamless
  const stats = [
    { icon: Star, value: "4.9", label: "Avg Rating" },
    { icon: ShieldCheck, value: "Verified", label: "Host Profiles" },
    { icon: MapPin, value: "Nigeria", label: "Lagos & Abuja" },
    { icon: Star, value: "4.9", label: "Avg Rating" },
    { icon: ShieldCheck, value: "Verified", label: "Host Profiles" },
    { icon: MapPin, value: "Nigeria", label: "Lagos & Abuja" },
  ];

  return (
    /* Laptop Fix: Reduced py-24 to py-16 and lg:py-32 to lg:py-20 */
    /* Mobile Fix: Reduced py-8 to py-6 and added pb-2 to specifically hug the bottom marquee */
    <section className="relative overflow-hidden bg-background pt-6 pb-2 md:pt-16 md:pb-8 lg:pt-20 lg:pb-10 transition-colors duration-300">
      {/* MESH GRADIENT BACKDROP */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-[5%] -right-[5%] h-[60%] w-[50%] rounded-full bg-gradient-to-br from-primary/20 to-orange-200/30 blur-[100px] rotate-12 dark:from-primary/10 dark:to-primary/5" />
        <div className="absolute -bottom-[10%] -left-[10%] h-[70%] w-[60%] rounded-full bg-orange-50/40 blur-[80px] -rotate-12 dark:bg-primary/5" />
      </div>

      <div className="container relative z-10 px-4">
        <div className="mx-auto max-w-5xl text-center">
          {/* Animated Badge - Tighter margin */}
          <div className="mb-3 md:mb-5 inline-flex items-center gap-2 rounded-full bg-background/80 backdrop-blur-md border border-primary/20 px-4 py-2 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-primary shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Premium Short-lets in Nigeria
          </div>

          {/* Heading - Tighter leading and margin */}
          <h1 className="mb-4 md:mb-6 text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.1]">
            Discover unique stays <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-primary via-orange-500 to-orange-400 bg-clip-text text-transparent">
              across Nigeria.
            </span>
          </h1>

          {/* Paragraph - Reduced mb-10 to mb-8 for laptops */}
          <p className="mx-auto mb-6 md:mb-8 max-w-2xl text-sm md:text-lg lg:text-xl text-muted-foreground font-medium">
            From Lagos to Abuja. Find your perfect getaway.
          </p>

          {/* Floating Glass Search Bar */}
          <div className="flex justify-center w-full">
            <div className="w-full max-w-4xl p-1.5 md:p-2 rounded-[24px] md:rounded-[32px] bg-background/60 backdrop-blur-2xl border border-primary/10 shadow-[0_20px_40px_-12px_rgba(244,130,33,0.12)] dark:bg-card/60 dark:border-white/10">
              <SearchBar variant="hero" />
            </div>
          </div>

          {/* INFINITE MARQUEE STATS */}
          {/* Laptop Fix: Reduced mt-20 to mt-12. Mobile Fix: mt-8 */}
          <div className="relative mt-8 md:mt-12 lg:mt-16 w-full overflow-hidden py-2 md:py-3">
            {/* Edge Fades */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 md:w-24 bg-gradient-to-r from-background via-background/80 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 md:w-24 bg-gradient-to-l from-background via-background/80 to-transparent" />

            {/* The Track */}
            <div className="flex w-max animate-marquee gap-10 md:gap-20 items-center">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 md:gap-4 whitespace-nowrap"
                >
                  <div className="h-10 w-10 md:h-12 lg:h-14 rounded-xl bg-card shadow-sm border border-primary/10 flex items-center justify-center text-primary">
                    <stat.icon className="h-5 w-5 md:h-6" />
                  </div>
                  <div className="text-left">
                    <div className="text-base md:text-lg lg:text-xl font-black text-foreground leading-none">
                      {stat.value}
                    </div>
                    <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
