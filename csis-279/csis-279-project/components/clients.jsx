import { useEffect, useState } from "react";

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    department_id: "",
  });
  const [editngId, setEditingId] = useState(null);

  const API = "http://localhost:3001/clients";
  const DEPT_API = "http://localhost:3001/department";

  useEffect(() => {
    loadClients();
    loadDepartments();
  }, []);

  const loadClients = async () => {
    const res = await fetch(API);
    const data = await res.json();
    setClients(data);
  };

  const loadDepartments = async () => {
    const res = await fetch(DEPT_API);
    const data = await res.json();
    setDepartments(data);
  };

  const clear = () => {
    setForm({ name: "", email: "", department_id: "" });
    setEditingId(null);
  };

  const handleEdit = (client) => {
    setForm({
      name: client.name,
      email: client.email,
      department_id: client.department_id ?? "",
    });
    setEditingId(client.id);
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/${id}`, { method: "DELETE" });
    loadClients();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      department_id:
        form.department_id === "" ? null : Number(form.department_id),
    };

    if (editngId) {
      await fetch(`${API}/${editngId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    clear();
    loadClients();
  };

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

        {/* Department dropdown */}
        <select
          value={form.department_id}
          onChange={(e) =>
            setForm({ ...form, department_id: e.target.value })
          }
        >
          <option value="">-- Select Department --</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <button type="submit">{!editngId ? "add" : "update"}</button>
        <button type="button" onClick={clear}>
          clear
        </button>
      </form>

      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>ID</th>
            <th>NAME</th>
            <th>EMAIL</th>
            <th>DEPARTMENT</th>
            <td colSpan={2}>ACTIONS</td>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.name}</td>
              <td>{c.email}</td>
              <td>{c.department_name ?? "-"}</td>
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
