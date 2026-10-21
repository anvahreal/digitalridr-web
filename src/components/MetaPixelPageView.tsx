import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackMetaEvent } from "@/lib/metaPixel";

/** Records navigation in this single-page application as Meta Pixel page views. */
export default function MetaPixelPageView() {
  const location = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // AnalyticsConsent records the initial landing after consent is granted.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    trackMetaEvent("PageView");
  }, [location.pathname, location.search, location.hash]);

  return null;
}
