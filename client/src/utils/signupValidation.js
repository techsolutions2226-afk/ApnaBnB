/* Signup form validation — pure, framework-agnostic helpers shared by the
   Signup page. Each validator returns an error string, or null when valid, so
   the form can render inline messages and gate the submit button.

   Design notes:
   - Names use Unicode letter classes so international names (José, François,
     محمد, 张伟) pass, while digits and stray symbols (J0hn123, @#$) fail.
   - Age is computed from the exact calendar date (not year subtraction) so a
     user turning 18 today is accepted and one who is 17y364d is rejected.
   - Server-side validation in the auth controller mirrors these rules and is
     the authoritative check; these run client-side for fast feedback only. */

export const NAME_MAX = 50;
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
export const MIN_AGE = 18;
export const MIN_YEAR = 1900; // reject unrealistic DOBs like 1800

// First char must be a letter/mark; the rest may include spaces, apostrophes
// (straight or curly), periods and hyphens. Covers all scripts via \p{L}.
const NAME_ALLOWED = /^[\p{L}\p{M}][\p{L}\p{M}\s'’.-]*$/u;

export const validateName = (value, label = "Name") => {
  const v = (value || "").trim();
  if (!v) return `${label} is required`;
  if (v.length > NAME_MAX) return `${label} must be ${NAME_MAX} characters or fewer`;
  if (/[0-9]/.test(v)) return `${label} can't contain numbers`;
  if (!NAME_ALLOWED.test(v)) return `${label} contains invalid characters`;
  return null;
};

export const validateEmail = (value) => {
  const v = (value || "").trim();
  if (!v) return "Email is required";
  if (v.length > EMAIL_MAX) return "Email is too long";
  // Reasonable structure check: non-empty local part, a domain, and a TLD of
  // at least two chars. Rejects test@, test.com, test@@a.com.
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(v)) return "Enter a valid email";
  return null;
};

// Accepts +, spaces, dashes, parens; validates on digits only (10–15 covers
// local 03xxxxxxxxx and +92 international forms).
export const validatePhone = (value) => {
  const v = (value || "").trim();
  if (!v) return "Mobile number is required";
  const digits = v.replace(/[^\d]/g, "");
  if (digits.length < 10 || digits.length > 15) return "Enter a valid mobile number";
  return null;
};

// Exact age from a YYYY-MM-DD string, evaluated against today's calendar date.
export const calculateAge = (dob) => {
  if (!dob) return NaN;
  const [y, m, d] = String(dob).split("-").map(Number);
  if (!y || !m || !d) return NaN;
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) age -= 1;
  return age;
};

export const validateDob = (value) => {
  if (!value) return "Date of birth is required";
  const parts = String(value).split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return "Please enter a valid date of birth";
  }
  const [y, m, d] = parts;
  if (y < MIN_YEAR) return "Please enter a valid date of birth";
  // Round-trip guards against invalid calendar dates (e.g. 31/02/2000).
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return "Please enter a valid date of birth";
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dt > today) return "Please enter a valid date of birth"; // no future dates
  if (calculateAge(value) < MIN_AGE) return `You must be at least ${MIN_AGE} years old`;
  return null;
};

// Live per-rule checklist state. "special" excludes whitespace so an
// all-spaces password can never satisfy it (and thus is always rejected).
export const passwordChecks = (value) => {
  const v = value || "";
  return {
    length: v.length >= PASSWORD_MIN,
    lowercase: /[a-z]/.test(v),
    uppercase: /[A-Z]/.test(v),
    number: /[0-9]/.test(v),
    special: /[^A-Za-z0-9\s]/.test(v),
  };
};

export const isPasswordValid = (value) =>
  Object.values(passwordChecks(value)).every(Boolean);

export const validatePassword = (value) => {
  const v = value || "";
  if (!v) return "Password is required";
  if (!v.trim()) return "Password cannot be only spaces";
  const c = passwordChecks(v);
  if (!c.length) return `Password must be at least ${PASSWORD_MIN} characters`;
  if (!c.lowercase) return "Password must contain a lowercase letter";
  if (!c.uppercase) return "Password must contain an uppercase letter";
  if (!c.number) return "Password must contain a number";
  if (!c.special) return "Password must contain a special character";
  return null;
};

// Whole-form validity → { errors, isValid }. `agreed` is the terms checkbox.
export const validateSignupForm = (form, agreed) => {
  const errors = {};
  const firstName = validateName(form.firstName, "First name");
  if (firstName) errors.firstName = firstName;
  const lastName = validateName(form.lastName, "Last name");
  if (lastName) errors.lastName = lastName;
  const email = validateEmail(form.email);
  if (email) errors.email = email;
  const phone = validatePhone(form.phone);
  if (phone) errors.phone = phone;
  const password = validatePassword(form.password);
  if (password) errors.password = password;
  const birthdate = validateDob(form.birthdate);
  if (birthdate) errors.birthdate = birthdate;
  if (!form.role) errors.role = "Please select how you want to use the platform";
  if (!agreed) errors.agreed = "You must agree to the terms";
  return { errors, isValid: Object.keys(errors).length === 0 };
};
