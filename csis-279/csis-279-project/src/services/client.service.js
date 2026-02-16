import apiService from './api.js';

const clientService = {
  // Get all clients with department information
  getClients: async () => {
    return await apiService.get('/clients');
  },

  // Get client by ID
  getClient: async (id) => {
    return await apiService.get(`/clients/${id}`);
  },

  // Create a new client
  createClient: async (clientData) => {
    return await apiService.post('/clients', clientData);
  },

  // Update existing client
  updateClient: async (id, clientData) => {
    return await apiService.put(`/clients/${id}`, clientData);
  },

  // Delete client
  deleteClient: async (id) => {
    return await apiService.delete(`/clients/${id}`);
  },

  // Create or update client (unified method)
  saveClient: async (clientData, id = null) => {
    if (id) {
      return await clientService.updateClient(id, clientData);
    } else {
      return await clientService.createClient(clientData);
    }
  }
};

export default clientService;