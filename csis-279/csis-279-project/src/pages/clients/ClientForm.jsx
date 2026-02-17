import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getClient, saveClient } from "../../services/client.service";
import { getDepartements } from "../../services/departement.service";

const ClientForm = () => {
    const [form, setForm] = useState({name: "", email: "", department_id: ""});
    const [departements, setDepartements] = useState([]);
    const {id} = useParams();
    const navigate = useNavigate();

    useEffect(()=>{
        loadDepartements();
        if(id){
            getClient(id).then(client => {
                setForm({
                    name: client.name || "",
                    email: client.email || "",
                    department_id: client.department_id || ""
                });
            });
        }
    }, [id]);

    const loadDepartements = async () => {
        const data = await getDepartements();
        setDepartements(data);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name: form.name,
            email: form.email,
            department_id: form.department_id === "" ? null : form.department_id
        };
        await saveClient(payload, id);
        navigate("/clients");
    }

    return(
        <>
            <h3>{id ? "Edit" : "Add"} Client</h3>

            <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
                <input
                    placeholder="Name"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required />

                <input
                    placeholder="Email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    required />

                <select
                    value={form.department_id}
                    onChange={e => setForm({ ...form, department_id: e.target.value })}>
                    <option value="">Select Department (Optional)</option>
                    {departements.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                </select>

                <button type="submit">
                    {id ? "Update" : "Add"}
                </button>
            </form>
        </>
    )
}

export default ClientForm;