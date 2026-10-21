import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { initializeMetaPixel, revokeMetaPixelConsent } from "@/lib/metaPixel";

const CONSENT_STORAGE_KEY = "digital-ridr-analytics-consent";
type ConsentState = "unknown" | "undecided" | "accepted" | "declined";

export default function AnalyticsConsent() {
  const [consent, setConsent] = useState<ConsentState>("unknown");

  useEffect(() => {
    const savedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (savedConsent === "accepted") {
      initializeMetaPixel();
      setConsent("accepted");
    } else if (savedConsent === "declined") {
      setConsent("declined");
    } else {
      setConsent("undecided");
    }

    const openPreferences = () => setConsent("undecided");
    window.addEventListener("digitalrider:open-cookie-preferences", openPreferences);
    return () => window.removeEventListener("digitalrider:open-cookie-preferences", openPreferences);
  }, []);

  const saveConsent = (choice: "accepted" | "declined") => {
    localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    setConsent(choice);

    if (choice === "accepted") {
      initializeMetaPixel();
    } else {
      revokeMetaPixelConsent();
    }
  };

  if (consent !== "undecided") return null;

  return (
    <section
      className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-2xl rounded-2xl border border-border bg-background p-5 shadow-2xl md:bottom-6 md:p-6"
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
    >
      <h2 id="cookie-consent-title" className="text-base font-bold text-foreground">Your privacy choices</h2>
      <p id="cookie-consent-description" className="mt-2 text-sm leading-6 text-muted-foreground">
        With your permission, we use Meta Pixel cookies to understand website activity and show more relevant Digital Ridr ads. You can change your choice at any time in the footer. Read our <Link className="font-semibold text-primary hover:underline" to="/privacy-policy">Privacy Policy</Link>.
      </p>
      <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => saveConsent("declined")} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted">
          Reject analytics
        </button>
        <button type="button" onClick={() => saveConsent("accepted")} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90">
          Accept analytics
        </button>
      </div>
    </section>
  );
}
