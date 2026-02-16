import { Link } from "react-router-dom";
import "./Home.css";

const Home = () => {
  return (
    <div className="home-container">
      <div className="hero-section">
        <h1 className="hero-title">CSIS-279 Management System</h1>
        <p className="hero-subtitle">
          Welcome to our modern client and department management system. 
          Efficiently manage your organization's structure with clean CRUD operations.
        </p>
      </div>

      <div className="features-section">
        <h2>Available Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>👥 Client Management</h3>
            <p>Add, edit, view, and delete clients. Assign clients to departments for better organization.</p>
            <div className="feature-actions">
              <Link to="/clients" className="btn btn-primary">
                View Clients
              </Link>
              <Link to="/clients/new" className="btn btn-secondary">
                Add Client
              </Link>
            </div>
          </div>

          <div className="feature-card">
            <h3>🏢 Department Management</h3>
            <p>Manage organizational departments. Create and maintain department hierarchy and information.</p>
            <div className="feature-actions">
              <Link to="/departments" className="btn btn-primary">
                View Departments
              </Link>
              <Link to="/departments/new" className="btn btn-secondary">
                Add Department
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h2>System Features</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-icon">⚡</span>
            <h4>Fast & Responsive</h4>
            <p>Built with React for smooth user experience</p>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🔒</span>
            <h4>Secure API</h4>
            <p>RESTful API with proper error handling</p>
          </div>
          <div className="stat-item">
            <span className="stat-icon">📱</span>
            <h4>Mobile Friendly</h4>
            <p>Responsive design works on all devices</p>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🎨</span>
            <h4>Modern UI</h4>
            <p>Clean and intuitive user interface</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;