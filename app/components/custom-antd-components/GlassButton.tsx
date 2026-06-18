import { Button, ConfigProvider } from "antd";
import type { ButtonProps } from "antd";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type TouchEvent,
} from "react";

function GlassButton({
  children,
  style,
  className,
  onTouchStart,
  onTouchEnd,
  onTouchCancel,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  ...props
}: {
  children?: ReactNode;
} & ButtonProps) {
  const MIN_PRESS_MS = 200;
  const { alignSelf, ...buttonStyle } = style ?? {};

  const [isPressed, setIsPressed] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const pressedAtRef = useRef<number>(0);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (releaseTimerRef.current) {
        clearTimeout(releaseTimerRef.current);
      }
    };
  }, []);

  const pressStart = () => {
    if (releaseTimerRef.current) {
      clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }
    pressedAtRef.current = Date.now();
    setIsReleasing(false);
    setIsPressed(true);
  };

  const pressEnd = () => {
    const elapsed = Date.now() - pressedAtRef.current;
    const release = () => {
      setIsPressed(false);
      setIsReleasing(true);
    };

    if (elapsed >= MIN_PRESS_MS) {
      release();
      return;
    }

    releaseTimerRef.current = setTimeout(() => {
      release();
      releaseTimerRef.current = null;
    }, MIN_PRESS_MS - elapsed);
  };

  const handleTouchStart = (event: TouchEvent<HTMLButtonElement>) => {
    pressStart();
    onTouchStart?.(event);
  };

  const handleTouchEnd = (event: TouchEvent<HTMLButtonElement>) => {
    pressEnd();
    onTouchEnd?.(event);
  };

  const handleTouchCancel = (event: TouchEvent<HTMLButtonElement>) => {
    pressEnd();
    onTouchCancel?.(event);
  };

  const handleMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    pressStart();
    onMouseDown?.(event);
  };

  const handleMouseUp = (event: MouseEvent<HTMLButtonElement>) => {
    pressEnd();
    onMouseUp?.(event);
  };

  const handleMouseLeave = (event: MouseEvent<HTMLButtonElement>) => {
    if (isPressed) pressEnd();
    onMouseLeave?.(event);
  };

  return (
    <ConfigProvider
      wave={{ disabled: true }}
      theme={{
        components: {
          Button: {
            defaultBorderColor: "transparent",
            defaultHoverColor: "inherit",
            defaultHoverBorderColor: "transparent",
            defaultActiveBg: "transparent",
            defaultActiveColor: "inherit",
            defaultActiveBorderColor: "transparent",
            defaultShadow: "none",
            primaryShadow: "none",
          },
        },
      }}
    >
      <span
        className="ios-glass-border-wrap"
        style={alignSelf ? { alignSelf } : undefined}
      >
        <Button
          className={`rounded-4xl! ios-button-spring ${isPressed ? "is-pressed" : ""} ${isReleasing ? "is-releasing" : ""} ${className ?? ""}`}
          onAnimationEnd={(e) => {
            if (e.animationName === "ios-spring-bounce") setIsReleasing(false);
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", sans-serif',
            fontWeight: 500,
            fontSize: 17,
            lineHeight: 1.2,
            height: 44,
            letterSpacing: "-0.01em",
            boxShadow: "0px 10px 20px 6px rgba(0,0,0,0.04)",
            backdropFilter: "blur(20px)",
            ...buttonStyle,
          }}
          {...props}
        >
          {children}
        </Button>
      </span>
    </ConfigProvider>
  );
}

export default GlassButton;
