import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function noWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null;
    if (!value) return null;
    return /\s/.test(value) ? { whitespace: true } : null;
  };
}

export function noEmojiValidator(): ValidatorFn {
  const emojiRegex =
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/u;

  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null;
    if (!value) return null;
    return emojiRegex.test(value) ? { emoji: true } : null;
  };
}

/** Solo se usa en registro/cambio de contraseña, no en login. */
export function passwordComplexityValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null;
    if (!value) return null;

    const errors: ValidationErrors = {};
    if (value.length < 8) errors['minLength'] = true;
    if (!/[A-Z]/.test(value)) errors['upperCase'] = true;
    if (!/[a-z]/.test(value)) errors['lowerCase'] = true;
    if (!/\d/.test(value)) errors['number'] = true;
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)) errors['specialChar'] = true;
    if (/\s/.test(value)) errors['whitespace'] = true;

    return Object.keys(errors).length > 0 ? errors : null;
  };
}