import { useState } from "react";

const WeightConverter = () => {
  const [pounds, setPounds] = useState("");
  const [kilograms, setKilograms] = useState("");

  const handlePoundsChange = (value) => {
    setPounds(value);
    setKilograms(value ? (value / 2.20462).toFixed(2) : "");
  };

  const handleKgChange = (value) => {
    setKilograms(value);
    setPounds(value ? (value * 2.20462).toFixed(2) : "");
  };

  return (
    <>
      <h1>Pounds to Kilograms</h1>

      <input
        type="number"
        placeholder="Pounds (lbs)"
        value={pounds}
        onChange={(e) => handlePoundsChange(e.target.value)}
      />

      <input
        type="number"
        placeholder="Kilograms (kg)"
        value={kilograms}
        onChange={(e) => handleKgChange(e.target.value)}
      />
    </>
  );
};

export default WeightConverter;