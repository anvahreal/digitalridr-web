export type BookingLike = {
  status?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  total_price?: number | string | null;
  security_deposit?: number | string | null;
  platform_fee?: number | string | null;
  host_payout_amount?: number | string | null;
  payment_status?: string | null;
};

export type BookingViewStatus = "pending" | "active" | "ended" | "cancelled";

export const getNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getBookingDates = (booking: BookingLike) => ({
  checkIn: booking.check_in || booking.start_date || "",
  checkOut: booking.check_out || booking.end_date || "",
});

const endOfCheckoutDay = (dateValue: string) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date;
};

export const getBookingViewStatus = (booking: BookingLike, now = new Date()): BookingViewStatus => {
  if (booking.status === "cancelled") return "cancelled";
  if (booking.status === "completed") return "ended";
  if (booking.status === "pending") return "pending";

  const { checkOut } = getBookingDates(booking);
  const checkoutDate = endOfCheckoutDay(checkOut);

  if (booking.status === "confirmed" && checkoutDate && checkoutDate < now) {
    return "ended";
  }

  return "active";
};

export const isRevenueBooking = (booking: BookingLike) =>
  (booking.status === "confirmed" || booking.status === "completed") &&
  booking.payment_status !== "rejected";

export const getBookingRevenue = (booking: BookingLike) =>
  Math.max(0, getNumber(booking.total_price) - getNumber(booking.security_deposit));

export const getBookingPlatformFee = (booking: BookingLike) =>
  getNumber(booking.platform_fee) || Math.round(getBookingRevenue(booking) * 0.1);

export const getBookingHostPayout = (booking: BookingLike) =>
  getNumber(booking.host_payout_amount) || Math.max(0, getBookingRevenue(booking) - getBookingPlatformFee(booking));
