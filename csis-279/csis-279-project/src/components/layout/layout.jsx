import NavBar from "./NavBar";

const Layout = ({children}) => {
    return(
        <>
            <NavBar />
            <main className="container">{children}</main>
        </>
    )
}

export default Layout;