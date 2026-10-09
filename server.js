const http = require("http");
const {
  Client,
  PresenceBuilder,
  ActivityType
} = require("@nich87/discord-rpc");

const PORT = 38473;
const DISCORD_CLIENT_ID = "463151177836658699";
const EXTENSION_ORIGIN = "chrome-extension://jgijfkpgdbkbmedmcfjljhpmlnjpdnjg";
const MAX_REQUEST_BYTES = 16 * 1024;

const discord = new Client();

let discordReady = false;
let currentActivity = false;
let lastPlayingData = null;
let reconnectTimer = null;
let connecting = false;


// ============================================================
// RECONEXÃO
// ============================================================

function scheduleReconnect() {
  if (reconnectTimer || discordReady || connecting) {
    return;
  }

  console.log("[YTM-RPC] Nova tentativa de conexão em 5 segundos...");

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;

    await connectDiscord();

    // Se ainda não conseguiu conectar,
    // agenda automaticamente outra tentativa.
    if (!discordReady) {
      scheduleReconnect();
    }
  }, 5000);
}

// ============================================================
// CONEXÃO COM DISCORD
// ============================================================

async function connectDiscord() {
  if (discordReady || connecting) {
    return;
  }

  connecting = true;

  try {
    console.log("[YTM-RPC] Tentando conectar ao Discord...");

    await discord.login({
      clientId: DISCORD_CLIENT_ID
    });

    discordReady = true;

    console.log("[YTM-RPC] Discord conectado.");

    // Se uma música estava tocando enquanto o Discord estava fechado,
    // reconstrói a atividade.
    if (lastPlayingData) {
      console.log("[YTM-RPC] Restaurando atividade da música atual...");

      try {
        await updateDiscord(lastPlayingData);
      } catch (error) {
        console.error(
          "[YTM-RPC] Erro ao restaurar atividade:",
          error
        );
      }
    }

  } catch (error) {
    discordReady = false;

    console.error(
      "[YTM-RPC] Discord indisponível:",
      error
    );

  } finally {
    connecting = false;
  }
}


// ============================================================
// EVENTOS DO DISCORD RPC
// ============================================================

// Conexão efetivamente estabelecida
discord.on("connected", () => {
  console.log("[YTM-RPC] Transporte Discord conectado.");
});


// Cliente RPC pronto
discord.on("ready", () => {
  discordReady = true;

  console.log("[YTM-RPC] Cliente RPC pronto.");

  if (lastPlayingData) {
    updateDiscord(lastPlayingData).catch(error => {
      console.error(
        "[YTM-RPC] Erro ao restaurar atividade após ready:",
        error
      );
    });
  }
});


// Discord foi fechado/reiniciado ou IPC caiu
discord.on("disconnected", (reason) => {
  console.warn(
    "[YTM-RPC] Discord desconectado:",
    reason || "motivo desconhecido"
  );

  discordReady = false;

  scheduleReconnect();
});


// Erros emitidos pelo cliente RPC
discord.on("error", (error) => {
  console.error(
    "[YTM-RPC] Erro interno do Discord RPC:",
    error
  );
});


// Mudanças de estado da conexão
discord.on("stateChange", (state) => {
  console.log(
    "[YTM-RPC] Estado Discord:",
    state
  );

  if (state === "ready") {
    discordReady = true;
  }

  if (state === "disconnected") {
    discordReady = false;
    scheduleReconnect();
  }
});


// ============================================================
// LIMPAR ATIVIDADE
// ============================================================

async function clearDiscordActivity() {
  if (!discordReady || !discord.isReady) {
    return;
  }

  try {
    await discord.clearActivity();

    currentActivity = false;

    console.log("[YTM-RPC] Atividade removida.");

  } catch (error) {

    console.error(
      "[YTM-RPC] Erro ao remover atividade:",
      error
    );

    // Se o erro aconteceu porque a conexão morreu,
    // força o estado local para desconectado.
    if (!discord.isReady) {
      discordReady = false;
      scheduleReconnect();
    }
  }
}


// ============================================================
// ATUALIZAR RICH PRESENCE
// ============================================================

async function updateDiscord(data) {

  // Guarda somente a última música realmente em reprodução.
  if (data.state === "playing") {
    lastPlayingData = {
      ...data
    };
  }


  // Se Discord não está pronto, simplesmente aguarda reconexão.
  if (!discordReady || !discord.isReady) {
    return;
  }


  // Música pausada/parada
  if (data.state !== "playing") {
    lastPlayingData = null;

    await clearDiscordActivity();

    return;
  }


  // Sem título não existe atividade útil para enviar.
  if (!data.title) {
    return;
  }


  // ==========================================================
  // CONSTRÓI PRESENCE
  // ==========================================================

  const builder = new PresenceBuilder()
    .setType(ActivityType.Listening)
    .setDetails(data.title)
    .setState(data.artist || "YouTube Music");


  // ==========================================================
  // TIMESTAMPS
  // ==========================================================

  if (
    Number.isFinite(data.currentTime) &&
    Number.isFinite(data.duration) &&
    data.duration > 0 &&
    data.currentTime >= 0 &&
    data.currentTime <= data.duration
  ) {

    const now = Date.now();

    const start =
      now - Math.floor(data.currentTime * 1000);

    const end =
      now +
      Math.floor(
        (data.duration - data.currentTime) * 1000
      );

    builder.setTimestamps({
      start,
      end
    });
  }


  // ==========================================================
  // CAPA
  // ==========================================================

  if (data.artwork) {
    builder.setLargeImage(data.artwork);
  }


  // ==========================================================
  // ENVIA PARA DISCORD
  // ==========================================================

  try {

    await discord.setActivity(
      builder.build()
    );

    currentActivity = true;

    console.log(
      "[YTM-RPC] Atividade atualizada:",
      data.title,
      "-",
      data.artist
    );

  } catch (error) {

    console.error(
      "[YTM-RPC] Erro ao atualizar atividade:",
      error
    );

    // A conexão pode ter caído exatamente no momento
    // em que tentamos enviar a atividade.
    if (!discord.isReady) {

      discordReady = false;

      scheduleReconnect();
    }
  }
}


