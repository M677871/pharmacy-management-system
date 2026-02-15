const BASE = "http://localhost:3001/clients";


const getClients = async () => {
    const response = await fetch(BASE);
    return await response.json();
}

const getClient = async (id) => {
    const response = await fetch(`${BASE}/${id}`);
    return await response.json();
}

const saveclient = async (client, id) =>
{
    await fetch(id ? `${BASE}/${id}` : BASE, {
        method: id ? "PUT" :"POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(client)
    });
}

const deleteClient = async (id) =>
{
    await fetch(`${BASE}/${id}`, {
        method: "DELETE"
    });
}

export default {
    getClients,
    getClient,
    saveclient,
    deleteClient
}