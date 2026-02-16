import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import departmentService from "../../services/department.service.js";
import LoadingSpinner from "../../components/ui/LoadingSpinner.jsx";
import ErrorMessage from "../../components/ui/ErrorMessage.jsx";
import { useApi } from "../../hooks/useApi.js";
import "./DepartmentForm.css";

const DepartmentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  
  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const { loading, error, execute, clearError } = useApi();

  useEffect(() => {
    if (isEdit) {
      loadDepartment();
    }
  }, [id]);

  const loadDepartment = async () => {
    try {
      await execute(
        () => departmentService.getDepartment(id),
        (department) => {
          setForm({
            name: department.name || "",
            description: department.description || "",
          });
        }
      );
    } catch (error) {
      console.error('Failed to load department:', error);
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
      description: form.description.trim(),
    };

    try {
      await execute(() => departmentService.saveDepartment(payload, id));
      navigate('/departments');
    } catch (error) {
      console.error('Failed to save department:', error);
    }
  };

  if (loading && isEdit && !form.name) {
    return <LoadingSpinner message="Loading department..." />;
  }

  return (
    <div className="department-form-container">
      <div className="page-header">
        <h1>{isEdit ? "Edit Department" : "Add New Department"}</h1>
        <Link to="/departments" className="btn btn-secondary">
          Back to Departments
        </Link>
      </div>

      <ErrorMessage 
        message={error} 
        onDismiss={clearError} 
      />

      <div className="form-container">
        <form onSubmit={handleSubmit} className="department-form">
          <div className="form-group">
            <label htmlFor="name">Department Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={form.name}
              onChange={handleInputChange}
              required
              disabled={loading}
              placeholder="Enter department name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleInputChange}
              required
              disabled={loading}
              placeholder="Enter department description"
              rows="4"
            />
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : (isEdit ? 'Update Department' : 'Create Department')}
            </button>
            <Link to="/departments" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepartmentForm;