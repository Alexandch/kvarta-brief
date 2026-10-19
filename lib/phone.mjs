const BY_MOBILE_PREFIX = /^375(?:25|29|33|44)\d{7}$/;

export function normalizeByMobilePhone(value) {
  const digits = value.replace(/\D/g, "");
  return BY_MOBILE_PREFIX.test(digits) ? `+${digits}` : null;
}
