import { NavLink } from "react-router-dom";
import { AppBar, Toolbar, Button, Box } from "@mui/material";

const NavBar = () => {
    return (
        <AppBar position="static">
            <Toolbar>
                <Box sx={{ display: "flex", gap: 1 }}>
                    <Button color="inherit" component={NavLink} to="/">Home</Button>
                    <Button color="inherit" component={NavLink} to="/about">About</Button>
                    <Button color="inherit" component={NavLink} to="/clients">Clients</Button>
                    <Button color="inherit" component={NavLink} to="/departements">Departments</Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default NavBar;