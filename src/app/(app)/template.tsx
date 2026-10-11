"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { DURATION, EASE_MAC, ENTRANCE_OFFSET } from "@/components/motion/presets";

// WRMax DS · Animações §2: the new section slides in from the side with a fade,
// but never on the first load. Set only in an effect (client-side, after the
// first mount) so server renders and the hydration render never animate.
let hasNavigated = false;

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const [animateEntrance] = useState(() => typeof window !== "undefined" && hasNavigated);
  useEffect(() => {
    hasNavigated = true;
  }, []);

  return (
    <motion.div
      className="flex flex-1 flex-col"
      initial={animateEntrance ? { opacity: 0, x: ENTRANCE_OFFSET } : false}
      animate={{ opacity: 1, x: 0, transition: { duration: DURATION.slide, ease: EASE_MAC } }}
    >
      {children}
    </motion.div>
  );
}
