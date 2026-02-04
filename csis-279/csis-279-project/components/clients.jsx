import { useEffect, useState } from "react";

const Clients = () => {
const [clients, setClients] = useState([]);
const [form, setForm] = useState({name : "", email : ""})
const [editngId, setEditingId] = useState(null);


const API = "http://localhost:3001/clients";

useEffect(() =>
{
  loadClients();
}, []);

const loadClients = async() =>
{
  const res = await fetch(API);
  const data = await res.json();
  setClients(data)
}

const clear = () =>
{
  setForm({name: "", email: ""});
  setEditingId(null);
}

const handleEdit = (client) =>
{
  setForm({ name: client.name, email: client.email });
  setEditingId(client.id);
}
const handleDelete =async (id) =>
{
  await fetch(`${API}/${id}`, {method: "DELETE"});
  loadClients();
}

const handleSubmit = async (e) =>
{
  e.preventDefault();
  if(editngId)
  {
    await fetch(`${API}/${editngId}`,{
        method: "PUT",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(form)
       })
  }
  else{
    await fetch(`${API}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
  }

  clear()
  loadClients()
}

  return (
    <>
      <h3>Clients</h3>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={form.name}
          placeholder="name"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        <input
          type="text"
          value={form.email}
          placeholder="email"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />

        <button type="submit">{!editngId ? "add" : "update"}</button>

        <button onClick={clear}>clear</button>
      </form>


      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>ID</th>
            <th>NAME</th>
            <th>EMAIL</th>
            <td colSpan={2}>ACTIONS</td>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.name}</td>
              <td>{c.email}</td>
              <td>
                <button onClick={() => handleEdit(c)}>update</button>
              </td>
              <td>
                <button onClick={() => handleDelete(c.id)}>delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

export default Clients;
