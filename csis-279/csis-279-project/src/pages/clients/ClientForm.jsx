import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import clientService from "../../services/client.service.js";
import departmentService from "../../services/department.service.js";
import LoadingSpinner from "../../components/ui/LoadingSpinner.jsx";
import ErrorMessage from "../../components/ui/ErrorMessage.jsx";
import { useApi } from "../../hooks/useApi.js";
import "./ClientForm.css";

const ClientForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    department_id: "",
  });

  const { loading, error, execute, clearError } = useApi();

  useEffect(() => {
    loadDepartments();
    if (isEdit) {
      loadClient();
    }
  }, [id]);

  const loadDepartments = async () => {
    try {
      await execute(
        () => departmentService.getDepartments(),
        (data) => setDepartments(data)
      );
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const loadClient = async () => {
    try {
      await execute(
        () => clientService.getClient(id),
        (client) => {
          setForm({
            name: client.name || "",
            email: client.email || "",
            department_id: client.department_id || "",
          });
        }
      );
    } catch (error) {
      console.error('Failed to load client:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      department_id: form.department_id === "" ? null : Number(form.department_id),
    };

    try {
      await execute(() => clientService.saveClient(payload, id));
      navigate('/clients');
    } catch (error) {
      console.error('Failed to save client:', error);
    }
  };

  if (loading && !departments.length) {
    return <LoadingSpinner message={isEdit ? "Loading client..." : "Loading form..."} />;
  }

  return (
    <div className="client-form-container">
      <div className="page-header">
        <h1>{isEdit ? "Edit Client" : "Add New Client"}</h1>
        <Link to="/clients" className="btn btn-secondary">
          Back to Clients
        </Link>
      </div>

      <ErrorMessage 
        message={error} 
        onDismiss={clearError} 
      />

      <div className="form-container">
        <form onSubmit={handleSubmit} className="client-form">
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={form.name}
              onChange={handleInputChange}
              required
              disabled={loading}
              placeholder="Enter client name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleInputChange}
              required
              disabled={loading}
              placeholder="Enter email address"
            />
          </div>

          <div className="form-group">
            <label htmlFor="department_id">Department</label>
            <select
              id="department_id"
              name="department_id"
              value={form.department_id}
              onChange={handleInputChange}
              disabled={loading}
            >
              <option value="">Select Department (Optional)</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : (isEdit ? 'Update Client' : 'Create Client')}
            </button>
            <Link to="/clients" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientForm;