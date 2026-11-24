// Pure game rules: deliberately independent of the camera and renderer.
export const ITEMS = [
  { id: 'apple', name: 'Apple core', type: 'wet', tip: 'Food scraps belong in the wet bin.' },
  { id: 'leaf', name: 'Fallen leaf', type: 'wet', tip: 'Leaves are biodegradable wet waste.' },
  { id: 'peel', name: 'Orange peel', type: 'wet', tip: 'Fruit peels belong in the wet bin.' },
  { id: 'bottle', name: 'Empty plastic bottle', type: 'dry', tip: 'Empty, clean plastic packaging belongs in the dry bin.' },
  { id: 'paper', name: 'Clean paper', type: 'dry', tip: 'Clean, dry paper belongs in the dry bin.' },
  { id: 'can', name: 'Empty metal can', type: 'dry', tip: 'Empty, clean metal cans belong in the dry bin.' }
];
export function newGame() { return { score: 0, sorted: [], mistakes: 0 }; }
export function sortItem(state, id, bin) {
  const item = ITEMS.find(item => item.id === id);
  if (!item || !['wet', 'dry'].includes(bin) || state.sorted.includes(id)) return { state, correct: false, ignored: true };
  if (item.type !== bin) return { state: { ...state, mistakes: state.mistakes + 1 }, correct: false, ignored: false };
  return { state: { ...state, score: state.score + 10, sorted: [...state.sorted, id] }, correct: true, ignored: false };
}
