import { Button } from "antd";
import type { ButtonProps } from "antd";
import { useState, type ReactNode } from "react";

function GlassButton({
  children,
  style,
  onClick,
  ...props
}: {
  children?: ReactNode;
} & ButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    // 1. Restart the animation state immediately
    setIsAnimating(false);

    // 2. Use a microtask/timeout to force React to batch the state change and re-trigger the animation
    setTimeout(() => {
      setIsAnimating(true);
    }, 10);

    // 3. Fire any external click logic passed from parent components
    if (onClick) onClick(e);
  };
  return (
    <Button
      className={`rounded-4xl! ${isAnimating ? "ios-pop-animation" : ""}`}
      onClick={handleClick}
      onAnimationEnd={() => setIsAnimating(false)}
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", sans-serif',
        fontWeight: 500,
        fontSize: 17,
        lineHeight: 1.2,
        letterSpacing: "-0.01em",
        boxShadow: "0px 10px 20px 9px #00000014",
        ...style,
      }}
      {...props}
    >
      {children}
    </Button>
  );
}

export default GlassButton;
