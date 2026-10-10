export default function Login() {
  return (
    // TODO(style): centered card / container
    <div>
      <h2>Log in</h2>
      <form onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="login-email">Email</label>
        <input id="login-email" type="email" />

        <label htmlFor="login-password">Password</label>
        <input id="login-password" type="password" />

        {/* TODO(auth): connect to real login */}
        <button type="submit">Log in</button>
      </form>
    </div>
  );
}