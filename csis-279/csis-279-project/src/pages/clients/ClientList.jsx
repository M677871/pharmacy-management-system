import { useState, useEffect, use } from "react";

const ClientsList = () => {
  const [clients, setClients] = useState([]);
  const API = "http://localhost:3001/clients";

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const res = await fetch(API);
    const data = await res.json();
    setClients(data);
  };
  const handleDelete = async (id) => {
    await fetch(`${API}/${id}`, { method: "DELETE" });
    loadClients();
  };

    return (
        <>
        <h1>Clients List</h1>
        <table border={1} cellPadding={5} cellSpacing={0}>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {clients.map((client) => (
                    <tr key={client.id}>
                        <td>{client.name}</td>
                        <td>{client.email}</td>
                        <td>{client.department?.name || "N/A"}</td>
                        <td>
                            <button onClick={() => handleDelete(client.id)}>
                                Delete
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        </>
    )
}
export default ClientsList;