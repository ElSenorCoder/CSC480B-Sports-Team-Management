import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TextInput } from "../ui/TextInput";
import { login } from "../../lib/auth/authApi";
import { tokenStorage } from "../../lib/auth/tokenStorage";

type FormErrors = {
  identifier?: string;
  password?: string;
  form?: string;
};

const EmailIcon = () => (
  <span className="input-icon" aria-hidden="true">
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path
        d="M3 5.5 10 11l7-5.5M4.5 16h11A1.5 1.5 0 0 0 17 14.5v-9A1.5 1.5 0 0 0 15.5 4h-11A1.5 1.5 0 0 0 3 5.5v9A1.5 1.5 0 0 0 4.5 16Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

export function LoginForm() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  function validate() {
    const nextErrors: FormErrors = {};

    if (!identifier.trim()) {
      nextErrors.identifier = "Enter your username or email address.";
    }

    if (!password) {
      nextErrors.password = "Enter your password.";
    } else if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await login({ identifier: identifier.trim(), password });
      tokenStorage.set(response.token);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setErrors({
        form:
          error instanceof Error
            ? error.message
            : "Unable to sign in. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
      <TextInput
        id="identifier"
        name="identifier"
        type="text"
        label="Username or email"
        inputMode="email"
        autoComplete="username"
        placeholder="name@team.com"
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
        error={errors.identifier}
        suffix={<EmailIcon />}
      />

      <TextInput
        id="password"
        name="password"
        type={showPassword ? "text" : "password"}
        label="Password"
        autoComplete="current-password"
        placeholder="Enter your password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={errors.password}
        suffix={
          <button
            className="password-toggle"
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            <svg width="19" height="19" viewBox="0 0 20 20" fill="none">
              <path
                d="M2.4 10s2.7-4.5 7.6-4.5 7.6 4.5 7.6 4.5-2.7 4.5-7.6 4.5S2.4 10 2.4 10Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        }
      />

      {errors.form ? (
        <p className="form-error" role="alert">
          {errors.form}
        </p>
      ) : null}

      <button className="submit-button" type="submit" disabled={isSubmitting}>
        <span>{isSubmitting ? "Signing in…" : "Sign in to workspace"}</span>
        <span className="button-arrow" aria-hidden="true">→</span>
      </button>
    </form>
  );
}
