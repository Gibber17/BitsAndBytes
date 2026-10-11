import { useState } from "react";
import "./Login.css";
import { signInAccount, type AuthUser } from "../lib/api";

interface Props {
  onSuccess: (user: AuthUser) => void;
  onShowSignup: () => void;
  onBack?: () => void;
}

export default function Login({ onSuccess, onShowSignup, onBack }: Props) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (email.trim() === "") {
      setError("Enter your email.");
      return;
    }

    if (pass.trim() === "") {
      setError("Enter your password.");
      return;
    }

    setLoading(true);
    try {
      onSuccess(await signInAccount(email.trim(), pass));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    // TODO(style): centered card / container
    <div className="login-container">
      <div className="login-left">
        <h2 className="login-title">Login</h2>

        <form onSubmit={handleLogin}>
          <label htmlFor="login-email" className="login-label">
            Email
          </label>

          <input
            id="login-email"
            type="email"
            className="login-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label htmlFor="login-password" className="login-label">
            Password
          </label>

          <input
            id="login-password"
            type="password"
            className="login-input"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />

          {error && (
            <p role="alert" className="auth-error">
              {error}
            </p>
          )}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
            <span className="login-arrow">↗</span>
          </button>

          <p className="auth-switch">
            Don&apos;t have an account?{" "}
            <button type="button" onClick={onShowSignup}>
              Sign up
            </button>
          </p>
        </form>

        {onBack && (
          <button type="button" className="auth-switch" onClick={onBack}>
            ← Back to home
          </button>
        )}
      </div>
    </div>
  );
}