export function validatePassport(passport: string): boolean {
  // Regex genérico para passaportes (Maioria é 6-9 alfanuméricos)
  return /^[A-Z0-9]{6,9}$/.test(passport);
}

export function validateSSN(ssn: string): boolean {
  // US SSN: 9 digits, can have dashes
  return /^(?!000|666|9\d{2})\d{3}-?(?!00)\d{2}-?(?!0000)\d{4}$/.test(ssn);
}

export function validateDocument(country: string, docId: string): boolean {
  if (!docId) return false;
  
  switch (country) {
    case 'BR': return validateCPF(docId);
    case 'US': return validateSSN(docId) || validatePassport(docId); // Aceita ambos
    default: return docId.length >= 5; // Fallback genérico para outros países (Passport/ID)
  }
}

export function validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) 
    sum = sum + parseInt(cpf.substring(i-1, i)) * (11 - i);
  remainder = (sum * 10) % 11;
  
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) 
    sum = sum + parseInt(cpf.substring(i-1, i)) * (12 - i);
  remainder = (sum * 10) % 11;
  
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;
  
  return true;
}

export function isAdult(birthDate: string | Date): boolean {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 18;
}