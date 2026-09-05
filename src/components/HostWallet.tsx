import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2
} from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useHostBookings } from "@/hooks/useHostBookings";
import { formatNaira } from "@/lib/utils";
import {
  getBookingHostPayout,
  getEligibleBookingPayout,
  getPayoutAvailableAt,
  isRevenueBooking,
} from "@/lib/bookings";
import { format, differenceInDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const isReleasedPayout = (booking: any) => getEligibleBookingPayout(booking) > 0;

const HostWallet = () => {
  const { bookings, loading, refetch } = useHostBookings();

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

  // Fetch payouts to deduct from balance
  const [payouts, setPayouts] = useState<any[]>([]);

  useEffect(() => {
    const fetchPayouts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('user_id', user.id);

      if (data) setPayouts(data);
    };

    fetchPayouts();
  }, []);

  // Calculate Stats
  const revenueBookings = bookings.filter(isRevenueBooking);
  const totalEarned = revenueBookings.reduce((sum, b) => sum + getBookingHostPayout(b), 0);
  const releasedEarnings = revenueBookings.reduce((sum, b) => sum + getEligibleBookingPayout(b), 0);

  const pendingBookings = bookings
    .filter(b => b.status === 'pending')
    .reduce((sum, b) => sum + getBookingHostPayout(b), 0);

  const lockedEarnings = revenueBookings
    .filter(b => !isReleasedPayout(b))
    .reduce((sum, b) => sum + getBookingHostPayout(b), 0);

  const totalWithdrawn = payouts
    .filter(p => p.status === 'paid' || p.status === 'pending') // Deduct both paid and pending requests
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const availableBalance = releasedEarnings - totalWithdrawn;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Balance */}
        <Card className="bg-[#FF7A00] text-white border-none shadow-xl rounded-[2.5rem] overflow-hidden relative">
          <div className="absolute right-[-20px] top-[-20px] opacity-10">
            <Wallet size={120} />
          </div>
          <CardHeader>
            <CardTitle className="text-[10px] font-black opacity-80 uppercase tracking-widest text-white">
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <LoadingSpinner className="h-8 w-8" /> : (
              <div className="text-3xl font-black mb-1">{formatNaira(Math.max(0, availableBalance))}</div>
            )}
            <p className="text-[10px] text-white/70 font-bold uppercase">Bookings unlock 24h after checkout</p>
          </CardContent>
        </Card>

        {/* Pending Card */}
        <Card className="rounded-[2.5rem] border-none shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">On Hold / Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {loading ? <LoadingSpinner className="h-8 w-8" /> : (
              <div className="text-2xl font-black text-foreground">{formatNaira(lockedEarnings + pendingBookings + totalWithdrawn)}</div>
            )}
            <p className="text-[10px] text-muted-foreground mt-1 font-bold">Includes active stays and processing payouts</p>
          </CardContent>
        </Card>

        {/* Total Earned Card */}
        <Card className="rounded-[2.5rem] border-none shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Earned</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {loading ? <LoadingSpinner className="h-8 w-8" /> : (
              <div className="text-2xl font-black text-foreground">{formatNaira(totalEarned)}</div>
            )}
            <p className="text-[10px] text-muted-foreground mt-1 font-bold">Host payout earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* TRANSACTION LIST */}
      <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-card">
        <div className="p-6 border-b border-border">
          <h3 className="font-black text-lg text-foreground">Recent Activity</h3>
        </div>
        <div className="flex flex-col">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading transactions...</div>
          ) : bookings.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No transactions yet.</div>
          ) : bookings.map((tx: any) => (
            <Dialog key={tx.id}>
              <DialogTrigger asChild>
                <div className="p-4 md:p-6 border-b border-border/50 last:border-none hover:bg-muted/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer">

                  {/* LEFT: Icon + Details */}
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full shrink-0 ${tx.status === "confirmed" || tx.status === "completed" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                      {tx.status === "confirmed" || tx.status === "completed" ? <ArrowDownLeft size={18} /> : <Clock size={18} />}
                    </div>
                    <div>
                      <p className="text-sm md:text-base font-bold text-foreground">Booking: {tx.listing?.title || "Unknown Listing"}</p>
                      <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* RIGHT: Price + Status + Actions */}
                  <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto pl-14 sm:pl-0">
                    <div className="flex flex-row items-center justify-between sm:justify-end gap-3 w-full">
                      <p className={`font-black text-sm md:text-base ${tx.status === "confirmed" || tx.status === "completed" ? "text-emerald-600" : "text-foreground"}`}>
                        +{formatNaira(getBookingHostPayout(tx))}
                      </p>
                      <Badge variant="outline" className={`rounded-full border-none text-[9px] font-black uppercase px-2 py-0.5 ${tx.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-700' :
                        tx.status === 'pending' ? 'bg-amber-500/10 text-amber-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                        {tx.status}
                      </Badge>
                    </div>

                    {/* Actions Row - Only for Pending (Awaiting Admin Verification indicator) */}
                    {tx.status === 'pending' && (
                      <div className="flex justify-start sm:justify-end mt-1 w-full">
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          Awaiting Admin Verification
                        </span>
                      </div>
                    )}
                    {isRevenueBooking(tx) && !isReleasedPayout(tx) && (
                      <div className="flex justify-start sm:justify-end mt-1 w-full">
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">
                          Available {getPayoutAvailableAt(tx)?.toLocaleDateString() || "after hold"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-[2.5rem] p-6 bg-card border-none">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black text-foreground">Booking Details</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Guest Info */}
                  <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-2xl">
                    <Avatar className="h-12 w-12 border-2 border-background">
                      <AvatarImage src={tx.profiles?.avatar_url} />
                      <AvatarFallback>{tx.profiles?.full_name?.[0] || 'G'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-black text-foreground">{tx.profiles?.full_name || "Guest"}</p>
                      <p className="text-xs text-muted-foreground">{tx.profiles?.email || "No email provided"}</p>
                    </div>
                  </div>

                  {/* Trip Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-muted-foreground uppercase">Check-in</p>
                      <p className="font-bold text-foreground">{format(new Date(tx.check_in), "dd MMM yyyy")}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-muted-foreground uppercase">Check-out</p>
                      <p className="font-bold text-foreground">{format(new Date(tx.check_out), "dd MMM yyyy")}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-muted-foreground uppercase">Duration</p>
                      <p className="font-bold text-foreground">{differenceInDays(new Date(tx.check_out), new Date(tx.check_in))} nights</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-muted-foreground uppercase">Guests</p>
                      <p className="font-bold text-foreground">{tx.guests} guest{tx.guests > 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between items-center bg-muted/50 p-4 rounded-2xl">
                      <span className="font-black text-muted-foreground text-sm">Host Payout</span>
                      <span className="font-black text-xl text-foreground">{formatNaira(getBookingHostPayout(tx))}</span>
                    </div>
                  </div>

                  {/* Actions (if pending) */}
                  {tx.status === 'pending' && (
                    <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 text-center">
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-bold">
                        Awaiting Admin Payment Verification. Funds will be credited once approved.
                      </p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default HostWallet;
