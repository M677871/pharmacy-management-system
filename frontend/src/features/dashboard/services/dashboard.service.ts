import { gql, graphqlQuery } from '../../../shared/api/graphql';
import type {
  CatalogResponse,
  DashboardOverview,
  DashboardReports,
} from '../types/dashboard.types';

const DASHBOARD_OVERVIEW = gql`
  query DashboardOverview($input: JSONObject) {
    dashboardOverview(input: $input)
  }
`;

const DASHBOARD_REPORTS = gql`
  query DashboardReports($input: JSONObject) {
    dashboardReports(input: $input)
  }
`;

const DASHBOARD_CATALOG = gql`
  query DashboardCatalog($input: JSONObject) {
    dashboardCatalog(input: $input)
  }
`;

export const dashboardService = {
  async getOverview(days = 30) {
    const result = await graphqlQuery<
      { dashboardOverview: DashboardOverview },
      { input: { days: number } }
    >(DASHBOARD_OVERVIEW, { input: { days } });
    return result.dashboardOverview;
  },

  async getReports(days = 30) {
    const result = await graphqlQuery<
      { dashboardReports: DashboardReports },
      { input: { days: number } }
    >(DASHBOARD_REPORTS, { input: { days } });
    return result.dashboardReports;
  },

  async getCatalog(search?: string, limit?: number) {
    const result = await graphqlQuery<
      { dashboardCatalog: CatalogResponse },
      { input: { search?: string; limit?: number } }
    >(DASHBOARD_CATALOG, {
      input: {
        search: search?.trim() || undefined,
        limit,
      },
    });
    return result.dashboardCatalog;
  },
};
