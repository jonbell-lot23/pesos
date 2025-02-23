"use client";

import React, { useEffect, useRef } from "react";

export default function Spinner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<any>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !containerRef.current ||
      animationRef.current
    ) {
      return;
    }

    let isMounted = true;

    import("lottie-web").then((module) => {
      if (!isMounted || !containerRef.current) return;

      const lottie = module.default;
      animationRef.current = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: "/fire_loader.json",
      });
    });

    return () => {
      isMounted = false;
      if (animationRef.current) {
        animationRef.current.destroy();
        animationRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex justify-center items-center py-4">
      <div ref={containerRef} className="w-32 h-32"></div>
    </div>
  );
}
