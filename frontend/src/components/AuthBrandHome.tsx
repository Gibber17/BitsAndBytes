interface Props {
  onHome: () => void;
}

export default function AuthBrandHome({ onHome }: Props) {
  return (
    <button
      type="button"
      onClick={onHome}
      aria-label="Knight Study Space home"
      className="absolute left-6 top-6 z-10 flex cursor-pointer items-center gap-3 text-left text-[#3E1230]"
    >
      <span className="relative h-12 w-12 flex-none overflow-hidden rounded-2xl bg-[#E2D2F9]">
        <img
          src="/images/knight-moon.jpg"
          alt=""
          className="absolute left-[-84px] top-[-45px] w-[220px] max-w-none"
        />
      </span>
      <span className="font-['League_Spartan'] text-[22px] font-bold leading-none">
        Knight
        <br />
        Study Space
      </span>
    </button>
  );
}
