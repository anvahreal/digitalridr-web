import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
    LayoutDashboard,
    Users,
    Building2,
    Wallet,
    MessageSquare,
    Search,
    CheckCircle2,
    Check,
    X,
    LogOut,
    Ban,
    Menu,
    Copy,
    Mail,
    MapPin,
    ShieldCheck,
    FileText,
    ExternalLink
} from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sendNotificationEmail } from "@/lib/email";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { formatNaira } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ModeToggle } from "@/components/ModeToggle";
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("overview");
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    // Data States
    const { user, loading: profileLoading } = useProfile();
    const [stats, setStats] = useState({ revenue: 0, hosts: 0, bookings: 0 });
    const [selectedHost, setSelectedHost] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const [hosts, setHosts] = useState<any[]>([]);
    const [listings, setListings] = useState<any[]>([]);
    const [payouts, setPayouts] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [verifications, setVerifications] = useState<any[]>([]);

    // Filtered Data
    const filteredHosts = hosts.filter(h =>
        h.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredListings = listings.filter(l =>
        l.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredVerifications = verifications.filter(v =>
        v.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredPayouts = payouts.filter(p =>
        p.amount?.toString().includes(searchQuery) ||
        p.id?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        if (!profileLoading) {
            // Failsafe: Allow specific email or DB admin flag
            const isHardcodedAdmin = user?.email === "hotmailblvck17@gmail.com";

            if (user?.is_admin || isHardcodedAdmin) {
                setIsAdmin(true);
                fetchData();
            } else {
                toast.error("Unauthorized access: Admin only.");
                navigate("/");
            }
        }
    }, [user, profileLoading]);

    const fetchData = async () => {
        try {
            const [
                { data: profiles },
                { data: properties },
                { data: bookingsData },
                { data: payout_requests },
                { data: verificationsData }
            ] = await Promise.all([
                supabase.from('profiles').select('*').order('updated_at', { ascending: false }),
                supabase.from('listings').select('*').order('created_at', { ascending: false }),
                supabase.from('bookings').select('*').order('created_at', { ascending: false }),
                supabase.from('payout_requests').select('*').order('created_at', { ascending: false }),
                supabase.from('profiles').select('*').in('verification_status', ['pending', 'verified']).not('identity_doc_url', 'is', null).order('updated_at', { ascending: false })
            ]);

            if (profiles) setHosts(profiles);
            if (properties) setListings(properties);
            if (bookingsData) setBookings(bookingsData);
            if (payout_requests) setPayouts(payout_requests);
            if (verificationsData) setVerifications(verificationsData);

            const totalRevenue = bookingsData?.reduce((acc: number, curr: any) => acc + (curr.total_price || 0), 0) || 0;

            setStats({
                revenue: totalRevenue,
                hosts: profiles?.length || 0,
                bookings: bookingsData?.length || 0
            });

        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    const handleBanHost = async (hostId: string, currentStatus: boolean) => {
        const { error } = await supabase.from('profiles').update({ banned: !currentStatus }).eq('id', hostId);
        if (error) {
            toast.error("Failed to update host status");
        } else {
            toast.success(currentStatus ? "Host unbanned" : "Host banned");
            fetchData();
        }
    };

    const handleUpdateHostStatus = async (hostId: string, status: 'approved' | 'rejected' | 'pending') => {
        const { error } = await supabase.from('profiles').update({ host_status: status }).eq('id', hostId);
        if (error) {
            toast.error("Failed to update host status");
        } else {
            toast.success(`Host status updated to ${status}`);
            fetchData();
        }
    };

    const handlePayoutAction = async (id: string, status: string) => {
        // Optimistic Update
        const originalPayouts = [...payouts];
        setPayouts(prev => prev.map(p => p.id === id ? { ...p, status } : p));

        const { error } = await supabase.from('payout_requests').update({ status }).eq('id', id);
        if (error) {
            console.error("Payout Update Error:", error);
            toast.error("Failed to update payout");
            setPayouts(originalPayouts); // Revert on error
        } else {
            toast.success(`Payout marked as ${status}`);

            // Send Email Notification
            const recipient = hosts.find(h => h.id === originalPayouts.find(p => p.id === id)?.user_id);
            if (recipient?.email) {
                const subject = status === 'paid' ? '💰 Payout Processed' : '⚠️ Payout Update';
                const html = status === 'paid'
                    ? `<p>Hi ${recipient.full_name},</p><p>Great news! Your payout request has been processed and sent to your bank account.</p>`
                    : `<p>Hi ${recipient.full_name},</p><p>There was an issue with your payout request. It has been marked as rejected. Please check your bank details.</p>`;

                sendNotificationEmail(recipient.email, subject, html);
            }
        }
    };

    const handleDeleteListing = async (id: string) => {
        if (!confirm("Are you sure you want to delete this listing? This action cannot be undone.")) return;

        try {
            const { error } = await supabase.from('listings').delete().eq('id', id);
            if (error) throw error;

            toast.success("Listing deleted successfully");
            fetchData();
        } catch (error: any) {
            console.error("Delete error:", error);
            toast.error(error.message || "Failed to delete listing");
        }
    };



    const handleMessageHost = async (hostId: string) => {
        try {
            if (!user) return;

            // Check if conversation exists
            const { data: existingConvs } = await supabase
                .from('conversations')
                .select('id')
                .or(`and(host_id.eq.${user.id},guest_id.eq.${hostId}),and(host_id.eq.${hostId},guest_id.eq.${user.id})`)
                .limit(1)
                .maybeSingle(); // Changed to maybeSingle to avoid error if not found

            let conversationId = existingConvs?.id;

            if (!conversationId) {
                // Create new conversation
                const { data: newConv, error } = await supabase
                    .from('conversations')
                    .insert({
                        host_id: hostId,
                        guest_id: user.id
                    })
                    .select()
                    .single();

                if (error) throw error;
                conversationId = newConv.id;
            }

            navigate('/host/messages', { state: { selectedChatId: conversationId } });

        } catch (error: any) {
            console.error("Error starting conversation:", error);
            toast.error(`Failed to start conversation: ${error.message || "Unknown error"}`);
        }
    };

    const handleVerificationReview = async (userId: string, action: 'approve' | 'reject', rejectionReason?: string) => {
        try {
            // IF APPROVING: Automatically set their "Selfie" as their public "Avatar"
            if (action === 'approve') {
                const verification = verifications.find(v => v.id === userId);
                if (verification?.selfie_url) {
                    try {
                        const selfiePath = verification.selfie_url;
                        toast.info("Setting up user avatar...");

                        // 1. Download private selfie
                        const { data: blob, error: downloadError } = await supabase.storage
                            .from('secure-documents')
                            .download(selfiePath);

                        if (downloadError) throw downloadError;

                        // 2. Upload to public avatars bucket
                        const avatarPath = `${userId}/avatar-${Date.now()}.png`; // Unique name
                        const { error: uploadError } = await supabase.storage
                            .from('avatars')
                            .upload(avatarPath, blob, {
                                contentType: 'image/png',
                                upsert: true
                            });

                        if (uploadError) throw uploadError;

                        // 3. Get Public URL
                        const { data: publicData } = supabase.storage
                            .from('avatars')
                            .getPublicUrl(avatarPath);

                        // 4. Update Profile with new Avatar URL
                        await supabase
                            .from('profiles')
                            .update({ avatar_url: publicData.publicUrl })
                            .eq('id', userId);

                        console.log("Avatar updated from selfie:", publicData.publicUrl);

                    } catch (avatarError) {
                        console.error("Failed to copy selfie to avatar:", avatarError);
                        toast.warning("Verification approved, but failed to update avatar.");
                    }
                }
            }

            const { error } = await supabase.rpc('review_identity_verification', {
                user_id_input: userId,
                status_input: action === 'approve' ? 'verified' : 'rejected',
                rejection_reason_input: rejectionReason || null
            });

            if (error) throw error;

            toast.success(`Verification ${action}d successfully`);

            // Send Email Notification
            const recipient = verifications.find(v => v.id === userId);
            if (recipient?.email) {
                const subject = action === 'approve' ? '🎉 Identity Verified!' : '⚠️ Verification Update';
                const html = action === 'approve'
                    ? `<p>Hi ${recipient.full_name},</p><p>Congratulations! Your identity has been successfully verified. You can now list properties and accept bookings.</p>`
                    : `<p>Hi ${recipient.full_name},</p><p>Your identity verification was rejected. Reason: ${rejectionReason || 'Documents did not meet requirements'}.</p>`;

                sendNotificationEmail(recipient.email, subject, html);
            }

            fetchData();
        } catch (err: any) {
            console.error("Review Error:", err);
            toast.error(`Failed to ${action} verification: ${err.message || err.error_description || "Unknown error"}`);
        }
    };

    if (loading || profileLoading) return <div className="flex h-screen items-center justify-center">Loading God Mode...</div>;
    if (!isAdmin) return null;

    return (
        <div className="min-h-screen bg-background text-foreground flex font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
                <div className="p-6 border-b border-border">
                    <div className="flex flex-col items-start justify-center gap-1 cursor-default">
                        <img src="/assets/digitalridr-logo.PNG" alt="Digital Ridr" className="h-8 w-auto" />
                        <span className="text-[10px] font-black tracking-[0.3em] text-[#F48221] uppercase mt-1 pl-1">Admin Panel</span>
                    </div>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <MenuButton icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                    <MenuButton icon={Users} label="Hosts & Users" active={activeTab === 'hosts'} onClick={() => setActiveTab('hosts')} />
                    <MenuButton icon={Wallet} label="Payouts" active={activeTab === 'payouts'} onClick={() => setActiveTab('payouts')} />
                    <MenuButton icon={ShieldCheck} label="Verifications" active={activeTab === 'verifications'} onClick={() => setActiveTab('verifications')} />
                    <MenuButton icon={MessageSquare} label="Messages" active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} />
                    <MenuButton icon={Building2} label="Properties" active={activeTab === 'properties'} onClick={() => setActiveTab('properties')} />
                </nav>
                <div className="p-4 border-t border-border">
                    <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-3" onClick={() => navigate('/')}>
                        <LogOut size={18} />
                        Exit God Mode
                    </Button>
                </div>
            </aside>

            {/* Host Properties Sheet */}
            <Sheet open={!!selectedHost} onOpenChange={(open) => !open && setSelectedHost(null)}>
                <SheetContent side="right" className="w-full sm:max-w-xl overflow-hidden p-0 border-l border-border bg-background shadow-2xl">
                    <div className="sr-only">
                        <DialogTitle>Host Properties</DialogTitle>
                        <DialogDescription>
                            View and manage properties listed by this host
                        </DialogDescription>
                    </div>
                    {selectedHost && (
                        <div className="flex flex-col h-full bg-background">
                            <div className="p-8 border-b border-border bg-muted/10">
                                <div className="flex items-center gap-6">
                                    <Avatar className="h-20 w-20 rounded-[1.5rem] border-4 border-background shadow-lg">
                                        <AvatarImage src={selectedHost.avatar_url} className="object-cover" />
                                        <AvatarFallback className="font-black text-2xl bg-muted text-muted-foreground">{selectedHost.full_name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h2 className="text-2xl font-black text-foreground tracking-tight">{selectedHost.full_name}</h2>
                                        <p className="text-sm text-muted-foreground font-bold">{selectedHost.email}</p>
                                        <div className="flex items-center gap-3 mt-3">
                                            <Badge variant="outline" className={`rounded-lg border-opacity-50 px-3 py-1 font-bold uppercase text-[10px] tracking-wider ${selectedHost.banned ? "border-red-500 text-red-500 bg-red-500/10" : "border-emerald-500 text-emerald-500 bg-emerald-500/10"}`}>
                                                {selectedHost.banned ? "Banned User" : "Active Host"}
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest bg-muted rounded-md px-2 py-1">ID: {selectedHost.id.slice(0, 8)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 p-8 overflow-y-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                                        Properties Owned ({listings.filter(l => l.host_id === selectedHost.id).length})
                                    </h3>
                                    <Button variant="outline" size="sm" className="h-7 text-[10px] font-black uppercase rounded-lg">View All</Button>
                                </div>

                                <div className="space-y-4">
                                    {listings.filter(l => l.host_id === selectedHost.id).length > 0 ? (
                                        listings.filter(l => l.host_id === selectedHost.id).map(l => (
                                            <div key={l.id} className="flex gap-5 p-4 rounded-[1.5rem] border border-border/50 bg-card hover:bg-muted/30 transition-all group shadow-sm hover:shadow-md">
                                                <div className="h-24 w-32 bg-muted rounded-2xl bg-center bg-cover shrink-0 relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                                                    <img src={l.images?.[0]} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                                    <div>
                                                        <h4 className="font-exhibit font-bold text-foreground truncate text-lg leading-tight">{l.title}</h4>
                                                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-1">
                                                            <MapPin className="h-3 w-3" /> {l.location}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-3">
                                                        <p className="font-black text-foreground">{formatNaira(l.price_per_night)}<span className="text-[10px] font-normal text-muted-foreground">/night</span></p>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteListing(l.id)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-20 bg-muted/20 rounded-[2.5rem] border border-dashed border-border/60">
                                            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                                            <p className="font-bold text-muted-foreground">No properties listed.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto h-screen">
                <header className="h-16 border-b border-border flex items-center justify-between px-4 lg:px-8 bg-background/50 backdrop-blur sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="md:hidden">
                                    <Menu size={20} />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-64 p-0 bg-card border-r border-border flex flex-col">
                                <div className="p-6 border-b border-border">
                                    <div className="flex flex-col items-start justify-center gap-1 cursor-default">
                                        <img src="/assets/digitalridr-logo.PNG" alt="Digital Ridr" className="h-8 w-auto" />
                                        <span className="text-[10px] font-black tracking-[0.3em] text-[#F48221] uppercase mt-1 pl-1">Admin Panel</span>
                                    </div>
                                </div>
                                <nav className="flex-1 p-4 space-y-2">
                                    <MenuButton icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                                    <MenuButton icon={Users} label="Hosts & Users" active={activeTab === 'hosts'} onClick={() => setActiveTab('hosts')} />
                                    <MenuButton icon={Wallet} label="Payouts" active={activeTab === 'payouts'} onClick={() => setActiveTab('payouts')} />
                                    <MenuButton icon={ShieldCheck} label="Verifications" active={activeTab === 'verifications'} onClick={() => setActiveTab('verifications')} />
                                    <MenuButton icon={MessageSquare} label="Messages" active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} />
                                    <MenuButton icon={Building2} label="Properties" active={activeTab === 'properties'} onClick={() => setActiveTab('properties')} />
                                </nav>
                            </SheetContent>
                        </Sheet>
                        <h1 className="font-bold text-lg capitalize">{activeTab}</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search everything..."
                                className="pl-9 w-64 bg-muted/50 border-none h-9 rounded-xl focus:ring-1 focus:ring-[#F48221]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <NotificationBell />
                        <ModeToggle />
                        <Button size="icon" variant="ghost" className="rounded-full">
                            <Users size={20} />
                        </Button>
                    </div>
                </header>

                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">

                        {/* OVERVIEW TAB */}
                        <TabsContent value="overview" className="space-y-6 animate-in fade-in">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">Welcome back, Admin 👋</h2>
                                    <p className="text-muted-foreground mt-1 font-medium text-sm md:text-base">Here's what's happening with your properties today.</p>
                                </div>
                                <div className="text-right hidden md:block">
                                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <AnalyticsStatsCard
                                    title="Total Revenue"
                                    value={formatNaira(stats.revenue)}
                                    icon={Wallet}
                                    trend="+12.5%"
                                    trendUp={true}
                                    color="bg-emerald-500/10 text-emerald-500"
                                />
                                <AnalyticsStatsCard
                                    title="Active Hosts"
                                    value={stats.hosts}
                                    icon={Users}
                                    trend="+4"
                                    trendUp={true}
                                    color="bg-blue-500/10 text-blue-500"
                                />
                                <AnalyticsStatsCard
                                    title="Total Bookings"
                                    value={stats.bookings}
                                    icon={CheckCircle2}
                                    trend="+2.4%"
                                    trendUp={true}
                                    color="bg-orange-500/10 text-orange-500"
                                />
                                <AnalyticsStatsCard
                                    title="Active Listings"
                                    value={listings.length}
                                    icon={Building2}
                                    trend="+5"
                                    trendUp={true}
                                    color="bg-purple-500/10 text-purple-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <Card className="lg:col-span-2 bg-card border-border/60 shadow-sm rounded-[2rem] hover:shadow-lg transition-all">
                                    <CardHeader className="p-5 md:p-6">
                                        <CardTitle className="text-lg font-bold">Revenue Overview</CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[250px] md:h-[300px] p-5 md:p-6 pt-0 md:pt-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={bookings.slice(0, 10).map((b, i) => ({ name: `Booking ${i + 1}`, amount: b.total_price || 0 }))}>
                                                <defs>
                                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                                <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `₦${value / 1000}k`} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '8px' }}
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="bg-card border-border/60 shadow-sm rounded-[2rem] hover:shadow-lg transition-all">
                                    <CardHeader className="p-5 md:p-6">
                                        <CardTitle className="text-lg font-bold">Properties by Location</CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[250px] md:h-[300px] flex items-center justify-center relative p-5 md:p-6 pt-0 md:pt-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={listings.reduce((acc: any[], curr) => {
                                                        const existing = acc.find((item: any) => item.name === curr.location);
                                                        if (existing) existing.value++;
                                                        else acc.push({ name: curr.location, value: 1 });
                                                        return acc;
                                                    }, [])}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {listings.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f97316', '#a855f7', '#ec4899'][index % 5]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '8px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-bold">Recent Host Activity</h3>
                                <HostTable hosts={hosts} onBan={handleBanHost} onUpdateStatus={handleUpdateHostStatus} limit={5} onViewProperties={setSelectedHost} onMessage={handleMessageHost} onDelete={handleDeleteListing} />
                            </div>
                        </TabsContent>

                        {/* HOSTS TAB */}
                        <TabsContent value="hosts" className="animate-in fade-in">
                            <Card className="bg-card border-border text-foreground">
                                <CardHeader>
                                    <CardTitle>All Hosts</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <HostTable hosts={filteredHosts} onBan={handleBanHost} onUpdateStatus={handleUpdateHostStatus} onViewProperties={setSelectedHost} onMessage={handleMessageHost} onDelete={handleDeleteListing} />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* VERIFICATIONS TAB */}
                        <TabsContent value="verifications" className="animate-in fade-in">
                            <Card className="bg-card border-border text-foreground">
                                <CardHeader>
                                    <CardTitle>Identity Verifications Management</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 gap-4">
                                        {filteredVerifications.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground">
                                                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                                                <p>No verifications found.</p>
                                            </div>
                                        ) : filteredVerifications.map((v) => (
                                            <div key={v.id} className="flex flex-col md:flex-row gap-6 p-6 border border-border rounded-2xl bg-muted/20 relative overflow-hidden">
                                                {v.verification_status === 'verified' && (
                                                    <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                                                        Auto-Verified
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-4 min-w-[200px]">
                                                    <Avatar className="h-16 w-16 rounded-xl border-2 border-border">
                                                        <AvatarImage src={v.avatar_url} className="object-cover" />
                                                        <AvatarFallback>{v.full_name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-bold text-foreground text-lg">{v.full_name}</p>
                                                        <p className="text-xs text-muted-foreground font-mono">{v.email}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {v.verification_submitted_at ? new Date(v.verification_submitted_at).toLocaleDateString() : 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex-1 grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-bold uppercase text-muted-foreground">ID Document</p>
                                                        <div className="h-32 bg-background rounded-lg border border-border overflow-hidden relative group">
                                                            <SecureImage path={v.identity_doc_url} alt="ID Document" className="w-full h-full object-cover" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Selfie with ID</p>
                                                        <div className="h-32 bg-background rounded-lg border border-border overflow-hidden relative group">
                                                            <SecureImage path={v.selfie_url} alt="Selfie" className="w-full h-full object-cover" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col justify-center gap-2 min-w-[120px]">
                                                    {v.verification_status === 'pending' ? (
                                                        <>
                                                            <Button
                                                                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                                                                onClick={() => handleVerificationReview(v.id, 'approve')}
                                                            >
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                className="font-bold"
                                                                onClick={() => {
                                                                    const reason = prompt("Enter rejection reason:");
                                                                    if (reason) handleVerificationReview(v.id, 'reject', reason);
                                                                }}
                                                            >
                                                                Reject
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button
                                                            variant="destructive"
                                                            className="font-bold bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/50"
                                                            onClick={() => {
                                                                if (confirm("Are you sure you want to REVOKE this verification? The user will lose their verified status.")) {
                                                                    handleVerificationReview(v.id, 'reject', "Verification Revoked by Admin");
                                                                }
                                                            }}
                                                        >
                                                            Revoke
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* PAYOUTS TAB */}
                        <TabsContent value="payouts" className="animate-in fade-in">
                            <Card className="bg-card border-border text-foreground">
                                <CardHeader>
                                    <CardTitle>Withdrawal Requests</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {/* Mobile View: Cards */}
                                    <div className="md:hidden space-y-4">
                                        {filteredPayouts.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground">No pending payouts.</div>
                                        ) : filteredPayouts.map((p) => {
                                            const requestUser = hosts.find(h => h.id === p.user_id);
                                            return (
                                                <div key={p.id} className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="font-medium text-sm">{requestUser?.full_name || "Unknown"}</div>
                                                        <Badge variant="outline" className={`
                                                            ${p.status === 'paid' ? 'border-emerald-500 text-emerald-500' :
                                                                p.status === 'rejected' ? 'border-red-500 text-red-500' :
                                                                    'border-amber-500 text-amber-500'}
                                                        `}>
                                                            {p.status}
                                                        </Badge>
                                                    </div>
                                                    <div className="mb-3">
                                                        <p className="text-2xl font-bold text-emerald-400">{formatNaira(p.amount)}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {p.bank_name} • {p.account_number}
                                                        </p>
                                                    </div>
                                                    {p.status === 'pending' && (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <Button size="sm" variant="outline" className="w-full border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white" onClick={() => handlePayoutAction(p.id, 'paid')}>Pay</Button>
                                                            <Button size="sm" variant="outline" className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white" onClick={() => handlePayoutAction(p.id, 'rejected')}>Reject</Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Desktop View: Table */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                                                <tr>
                                                    <th className="pb-3 pl-4">Host</th>
                                                    <th className="pb-3">Amount</th>
                                                    <th className="pb-3">Bank Details</th>
                                                    <th className="pb-3">Status</th>
                                                    <th className="pb-3 text-right pr-4">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {filteredPayouts.length === 0 ? (
                                                    <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No pending payouts.</td></tr>
                                                ) : filteredPayouts.map((p) => {
                                                    const requestUser = hosts.find(h => h.id === p.user_id);
                                                    return (
                                                        <tr key={p.id} className="hover:bg-muted/50">
                                                            <td className="py-4 pl-4 font-medium">{requestUser?.full_name || "Unknown"}</td>
                                                            <td className="py-4 font-bold text-emerald-400">{formatNaira(p.amount)}</td>
                                                            <td className="py-4 text-sm text-muted-foreground">
                                                                {p.bank_name} <br /> {p.account_number}
                                                            </td>
                                                            <td className="py-4">
                                                                <Badge variant="outline" className={`
                                                        ${p.status === 'paid' ? 'border-emerald-500 text-emerald-500' :
                                                                        p.status === 'rejected' ? 'border-red-500 text-red-500' :
                                                                            'border-amber-500 text-amber-500'}
                                                      `}>
                                                                    {p.status}
                                                                </Badge>
                                                            </td>
                                                            <td className="py-4 text-right pr-4 space-x-2">
                                                                {p.status === 'pending' && (
                                                                    <>
                                                                        <Button size="sm" variant="outline" className="h-7 border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white" onClick={() => handlePayoutAction(p.id, 'paid')}>Pay</Button>
                                                                        <Button size="sm" variant="outline" className="h-7 border-red-500 text-red-500 hover:bg-red-500 hover:text-white" onClick={() => handlePayoutAction(p.id, 'rejected')}>Reject</Button>
                                                                    </>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* MESSAGES TAB */}
                        <TabsContent value="messages" className="animate-in fade-in">
                            <Card className="bg-card border-border text-foreground h-[600px] flex items-center justify-center">
                                <div className="text-center">
                                    <MessageSquare size={48} className="mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-xl font-bold">Admin Inbox</h3>
                                    <p className="text-muted-foreground mt-2">Manage all communications.</p>
                                    <Button className="mt-6 bg-[#F48221] text-black font-bold" onClick={() => navigate("/host/messages")}>
                                        Open Messaging Center
                                    </Button>
                                </div>
                            </Card>
                        </TabsContent>

                        {/* PROPERTIES TAB (Grouped by Host) */}
                        <TabsContent value="properties" className="animate-in fade-in">
                            <div className="space-y-8">
                                {hosts.filter(h => filteredListings.some(l => l.host_id === h.id)).map((host) => {
                                    const hostListings = filteredListings.filter(l => l.host_id === host.id);
                                    return (
                                        <Card key={host.id} className="bg-card border-border overflow-hidden">
                                            <CardHeader className="bg-muted/20 border-b border-border pb-4">
                                                <div className="flex items-center gap-4">
                                                    <Avatar className="h-12 w-12 rounded-xl border-2 border-background shadow-sm">
                                                        <AvatarImage src={host.avatar_url} className="object-cover" />
                                                        <AvatarFallback className="font-bold bg-muted text-muted-foreground rounded-xl">
                                                            {host.full_name?.[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <CardTitle className="text-lg font-bold">{host.full_name}</CardTitle>
                                                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1">
                                                            {hostListings.length} {hostListings.length === 1 ? 'Property' : 'Properties'} Listed
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-6">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {hostListings.map((l) => (
                                                        <div key={l.id} className="flex gap-4 p-3 rounded-2xl border border-border/50 bg-background hover:bg-muted/30 transition-all group/card">
                                                            <div className="h-20 w-24 bg-muted rounded-xl bg-center bg-cover shrink-0 relative overflow-hidden">
                                                                <img src={l.images?.[0]} className="w-full h-full object-cover" />
                                                            </div>
                                                            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                                                <div>
                                                                    <h4 className="font-bold text-sm text-foreground truncate">{l.title}</h4>
                                                                    <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5 mb-2">
                                                                        <MapPin className="h-3 w-3" /> {l.location}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-mono text-xs text-[#F48221] font-bold">{formatNaira(l.price_per_night)}</span>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-6 px-2 text-[10px] font-bold uppercase tracking-wider text-red-500 hover:bg-red-500/10 hover:text-red-600 rounded-lg"
                                                                        onClick={() => handleDeleteListing(l.id)}
                                                                    >
                                                                        Delete
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}

                                {listings.length === 0 && (
                                    <div className="text-center py-20 bg-muted/20 rounded-[2.5rem] border border-dashed border-border/60">
                                        <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                                        <p className="font-bold text-muted-foreground">No properties listed.</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                    </Tabs>
                </div>
            </main >
        </div >
    );
};

// Sub-components
const MenuButton = ({ icon: Icon, label, active, onClick }: any) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
      ${active ? "bg-[#F48221] text-black font-bold" : "text-muted-foreground hover:bg-accent hover:text-foreground"}
    `}
    >
        <Icon size={18} />
        {label}
    </button>
);

const SecureImage = ({ path, alt, className }: { path: string, alt: string, className?: string }) => {
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
        if (!path) return;

        // If it's already a full URL (legacy), use it. Otherwise generate signed URL.
        if (path.startsWith('http')) {
            setSrc(path);
            return;
        }

        const fetchSignedUrl = async () => {
            const { data } = await supabase.storage.from('secure-documents').createSignedUrl(path, 3600); // 1 hour expiry
            if (data?.signedUrl) setSrc(data.signedUrl);
        };
        fetchSignedUrl();
    }, [path]);

    if (!src) return <div className={`bg-muted animate-pulse ${className}`} />;

    return (
        <div className="relative group w-full h-full">
            <img src={src} alt={alt} className={className} />
            <a href={src} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="text-white h-6 w-6" />
            </a>
        </div>
    );
};

const AnalyticsStatsCard = ({ title, value, icon: Icon, trend, trendUp, color }: any) => (
    <Card className="bg-card border-border/60 shadow-sm rounded-[2rem] relative overflow-hidden group hover:shadow-2xl hover:border-border transition-all duration-300">
        <CardContent className="p-6 md:p-8 flex items-start justify-between relative z-10">
            <div>
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-2">{title}</p>
                <h3 className="text-2xl md:text-3xl font-black text-foreground tracking-tighter">{value}</h3>
                {trend && (
                    <div className={`flex items-center gap-1.5 mt-3 text-xs font-bold ${trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
                        <span className="bg-current/10 p-0.5 rounded-full">{trendUp ? '↑' : '↓'}</span>
                        <span>{trend}</span>
                        <span className="text-muted-foreground font-medium ml-1 whitespace-nowrap">vs last month</span>
                    </div>
                )}
            </div>
            <div className={`h-10 w-10 md:h-12 md:w-12 rounded-2xl flex items-center justify-center shadow-inner ${color}`}>
                <Icon size={20} className="md:w-[22px] md:h-[22px] stroke-[2.5px]" />
            </div>
        </CardContent>
        <div className={`absolute -right-6 -bottom-6 h-28 w-28 md:h-32 md:w-32 rounded-full opacity-5 blur-3xl transition-all duration-500 group-hover:opacity-15 group-hover:scale-110 ${color.split(' ')[0]}`} />
    </Card>
);

const HostTable = ({ hosts, onBan, onUpdateStatus, limit, onViewProperties, onMessage, onDelete }: any) => {
    const displayHosts = limit ? hosts.slice(0, limit) : hosts;

    return (
        <>
            {/* Mobile View: Cards */}
            <div className="md:hidden space-y-4">
                {displayHosts.map((h: any) => (
                    <div key={h.id} className={`bg-card border border-border/50 rounded-2xl p-4 shadow-sm ${h.banned ? 'opacity-70 bg-red-500/5' : ''}`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 rounded-xl border border-border">
                                    <AvatarImage src={h.avatar_url} className="object-cover" />
                                    <AvatarFallback>{h.full_name?.[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold text-sm truncate max-w-[120px]">{h.full_name}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">#{h.id.slice(0, 6)}</p>
                                </div>
                            </div>
                            <Badge className={`rounded-full px-2 py-0.5 text-[10px] ${h.banned ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                {h.banned ? 'Banned' : 'Active'}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="bg-muted/30 p-2 rounded-lg">
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">Role</p>
                                <p className="text-xs font-medium">{h.host_status === 'approved' ? 'Host' : h.host_status === 'pending' ? 'Applicant' : 'User'}</p>
                            </div>
                            <div className="bg-muted/30 p-2 rounded-lg">
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">Joined</p>
                                <p className="text-xs font-medium">{h.created_at ? new Date(h.created_at).toLocaleDateString() : 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="flex-1 h-9 text-xs font-bold">Manage</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    {h.host_status === 'pending' && (
                                        <>
                                            <DropdownMenuItem onClick={() => onUpdateStatus(h.id, 'approved')}>Approve Host</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onUpdateStatus(h.id, 'rejected')}>Reject Host</DropdownMenuItem>
                                        </>
                                    )}
                                    <DropdownMenuItem onClick={() => onViewProperties(h)}>View Properties</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onMessage(h.id)}>Message</DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-500" onClick={() => onBan(h.id, h.banned)}>
                                        {h.banned ? "Unban" : "Ban User"}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block rounded-[1.5rem] border border-border/40 overflow-x-auto bg-muted/20">
                <table className="w-full text-left">
                    <thead className="text-[11px] font-black uppercase text-muted-foreground bg-muted/30">
                        <tr>
                            <th className="p-5 font-black tracking-widest pl-6">Host / User</th>
                            <th className="p-5 font-black tracking-widest">Contact</th>
                            <th className="p-5 font-black tracking-widest">Status</th>
                            <th className="p-5 font-black tracking-widest">Host Status</th>
                            <th className="p-5 font-black tracking-widest text-right pr-6">Joined Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                        {displayHosts.map((h: any) => (
                            <tr key={h.id} className={`group hover:bg-muted/30 transition-all duration-200 ${h.banned ? 'opacity-60 bg-red-500/5' : ''}`}>
                                <td className="p-4 pl-6">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <div className="flex items-center gap-4 cursor-pointer select-none">
                                                <Avatar className="h-11 w-11 rounded-2xl border-2 border-transparent group-hover:border-[#F48221] transition-all shadow-sm">
                                                    <AvatarImage src={h.avatar_url} className="object-cover" />
                                                    <AvatarFallback className="font-black bg-muted text-muted-foreground rounded-2xl">
                                                        {h.full_name?.[0]?.toUpperCase() || '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-bold text-foreground text-sm group-hover:text-[#F48221] transition-colors">{h.full_name || "Unknown User"}</p>
                                                    <p className="text-[10px] text-muted-foreground font-bold font-mono mt-0.5">#{h.id.slice(0, 6)}</p>
                                                </div>
                                            </div>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-60 rounded-2xl p-2 bg-card border-border shadow-2xl z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl">
                                            <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-3 py-2">
                                                Manage {h.full_name?.split(' ')[0]}
                                            </DropdownMenuLabel>
                                            <div className="px-2 pb-2">
                                                <div className="bg-muted/50 rounded-xl p-2 mb-2">
                                                    <p className="text-[10px] font-medium text-muted-foreground">User ID</p>
                                                    <p className="text-xs font-mono font-bold text-foreground truncate">{h.id}</p>
                                                </div>
                                            </div>
                                            <DropdownMenuSeparator className="bg-border/50 mx-2" />

                                            {/* HOST APPROVAL ACTIONS */}
                                            {h.host_status === 'pending' && (
                                                <>
                                                    <DropdownMenuItem
                                                        className="rounded-xl font-bold cursor-pointer py-2.5 px-3 focus:bg-emerald-500/10 focus:text-emerald-500 transition-colors group/item"
                                                        onClick={() => onUpdateStatus(h.id, 'approved')}
                                                    >
                                                        <Check className="mr-3 h-4 w-4 text-emerald-500" />
                                                        Approve Application
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="rounded-xl font-bold cursor-pointer py-2.5 px-3 focus:bg-red-500/10 focus:text-red-500 transition-colors group/item"
                                                        onClick={() => onUpdateStatus(h.id, 'rejected')}
                                                    >
                                                        <X className="mr-3 h-4 w-4 text-red-500" />
                                                        Reject Application
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-border/50 mx-2" />
                                                </>
                                            )}

                                            {h.host_status === 'approved' && !h.is_admin && (
                                                <DropdownMenuItem
                                                    className="rounded-xl font-bold cursor-pointer py-2.5 px-3 focus:bg-amber-500/10 focus:text-amber-500 transition-colors group/item"
                                                    onClick={() => onUpdateStatus(h.id, 'rejected')}
                                                >
                                                    <Ban className="mr-3 h-4 w-4 text-amber-500" />
                                                    Revoke Host Access
                                                </DropdownMenuItem>
                                            )}

                                            <DropdownMenuItem className="rounded-xl font-bold cursor-pointer py-2.5 px-3 focus:bg-accent focus:text-accent-foreground transition-colors group/item" onClick={() => onViewProperties(h)}>
                                                <Building2 className="mr-3 h-4 w-4 text-muted-foreground group-hover/item:text-foreground" />
                                                View Properties
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="rounded-xl font-bold cursor-pointer py-2.5 px-3 focus:bg-accent focus:text-accent-foreground transition-colors group/item" onClick={() => {
                                                if (h.email) {
                                                    navigator.clipboard.writeText(h.email);
                                                    toast.success("Email copied");
                                                }
                                            }}>
                                                <Copy className="mr-3 h-4 w-4 text-muted-foreground group-hover/item:text-foreground" />
                                                Copy Email
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="rounded-xl font-bold cursor-pointer py-2.5 px-3 focus:bg-accent focus:text-accent-foreground transition-colors group/item" onClick={() => window.location.href = `mailto:${h.email}`}>
                                                <Mail className="mr-3 h-4 w-4 text-muted-foreground group-hover/item:text-foreground" />
                                                Send Email
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="rounded-xl font-bold cursor-pointer py-2.5 px-3 focus:bg-accent focus:text-accent-foreground transition-colors group/item" onClick={() => onMessage(h.id)}>
                                                <MessageSquare className="mr-3 h-4 w-4 text-muted-foreground group-hover/item:text-foreground" />
                                                Message User
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-border/50 mx-2" />
                                            <DropdownMenuItem
                                                className={`rounded-xl font-black cursor-pointer py-2.5 px-3 mt-1 transition-colors ${h.banned ? 'text-emerald-500 focus:text-emerald-500 focus:bg-emerald-500/10' : 'text-red-500 focus:text-red-500 focus:bg-red-500/10'}`}
                                                onClick={() => onBan(h.id, h.banned)}
                                            >
                                                {h.banned ? <><CheckCircle2 className="mr-3 h-4 w-4" /> Unban User</> : <><Ban className="mr-3 h-4 w-4" /> Ban Access</>}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                                <td className="p-4 align-middle">
                                    <span className="font-bold text-sm text-foreground">{h.email || "N/A"}</span>
                                </td>
                                <td className="p-4 align-middle">
                                    <Badge className={`
                                        rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide border-none shadow-none
                                        ${h.banned
                                            ? 'bg-red-500/10 text-red-500'
                                            : 'bg-emerald-500/10 text-emerald-500'}
                                    `}>
                                        {h.banned ? 'Banned' : 'Active'}
                                    </Badge>
                                </td>
                                <td className="p-4 align-middle">
                                    <Badge variant="outline" className={`
                                        rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider
                                        ${h.host_status === 'approved' ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/5' :
                                            h.host_status === 'pending' ? 'border-amber-500/50 text-amber-500 bg-amber-500/5' :
                                                h.host_status === 'rejected' ? 'border-red-500/50 text-red-500 bg-red-500/5' :
                                                    'border-muted text-muted-foreground'
                                        }
                                    `}>
                                        {h.host_status || 'None'}
                                    </Badge>
                                </td>
                                <td className="p-4 pr-6 text-right align-middle">
                                    <span className="text-xs font-bold text-muted-foreground">
                                        {h.created_at ? new Date(h.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

// Helper to avoid scope issues if any, but simplified for now
const DropdownMenuMenuItemWrapper = ({ onMessage }: any) => (
    <DropdownMenuItem className="rounded-xl font-bold cursor-pointer py-2.5 px-3 focus:bg-accent focus:text-accent-foreground transition-colors group/item" onClick={onMessage}>
        <MessageSquare className="mr-3 h-4 w-4 text-muted-foreground group-hover/item:text-foreground" />
        Message User
    </DropdownMenuItem>
);

export default AdminDashboard;
