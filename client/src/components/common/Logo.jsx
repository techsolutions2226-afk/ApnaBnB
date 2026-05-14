import logoImg from "../../assets/images/logo.png";

export default function Logo({ size = 32, alt = "apnabnb" }) {
  return (
    <img
      src={logoImg}
      alt={alt}
      style={{ height: size, width: "auto", objectFit: "contain", display: "block" }}
    />
  );
}
