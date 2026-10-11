import { useState } from "react";
import "../styles/SignUp.css";
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
   // TODO(style): centered card / container
   <div className="signup-container">
     <div className="signup-left">
       <h2 className="signup-title">Sign up</h2>


       <form onSubmit={handleSignUp}>
         <label htmlFor="signup-FirstName" className="signup-label">
           First Name
         </label>


         <input
           id="signup-FirstName"
           type="text"
           className="signup-input"
           value={FName}
           onChange={(e) => SetFName(e.target.value)}
         />


         <label htmlFor="signup-LastName" className="signup-label">
           Last Name
         </label>


         <input
           id="signup-LastName"
           type="text"
           className="signup-input"
           value={LName}
           onChange={(e) => setLName(e.target.value)}
         />


         <label htmlFor="signup-email" className="signup-label">
           Email
         </label>


         <input
           id="signup-email"
           type="email"
           className="signup-input"
           value={email}
           onChange={(e) => setEmail(e.target.value)}
         />


         <label htmlFor="signup-password" className="signup-label">
           Password
         </label>


         <input
           id="signup-password"
           type="password"
           className="signup-input"
           value={pass}
           onChange={(e) => setPass(e.target.value)}
         />


         {error && (
           <p role="alert" className="auth-error">
             {error}
           </p>
         )}


         <button type="submit" className="signup-button" disabled={loading}>
           {loading ? "Creating account..." : "Sign up"}
           <span className="signup-arrow">↗</span>
         </button>


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


       <img
         src="/images/knight-moon.jpg"
         alt="Knight moon"
         className="signup-box-image"
         />
        
   </div>
 );
}
