import Home from "../pages/Home";
import About from "../pages/About";
import ClientsList from "../features/clients/ClientList";
import ClientForm from "../features/clients/ClientForm";
import DepartmentList from "../pages/departments/DepartmentList";
import DepartmentForm from "../pages/departments/DepartmentForm";

export const routes = [
    { path: "/", element: Home },
    { path: "/about", element: About },
    
    // Client routes
    { path: "/clients", element: ClientsList },
    { path: "/clients/new", element: ClientForm },
    { path: "/clients/:id/edit", element: ClientForm },
    
    // Department routes
    { path: "/departments", element: DepartmentList },
    { path: "/departments/new", element: DepartmentForm },
    { path: "/departments/:id/edit", element: DepartmentForm },
];