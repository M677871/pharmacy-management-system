import apiService from './api.js';

const departmentService = {
  // Get all departments
  getDepartments: async () => {
    return await apiService.get('/department');
  },

  // Get department by ID
  getDepartment: async (id) => {
    return await apiService.get(`/department/${id}`);
  },

  // Create a new department
  createDepartment: async (departmentData) => {
    return await apiService.post('/department', departmentData);
  },

  // Update existing department
  updateDepartment: async (id, departmentData) => {
    return await apiService.put(`/department/${id}`, departmentData);
  },

  // Delete department
  deleteDepartment: async (id) => {
    return await apiService.delete(`/department/${id}`);
  },

  // Create or update department (unified method)
  saveDepartment: async (departmentData, id = null) => {
    if (id) {
      return await departmentService.updateDepartment(id, departmentData);
    } else {
      return await departmentService.createDepartment(departmentData);
    }
  }
};

export default departmentService;