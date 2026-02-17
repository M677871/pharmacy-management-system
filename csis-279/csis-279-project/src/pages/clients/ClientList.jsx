import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteClient, getClients } from "../../services/client.service";

const ClientList = () => {
    const [clients, setClients] = useState([]);

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        const data = await getClients();
        setClients(data)
    }

    const handleDelete = async (id) => {
        await deleteClient(id);
        loadClients();
    }

    return (
        <>
            <h3>Client List</h3>
            <Link to="/clients/new">Create</Link>
            <table border="1" cellPadding="8">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>NAME</th>
                        <th>EMAIL</th>
                        <th>DEPARTMENT</th>
                        <th colSpan={2}>ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    {
                        clients.map(client => (
                            <tr key={client.id}>
                                <td>{client.id}</td>
                                <td>{client.name}</td>
                                <td>{client.email}</td>
                                <td>{client.department_name || "No Department"}</td>
                                <td><Link to={`/clients/${client.id}/edit`}>Edit</Link></td>
                                <td><button onClick={() => handleDelete(client.id)}>Delete</button></td>
                            </tr>
                        ))
                    }
                </tbody>
            </table>
        </>
    )
}

export default ClientList;