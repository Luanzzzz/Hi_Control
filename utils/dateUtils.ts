/**
 * Utility functions for date handling
 */

/**
 * Format date string to Brazilian format (dd/mm/yyyy)
 * @param dateString - ISO date string or Date object
 * @returns string - Formatted date in pt-BR format
 */
export const formatDate = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('pt-BR');
};

/**
 * Format date string to Brazilian format with time (dd/mm/yyyy HH:mm)
 * @param dateString - ISO date string or Date object
 * @returns string - Formatted date and time in pt-BR format
 */
export const formatDateTime = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleString('pt-BR');
};

/**
 * Calculate days remaining until a future date
 * @param futureDate - ISO date string or Date object
 * @returns number - Days remaining (negative if date has passed)
 */
export const calculateDaysRemaining = (futureDate: string | Date): number => {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset time to start of day

  const target = typeof futureDate === 'string' ? new Date(futureDate) : futureDate;
  target.setHours(0, 0, 0, 0); // Reset time to start of day

  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Check if a date is in the past
 * @param dateString - ISO date string or Date object
 * @returns boolean - True if date has passed
 */
export const isPast = (dateString: string | Date): boolean => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  return date < now;
};

/**
 * Check if a date is within X days from now
 * @param dateString - ISO date string or Date object
 * @param days - Number of days to check
 * @returns boolean - True if date is within X days
 */
export const isWithinDays = (dateString: string | Date, days: number): boolean => {
  const daysRemaining = calculateDaysRemaining(dateString);
  return daysRemaining >= 0 && daysRemaining <= days;
};

/**
 * Get relative time string (e.g., "2 dias atrás", "em 5 dias")
 * @param dateString - ISO date string or Date object
 * @returns string - Relative time in Portuguese
 */
export const getRelativeTime = (dateString: string | Date): string => {
  const days = calculateDaysRemaining(dateString);

  if (days < 0) {
    const absDays = Math.abs(days);
    if (absDays === 1) return 'há 1 dia';
    if (absDays < 30) return `há ${absDays} dias`;
    if (absDays < 365) {
      const months = Math.floor(absDays / 30);
      return months === 1 ? 'há 1 mês' : `há ${months} meses`;
    }
    const years = Math.floor(absDays / 365);
    return years === 1 ? 'há 1 ano' : `há ${years} anos`;
  }

  if (days === 0) return 'hoje';
  if (days === 1) return 'amanhã';
  if (days < 30) return `em ${days} dias`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? 'em 1 mês' : `em ${months} meses`;
  }
  const years = Math.floor(days / 365);
  return years === 1 ? 'em 1 ano' : `em ${years} anos`;
};
