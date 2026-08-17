import logo from "../assets/heartstone-logo.png";

// The official HeartStone Hospital mark (heart + cross + "H" monogram).
// Used everywhere the brand mark appears: navbar, sidebar/dashboards,
// footer, login, book-appointment, emergency page, and staff messages.
// `size` sets the rendered height in px; width follows the image's own
// aspect ratio automatically so the mark never looks squashed.
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
