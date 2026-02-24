const SALT = 'EFUEL-SECURE-V1-';

export const encryptData = (data: any): string => {
    try {
        const json = JSON.stringify(data);
        return btoa(SALT + encodeURIComponent(json));
    } catch {
        return '';
    }
};

export const decryptData = (val: string): any => {
    if (!val) return null;
    try {
        const decoded = decodeURIComponent(atob(val));
        if (decoded.startsWith(SALT)) {
            return JSON.parse(decoded.substring(SALT.length));
        }
        // Fallback for unencrypted legacy data
        return JSON.parse(val);
    } catch {
        // Fallback if parsing unencrypted legacy data
        try {
            return JSON.parse(val);
        } catch {
            return null;
        }
    }
};
