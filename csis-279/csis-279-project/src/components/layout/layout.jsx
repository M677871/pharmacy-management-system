import NavBar from "./NavBar";
import "./Layout.css";

const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <NavBar />
      <main className="main-content">{children}</main>
      <footer className="footer">
        <p>&copy; 2026 CSIS-279 Project. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Layout;