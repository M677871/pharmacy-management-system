import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    getDepartement,
    saveDepartement,
} from "../services/departments.service.js";
import {
    Typography, TextField, Button, Box, Paper
} from "@mui/material";

const DepartementForm = () => {
    const { id } = useParams();
    const [form, setForm] = useState({ name: "", description: "" });
    const navigate = useNavigate();

    useEffect(() => {
        if (id) {
            getDepartement(id).then(setForm);
        }
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await saveDepartement(form, id);
        navigate("/departements");
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                {id ? "Edit" : "Add"} Departement
            </Typography>

            <Paper sx={{ p: 3, mt: 2 }}>
                <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                        label="Name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                        fullWidth
                    />
                    <TextField
                        label="Description"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        required
                        fullWidth
                    />
                    <Button type="submit" variant="contained">
                        {id ? "Update" : "Add"}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default DepartementForm;