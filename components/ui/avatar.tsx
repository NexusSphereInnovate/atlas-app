import { cn } from "@/lib/utils";

interface AvatarProps {
  initials?: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function Avatar({ initials = "?", src, size = "md", className }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold select-none shrink-0",
        "bg-gradient-to-br from-blue-500 to-violet-600 text-white",
        sizes[size],
        className
      )}
    >
      {src ? (
        <img src={src} alt={initials} className="h-full w-full rounded-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}
