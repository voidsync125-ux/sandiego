const emailPattern = /^(?=.{1,64}@)(?=.{1,254}$)[a-z0-9](?:[a-z0-9.!#$%&'*+/=?^_`{|}~-]*[a-z0-9])?@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i

export function isValidEmail(email: string): boolean {
  return emailPattern.test(email) && !email.includes('..')
}

export const INVALID_EMAIL_MESSAGE = 'Enter a valid email address (for example name@example.com).'
