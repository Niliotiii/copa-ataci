// Stub exigido pelo pool-workers como entry do Worker. Os testes chamam os
// handlers das Pages Functions diretamente com um contexto montado; este fetch
// não é exercitado, mas o runtime precisa de um main.
export default {
  async fetch() {
    return new Response("test worker");
  },
};
