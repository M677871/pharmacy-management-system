export function getErrorMessage(error: unknown): string {
  const response = (error as {
    response?: { data?: { message?: string | string[] } };
  })?.response;
  const message = response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  if (typeof message === 'string') {
    return message;
  }

  return 'Something went wrong. Please try again.';
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export function formatDate(value: string | null): string {
  if (!value) {
    return 'N/A';
  }

  return new Date(value).toLocaleDateString();
}
