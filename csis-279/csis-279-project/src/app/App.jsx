import { Route, Routes } from "react-router-dom"
import Layout from "../components/layout/Layout"
import { routes } from "./routes"

function App() {

  return (
    <Layout>
      <Routes>
        {routes.map(({ path, element: Page }) => (
          <Route key={path} path={path} element={<Page />} />
        ))}
      </Routes>
    </Layout>
  )
}

export default App