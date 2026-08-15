// Game server — WebSocket rooms land in a later milestone; health check for now.
const server = Bun.serve({
  port: Number(process.env.PORT ?? 3001),
  fetch() {
    return new Response('board-game server ok');
  },
});

console.log(`server listening on :${server.port}`);
