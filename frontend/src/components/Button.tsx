
import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import styles from "./button.module.css";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "light" | "link";  buttonSize?: "small" | "medium" | "large";
  fullWidth?: boolean;
  showArrow?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      variant = "primary",
      buttonSize = "medium",
      fullWidth = false,
      showArrow = false,
      type = "button",
      ...props
    },
    ref
  ) => {
    const buttonClasses = [
      styles.button,
      styles[variant],
      styles[buttonSize],
      fullWidth ? styles.fullWidth : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        type={type}
        className={buttonClasses}
        {...props}
      >
        {children}

        {showArrow && (
          <span className={styles.arrow} aria-hidden="true">
            ↗
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
