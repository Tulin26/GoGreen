                                                 
                                                                         
export function whatsappUrl(phone) {
  const digits = String(phone).replace(/\D/g, '');
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
}
