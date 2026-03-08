import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/utils";
import { format } from "date-fns";
import { Printer, AlertTriangle, Ban, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

// --- MANAGE BOOKING DIALOG ---
export const ManageBookingDialog = ({ booking, open, onOpenChange, onUpdate, profile }: any) => {
    const [loading, setLoading] = useState(false);

    const handleCancel = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', booking.id);

            if (error) throw error;
            toast.success("Booking cancelled successfully.");
            onUpdate();
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.message || "Failed to cancel");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage Booking</DialogTitle>
                    <DialogDescription>
                        {booking.listings?.title}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-3 text-sm text-slate-600">
                        <div>
                            <p><span className="font-bold">Check-in:</span> {format(new Date(booking.check_in), "MMM d, yyyy")}</p>
                            <p><span className="font-bold">Check-out:</span> {format(new Date(booking.check_out), "MMM d, yyyy")}</p>
                        </div>
                    </div>

                    {booking.status === 'cancelled' && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3">
                            <Ban className="h-5 w-5" />
                            <span className="font-bold">This booking is cancelled.</span>
                        </div>
                    )}

                    {/* CHECK-IN INSTRUCTIONS (LOCKED IF UNVERIFIED) */}
                    {booking.status === 'confirmed' && (
                        <div className="space-y-3 pt-2">
                            <h4 className="font-bold text-sm flex items-center gap-2">
                                <FileText className="h-4 w-4" /> Check-in Instructions
                            </h4>

                            {/* @ts-ignore */}
                            {booking.status === 'confirmed' && profile?.verification_status === 'verified' ? (
                                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-bold text-emerald-800 uppercase">Exact Location</p>
                                            <p className="text-sm font-medium text-emerald-900">{booking.listings?.location}</p>
                                            <p className="text-xs text-emerald-700 mt-1">{booking.listings?.address || "Address available on check-in day"}</p>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-emerald-200/50 flex flex-wrap gap-4">
                                        <div>
                                            <p className="text-xs font-bold text-emerald-800 uppercase">Access Code</p>
                                            <p className="text-lg font-black text-emerald-900 tracking-widest font-mono">
                                                {booking.listings?.access_code || "N/A"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-emerald-800 uppercase">Wifi Password</p>
                                            <p className="text-sm font-medium text-emerald-900 select-all">
                                                {booking.listings?.wifi_password || "N/A"}
                                            </p>
                                            {booking.listings?.wifi_name && (
                                                <p className="text-[10px] text-emerald-800/70 mt-0.5">SSID: {booking.listings?.wifi_name}</p>
                                            )}
                                        </div>
                                    </div>
                                    {booking.listings?.check_in_instructions && (
                                        <div className="pt-2 border-t border-emerald-200/50">
                                            <p className="text-xs font-bold text-emerald-800 uppercase">Notes</p>
                                            <p className="text-xs text-emerald-900 italic mt-1">"{booking.listings?.check_in_instructions}"</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl text-center space-y-3">
                                    <div className="mx-auto h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center">
                                        <Ban className="h-5 w-5 text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">Check-in Details Locked</p>
                                        <p className="text-xs text-slate-500 max-w-[200px] mx-auto">
                                            You must verify your identity to see the exact address and access codes.
                                        </p>
                                    </div>
                                    <div className="pt-2">
                                        <Button
                                            size="sm"
                                            className="w-full font-bold bg-[#F48221] hover:bg-orange-600"
                                            onClick={() => window.location.href = '/verify-identity'}
                                        >
                                            Verify Identity Now
                                        </Button>
                                        {/* @ts-ignore */}
                                        {profile?.verification_status === 'pending' && (
                                            <p className="text-[10px] text-orange-600 font-bold mt-2 animate-pulse">
                                                Verification Pending Review...
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    {booking.status !== 'cancelled' && (
                        <Button variant="destructive" onClick={handleCancel} disabled={loading}>
                            {loading ? "Processing..." : (booking.status === 'pending' ? "Withdraw Request" : "Cancel Booking")}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
};

// --- RECEIPT COMPONENT ---
export const BookingReceipt = ({ booking, open, onOpenChange }: any) => {
    const handlePrint = () => {
        window.print();
    };

    if (!booking) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <div className="print:fixed print:inset-0 print:bg-white print:z-[99999] print:p-8" id="printable-receipt">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <img src="/assets/digitalridr-logo.PNG" alt="Digital Ridr" className="h-8 w-auto mb-1" />
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Booking Receipt</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-900">Receipt #{booking.id.slice(0, 8).toUpperCase()}</p>
                            <p className="text-xs text-slate-500">{format(new Date(), "MMM d, yyyy")}</p>
                        </div>
                    </div>

                    <div className="border-t border-b border-slate-100 py-8 my-8 space-y-6">
                        <div className="flex justify-between">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Billed To</p>
                                <p className="font-bold text-slate-900 text-lg mt-1">{booking.profiles?.full_name || "Guest"}</p>
                                <p className="text-sm text-slate-500">{booking.profiles?.email}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] uppercase font-bold text-slate-400">Property</p>
                                <p className="font-bold text-slate-900 text-lg mt-1">{booking.listings?.title}</p>
                                <p className="text-sm text-slate-500">{booking.listings?.location}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 bg-slate-50 p-6 rounded-2xl">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Check In</p>
                                <p className="font-bold text-slate-900">{format(new Date(booking.check_in), "MMM d")}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Check Out</p>
                                <p className="font-bold text-slate-900">{format(new Date(booking.check_out), "MMM d")}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Guests</p>
                                <p className="font-bold text-slate-900">{booking.guests}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Status</p>
                                <p className="font-bold text-emerald-600 uppercase">{booking.status}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center bg-slate-900 text-white p-6 rounded-2xl">
                        <span className="font-bold">Total Amount Paid</span>
                        <span className="font-black text-2xl">{formatNaira(booking.total_price)}</span>
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-slate-400">Thank you for choosing Digital Ridr. Safe travels!</p>
                    </div>
                </div>

                <DialogFooter className="print:hidden">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    <Button onClick={handlePrint} className="gap-2 bg-slate-900 hover:bg-slate-800">
                        <Printer className="h-4 w-4" /> Print Receipt
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
