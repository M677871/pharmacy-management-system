import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import departmentService from "../../services/department.service.js";
import LoadingSpinner from "../../components/ui/LoadingSpinner.jsx";
import ErrorMessage from "../../components/ui/ErrorMessage.jsx";
import { useApi } from "../../hooks/useApi.js";
import "./DepartmentList.css";

const DepartmentList = () => {
  const [departments, setDepartments] = useState([]);
  const { loading, error, execute, clearError } = useApi();

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    await execute(
      () => departmentService.getDepartments(),
      (data) => setDepartments(data)
    );
  };

  const handleDelete = async (id, departmentName) => {
    if (window.confirm(`Are you sure you want to delete "${departmentName}"?`)) {
      try {
        await execute(() => departmentService.deleteDepartment(id));
        await loadDepartments(); // Reload the list after deletion
      } catch (error) {
        console.error('Failed to delete department:', error);
      }
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading departments..." />;
  }

  return (
    <div className="departments-list-container">
      <div className="page-header">
        <h1>Departments Management</h1>
        <Link to="/departments/new" className="btn btn-primary">
          Add New Department
        </Link>
      </div>

      <ErrorMessage 
        message={error} 
        onRetry={loadDepartments} 
        onDismiss={clearError} 
      />

      {departments.length === 0 ? (
        <div className="empty-state">
          <p>No departments found.</p>
          <Link to="/departments/new" className="btn btn-primary">
            Create your first department
          </Link>
        </div>
      ) : (
        <div className="table-container">
          <table className="departments-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((department) => (
                <tr key={department.id}>
                  <td>{department.id}</td>
                  <td>{department.name}</td>
                  <td>{department.description || "No description"}</td>
                  <td className="actions">
                    <Link 
                      to={`/departments/${department.id}/edit`} 
                      className="btn btn-secondary btn-sm"
                    >
                      Edit
                    </Link>
                    <button 
                      onClick={() => handleDelete(department.id, department.name)}
                      className="btn btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DepartmentList;