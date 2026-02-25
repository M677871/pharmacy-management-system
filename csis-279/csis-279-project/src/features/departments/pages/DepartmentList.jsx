import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { deleteDepartement, getDepartements } from "../services/departments.service.js";
import {
    Typography, Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, IconButton, Box
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const DepartementList = () => {
    const [departements, setDepartements] = useState([]);

    useEffect(() => {
        loadDepartements();
    }, []);

    const loadDepartements = async () => {
        const data = await getDepartements();
        setDepartements(data);
    };

    const handleDelete = async (id) => {
        await deleteDepartement(id);
        loadDepartements();
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Departement List</Typography>
            <Button variant="contained" component={Link} to="/departements/new" sx={{ mb: 2 }}>
                Create Departement
            </Button>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>NAME</TableCell>
                            <TableCell>DESCRIPTION</TableCell>
                            <TableCell align="center" colSpan={2}>ACTIONS</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {departements.map(d => (
                            <TableRow key={d.id}>
                                <TableCell>{d.id}</TableCell>
                                <TableCell>{d.name}</TableCell>
                                <TableCell>{d.description}</TableCell>
                                <TableCell>
                                    <IconButton component={Link} to={`/departements/${d.id}/edit`} color="primary">
                                        <EditIcon />
                                    </IconButton>
                                </TableCell>
                                <TableCell>
                                    <IconButton onClick={() => handleDelete(d.id)} color="error">
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

export default DepartementList;