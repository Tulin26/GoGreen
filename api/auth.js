import { responder, tratarAuth } from './_lib/rotas.js';

export default function handler(req, res) {
  return responder(tratarAuth, req, res);
}
