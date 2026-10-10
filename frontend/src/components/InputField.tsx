
import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import styles from "./InputField.module.css";

export interface InputFieldProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, id, className = "", ...props }, ref) => {
    return (
      <div>
        {label && (
        <label htmlFor={id} className={styles.label}>
            {label}
        </label>
        )}

        <input
          ref={ref}
          id={id}
          className={`${styles.input} ${className}`}
          {...props}
        />
      </div>
    );
  }
);

InputField.displayName = "InputField";

export default InputField;
