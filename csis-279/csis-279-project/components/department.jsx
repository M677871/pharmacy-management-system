import { useState, useEffect } from "react";

const Department = () => {
  const API = "http://localhost:3001/department";

  useEffect(() => {
    reloadDepatemts();
  }, []);

  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState(null);

  const handleEdit = (dept) => {
    setForm({ name: dept.name, description: dept.description });
    setEditingId(dept.id);
  };

  const clear = () => {
    setForm({ name: "", description: "" });
    setEditingId(null);
  };

  const reloadDepatemts = async () => {
    const res = await fetch(API);
    const data = await res.json();
    setDepartments(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingId) {
      await fetch(`${API}/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }

    clear();
    reloadDepatemts();
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/${id}`, { method: "DELETE" });
    reloadDepatemts();
  };

  return (
    <>
      <h3>Departments</h3>

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
          value={form.description}
          placeholder="Description"
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />

        <button type="submit">{!editingId ? "add" : "update"}</button>
        <button type="button" onClick={clear}>
          clear
        </button>
      </form>

      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>ID</th>
            <th>NAME</th>
            <th>DESCRIPTION</th>
            <td colSpan={2}>ACTIONS</td>
          </tr>
        </thead>
        <tbody>
          {departments.map((d) => (
            <tr key={d.id}>
              <td>{d.id}</td>
              <td>{d.name}</td>
              <td>{d.description}</td>
              <td>
                <button onClick={() => handleEdit(d)}>update</button>
              </td>
              <td>
                <button onClick={() => handleDelete(d.id)}>delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

export default Department;
