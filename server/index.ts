import express from "express";
import { router } from "./routes";

const app = express();
app.use(express.json({ limit: "2mb" }));

// Log simples de API (ignora rotas estáticas do Vite, se alguma dia servirmos).
app.use((req, _res, next) => {
  if (req.path.startsWith("/api")) {
    console.log(`[api] ${req.method} ${req.path}`);
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, version: "0.1.0" });
});

app.use("/api", router);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`[server] VolleyIQ API em http://localhost:${port}`);
});
