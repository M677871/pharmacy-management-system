import { useState } from "react";

const BmiCalculator = () => {
    const [weight, setWeight] = useState(0);
    const [height, setHeight] = useState(0);
    const [bmi, setBmi] = useState("");

    const calculateBmi = () => {
        if (height > 0) {
            const heightInMeters = height / 100;
            const bmiValue = (weight / (heightInMeters * heightInMeters)).toFixed(2);
            setBmi(bmiValue)
        }
    };

    return (
        <>
            <h1>BMI Calculator</h1>
            <input
                type="number"
                placeholder="Weight (kg)"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
            />
            <input
                type="number"
                placeholder="Height (cm)"
                value= {height}
                onChange={(e) => setHeight(e.target.value)}
            />
            <label>
                 {bmi !== null && bmi < 18 ? `your bmi is ${bmi} and underwight` : bmi >=18 && bmi < 24 ? `your bmi is ${bmi} and normal weight` :
                bmi >=24 && bmi < 30 ? `your bmi is ${bmi} and overweight` :
                bmi >=30 ? `your bmi is ${bmi} and obese` : ""} 

            </label>
           
            <button onClick={calculateBmi}>Calculate BMI</button>
            </>
    );
}
export default BmiCalculator;
