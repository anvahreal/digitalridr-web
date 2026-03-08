import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { Search, Menu, User, Globe, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ModeToggle } from "@/components/ModeToggle";
import { NotificationBell } from "@/components/NotificationBell";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useProfile();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${isScrolled
        ? "bg-background/95 backdrop-blur-md shadow-md py-2"
        : "bg-background py-4"
        }`}
    >
      <div className="container mx-auto flex items-center justify-between px-4">
        {/* Logo Section */}
        <Link to="/" className="flex items-center gap-2 group">
          <img
            src="/assets/digitalridr-logo.PNG"
            alt="Digital Ridr Apartments"
            className="h-8 md:h-10 w-auto group-hover:opacity-90 transition-opacity"
          />
        </Link>

        {!location.pathname.includes("/host") && (
          <div className="hidden md:flex items-center">
            <Link to="/search">
              <button className="flex items-center gap-4 rounded-full border border-border bg-card px-6 py-2.5 shadow-sm hover:shadow-md transition-all">
                <span className="font-bold text-sm text-foreground">Anywhere</span>
                <span className="h-4 w-px bg-border" />
                <span className="font-bold text-sm text-foreground">Any week</span>
                <span className="h-4 w-px bg-border" />
                <span className="text-muted-foreground text-sm font-medium">
                  Add guests
                </span>
                <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#F48221] text-white">
                  <Search className="h-4 w-4 stroke-[3px]" />
                </div>
              </button>
            </Link>
          </div>
        )}

        {/* Right Menu */}
        <div className="flex items-center gap-2 md:gap-4">
          <NotificationBell />
          <div className="hidden lg:block">
            {profile?.is_host ? (
              <span className="text-sm font-bold text-muted-foreground cursor-default px-4 py-2 select-none" title="You are already a host">
                You are a Host
              </span>
            ) : (
              <Link to="/host">
                <Button
                  variant="ghost"
                  className="rounded-full font-black text-foreground hover:bg-accent"
                >
                  Become a Host
                </Button>
              </Link>
            )}
          </div>

          <div className="hidden md:block">
            <ModeToggle />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-3 rounded-full border-border pl-3 pr-1 py-1 h-12 hover:shadow-md transition-all bg-background"
              >
                <Menu className="h-4 w-4 text-foreground" />
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 rounded-2xl p-2 shadow-xl border-border mt-2 bg-card text-card-foreground"
            >
              {!user ? (
                <>
                  <DropdownMenuItem
                    asChild
                    className="rounded-xl focus:bg-accent focus:text-accent-foreground cursor-pointer"
                  >
                    <Link to="/auth" className="font-black py-2">
                      Sign up
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="rounded-xl focus:bg-accent focus:text-accent-foreground cursor-pointer"
                  >
                    <Link to="/auth" className="py-2 font-medium">
                      Log in
                    </Link>
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    asChild
                    className="rounded-xl focus:bg-accent focus:text-accent-foreground cursor-pointer"
                  >
                    <Link to="/dashboard" className="font-black py-2">
                      My Stays
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="rounded-xl focus:bg-accent focus:text-accent-foreground cursor-pointer"
                  >
                    <Link to="/host/dashboard" className="py-2 font-medium">
                      Host Dashboard
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator className="my-2 bg-border" />
              <DropdownMenuItem
                asChild
                className="rounded-xl focus:bg-accent focus:text-accent-foreground cursor-pointer"
              >
                <Link to="/host" className="py-2">
                  Host your home
                </Link>
              </DropdownMenuItem>
              <div className="md:hidden">
                <DropdownMenuSeparator className="my-2 bg-border" />
                <div className="p-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Theme</span>
                  <ModeToggle />
                </div>
              </div>
              {user && (
                <DropdownMenuItem
                  className="rounded-xl focus:bg-red-50 focus:text-red-600 py-2 text-red-500 font-bold cursor-pointer"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate("/");
                    toast.info("Logged out successfully");
                  }}
                >
                  Log out
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
