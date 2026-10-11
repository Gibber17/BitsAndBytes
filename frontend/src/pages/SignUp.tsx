import { useState } from "react";
import "../styles/SignUp.css";
import Button from "../components/Button";
import InputField from "../components/InputField";
import { signInAccount, signUpAccount, type AuthUser } from "../lib/api";

interface Props {
  onSuccess: (user: AuthUser) => void;
  onShowLogin: () => void;
  onBack?: () => void;
}

export default function SignUp({ onSuccess, onShowLogin, onBack }: Props) {
  const [FName, SetFName] = useState("");
  const [LName, setLName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (FName.trim() === "" || LName.trim() === "") {
      setError("Enter your first and last name.");
      return;
    }

    if (email.trim() === "") {
      setError("Enter your email.");
      return;
    }

    if (pass.length < 8) {
      setError("Password needs to be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await signUpAccount({
        first_name: FName.trim(),
        last_name: LName.trim(),
        email: email.trim(),
        password: pass,
      });
      onSuccess(await signInAccount(email.trim(), pass));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-container">
      <div className="signup-left">
        <h2 className="signup-title">Sign up</h2>

        <form onSubmit={handleSignUp}>
          <InputField
            id="signup-FirstName"
            label="First Name"
            type="text"
            value={FName}
            onChange={(e) => SetFName(e.target.value)}
          />

          <InputField
            id="signup-LastName"
            label="Last Name"
            type="text"
            value={LName}
            onChange={(e) => setLName(e.target.value)}
          />

          <InputField
            id="signup-email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <InputField
            id="signup-password"
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
            {loading ? "Creating account..." : "Sign up"}
          </Button>

          <p className="auth-switch">
            Already have an account?{" "}
            <button type="button" onClick={onShowLogin}>
              Log in
            </button>
          </p>
        </form>

        {onBack && (
          <button type="button" className="auth-switch" onClick={onBack}>
            ← Back to home
          </button>
        )}
      </div>

      <div className="signup-pink-box"></div>
    </div>
  );
}