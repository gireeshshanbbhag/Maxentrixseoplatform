import { cn } from "@/lib/utils.ts";
import { getScoreColor, getScoreLabel, getScoreTrackColor } from "@/lib/seo-health.ts";

type HealthScoreRingProps = {
  score: number | null; // null = not yet scored
  size?: "sm" | "lg";
};

export default function HealthScoreRing({
  score,
  size = "lg",
}: HealthScoreRingProps) {
  const isLarge = size === "lg";
  const svgSize = isLarge ? 180 : 80;
  const strokeWidth = isLarge ? 10 : 6;
  const radius = (svgSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score !== null ? (score / 100) * circumference : 0;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        className="-rotate-90"
      >
        {/* Background track */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        {/* Progress arc */}
        {score !== null && (
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            className={cn("transition-all duration-1000", getScoreTrackColor(score))}
          />
        )}
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {score !== null ? (
          <>
            <span
              className={cn(
                "font-bold tabular-nums",
                isLarge ? "text-4xl" : "text-lg",
                getScoreColor(score),
              )}
            >
              {score}
            </span>
            {isLarge && (
              <span className={cn("text-xs font-medium mt-0.5", getScoreColor(score))}>
                {getScoreLabel(score)}
              </span>
            )}
          </>
        ) : (
          <>
            <span
              className={cn(
                "font-bold text-muted-foreground/40",
                isLarge ? "text-3xl" : "text-base",
              )}
            >
              --
            </span>
            {isLarge && (
              <span className="text-xs text-muted-foreground/40 mt-0.5">
                No data
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
