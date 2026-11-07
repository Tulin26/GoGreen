                                                             
export const isValidUsername = (s) => /^[a-z0-9_.]{3,30}$/.test(s);
export const normalizePhone = (s) => s.replace(/\D/g, '');
export const isValidPhone = (s) => /^[0-9]{10,13}$/.test(s);
