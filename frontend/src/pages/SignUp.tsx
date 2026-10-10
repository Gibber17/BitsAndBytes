export default function SignUp() {
  return (
    // TODO(style): centered card / container
    <div>
      <h2>Sign up</h2>
      <form onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="signup-email">Email</label>
        <input id="signup-email" type="email" />

        <label htmlFor="signup-password">Password</label>
        <input id="signup-password" type="password" />

        <label htmlFor="signup-confirm">Confirm password</label>
        <input id="signup-confirm" type="password" />

        {/* TODO(auth): connect to real sign up */}
        <button type="submit">Sign up</button>
      </form>
    </div>
  );
}