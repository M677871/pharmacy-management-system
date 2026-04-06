export const decimalTransformer = {
  to(value?: number | null): number | null {
    if (value === undefined || value === null) {
      return null;
    }

    return Number(value);
  },
  from(value?: string | number | null): number | null {
    if (value === undefined || value === null) {
      return null;
    }

    return Number(value);
  },
};
