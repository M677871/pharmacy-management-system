import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import clientService from "../../services/client.service.js";
import LoadingSpinner from "../../components/ui/LoadingSpinner.jsx";
import ErrorMessage from "../../components/ui/ErrorMessage.jsx";
import { useApi } from "../../hooks/useApi.js";
import "./ClientList.css";

const ClientsList = () => {
  const [clients, setClients] = useState([]);
  const { loading, error, execute, clearError } = useApi();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    await execute(
      () => clientService.getClients(),
      (data) => setClients(data)
    );
  };

  const handleDelete = async (id, clientName) => {
    if (window.confirm(`Are you sure you want to delete "${clientName}"?`)) {
      try {
        await execute(() => clientService.deleteClient(id));
        await loadClients(); // Reload the list after deletion
      } catch (error) {
        console.error('Failed to delete client:', error);
      }
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading clients..." />;
  }

  return (
    <div className="clients-list-container">
      <div className="page-header">
        <h1>Clients Management</h1>
        <Link to="/clients/new" className="btn btn-primary">
          Add New Client
        </Link>
      </div>

      <ErrorMessage 
        message={error} 
        onRetry={loadClients} 
        onDismiss={clearError} 
      />

      {clients.length === 0 ? (
        <div className="empty-state">
          <p>No clients found.</p>
          <Link to="/clients/new" className="btn btn-primary">
            Create your first client
          </Link>
        </div>
      ) : (
        <div className="table-container">
          <table className="clients-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>{client.id}</td>
                  <td>{client.name}</td>
                  <td>{client.email}</td>
                  <td>{client.department_name || "No Department"}</td>
                  <td className="actions">
                    <Link 
                      to={`/clients/${client.id}/edit`} 
                      className="btn btn-secondary btn-sm"
                    >
                      Edit
                    </Link>
                    <button 
                      onClick={() => handleDelete(client.id, client.name)}
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

export default ClientsList;