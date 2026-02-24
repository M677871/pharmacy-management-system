const BASE = "http://localhost:3001/department";

export const getDepartements = async () => {
    const res = await fetch(`${BASE}`);
    const data = await res.json();
    return data;
}

export const getDepartement = async(id) => {
    const res = await fetch(`${BASE}/${id}`);
    const data = await res.json();
    return data;
}

export const saveDepartement = async(data, id) => {
    await fetch(id ? `${BASE}/${id}` : BASE, {
        method: id ? "PUT" : "POST",
        headers: {"Content-Type" : "application/json"},
        body: JSON.stringify(data)
    })
}

export const deleteDepartement = async (id) => {
    await fetch(`${BASE}/${id}`, {
        method: "DELETE"
    })
}
