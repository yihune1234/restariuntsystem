import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 767px)";

const getIsMobile = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_QUERY).matches;
};

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
};

export default useIsMobile;