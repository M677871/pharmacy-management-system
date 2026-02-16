import Home from "../pages/Home";
import About from "../pages/About";
import ClientsList from "../pages/clients/ClientList";
import ClientsForm from "../pages/clients/ClientForm";

export const routes = [
    {path: "/", element: Home},
    {path: "/about", element: About},
    {path: "/clients", element: ClientsList},
    {path: "/clients/new", element: ClientsForm},
    {path: "/clients/:id/edit", element: ClientsForm}
];