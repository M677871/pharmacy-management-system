import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getDepartement,
  saveDepartement,
} from "../../services/departement.service";

const DepartementForm = () => {
  const { id } = useParams();
  const [form, setForm] = useState({ name: "", description: "" });
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      getDepartement(id).then(setForm);
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveDepartement(form, id);
    navigate("/departements");
  };

  return (
    <>
      <h3>{id ? "Edit" : "Add"} Departement</h3>
      <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />

        <button type="submit">{id ? "Update" : "Add"}</button>
      </form>
    </>
  );
};

export default DepartementForm;