// ============================================================
// SERVIDOR HTTP
// ============================================================

const server = http.createServer((req, res) => {

  const origin = req.headers.origin;

  // Only accept requests from the locally installed extension.
  if (origin !== EXTENSION_ORIGIN) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, error: "Forbidden origin" }));
    return;
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": EXTENSION_ORIGIN,
    "Vary": "Origin"
  };

  if (req.method === "OPTIONS" && req.url === "/test") {
    res.writeHead(204, {
      ...corsHeaders,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600"
    });
    res.end();
    return;
  }

  // ----------------------------------------------------------
  // POST /test
  // ----------------------------------------------------------

  if (
    req.method === "POST" &&
    req.url === "/test"
  ) {

    if (!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] || "")) {
      res.writeHead(415, {
        ...corsHeaders,
        "Content-Type": "application/json"
      });
      res.end(JSON.stringify({ success: false, error: "Content-Type must be application/json" }));
      return;
    }

    const declaredLength = Number(req.headers["content-length"]);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
      res.writeHead(413, {
        ...corsHeaders,
        "Content-Type": "application/json"
      });
      res.end(JSON.stringify({ success: false, error: "Request too large" }));
      req.resume();
      return;
    }

    let body = "";
    let bodyBytes = 0;
    let tooLarge = false;

    req.on("data", chunk => {
      if (tooLarge) return;
      bodyBytes += chunk.length;
      if (bodyBytes > MAX_REQUEST_BYTES) {
        tooLarge = true;
        res.writeHead(413, {
          ...corsHeaders,
          "Content-Type": "application/json"
        });
        res.end(JSON.stringify({ success: false, error: "Request too large" }));
        return;
      }
      body += chunk;
    });


    req.on("end", async () => {

      try {

        if (tooLarge) return;

        const data = JSON.parse(body);

        const validStates = ["playing", "paused", "stopped"];
        const validText = (value, maxLength) =>
          value === null ||
          (typeof value === "string" && value.length <= maxLength);

        if (
          !data || typeof data !== "object" || Array.isArray(data) ||
          !validStates.includes(data.state) ||
          !validText(data.title, 500) ||
          !validText(data.artist, 500) ||
          !validText(data.artwork, 2048) ||
          !validText(data.timeText, 100) ||
          !(data.currentTime === null ||
            (Number.isFinite(data.currentTime) && data.currentTime >= 0)) ||
          !(data.duration === null ||
            (Number.isFinite(data.duration) && data.duration >= 0))
        ) {
          res.writeHead(400, {
            ...corsHeaders,
            "Content-Type": "application/json"
          });
          res.end(JSON.stringify({ success: false, error: "Invalid track data" }));
          return;
        }

        if (data.artwork) {
          let artworkUrl;
          try {
            artworkUrl = new URL(data.artwork);
          } catch {
            res.writeHead(400, {
              ...corsHeaders,
              "Content-Type": "application/json"
            });
            res.end(JSON.stringify({ success: false, error: "Invalid artwork URL" }));
            return;
          }
          if (artworkUrl.protocol !== "https:") {
            res.writeHead(400, {
              ...corsHeaders,
              "Content-Type": "application/json"
            });
            res.end(JSON.stringify({ success: false, error: "Invalid artwork URL" }));
            return;
          }
        }

        await updateDiscord(data);


        res.writeHead(
          200,
          {
          "Content-Type": "application/json",
            ...corsHeaders
          }
        );

        res.end(
          JSON.stringify({
            success: true
          })
        );

      } catch (error) {

        console.error(
          "[YTM-RPC] Erro ao processar requisição:",
          error
        );

        res.writeHead(
          400,
          {
          "Content-Type": "application/json",
            ...corsHeaders
          }
        );

        res.end(
          JSON.stringify({
            success: false,
            error: String(error)
          })
        );
      }
    });

    return;
  }


  // ----------------------------------------------------------
  // ROTA DESCONHECIDA
  // ----------------------------------------------------------

  res.writeHead(
    404,
    {
    "Content-Type": "application/json",
      ...corsHeaders
    }
  );

  res.end(
    JSON.stringify({
      success: false,
      error: "Not found"
    })
  );
});


// ============================================================
// INICIA SERVIDOR
// ============================================================

server.listen(
  PORT,
  "127.0.0.1",
  () => {
    console.log(
      `[YTM-RPC] Servidor ouvindo em http://127.0.0.1:${PORT}`
    );
  }
);


// ============================================================
// INICIA CONEXÃO
// ============================================================

connectDiscord();
