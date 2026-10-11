import { useState } from "react";
import "../styles/Login.css";
import Button from "../components/Button";
import InputField from "../components/InputField";
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
    <div className="login-container">
      <div className="login-left">
        <h2 className="login-title">Login</h2>

        <form onSubmit={handleLogin}>
          <InputField
            id="login-email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <InputField
            id="login-password"
            label="Password"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />

          {error && (
            <p role="alert" className="auth-error">
              {error}
            </p>
          )}

          <Button type="submit" showArrow disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </Button>

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