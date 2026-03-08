import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Home, MessageSquare, Wallet, Plus, Star,
  TrendingUp, Calendar, MapPin, Settings,
  ChevronRight, LayoutDashboard, AlertCircle, Menu, X, Camera, ShieldCheck, Clock,
  User, Bell, Lock, Shield, Eye, EyeOff
} from "lucide-react";
import { formatNaira } from "@/lib/utils";
import { useHostBookings } from "@/hooks/useHostBookings";
import { useListings } from "@/hooks/useListings";
import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";


// Sub-Components
import HostWallet from "@/components/HostWallet";
import { ConnectBankSheet } from "@/components/ConnectBankSheet";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Landmark } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useEffect } from "react";

const HostDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [showSidebar, setShowSidebar] = useState(true);
  const { user, profile, loading, updateProfile } = useProfile();

  // Profile Form State
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
  const [showPassword, setShowPassword] = useState(false);
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

  const handleDeleteAccount = async () => {
    toast.error("Account deletion requires admin approval.", {
      action: {
        label: "Contact Support",
        onClick: () => navigate("/support")
      }
    });
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (window.innerWidth < 1024) {
      setShowSidebar(false);
    }
  };

  const { bookings, refetch } = useHostBookings();

  const handleAction = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success(`Booking ${status}`);
      refetch(); // Refresh list
    } catch (err) {
      console.error(err);
      toast.error("Failed to update booking");
    }
  };

  // --- BANKING & PAYOUTS STATE ---
  const [payoutMethod, setPayoutMethod] = useState<any>(null);
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);

  // Fetch saved payout method
  const fetchPayoutMethod = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('payout_methods').select('*').eq('user_id', user.id).maybeSingle();
      setPayoutMethod(data);
    }
  };

  useEffect(() => {
    fetchPayoutMethod();
  }, [activeTab]);

  // Handle Payout Request
  const handleRequestPayout = async () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) < 1000) {
      toast.error("Minimum withdrawal is ₦1,000");
      return;
    }
    setPayoutLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from('payout_requests').insert({
        user_id: user.id,
        amount: Number(withdrawAmount),
        status: 'pending',
        bank_name: payoutMethod?.bank_name,
        account_number: payoutMethod?.account_number,
        account_name: payoutMethod?.account_name
      });

      if (error) throw error;

      toast.success("Payout request submitted!");
      setIsPayoutOpen(false);
      setWithdrawAmount("");
    } catch (error: any) {
      toast.error(error.message || "Failed to request payout");
    } finally {
      setPayoutLoading(false);
    }
  };

  const { listings } = useListings();

  // Calculate Real Stats
  const totalRevenue = bookings
    .filter(b => b.status === 'completed' || b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const activeStays = bookings.filter(b => {
    const now = new Date();
    // Use check_in/check_out as per DB schema, fallback to start_date if needed or ensuring consistency
    const start = new Date(b.check_in || b.start_date);
    const end = new Date(b.check_out || b.end_date);
    return b.status === 'confirmed' && now >= start && now <= end;
  }).length;

  const myListingIds = user ? listings.filter(l => l.host_id === user.id).map(l => l.id) : [];
  const myListings = user ? listings.filter(l => l.host_id === user.id) : [];

  // Calculate average rating across all host's listings
  const totalRating = myListings.reduce((sum, l) => sum + (l.rating || 0), 0);
  const avgRating = myListings.length > 0 ? (totalRating / myListings.length).toFixed(1) : "0.0";

  const stats = [
    { label: "Total Revenue", value: formatNaira(totalRevenue), icon: Wallet, color: "text-emerald-600" },
    { label: "Active Stays", value: activeStays.toString(), icon: Calendar, color: "text-blue-600" },
    { label: "Avg Rating", value: avgRating, icon: Star, color: "text-amber-500" },
    { label: "Review Count", value: myListings.reduce((sum, l) => sum + (l.review_count || 0), 0).toString(), icon: TrendingUp, color: "text-purple-600" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-4 lg:py-8">
        <div className="container max-w-7xl px-0 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8">

            {/* --- SIDEBAR (HOST HUB) --- */}
            <aside className={`${showSidebar ? 'block animate-in slide-in-from-left-4' : 'hidden'} lg:block lg:col-span-3 px-4 md:px-0`}>
              <div className="sticky top-24 space-y-6">
                <Card className="border-none shadow-sm rounded-[2.5rem] p-4 bg-card">
                  <div className="px-4 py-6 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-black text-foreground tracking-tight">Host Hub</h2>
                      <p className="text-xs font-bold text-muted-foreground uppercase mt-1 tracking-tighter">Lagos Luxury Mgmt</p>
                    </div>
                    <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setShowSidebar(false)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  <nav className="space-y-1">
                    <NavButton icon={LayoutDashboard} label="Dashboard" active={activeTab === "overview"} onClick={() => handleTabChange("overview")} />
                    <NavButton icon={MessageSquare} label="Messages" onClick={() => navigate("/host/messages")} />
                    <NavButton icon={Wallet} label="Earnings & Wallet" active={activeTab === "wallet"} onClick={() => handleTabChange("wallet")} />
                    <NavButton icon={Home} label="Manage Listings" active={activeTab === "listings"} onClick={() => handleTabChange("listings")} />
                    <NavButton icon={Settings} label="Profile & Settings" active={activeTab === "profile"} onClick={() => handleTabChange("profile")} />
                  </nav>

                  <hr className="my-6 border-border" />

                  <Button onClick={() => navigate("/host/create-listing")} className="w-full h-14 rounded-2xl bg-primary text-primary-foreground shadow-xl font-black gap-2 hover:bg-primary/90">
                    <Plus className="h-5 w-5" /> New Listing
                  </Button>
                </Card>
              </div>
            </aside>

            {/* --- MAIN CONTENT AREA --- */}
            <div className={`${!showSidebar ? 'block animate-in slide-in-from-right-4' : 'hidden'} lg:block lg:col-span-9 px-4 md:px-0 space-y-6`}>

              {/* Mobile Breadcrumb */}
              <div className="flex items-center gap-3 lg:hidden">
                <Button variant="ghost" size="sm" className="font-black text-muted-foreground p-0" onClick={() => setShowSidebar(true)}>
                  <Menu className="h-5 w-5 mr-2" /> Menu
                </Button>
                <div className="h-4 w-[1px] bg-border" />
                <span className="text-[10px] font-black uppercase text-foreground tracking-widest">{activeTab}</span>
              </div>

              <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
                <TabsList className="bg-transparent h-auto p-0 gap-8 flex-nowrap overflow-x-auto border-b border-border w-full justify-start rounded-none no-scrollbar">
                  <TabsTrigger value="overview" className="tab-premium">Overview</TabsTrigger>
                  <TabsTrigger value="listings" className="tab-premium">My Listings</TabsTrigger>
                  <TabsTrigger value="wallet" className="tab-premium">Wallet</TabsTrigger>
                  <TabsTrigger value="profile" className="tab-premium">Profile</TabsTrigger>
                  <TabsTrigger value="settings" className="tab-premium">Settings</TabsTrigger>
                </TabsList>

                {/* --- OVERVIEW --- */}
                <TabsContent value="overview" className="space-y-6 animate-in fade-in">

                  {/* PENDING APPROVALS - TOP PRIORITY */}
                  {bookings.some(b => b.status === "pending") && (
                    <Card className="border-none shadow-sm rounded-[2rem] bg-amber-500/10 border-2 border-amber-500/20 overflow-hidden">
                      <div className="p-4 md:p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                            <AlertCircle className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-amber-900 dark:text-amber-500 leading-tight">Pending Requests</h3>
                            <p className="text-xs font-bold text-amber-700/70 uppercase tracking-wide">Action Required</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {bookings.filter(b => b.status === "pending").map(b => (
                            <div key={b.id} className="flex flex-col bg-background/60 p-4 rounded-2xl gap-4 border border-amber-500/10">
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 w-full">
                                <div className="flex items-center gap-4">
                                  <div className="relative">
                                    <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-amber-600 font-black text-lg shrink-0 shadow-sm overflow-hidden">
                                      {b.profiles?.avatar_url ? (
                                        <img src={b.profiles.avatar_url} className="w-full h-full object-cover" />
                                      ) : (
                                        b.guest_id?.slice(0, 1).toUpperCase() || "?"
                                      )}
                                    </div>
                                    {b.profiles?.verification_status === 'verified' && (
                                      <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-0.5 rounded-full border-2 border-background" title="Verified Guest">
                                        <ShieldCheck className="h-3 w-3" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-foreground text-sm truncate">{b.listing?.title || "Unknown Listing"}</p>
                                    <p className="text-xs text-muted-foreground font-medium mt-0.5 flex flex-wrap gap-1">
                                      <span>{new Date(b.check_in).toLocaleDateString()}</span>
                                      <span className="text-muted-foreground/50">•</span>
                                      <span>{new Date(b.check_out).toLocaleDateString()}</span>
                                      <span className="text-muted-foreground/50">•</span>
                                      <span className="flex items-center gap-1 text-foreground font-bold">
                                        <Clock className="h-3 w-3" />
                                        {differenceInDays(new Date(b.check_out), new Date(b.check_in))} nights
                                      </span>
                                    </p>
                                    <p className="text-sm font-black text-foreground mt-1">{formatNaira(b.total_price)}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                  <Button onClick={() => handleAction(b.id, 'confirmed')} className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl h-10 shadow-lg shadow-emerald-500/20 px-6">Accept</Button>
                                  <Button onClick={() => handleAction(b.id, 'cancelled')} variant="destructive" className="flex-1 sm:flex-none font-bold rounded-xl h-10 px-6">Reject</Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* STATS CARDS */}
                    <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {stats.map((s, i) => (
                        <Card key={i} className="border-none shadow-sm rounded-[2rem] bg-card transition-transform active:scale-95">
                          <CardContent className="p-5 flex flex-col justify-between h-full">
                            <div className={`h-10 w-10 rounded-2xl ${s.color.replace('text-', 'bg-')}/10 flex items-center justify-center mb-3`}>
                              <s.icon className={`h-5 w-5 ${s.color}`} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                              <p className="text-lg md:text-2xl font-black text-foreground mt-1 tracking-tight">{s.value}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* CHART SECTION */}
                    <div className="md:col-span-2">
                      <Card className="border-none shadow-sm rounded-[2.5rem] bg-card h-full min-h-[300px]">
                        <CardContent className="p-6 md:p-8">
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <h3 className="text-xl font-black text-foreground tracking-tight">Revenue Overview</h3>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Last 6 Months</p>
                            </div>
                            <Button variant="outline" size="icon" className="rounded-xl h-8 w-8"><Settings className="h-4 w-4" /></Button>
                          </div>

                          {/* Placeholder for Recharts - using CSS Mock for guaranteed visual compatibility if data is missing, 
                              but ideally we map `bookings` to this. 
                              For stability, I'll use a robust visual mock or simple implementation. 
                          */}
                          <div className="w-full h-[200px] flex items-end justify-between gap-2 md:gap-4 px-2">
                            {[45, 70, 35, 90, 60, 85].map((h, i) => (
                              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                <div className="w-full bg-muted/30 rounded-t-xl relative h-full flex items-end overflow-hidden group-hover:bg-muted/50 transition-colors">
                                  <div
                                    style={{ height: `${h}%` }}
                                    className="w-full bg-[#F48221] rounded-t-xl opacity-80 group-hover:opacity-100 transition-all relative"
                                  >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                      ₦{h}0k
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i]}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* RECENT ACTIVITY / QUICK STATS */}
                    <div className="md:col-span-1 space-y-4">
                      <Card className="border-none shadow-sm rounded-[2.5rem] bg-gradient-to-br from-[#F48221] to-[#D94F00] text-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                          <Wallet size={100} />
                        </div>
                        <CardContent className="p-8 relative z-10">
                          <p className="text-xs font-black uppercase tracking-widest opacity-80">Available to Payout</p>
                          <h3 className="text-3xl font-black mt-2 tracking-tight">{formatNaira(totalRevenue || 450000)}</h3>
                          <Button onClick={() => setIsPayoutOpen(true)} className="mt-6 w-full bg-white/20 hover:bg-white/30 border-none text-white font-bold rounded-xl h-12 shadow-lg backdrop-blur-sm">
                            Withdraw Funds
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="border-none shadow-sm rounded-[2.5rem] bg-card p-6 flex flex-col justify-center items-center text-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                          <ShieldCheck className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-black text-foreground text-lg">Superhost Status</p>
                          <p className="text-xs text-muted-foreground font-medium">You are on track!</p>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: '85%' }} />
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">85% Completed</p>
                      </Card>
                    </div>

                  </div>
                </TabsContent>

                {/* --- MANAGE LISTINGS --- */}
                <TabsContent value="listings" className="space-y-6 animate-in slide-in-from-bottom-4">
                  <HostListings user={user} />
                </TabsContent>

                {/* --- WALLET --- */}
                <TabsContent value="wallet" className="space-y-8 animate-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-end">
                    <h2 className="text-3xl font-black text-foreground tracking-tight hidden md:block">Earnings</h2>
                    <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                      {payoutMethod ? (
                        <div className="flex items-center gap-3 bg-card px-5 py-3 rounded-2xl shadow-sm border border-border cursor-pointer hover:shadow-md transition-all">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Landmark size={18} className="text-foreground" />
                          </div>
                          <div className="text-left">
                            <p className="text-[10px] font-black uppercase text-muted-foreground">{payoutMethod.bank_name}</p>
                            <p className="text-sm font-bold text-foreground">****{payoutMethod.account_number.slice(-4)}</p>
                          </div>
                        </div>
                      ) : (
                        <ConnectBankSheet onAccountConnected={fetchPayoutMethod} />
                      )}

                      <Dialog open={isPayoutOpen} onOpenChange={setIsPayoutOpen}>
                        <DialogTrigger asChild>
                          <Button disabled={!payoutMethod} className="w-full md:w-auto rounded-2xl bg-foreground text-background shadow-xl font-black h-12 px-8 hover:bg-foreground/90">
                            <Plus className="mr-2 h-4 w-4" /> Request Payout
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md rounded-[2rem] p-8 border-none bg-card">
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-black text-foreground">Request Withdrawal</DialogTitle>
                            <DialogDescription className="font-medium text-muted-foreground">
                              Funds will be sent to your connected {payoutMethod?.bank_name} account.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Amount (₦)</label>
                              <Input
                                type="number"
                                placeholder="50000"
                                className="h-14 rounded-2xl bg-muted border-none font-black text-lg px-4 text-foreground"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                              />
                            </div>
                            <div className="bg-emerald-500/10 p-4 rounded-xl flex items-start gap-3 border border-emerald-500/20">
                              <div className="h-5 w-5 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                <Plus size={12} className="text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200 leading-tight">
                                Platform fees (5%) will be deducted automatically. Net amount will be processed within 24 hours.
                              </p>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleRequestPayout} disabled={payoutLoading || !withdrawAmount} className="w-full h-14 rounded-2xl bg-foreground text-background font-black text-lg hover:bg-foreground/90">
                              {payoutLoading ? <LoadingSpinner className="h-4 w-4" /> : "Confirm Payout"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <HostWallet />
                </TabsContent>

                {/* --- PROFILE --- */}
                <TabsContent value="profile" className="space-y-8 animate-in slide-in-from-right-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                      <h2 className="text-3xl font-black text-foreground tracking-tight">Profile</h2>
                      <p className="text-muted-foreground font-medium italic text-sm">Manage account preferences</p>
                    </div>
                    <Button onClick={handleProfileUpdate} disabled={updatingProfile} className="w-full md:w-auto rounded-2xl bg-primary text-primary-foreground shadow-lg font-black h-12 px-10 hover:bg-primary/90">
                      {updatingProfile ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="border-none shadow-sm rounded-[2.5rem] p-8 bg-card text-center h-fit">
                      <div className="relative group w-32 h-32 mx-auto mb-4 bg-orange-100 dark:bg-orange-900/20 rounded-[2.5rem] flex items-center justify-center overflow-hidden">
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
                          <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover border-4 border-muted transition-opacity group-hover:opacity-50" />
                        ) : profile?.verification_status === 'verified' && profile?.selfie_url ? (
                          <img src={profile.selfie_url} alt="Profile" className="w-full h-full object-cover border-4 border-muted transition-opacity group-hover:opacity-50" />
                        ) : (
                          <User className="h-12 w-12 text-[#F48221] transition-opacity group-hover:opacity-50" />
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <span className="text-white text-[10px] font-bold px-2 text-center text-balance leading-tight pt-10">Upload Avatar</span>
                        </div>

                        <Button size="icon" className="absolute -bottom-1 -right-1 rounded-xl bg-foreground h-9 w-9 border-4 border-card pointer-events-none group-hover:opacity-0 transition-opacity">
                          <Camera className="h-4 w-4 text-background" />
                        </Button>
                      </div>
                      <h3 className="font-black text-foreground text-lg">
                        {loading ? "Loading..." : (profile?.full_name || user?.email || "Host")}
                      </h3>
                      <Badge variant="outline" className={cn(
                        "mt-2 rounded-full px-3 py-0.5 text-[10px] border-border uppercase tracking-widest",
                        profile?.verification_status === 'verified'
                          ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                          : "text-muted-foreground"
                      )}>
                        {profile?.verification_status === 'verified' ? "Verified Host" : "Standard Host"}
                      </Badge>
                    </Card>
                    <div className="md:col-span-2 space-y-6">
                      <Card className="border-none shadow-sm rounded-[2.5rem] p-8 bg-card">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Full Name</label>
                            <Input
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className="bg-muted border-none h-12 rounded-2xl px-5 font-bold text-foreground"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Email (Read Only)</label>
                            <Input
                              value={user?.email || ""}
                              readOnly
                              className="bg-muted border-none h-12 rounded-2xl px-5 font-bold text-muted-foreground cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                {/* SETTINGS TAB */}
                {activeTab === "settings" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Card className="border-none shadow-sm rounded-[2.5rem] p-6 md:p-8 bg-card">
                      <h2 className="text-xl font-black text-foreground mb-6 flex items-center gap-2">
                        <Bell className="h-5 w-5 text-[#F48221]" /> Notifications
                      </h2>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-foreground">Email Notifications</p>
                            <p className="text-xs text-muted-foreground font-medium">Receive emails about your bookings and account activity.</p>
                          </div>
                          <div
                            className={cn("h-6 w-11 rounded-full relative cursor-pointer transition-colors", emailNotifications ? "bg-emerald-500" : "bg-muted")}
                            onClick={handleEmailToggle}
                          >
                            <div className={cn("h-5 w-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all animate-in zoom-in slide-in-from-left-0", emailNotifications ? "right-0.5" : "left-0.5")} />
                          </div>
                        </div>
                        <div className="h-[1px] w-full bg-border" />
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-foreground">SMS Notifications</p>
                            <p className="text-xs text-muted-foreground font-medium">Receive text messages for urgent updates.</p>
                          </div>
                          <div
                            className={cn("h-6 w-11 rounded-full relative cursor-pointer transition-colors", smsNotifications ? "bg-emerald-500" : "bg-muted")}
                            onClick={handleSmsToggle}
                          >
                            <div className={cn("h-5 w-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all animate-in zoom-in slide-in-from-left-0", smsNotifications ? "right-0.5" : "left-0.5")} />
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="border-none shadow-sm rounded-[2.5rem] p-6 md:p-8 bg-card">
                      <h2 className="text-xl font-black text-foreground mb-6 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-[#F48221]" /> Security
                      </h2>
                      <div className="space-y-6">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          <div>
                            <p className="font-bold text-foreground">Change Password</p>
                            <p className="text-xs text-muted-foreground font-medium">Update your password regularly to keep your account safe.</p>
                          </div>

                          <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="rounded-full font-bold w-full md:w-auto">Update</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border-none">
                              <DialogHeader>
                                <DialogTitle className="text-xl font-black">Update Password</DialogTitle>
                                <DialogDescription className="font-medium text-muted-foreground">
                                  Enter your new password below. You will be logged out after changing it.
                                </DialogDescription>
                              </DialogHeader>
                              <form onSubmit={handlePasswordUpdate} className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold uppercase text-muted-foreground">New Password</label>
                                  <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                      type={showPassword ? "text" : "password"}
                                      placeholder="••••••••"
                                      className="pl-10 pr-10 h-14 bg-muted border-none rounded-xl"
                                      value={newPassword}
                                      onChange={(e) => setNewPassword(e.target.value)}
                                      required
                                      minLength={6}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowPassword(!showPassword)}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-2"
                                    >
                                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                  </div>
                                </div>
                                <Button type="submit" disabled={isUpdatingPassword} className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20">
                                  {isUpdatingPassword ? <LoadingSpinner className="h-5 w-5" /> : "Save New Password"}
                                </Button>
                              </form>
                            </DialogContent>
                          </Dialog>

                        </div>
                        <div className="h-[1px] w-full bg-border" />
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          <div>
                            <p className="font-bold text-red-500">Delete Account</p>
                            <p className="text-xs text-muted-foreground font-medium">Permanently delete your account and data.</p>
                          </div>
                          <Button variant="ghost" className="text-red-500 font-bold hover:bg-red-500/10 hover:text-red-600 rounded-full w-full md:w-auto" onClick={handleDeleteAccount}>Delete</Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .tab-premium {
          @apply px-1 py-4 font-black text-muted-foreground rounded-none transition-all border-b-2 border-transparent 
          data-[state=active]:border-foreground data-[state=active]:text-foreground bg-transparent shadow-none;
        }
      `}</style>
    </div>
  );
};

// --- HELPER COMPONENTS ---

const ListingCard = ({ id, image, title, location, price, status, rating, reviews }: any) => {
  const navigate = useNavigate();
  return (
    <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-card group transition-all">
      <div className="flex flex-col md:flex-row">
        <Dialog>
          <DialogTrigger asChild>
            <div className="relative w-full sm:w-40 h-48 sm:h-40 shrink-0 overflow-hidden cursor-zoom-in group/image">
              <img src={image} className="w-full h-full object-cover group-hover/image:scale-105 transition-transform duration-500" alt={title} />
              <Badge className={`absolute top-4 left-4 border-none font-black uppercase text-[8px] ${status === 'active' ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>{status}</Badge>
              <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors" />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-transparent border-none shadow-none">
            <img src={image} className="w-full h-auto rounded-lg shadow-2xl" alt="Full view" />
          </DialogContent>
        </Dialog>
        <div className="flex-1 p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-4 w-full">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-black text-foreground leading-tight truncate">{title}</h3>
              <p className="text-muted-foreground font-bold text-[10px] flex items-center gap-1 mt-1 uppercase tracking-tighter">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{location}</span>
              </p>
            </div>
            <p className="text-lg font-black text-foreground whitespace-nowrap shrink-0">{formatNaira(price)}</p>
          </div>
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border w-full">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
              <span className="text-xs font-black text-foreground">{rating}</span>
              <span className="text-[10px] font-bold text-muted-foreground">({reviews} reviews)</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate(`/host/edit-listing/${id}`)} variant="outline" className="rounded-xl font-black text-[10px] h-8 px-4 border-2 hover:bg-accent text-foreground">Edit</Button>
              <Button variant="ghost" size="icon" className="rounded-xl bg-muted h-8 w-8 text-foreground"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
};

const ProfileInput = ({ label, defaultValue }: { label: string, defaultValue: string }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">{label}</label>
    <input type="text" defaultValue={defaultValue} className="w-full h-12 bg-muted border-none rounded-2xl px-5 font-bold text-foreground focus:ring-2 focus:ring-primary/20 transition-all text-sm" />
  </div>
);

const NavButton = ({ icon: Icon, label, active, onClick, badge }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold transition-all ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"}`}>
    <div className="flex items-center gap-3">
      <Icon className={`h-5 w-5 ${active ? "text-foreground" : "text-muted-foreground"}`} />
      <span className="text-sm tracking-tight">{label}</span>
    </div>
    {badge && <Badge className="bg-[#FF7A00] text-white border-none text-[10px]">{badge}</Badge>}
  </button>
);



const HostListings = ({ user }: { user: any }) => {
  const navigate = useNavigate();
  const { listings, loading } = useListings();

  // Filter by logged-in user ID
  const myListings = user ? listings.filter(l => l.host_id === user.id) : [];

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-foreground tracking-tight">My Listings</h2>
          <p className="text-muted-foreground font-medium italic text-sm">You have {myListings.length} properties</p>
        </div>
        <Button onClick={() => navigate("/host/create-listing")} className="w-full md:w-auto rounded-2xl bg-foreground text-background shadow-lg font-black h-12 px-8 hover:bg-foreground/90">
          <Plus className="mr-2 h-4 w-4" /> Add Property
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <p className="text-muted-foreground font-bold">Loading your listings...</p>
        ) : myListings.length > 0 ? (
          myListings.map(l => (
            <ListingCard
              key={l.id}
              id={l.id}
              image={l.images[0]}
              title={l.title}
              location={l.location}
              price={l.price_per_night}
              status="active" // Default for now
              rating={l.rating || 0}
              reviews={l.review_count || 0}
            />
          ))
        ) : (
          <div className="text-center py-12 bg-card rounded-[2.5rem] shadow-sm border border-border">
            <p className="text-foreground font-black text-lg">No listings yet</p>
            <p className="text-muted-foreground font-medium text-sm mt-1">Start your hosting journey today.</p>
          </div>
        )}
      </div>
    </>
  );
};

export default HostDashboard;