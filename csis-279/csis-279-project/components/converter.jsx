import { useState } from "react";

const Converter = () => {
  const [miles, setMiles] = useState("");
  const [km, setKm] = useState("");

  const handleMilesChange = (value) => {
    setMiles(value);
    setKm(value ? (value * 1.609).toFixed(2) : "");
  };

  const handleKmChange = (value) => {
    setKm(value);
    setMiles(value ? (value / 1.609).toFixed(2) : "");
  };

  return (
    <>
      <h1>Miles to Kilometers</h1>

      <input
        type="number"
        placeholder="Miles"
        value={miles}
        onChange={(e) => handleMilesChange(e.target.value)}
      />

      <input
        type="number"
        placeholder="Kilometers"
        value={km}
        onChange={(e) => handleKmChange(e.target.value)}
      />
    </>
  );
}

export default Converter;
