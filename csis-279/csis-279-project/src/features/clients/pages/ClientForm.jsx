import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getClient, saveClient } from "../services/client.service.js";
import { getDepartements } from "../../departments/services/departments.service.js";
import {
    Typography, TextField, Button, Box, Paper, MenuItem
} from "@mui/material";

const ClientForm = () => {
    const [form, setForm] = useState({ name: "", email: "", department_id: "" });
    const [departements, setDepartements] = useState([]);
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(()=>{
        loadDepartements();
        if (id) {
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
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name: form.name,
            email: form.email,
            department_id: form.department_id === "" ? null : form.department_id
        };
        await saveClient(payload, id);
        navigate("/clients");
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                {id ? "Edit" : "Add"} Client
            </Typography>

            <Paper sx={{ p: 3, mt: 2 }}>
                <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                        label="Name"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        required
                        fullWidth
                    />
                    <TextField
                        label="Email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        required
                        fullWidth
                    />
                    <TextField
                        select
                        label="Department (Optional)"
                        value={form.department_id}
                        onChange={e => setForm({ ...form, department_id: e.target.value })}
                        fullWidth
                    >
                        <MenuItem value="">None</MenuItem>
                        {departements.map(dept => (
                            <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
                        ))}
                    </TextField>

                    <Button type="submit" variant="contained">
                        {id ? "Update" : "Add"}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default ClientForm;