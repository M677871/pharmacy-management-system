import { useState, useEffect } from "react";
import {Link} from "react-router-dom";
import { deleteDepartement, getDepartements } from "../services/departments.service.js";

const DepartementList = () => {
    const [departements, setDepartements] = useState([]);

    useEffect(() => {
       loadDepartements();
    }, []);

  const loadDepartements = async () => {
    const data = await getDepartements();
    setDepartements(data);
  }

  const handleDelete = async (id) => {
    await deleteDepartement(id);
    loadDepartements();
  }

    return (
       <>
       <h3>Departement List</h3>    
       <Link to="/departements/new">Create Departement</Link>

       <table border={1} cellPadding={8}>
        <thead>
        <tr>
            <th>ID</th>
            <th>NAME</th>
            <th>DESCRIPTION</th>
            <th colSpan={2}>ACTIONS</th>
        </tr>

        </thead>
        <tbody>
            {
                departements.map(d => (
                    <tr key={d.id}>
                        <td>{d.id}</td>
                        <td>{d.name}</td>
                        <td>{d.description}</td>
                        <td><Link to={`/departements/${d.id}/edit`}>Edit</Link></td>
                        <td><button onClick={() => handleDelete(d.id)}>Delete</button></td>
                    </tr>
                ))
            }
        </tbody>

       </table>
       
       </>
    );
}

export default DepartementList;