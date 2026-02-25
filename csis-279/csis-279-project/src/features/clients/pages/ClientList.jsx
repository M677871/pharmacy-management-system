import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteClient, getClients } from "../services/client.service.js";
import {
    Typography, Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, IconButton, Box
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const ClientList = () => {
    const [clients, setClients] = useState([]);

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        const data = await getClients();
        setClients(data);
    };

    const handleDelete = async (id) => {
        await deleteClient(id);
        loadClients();
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Client List</Typography>
            <Button variant="contained" component={Link} to="/clients/new" sx={{ mb: 2 }}>
                Create
            </Button>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>NAME</TableCell>
                            <TableCell>EMAIL</TableCell>
                            <TableCell>DEPARTMENT</TableCell>
                            <TableCell align="center" colSpan={2}>ACTIONS</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {clients.map(client => (
                            <TableRow key={client.id}>
                                <TableCell>{client.id}</TableCell>
                                <TableCell>{client.name}</TableCell>
                                <TableCell>{client.email}</TableCell>
                                <TableCell>{client.department_name || "No Department"}</TableCell>
                                <TableCell>
                                    <IconButton component={Link} to={`/clients/${client.id}/edit`} color="primary">
                                        <EditIcon />
                                    </IconButton>
                                </TableCell>
                                <TableCell>
                                    <IconButton onClick={() => handleDelete(client.id)} color="error">
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default ClientList;