import * as functions from "firebase-functions";
import next from "next";

const app = next({
  dev: false,
  conf: {distDir: ".next"}, // ✅ avec bonne syntaxe
});

const handle = app.getRequestHandler();

export const nextApp = functions.https.onRequest(async (req, res) => {
  await app.prepare();
  return handle(req, res);
});
