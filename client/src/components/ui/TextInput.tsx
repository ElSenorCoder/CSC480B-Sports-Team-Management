import type { InputHTMLAttributes, ReactNode } from "react";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  labelAction?: ReactNode;
  suffix?: ReactNode;
};

export function TextInput({
  label,
  error,
  labelAction,
  suffix,
  id,
  ...inputProps
}: TextInputProps) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="form-field">
      <div className="field-header">
        <label htmlFor={id}>{label}</label>
        {labelAction}
      </div>
      <div className="input-wrap">
        <input
          {...inputProps}
          id={id}
          className="form-input"
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
        />
        {suffix}
      </div>
      {error ? (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
