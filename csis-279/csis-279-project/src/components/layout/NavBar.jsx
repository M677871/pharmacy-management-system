import { NavLink } from "react-router-dom";
import "./NavBar.css";

const NavBar = () => {
  return (
    <nav className="navbar">
      <div className="nav-brand">
        <NavLink to="/" className="brand-link">CSIS-279</NavLink>
      </div>
      <div className="nav-links">
        <NavLink to="/" className="nav-link">Home</NavLink>
        <NavLink to="/about" className="nav-link">About</NavLink>
        <NavLink to="/clients" className="nav-link">Clients</NavLink>
        <NavLink to="/departments" className="nav-link">Departments</NavLink>
      </div>
    </nav>
  );
};

export default NavBar;