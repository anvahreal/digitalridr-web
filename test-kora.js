import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Listen to network responses
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/m/charges') || url.includes('korapay.com')) {
      console.log(`Response from ${url}: ${response.status()}`);
      try {
        const text = await response.text();
        console.log(`Body: ${text}`);
      } catch(e) {}
    }
  });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js"></script>
    </head>
    <body>
      <button id="payBtn">Pay</button>
      <script>
        document.getElementById('payBtn').onclick = function() {
          try {
            window.Korapay.initialize({
              key: "pk_test_xvXFN3HCQPpUFGNKj3fKHxTY6sqGnZrzw4AhxzHQ",
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
                listing_id: "e96a9d4c-4be0-458e-bafe-07f0196a1868",
                guest_id: "e96a9d4c-4be0-458e-bafe-07f0196a1868",
                host_id: "e96a9d4c-4be0-458e-bafe-07f0196a1868",
                check_in: "2026-06-04T23:00:00.000Z",
                check_out: "2026-06-05T23:00:00.000Z",
                guests: "1",
                total_price: "125000",
                platform_fee: "12500",
                host_payout_amount: "112500",
                security_deposit: "50000"
              },
              merchant_bears_cost: true,
              onFailed: (data) => console.log("FAILED", data)
            });
          } catch (e) {
            console.error("Initialize error:", e.message);
          }
        };
      </script>
    </body>
    </html>
  `;

  await page.setContent(html);
  // Wait for script to load
  await new Promise(r => setTimeout(r, 2000));
  
  await page.click('#payBtn');
  
  // Wait for network requests
  await new Promise(r => setTimeout(r, 3000));
  
  await browser.close();
})();
