import About from "../pages/About";
import ClientForm from "../pages/clients/ClientForm";
import ClientList from "../pages/clients/ClientList";
import Home from "../pages/Home";
import DepartementForm from "../pages/departements/DepartementForm";
import DepartementList from "../pages/departements/DepartementList";


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