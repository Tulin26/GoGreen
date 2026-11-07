import { responder, tratarDb } from './_lib/rotas.js';

export default function handler(req, res) {
  return responder(tratarDb, req, res);
}
