import { useState } from "react";
import "../SignUp.css";

export default function SignUp() {
  const [FName, SetFName] = useState("");
  const [LName, setLName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  function handleSignUp(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault();
  
    if(FName.trim() === "" || LName.trim() === ""){
      alert("Enter your first and last name.");
      return;
    }

    if(email.trim() === ""){
      alert("Enter your email");
      return;
    }

    if(pass.length < 8){
      alert("Password needs to be at least 8 characters");
      return;
    }

  }

  return (
    // TODO(style): centered card / container
    <div className="signup-container">
      <div className="signup-left">
        <h2 className= "signup-title">Sign up</h2>

        <form onSubmit={handleSignUp}>
          <label 
            htmlFor="signup-FirstName"
            className="signup-label"
          >
          First Name
          </label>

          <input 
          id="signup-FirstName" 
          type="text"
          className="signup-input"
          value={FName}
          onChange={(e) => SetFName(e.target.value)} />

          <label 
            htmlFor="signup-LastName"
            className="signup-label"
          >
          Last Name
          </label>
          
          <input 
          id="signup-LastName" 
          type="text"
          className="signup-input"
          value={LName}
          onChange={(e) => setLName(e.target.value)} />

          <label 
            htmlFor="signup-email"
            className="signup-label"
          >
          Email
          </label>
          
          <input 
          id="signup-email" 
          type="email"
          className="signup-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)} />

          <label 
            htmlFor="signup-password"
            className="signup-label"
          >
          Password
          </label>
          
          <input 
          id="signup-password" 
          type="password"
          className="signup-input"
          value={pass}
          onChange={(e) => setPass(e.target.value)} />

          {/* TODO(auth): connect to real sign up */}
          <button type="submit" className="signup-button">
            Sign up
            <span className="signup-arrow">↗</span>
          </button>
      </form>
    </div>

    <div className="signup-pink-box"></div>

  </div>
  );
}