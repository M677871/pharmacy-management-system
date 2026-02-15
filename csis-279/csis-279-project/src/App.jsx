// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'

// import Converter from '../components/converter.jsx'
// import TempConverter from '../components/tempconverter.jsx'
// import WeightConverter from '../components/weightConverter.jsx'
// import BmiCalculator  from '../components/bmiCalculator.jsx'
// import Calculator from '../components/calculator.jsx'
// import Clients from '../components/clients.jsx'
// import Department from '../components/department.jsx'

import './App.css'
import {Route, Routes} from 'react-router-dom'
import Layout from './components/layout/layout'
import { routes } from './routes/routes'


function App() {
  
return (
  <>
    <Layout>
      <Routes>
        {routes.map(({ path, element: Page }) => (
          <Route key={path} path={path} element={<Page />} />
        ))}
      </Routes>
    </Layout>
  </>
);
   
}

export default App;
