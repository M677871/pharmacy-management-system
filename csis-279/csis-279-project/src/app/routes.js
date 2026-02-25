import About from "../pages/About";
import ClientForm from "../features/clients/pages/ClientForm";
import ClientList from "../features/clients/pages/ClientList";
import Home from "../pages/Home";
import DepartementForm from "../features/departments/pages/DepartmentForm";
import DepartementList from "../features/departments/pages/DepartmentList";



export const routes = [
    {path: "/", element: Home},
    {path: "/about", element: About},
    {path: "/clients", element: ClientList},
    {path: "/clients/new", element: ClientForm},
    {path: "/clients/:id/edit", element: ClientForm},
    {path: "/departements", element: DepartementList},
    {path: "/departements/new", element: DepartementForm},
    {path: "/departements/:id/edit", element: DepartementForm}
];