import { useState, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  MapPin,
  CreditCard,
  Heart,
  User,
  Settings,
  LogOut,
  ChevronRight,
  Star,
  Clock,
  AlertCircle,
  Bell,
  Shield,
  MessageSquare,
} from "lucide-react";
import { formatNaira, cn } from "@/lib/utils";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

import { ManageBookingDialog, BookingReceipt } from "@/components/BookingActions";
import { useUserBookings } from "@/hooks/useUserBookings";
import { useFavorites } from "@/hooks/useFavorites";
import { useMessages } from "@/hooks/useMessages";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/LoadingSpinner";

// ... imports

const UserDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("stays");
  const { contactSupport } = useMessages();
  const { user, profile, loading, updateProfile } = useProfile();
  const { bookings, loading: bookingsLoading } = useUserBookings();
  const { favorites, loading: favoritesLoading, toggleFavorite } = useFavorites();

  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [actionType, setActionType] = useState<"manage" | "receipt" | null>(null);

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState("");
  const [updatingAvatar, setUpdatingAvatar] = useState(false);

  // Settings State
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);

  useEffect(() => {
    const fetchNotificationSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata) {
        if (user.user_metadata.email_notifications !== undefined) {
          setEmailNotifications(user.user_metadata.email_notifications);
        }
        if (user.user_metadata.sms_notifications !== undefined) {
          setSmsNotifications(user.user_metadata.sms_notifications);
        }
      }
    };
    fetchNotificationSettings();
  }, []);

  const handleEmailToggle = async () => {
    const newVal = !emailNotifications;
    setEmailNotifications(newVal);
    const { error } = await supabase.auth.updateUser({ data: { email_notifications: newVal } });
    if (error) {
      setEmailNotifications(!newVal);
      toast.error("Failed to update preference.");
    } else {
      toast.success(`Email notifications ${newVal ? 'enabled' : 'disabled'}`);
    }
  };

  const handleSmsToggle = async () => {
    const newVal = !smsNotifications;
    setSmsNotifications(newVal);
    const { error } = await supabase.auth.updateUser({ data: { sms_notifications: newVal } });
    if (error) {
      setSmsNotifications(!newVal);
      toast.error("Failed to update preference.");
    } else {
      toast.success(`SMS notifications ${newVal ? 'enabled' : 'disabled'}`);
    }
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setDob(profile.date_of_birth || "");
      setPhone(profile.phone_number || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUpdatingAvatar(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      setAvatarUrl(data.publicUrl);
      await updateProfile({ avatar_url: data.publicUrl });
      toast.success('Avatar updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Error uploading avatar!');
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const handleProfileUpdate = async () => {
    setUpdatingProfile(true);
    try {
      await updateProfile({
        full_name: fullName,
        date_of_birth: dob,
        phone_number: phone,
        avatar_url: avatarUrl
      });
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast.error(`Failed to update profile: ${error.message || "Unknown error"}`);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      confirmed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      completed: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      cancelled: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      pending: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    };

    return (
      <Badge
        variant="outline"
        className={`capitalize px-3 py-1 rounded-full font-bold text-[10px] backdrop-blur-sm ${styles[status as keyof typeof styles] || styles.pending}`}
      >
        {status}
      </Badge>
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully");
      setPasswordDialogOpen(false);
      setNewPassword("");
    } catch (error: any) {
      console.error("Password update error:", error);
      toast.error(error.message || "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleManageBooking = (booking: any) => {
    setSelectedBooking(booking);
    setActionType('manage');
  };

  return (
    <div className="min-h-screen bg-background font-sans transition-colors duration-300">
      <Header />
      <main className="py-10">
        <div className="container max-w-6xl px-4">
          {/* Welcome Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-black text-foreground tracking-tight">
              Welcome back, {loading ? <LoadingSpinner className="h-4 w-4 inline ml-2" /> : (() => {
                const names = profile?.full_name?.trim().split(' ') || [];
                return (names.length > 1 ? names[1] : names[0]) || "Guest";
              })()} 👋
            </h1>
            <p className="text-muted-foreground font-medium mt-1">
              {bookings.filter(b => b.status === 'confirmed').length > 0
                ? `You have ${bookings.filter(b => b.status === 'confirmed').length} upcoming bookings.`
                : "No upcoming trips."}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
            {/* Nav Sidebar */}
            <aside className="hidden lg:block space-y-6 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto no-scrollbar">
              <div className="space-y-1">
                {[
                  { id: "stays", label: "My Stays", icon: Calendar },
                  { id: "favorites", label: "Favorites", icon: Heart },
                  { id: "profile", label: "Profile", icon: User },
                  { id: "settings", label: "Settings", icon: Settings },
                  { id: "support", label: "Support", icon: MessageSquare },
                ].map((nav) => (
                  <button
                    key={nav.id}
                    onClick={() => setActiveTab(nav.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 font-bold text-sm",
                      activeTab === nav.id
                        ? "bg-foreground text-background shadow-lg scale-105"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <nav.icon className={cn("h-4 w-4", activeTab === nav.id ? "text-[#F48221]" : "opacity-70")} />
                    {nav.label}
                  </button>
                ))
                }
              </div>

              <Separator className="bg-border" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </aside>

            {/* Mobile Nav (Horizontal Scroll) */}
            <div className="block lg:hidden overflow-x-auto pb-4 -mx-4 px-4 no-scrollbar">
              <div className="flex gap-2 min-w-max">
                {[
                  { id: "stays", label: "Stays", icon: Calendar },
                  { id: "favorites", label: "Saved", icon: Heart },
                  { id: "profile", label: "User", icon: User },
                  { id: "settings", label: "Settings", icon: Settings },
                ].map((nav) => (
                  <button
                    key={nav.id}
                    onClick={() => setActiveTab(nav.id)}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all duration-300 font-bold text-xs whitespace-nowrap",
                      activeTab === nav.id
                        ? "bg-foreground border-foreground text-background shadow-md"
                        : "bg-background border-border text-muted-foreground"
                    )}
                  >
                    <nav.icon className={cn("h-3.5 w-3.5", activeTab === nav.id ? "text-[#F48221]" : "opacity-50")} />
                    {nav.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Section */}
            <div className="space-y-8">
              {/* STAYS TAB */}
              {activeTab === "stays" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-foreground">My Bookings</h2>
                    <div className="flex bg-muted p-1 rounded-xl">
                      <button className="px-4 py-1.5 rounded-lg bg-background shadow-sm text-xs font-bold text-foreground transition-all">Upcoming</button>
                      <button className="px-4 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground transition-all">Past</button>
                    </div>
                  </div>

                  {bookingsLoading ? (
                    <div className="space-y-4">
                      {[1, 2].map(i => (
                        <div key={i} className="h-40 bg-muted/50 rounded-3xl animate-pulse" />
                      ))}
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="text-center py-12 bg-card rounded-3xl border border-dashed border-border">
                      <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-bold text-foreground mb-1">No stays booked... yet!</h3>
                      <p className="text-xs text-muted-foreground mb-4">Time to dust off your bags and start planning your next stay</p>
                      <Button onClick={() => navigate('/')} className="rounded-xl px-6 font-bold bg-[#F48221] hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20">
                        Start Searching
                      </Button>
                    </div>
                  ) : (
                    bookings.filter(b => b.status === "confirmed" || b.status === "pending").map((booking) => (
                      <div
                        key={booking.id}
                        className="bg-card hover:bg-muted/10 border border-border/40 hover:border-border/80 rounded-[2rem] p-3 transition-all duration-300 group"
                      >
                        <div className="flex flex-col md:flex-row gap-4">
                          {/* Image Section */}
                          <div className="w-full md:w-[280px] aspect-[4/3] md:aspect-[16/10] relative rounded-[1.5rem] overflow-hidden shrink-0">
                            <img
                              src={booking.listings?.images?.[0]}
                              alt={booking.listings?.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {/* Badges Overlay */}
                            <div className="absolute top-3 left-3 flex flex-col gap-2">
                              {booking.status === 'confirmed' ? (
                                <Badge className="bg-white/90 backdrop-blur-md text-emerald-600 border-white/20 shadow-sm">
                                  {(booking as any).payment_status === 'paid' ? 'Paid' : 'Confirmed'}
                                </Badge>
                              ) : booking.status === 'pending' ? (
                                <Badge variant="secondary" className="bg-white/90 backdrop-blur-md text-orange-600 border-white/20 shadow-sm">
                                  Pending approval
                                </Badge>
                              ) : null}
                            </div>
                          </div>

                          {/* Content Section */}
                          <div className="flex-1 flex flex-col py-1 md:pr-2">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-bold text-xl text-foreground leading-tight mb-1">{booking.listings?.title}</h3>
                                <p className="text-sm text-muted-foreground font-medium flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {booking.listings?.location}
                                </p>
                              </div>
                              <div className="hidden md:block text-right">
                                {/* Price moved to bottom for better layout */}
                              </div>
                            </div>


                            {/* Footer Actions - Redesigned for better space usage */}
                            <div className="mt-auto pt-4 border-t border-dashed border-border/40">
                              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                {/* Left Side: Price & Ref */}
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-baseline gap-2">
                                    <span className="font-black text-2xl text-foreground tracking-tight">
                                      {formatNaira(booking.total_price)}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest self-center">
                                      Total
                                    </span>
                                  </div>
                                  <div className="font-mono text-[10px] font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded w-fit">
                                    REF: {booking.id.split('-')[0].toUpperCase()}
                                  </div>
                                </div>

                                {/* Right Side: Actions */}
                                <div className="flex flex-wrap items-center gap-2">
                                  {booking.status === 'confirmed' && (booking.listings?.latitude || booking.listings?.address) && (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => {
                                        const { latitude, longitude, address, location } = booking.listings || {};
                                        const destination = latitude && longitude ? `${latitude},${longitude}` : encodeURIComponent(address || location);
                                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank');
                                      }}
                                      className="h-10 px-4 rounded-xl font-bold text-xs bg-[#00AEEF] hover:bg-[#00AEEF]/90 text-white shadow-lg shadow-blue-500/20 shrink-0"
                                    >
                                      <MapPin className="h-4 w-4 mr-2" /> Live Directions
                                    </Button>
                                  )}

                                  {booking.status === 'pending' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleManageBooking(booking)}
                                      className="h-10 px-4 rounded-xl font-bold text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 shrink-0"
                                    >
                                      Cancel Request
                                    </Button>
                                  )}

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleManageBooking(booking)}
                                    className="h-10 px-4 rounded-xl font-bold text-xs border-border hover:bg-muted shrink-0"
                                  >
                                    {booking.status === 'confirmed' ? 'Manage' : 'Details'}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* RESTORED: Booking Management Dialogs */}
                  {selectedBooking && (
                    <>
                      <ManageBookingDialog
                        open={actionType === 'manage'}
                        onOpenChange={(op: boolean) => !op && setActionType(null)}
                        booking={selectedBooking}
                        profile={profile}
                        onUpdate={() => window.location.reload()}
                      />
                      <BookingReceipt
                        open={actionType === 'receipt'}
                        onOpenChange={(op: boolean) => !op && setActionType(null)}
                        booking={selectedBooking}
                      />
                    </>
                  )}
                </div>
              )}

              {/* FAVORITES TAB */}
              {activeTab === "favorites" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <h2 className="text-xl font-black text-foreground mb-6">
                    Saved Places
                  </h2>
                  {favoritesLoading ? (
                    <p className="text-muted-foreground">Loading your favorites...</p>
                  ) : favorites.length === 0 ? (
                    <div className="text-center py-12 bg-card rounded-3xl border border-dashed border-border">
                      <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium">No saved places yet.</p>
                      <Button variant="link" onClick={() => navigate('/')} className="text-[#F48221]">Explore listings</Button>
                    </div>
                  ) : (
                    <div className="grid gap-6 sm:grid-cols-2">
                      {favorites.map((fav) => (
                        <Card
                          key={fav.id}
                          className="border-none shadow-sm rounded-3xl overflow-hidden bg-card group cursor-pointer"
                          onClick={() => navigate(`/listing/${fav.id}`)}
                        >
                          <div className="relative">
                            <img
                              src={fav.images?.[0] || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400"}
                              className="h-40 md:h-56 w-full object-cover"
                              alt=""
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(fav.id);
                              }}
                              className="absolute top-4 right-4 h-10 w-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-red-500 shadow-sm z-10 hover:bg-white transition-colors"
                            >
                              <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                            </button>
                          </div>
                          <CardContent className="p-4 md:p-5">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-bold text-foreground leading-tight">
                                {fav.title}
                              </h3>
                              <div className="flex items-center gap-1 font-bold text-sm text-foreground">
                                <Star className="h-3 w-3 fill-foreground" />{" "}
                                {fav.rating || "New"}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground font-medium mb-4">
                              {fav.location}
                            </p>
                            <div className="flex items-center justify-between pt-4 border-t border-border">
                              <p className="font-black text-lg text-foreground">
                                {formatNaira(fav.price_per_night)}{" "}
                                <span className="text-xs text-muted-foreground font-normal">
                                  / night
                                </span>
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-[#00AEEF] font-bold pointer-events-none"
                              >
                                Book Now <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PROFILE TAB */}
              {activeTab === "profile" && (
                <Card className="border-none shadow-sm rounded-3xl bg-card p-6 md:p-8 animate-in fade-in zoom-in-95">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8 text-center md:text-left">
                    <div className="relative group h-24 w-24 bg-orange-100 dark:bg-orange-900/20 rounded-3xl flex items-center justify-center overflow-hidden shrink-0">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={updatingAvatar}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="Upload Avatar"
                      />
                      {updatingAvatar ? (
                        <LoadingSpinner className="h-8 w-8 text-[#F48221]" />
                      ) : avatarUrl ? (
                        <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover transition-opacity group-hover:opacity-50" />
                      ) : profile?.verification_status === 'verified' && profile?.selfie_url ? (
                        <img src={profile.selfie_url} alt="Profile" className="w-full h-full object-cover transition-opacity group-hover:opacity-50" />
                      ) : (
                        <User className="h-12 w-12 text-[#F48221] transition-opacity group-hover:opacity-50" />
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <span className="text-white text-[10px] font-bold px-2 text-center">Change Photo</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-black text-foreground">
                        {loading ? "Loading..." : (profile?.full_name || "Guest User")}
                      </h2>
                      <p className="text-muted-foreground font-medium mb-2">
                        Member since {user?.created_at ? new Date(user.created_at).getFullYear() : "..."} • Lagos, Nigeria
                      </p>
                      <Badge variant="outline" className={cn(
                        "rounded-full px-3 py-0.5 text-[10px] border-border uppercase tracking-widest",
                        ((profile as any)?.is_verified || bookings.some(b => b.status === 'confirmed'))
                          ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                          : "text-muted-foreground"
                      )}>
                        {((profile as any)?.is_verified || bookings.some(b => b.status === 'confirmed')) ? "Verified Guest" : "Standard Guest"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">
                          Full Name
                        </Label>
                        <Input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="bg-muted/50 border-none h-12 rounded-xl text-foreground"
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">
                          Email Address
                        </Label>
                        <Input
                          value={user?.email || ""}
                          readOnly
                          className="bg-muted/50 border-none h-12 rounded-xl text-muted-foreground cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">
                          Date of Birth
                        </Label>
                        <Input
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="bg-muted/50 border-none h-12 rounded-xl text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">
                          Phone Number
                        </Label>
                        <Input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="bg-muted/50 border-none h-12 rounded-xl text-foreground"
                          placeholder="+234..."
                        />
                      </div>
                    </div>
                    <div className="pt-4">
                      <Button
                        onClick={handleProfileUpdate}
                        disabled={updatingProfile}
                        className="bg-[#F48221] hover:bg-orange-600 font-bold h-12 px-8 rounded-xl text-white"
                      >
                        {updatingProfile ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* SETTINGS TAB */}
              {activeTab === "settings" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <Card className="border-none shadow-sm rounded-3xl bg-card p-6 md:p-8">
                    <h2 className="text-xl font-black text-foreground mb-6 flex items-center gap-2">
                      <Bell className="h-5 w-5 text-[#F48221]" /> Notifications
                    </h2>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-foreground">Email Notifications</p>
                          <p className="text-xs text-muted-foreground">Receive emails about your bookings and account activity.</p>
                        </div>
                        <div
                          className={cn("h-6 w-11 rounded-full relative cursor-pointer transition-colors", emailNotifications ? "bg-emerald-500" : "bg-muted")}
                          onClick={handleEmailToggle}
                        >
                          <div className={cn("h-5 w-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all animate-in zoom-in slide-in-from-left-0", emailNotifications ? "right-0.5" : "left-0.5")} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-foreground">SMS Notifications</p>
                          <p className="text-xs text-muted-foreground">Receive text messages for urgent updates.</p>
                        </div>
                        <div
                          className={cn("h-6 w-11 rounded-full relative cursor-pointer transition-colors", smsNotifications ? "bg-emerald-500" : "bg-muted")}
                          onClick={handleSmsToggle}
                        >
                          <div className={cn("h-5 w-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all", smsNotifications ? "right-0.5" : "left-0.5")} />
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="border-none shadow-sm rounded-3xl bg-card p-6 md:p-8">
                    <h2 className="text-xl font-black text-foreground mb-6 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-[#F48221]" /> Security
                    </h2>
                    <div className="space-y-6">
                      <div className="flex items-start md:items-center flex-col md:flex-row justify-between gap-4">
                        <div>
                          <p className="font-bold text-foreground">Change Password</p>
                          <p className="text-xs text-muted-foreground">Update your password regularly to keep your account safe.</p>
                        </div>
                        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="rounded-xl border-border font-bold">Update</Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px] rounded-3xl p-6">
                            <form onSubmit={handlePasswordUpdate}>
                              <div className="mb-6">
                                <h3 className="text-lg font-black text-foreground mb-2">Update Password</h3>
                                <p className="text-sm text-muted-foreground">Enter your new password below. It must be at least 6 characters long.</p>
                              </div>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">New Password</Label>
                                  <Input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="h-12 rounded-xl bg-muted/50 border-none"
                                    required
                                    minLength={6}
                                  />
                                </div>
                                <Button
                                  type="submit"
                                  disabled={isUpdatingPassword}
                                  className="w-full h-12 rounded-xl font-bold bg-[#F48221] hover:bg-orange-600 text-white"
                                >
                                  {isUpdatingPassword ? <LoadingSpinner className="h-5 w-5 text-white" /> : "Save New Password"}
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex items-start md:items-center flex-col md:flex-row justify-between gap-4">
                        <div>
                          <p className="font-bold text-red-500">Delete Account</p>
                          <p className="text-xs text-muted-foreground">Permanently delete your account and data.</p>
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => toast.error("Account deletion requires contacting support for safety.", {
                            action: {
                              label: 'Contact Support', onClick: async () => {
                                try {
                                  const chatId = await contactSupport();
                                  navigate('/messages', { state: { selectedChatId: chatId } });
                                } catch (e: any) { toast.error(e.message) }
                              }
                            }
                          })}
                          className="rounded-xl text-red-500 font-bold hover:bg-red-500/10"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* SUPPORT TAB */}
              {activeTab === "support" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <Card className="border-none shadow-sm rounded-3xl bg-card p-6 md:p-8">
                    <div className="text-center max-w-lg mx-auto py-8">
                      <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <MessageSquare className="h-10 w-10 text-primary" />
                      </div>
                      <h2 className="text-2xl font-black text-foreground mb-3">
                        Need Help?
                      </h2>
                      <p className="text-muted-foreground font-medium mb-8">
                        Our support team is available to assist you with any questions, booking modifications, or concerns.
                      </p>

                      <div className="space-y-4">
                        <Button
                          onClick={async () => {
                            try {
                              const chatId = await contactSupport();
                              navigate('/messages', { state: { selectedChatId: chatId } });
                            } catch (err: any) {
                              toast.error(err.message);
                            }
                          }}
                          className="w-full h-12 rounded-xl font-black text-base shadow-lg shadow-primary/20"
                        >
                          Chat with Support
                        </Button>

                        <div className="p-4 rounded-xl bg-muted/50 mt-6">
                          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-1">Email Us</p>
                          <p className="font-bold text-foreground select-all">digitalridr.travels.apts@gmail.com</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </main >
      <Footer />
    </div >
  );
};

export default UserDashboard;
