import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  greenBorder?: boolean;
  [key: string]: any;
}

export function GlassCard({
  children,
  className,
  hoverEffect = false,
  greenBorder = true,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={hoverEffect ? { scale: 1.02 } : {}}
      className={cn(
        "glass-card rounded-2xl p-6 relative overflow-hidden",
        greenBorder && "border-primary/25",
        className
      )}
      {...props}
    >
      {/* Green glow effect */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
