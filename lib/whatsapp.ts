/** Nigerian numbers: 0803... or +234803... -> https://wa.me/234803... */
export function waLink(number: string | null | undefined, text?: string) {
  if (!number) return null;
  let d = number.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '234' + d.slice(1);
  else if (d.length === 10) d = '234' + d; // 803... typed without the leading 0
  if (d.length < 11) return null;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
