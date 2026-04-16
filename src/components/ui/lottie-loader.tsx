"use client";

import Lottie from "lottie-react";
import animationData from "../../../public/Akuru-Lottie.json";
import { cn } from "@/lib/utils";

interface LottieLoaderProps {
  /** Full-screen overlay mode (for page transitions / login) */
  fullScreen?: boolean;
  className?: string;
  size?: number;
}

export function LottieLoader({ fullScreen = false, className, size = 120 }: LottieLoaderProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
        <Lottie
          animationData={animationData}
          loop
          style={{ width: size, height: size }}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center py-16", className)}>
      <Lottie
        animationData={animationData}
        loop
        style={{ width: size, height: size }}
      />
    </div>
  );
}
