import { check } from './erros.js';

export function chatSupabase(db) {
  return {
                                                                                                    
    async listChatMessages(rideId, passengerId = null) { return check(await db.rpc('list_ride_messages', { p_ride: rideId, p_passenger: passengerId })) ?? []; },
    async sendChatMessage(rideId, passengerId, body) { return check(await db.rpc('send_ride_message', { p_ride: rideId, p_passenger: passengerId ?? null, p_body: body })); },
    async listChats() { return check(await db.rpc('my_ride_chats')) ?? []; },
  };
}
