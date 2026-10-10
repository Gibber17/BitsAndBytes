interface Props {
  onGetStarted: () => void; // go to the notes page
  onLogin: () => void;
  onSignUp: () => void;
}

export default function Landing({ onGetStarted, onLogin, onSignUp }: Props) {
  return (
    // TODO(style): full-page hero layout
    <div>
      <h1>BitsAndBytes</h1>
      <p>Turn handwritten notes into LaTeX, and find food near you.</p>

      {/* TODO(style): primary call-to-action button */}
      <button className="underline cursor-pointer" onClick={onGetStarted}>
        Get started
      </button>

      {/* TODO(style): secondary buttons */}
      <button className="underline cursor-pointer" onClick={onLogin}>
        Log in
      </button>
      <button className="underline cursor-pointer" onClick={onSignUp}>
        Sign up
      </button>

      {/* TODO(style): feature sections */}
      <section>
        <h2>Notes to LaTeX</h2>
        <p>Upload a photo of your handwritten notes and get editable LaTeX.</p>
      </section>
      <section>
        <h2>Find Food</h2>
        <p>Search restaurants near you by cuisine and price.</p>
      </section>
    </div>
  );
}