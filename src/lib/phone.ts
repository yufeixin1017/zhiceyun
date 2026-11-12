export function normalizePhone(value: string): string {
  let phone = value.trim().replace(/[\s-]/g, "");
  if (phone.startsWith("+86")) phone = phone.slice(3);
  return phone;
}

export function getPhoneError(value: string): string | null {
  return /^1[3-9]\d{9}$/.test(normalizePhone(value)) ? null : "请输入有效的 11 位手机号";
}
