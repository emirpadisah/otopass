export function validatePasswordPolicy(password: string): void {
  if (password.length < 12) {
    throw new Error("Şifre en az 12 karakter olmalıdır.");
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    throw new Error("Şifre büyük harf, küçük harf ve sayı içermelidir.");
  }
}
