export function plural(count: number, word: string) {
  return `${count} ${count === 1 ? word : `${word}s`}`;
}
