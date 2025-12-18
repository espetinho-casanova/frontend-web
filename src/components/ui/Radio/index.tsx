import React, { InputHTMLAttributes } from "react";
import styles from "./styles.module.scss";

interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Radio({ label, ...rest }: RadioProps) {
  return (
    <div className={styles["radio-container"]}>
      <input type="radio" {...rest} />
      <label>{label}</label>
    </div>
  );
}