const payload = {
  reference: "DR-TEST-" + Date.now(),
  amount: 125000,
  currency: "NGN",
  customer: {
    name: "Test User",
    email: "test@example.com",
  },
  narration: "DigitalRidr booking for Test Listing",
  channels: ["card", "bank_transfer", "pay_with_bank"],
  default_channel: "bank_transfer",
  metadata: {
    booking: "digitalridr",
    data: JSON.stringify({
      listing_id: "e96a9d4c-4be0-458e-bafe-07f0196a1868",
      guest_id: "e96a9d4c-4be0-458e-bafe-07f0196a1868",
      host_id: "e96a9d4c-4be0-458e-bafe-07f0196a1868",
      check_in: "2026-06-04T23:00:00.000Z",
      check_out: "2026-06-05T23:00:00.000Z",
      guests: 1,
      total_price: 125000,
      platform_fee: 12500,
      host_payout_amount: 112500,
      security_deposit: 50000
    })
  },
  merchant_bears_cost: true
};

fetch("https://api.korapay.com/core-middleware/api/m/charges", {
  method: "POST",
  headers: {
    Authorization: "Bearer pk_test_xvXFN3HCQPpUFGNKj3fKHxTY6sqGnZrzw4AhxzHQ",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
})
.then(r => r.json())
.then(data => console.log("Response:", JSON.stringify(data, null, 2)))
.catch(e => console.error(e));
