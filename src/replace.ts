export function replaceOnce(text: string, oldStr: string, newStr: string): string {
  if (oldStr === "") throw new Error("пустой фрагмент для замены");
  const first = text.indexOf(oldStr);
  if (first < 0) throw new Error("фрагмент не найден");
  const second = text.indexOf(oldStr, first + oldStr.length);
  if (second >= 0) throw new Error("фрагмент встречается больше одного раза");
  return text.slice(0, first) + newStr + text.slice(first + oldStr.length);
}
