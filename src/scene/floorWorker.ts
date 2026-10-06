// Paints the floor detail maps off the main thread (see floorTextures.ts): one message per texture as soon as it is done.
// Rows are posted bottom-up, which is how WebGL wants them for a DataTexture without flipY (a canvas texture has flipY on).
import { FLOOR_KINDS, SIZE, paintFloor } from './floorPainters';

interface WorkerScope {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
}
const scope = self as unknown as WorkerScope;

scope.onmessage = () => {
  const row = SIZE * 4;
  for (const kind of FLOOR_KINDS) {
    const ctx = new OffscreenCanvas(SIZE, SIZE).getContext('2d', { willReadFrequently: true })!;
    paintFloor(kind, ctx);
    const src = ctx.getImageData(0, 0, SIZE, SIZE).data;
    const pixels = new Uint8Array(SIZE * row);
    for (let y = 0; y < SIZE; y++) pixels.set(src.subarray(y * row, (y + 1) * row), (SIZE - 1 - y) * row);
    scope.postMessage({ kind, pixels }, [pixels.buffer]);
  }
};
