export let capturedHandler: (request: Request) => Promise<Response>;
export function serve(handler: typeof capturedHandler) {
  capturedHandler = handler;
}
