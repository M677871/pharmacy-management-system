import api from '../../../shared/api/axios';
import type {
  CatalogResponse,
  DashboardOverview,
  DashboardReports,
} from '../types/dashboard.types';

export const dashboardService = {
  async getOverview(days = 30) {
    const { data } = await api.get<DashboardOverview>('/dashboard/overview', {
      params: { days },
    });
    return data;
  },

  async getReports(days = 30) {
    const { data } = await api.get<DashboardReports>('/dashboard/reports', {
      params: { days },
    });
    return data;
  },

  async getCatalog(search?: string, limit?: number) {
    const { data } = await api.get<CatalogResponse>('/dashboard/catalog', {
      params: {
        search: search?.trim() || undefined,
        limit,
      },
    });
    return data;
  },
};
