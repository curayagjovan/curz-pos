import { Button } from "antd";
import type { ButtonProps } from "antd";
import type { ReactNode } from "react";

function GlassButton({
  children,
  ...props
}: {
  children?: ReactNode;
} & ButtonProps) {
  return (
    <Button className="rounded-4xl!" {...props}>
      {children}
    </Button>
  );
}

export default GlassButton;
