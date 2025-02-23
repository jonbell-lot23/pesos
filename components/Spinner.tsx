"use client";
import React, { useEffect, useRef } from "react";
import lottie from "lottie-web";

export default function Spinner() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: "/fire_loader.json",
      });

      return () => anim.destroy();
    }
  }, []);

  return (
    <div className="flex justify-center items-center py-4">
      <div ref={containerRef} className="w-32 h-32"></div>
    </div>
  );
}
