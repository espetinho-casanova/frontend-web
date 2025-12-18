import React, { InputHTMLAttributes } from "react";
import styles from "./styles.module.scss";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Checkbox({ label, ...rest }: CheckboxProps) {
  return (
    <div className={styles.checkbox}>
              <input type="checkbox" {...rest} />
      <label>

        {label}
      </label>
    </div>
  );
}