export function modelIds(body: unknown): string[] {
  if (!body || typeof body !== "object" || !("data" in body)) throw new Error("в ответе нет списка моделей");
  const data = (body as { data: unknown }).data;
  if (!Array.isArray(data)) throw new Error("в ответе нет списка моделей");
  if (data.length === 0) throw new Error("провайдер не вернул ни одной модели");
  const ids: string[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object" || typeof (item as { id?: unknown }).id !== "string") throw new Error("в списке моделей есть запись без id");
    const id = (item as { id: string }).id.trim();
    if (!id) throw new Error("в списке моделей есть запись без id");
    if (!ids.includes(id)) ids.push(id);
  }
  ids.sort((a, b) => a.localeCompare(b));
  return ids;
}
