import { useState } from "react";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  function handleLogin(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault();

    if(email.trim() === ""){
      alert("Enter your email.");
      return;
    }

    if(pass.trim() === ""){
      alert("Enter your password.");
      return;
    }
  }

  return (
    // TODO(style): centered card / container
    <div className="login-container">
      <div className="login-left">
        <h2 className= "login-title">Login</h2>

        <form onSubmit={handleLogin}>

          <label 
            htmlFor="login-email"
            className="login-label"
          >
          Email
          </label>
          
          <input 
          id="login-email" 
          type="email"
          className="login-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)} />

          <label 
            htmlFor="login-password"
            className="login-label"
          >
          Password
          </label>
          
          <input 
          id="login-password" 
          type="password"
          className="login-input"
          value={pass}
          onChange={(e) => setPass(e.target.value)} />

          {/* TODO(auth): connect to real login */}
          <button type="submit" className="login-button">
            Login
            <span className="login-arrow">↗</span>
          </button>
      </form>
    </div>
  </div>
  );
}