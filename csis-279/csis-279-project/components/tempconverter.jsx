import { useState } from "react";

const TempConverter = () => {
  const [fahrenheit, setFahrenheit] = useState("");
  const [celsius, setCelsius] = useState("");

  const handleFChange = (value) => {
    setFahrenheit(value);
    setCelsius(value ? ((value - 32) * 5 / 9).toFixed(2) : "");
  };

  const handleCChange = (value) => {
    setCelsius(value);
    setFahrenheit(value ? ((value * 9) / 5 + 32).toFixed(2) : "");
  };

  return (
    <>
      <h1>Fahrenheit to Celsius</h1>

      <input
        type="number"
        placeholder="Fahrenheit"
        value={fahrenheit}
        onChange={(e) => handleFChange(e.target.value)}
      />

      <input
        type="number"
        placeholder="Celsius"
        value={celsius}
        onChange={(e) => handleCChange(e.target.value)}
      />
    </>
  );
}

export default TempConverter;
