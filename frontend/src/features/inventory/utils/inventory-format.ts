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

export function formatDate(
  value: string | null | undefined,
  fallback = 'No expiry date',
): string {
  if (!value) {
    return fallback;
  }

  return new Date(value).toLocaleDateString();
}
