import { useEffect, useState } from "react";

const ClientsForm = () => {
  const [clients, setClients] = useState([]);
  const [departments, setDepartments] = useState([]);
    const [form, setForm] = useState({
        name: "",
        email: "",
        department_id: "",
    });
    const [editingId, setEditingId] = useState(null);

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
            department_id: form.department_id === "" ? null : Number(form.department_id),
        };
        if (editingId) {
            await fetch(`${API}/${editingId}`, {
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
        <h1>{editingId ? "Edit Client" : "Add Client"}</h1>
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
            />
            <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
            />
            <select
                value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value })}
            >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                        {dept.name}
                    </option>
                ))}
            </select>
            <button type="submit">{editingId ? "Update" : "Add"}</button>
            {editingId && <button type="button" onClick={clear}>Cancel</button>}
        </form>
        </>
    );
}

export default ClientsForm;