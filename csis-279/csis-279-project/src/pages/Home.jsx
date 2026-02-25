import { Typography, Box } from "@mui/material";

const Home = () => {
    return (
        <Box>
            <Typography variant="h4" gutterBottom>Home</Typography>
            <Typography variant="body1">
                Welcome to the CSIS-279 management system. This application allows you to manage clients and departements efficiently.
            </Typography>
        </Box>
    );
};

export default Home;