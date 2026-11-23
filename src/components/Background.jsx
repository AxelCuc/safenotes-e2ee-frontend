// Fondo abstracto y sutil: resplandores naranja desenfocados, anillos que giran muy despacio y grano.
export default function Background() {
  return (
    <div className="bg" aria-hidden="true">
      <div className="blob b1" />
      <div className="blob b2" />
      <svg className="rings" viewBox="0 0 800 800" fill="none">
        <circle cx="400" cy="400" r="380" stroke="#ff6a00" strokeWidth="1.2" strokeDasharray="2 14" />
        <circle cx="400" cy="400" r="290" stroke="#ff6a00" strokeWidth="1.2" strokeDasharray="90 40" />
        <circle cx="400" cy="400" r="190" stroke="#ff6a00" strokeWidth="1.2" strokeDasharray="1 9" />
        <circle cx="400" cy="400" r="95" stroke="#ff6a00" strokeWidth="1.2" />
      </svg>
      <div className="grain" />
    </div>
  );
}
