import { NavLink } from "react-router-dom"

const NavBar = () => {
    return(
        <>
            <nav className="nav">
                <NavLink to="/">Home</NavLink>
                <NavLink to="/about">About</NavLink>
                <NavLink to="/clients">Clients</NavLink>
                <NavLink to="/departements">Departements</NavLink>
            </nav>
        </>
    )
}

export default NavBar