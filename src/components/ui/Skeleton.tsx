import { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "rect" | "circle";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  variant = "text",
  width,
  height,
  className = "",
  style,
  ...props
}: SkeletonProps) {
  const variantStyles = {
    text: "h-4 w-full rounded",
    rect: "rounded-lg",
    circle: "rounded-full",
  };

  return (
    <div
      className={`animate-pulse bg-muted ${variantStyles[variant]} ${className}`}
      style={{ width, height, ...style }}
      {...props}
    />
  );
}
