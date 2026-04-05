/**
 * Parses duration strings like '10m', '1h', '7d' into minutes
 * @param durationStr - Duration string (e.g., '10m', '2h', '7d')
 * @returns Duration in minutes, or null if invalid
 */
export const parseDuration = (durationStr: string): number | null => {
    const regex = /^(\d+)([mhd])$/i;
    const match = durationStr.trim().match(regex);

    if (!match) {
        return null;
    }

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
        case 'm':
            return value;
        case 'h':
            return value * 60;
        case 'd':
            return value * 60 * 24;
        default:
            return null;
    }
};

/**
 * Formats minutes into a human-readable duration string
 * @param minutes - Duration in minutes
 * @returns Formatted string (e.g., '10 minutes', '2 hours', '7 days')
 */
export const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (minutes < 60 * 24) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        }
        return `${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
    } else {
        const days = Math.floor(minutes / (60 * 24));
        const remainingHours = Math.floor((minutes % (60 * 24)) / 60);
        if (remainingHours === 0) {
            return `${days} day${days !== 1 ? 's' : ''}`;
        }
        return `${days} day${days !== 1 ? 's' : ''} and ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
    }
};
