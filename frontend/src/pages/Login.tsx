import { useState } from "react";
import "./Login.css";

interface LoginProps {
  onSuccess?: () => void;
  onSwitchToSignUp?: () => void;
  onBack?: () => void;
}

export default function Login({ onSuccess, onSwitchToSignUp, onBack }: LoginProps) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (email.trim() === "") {
      alert("Enter your email.");
      return;
    }

    if (pass.trim() === "") {
      alert("Enter your password.");
      return;
    }

    // TODO(auth): check credentials with a real login before continuing
    onSuccess?.();
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

          {/* TODO(auth): connect to real login */}
          <button type="submit" className="login-button">
            Login
            <span className="login-arrow">↗</span>
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 14 }}>
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            style={{ textDecoration: "underline", cursor: "pointer", fontWeight: 700 }}
          >
            Sign up
          </button>
        </p>
        <button
          type="button"
          onClick={onBack}
          style={{ marginTop: 8, fontSize: 14, textDecoration: "underline", cursor: "pointer" }}
        >
          ← Back to home
        </button>
      </div>
    </div>
  );
}