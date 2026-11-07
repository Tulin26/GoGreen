                                                                 
const listeners = new Set();
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (what) => listeners.forEach((fn) => fn(what));

export const session = {
  user: null,
  trip: null,
                                                                                  
  lastCompare: null,
};

export function setUser(user) { session.user = user; emit('user'); }

                                                                                           
export function setTrip(trip) { session.trip = trip; emit('trip'); }
