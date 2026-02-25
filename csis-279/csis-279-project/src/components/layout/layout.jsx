import NavBar from "./NavBar";
import { Container } from "@mui/material";

const Layout = ({ children }) => {
    return (
        <>
            <NavBar />
            <Container maxWidth="lg" sx={{ mt: 4 }}>
                {children}
            </Container>
        </>
    );
};

export default Layout;