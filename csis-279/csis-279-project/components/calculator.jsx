import { useState } from 'react'

const Calculator = () => {
  const [display, setDisplay] = useState("")

  const handleClick = (value) => {
    setDisplay(display + value)
  }

  const clearDisplay = () => {
    setDisplay("")
  }

  const calculateResult = () => {
    try {
      setDisplay(eval(display))
    } catch {
      setDisplay("Error")
    }
  }

  return (
    <>
   <input
  id="calculator-display"
  name="calculatorDisplay"
  type="text"
  value={display}
  readOnly
/>


      <table>
        <tbody>
          <tr>
            <td><button onClick={() => handleClick("7")}>7</button></td>
            <td><button onClick={() => handleClick("8")}>8</button></td>
            <td><button onClick={() => handleClick("9")}>9</button></td>
            <td><button onClick={() => handleClick("/")}>/</button></td>
          </tr>
          <tr>
            <td><button onClick={() => handleClick("4")}>4</button></td>
            <td><button onClick={() => handleClick("5")}>5</button></td>
            <td><button onClick={() => handleClick("6")}>6</button></td>
            <td><button onClick={() => handleClick("*")}>*</button></td>
          </tr>
          <tr>
            <td><button onClick={() => handleClick("1")}>1</button></td>
            <td><button onClick={() => handleClick("2")}>2</button></td>
            <td><button onClick={() => handleClick("3")}>3</button></td>
            <td><button onClick={() => handleClick("-")}>-</button></td>
          </tr>
          <tr>
            <td><button onClick={() => handleClick("0")}>0</button></td>
            <td><button onClick={() => handleClick(".")}>.</button></td>
            <td><button onClick={calculateResult}>=</button></td>
            <td><button onClick={() => handleClick("+")}>+</button></td>
          </tr>
          <tr>
            <td >
              <button onClick={clearDisplay}>C</button>
            </td>
          </tr>
        </tbody>
      </table>
    </>
  )
}

export default Calculator
