import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
const buttonVariants = cva("ui-button", {
  variants: {
    variant: {
      default: "ui-primary",
      outline: "ui-outline"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});
export function Button({
  asChild = false,
  variant,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & {
  asChild?: boolean;
}) {
  const Component = asChild ? Slot : "button";
  return <Component className={buttonVariants({
    variant,
    className
  })} {...props} />;
}
