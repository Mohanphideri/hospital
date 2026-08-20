import logo from "../../assets/heartstone-logo.png";

export default function HeartMark({ size = 40, className = "" }) {
  return (
    <img
      src={logo}
      alt="HeartStone Hospital"
      height={size}
      style={{ height: size, width: "auto" }}
      className={className}
    />
  );
}
