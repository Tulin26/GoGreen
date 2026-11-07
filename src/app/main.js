import '../styles/index.css';

import { store } from '../dados/index.js';
import { onChange, setUser } from '../shared/estado.js';
import { bindShell, paintChrome, renderShell } from './moldura.js';
import { route } from './navegacao.js';

renderShell();
bindShell();

onChange((what) => { if (what === 'examples') paintChrome(); });
store.onAuthChange((user) => setUser(user));
window.addEventListener('hashchange', route);

paintChrome();
                                                              
route();
store.getUser().then(setUser).catch(() => setUser(null));
