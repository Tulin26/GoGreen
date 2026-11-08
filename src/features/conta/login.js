import { isDemo, store } from '../../dados/index.js';
import { session, setUser } from '../../shared/estado.js';
import { closeButton, openDialog } from '../../shared/ui/dialogo.js';
import { prefs } from '../../shared/preferencias.js';
import { $ } from '../../shared/ui/dom.js';
import { icon } from '../../shared/ui/icones.js';
import { readTransportes, transportesHtml } from '../../shared/ui/transportes.js';
import { isValidUsername } from '../../shared/validacao.js';
import { bindCarFields, carFieldsHtml } from '../carros/campos-carro.js';

export function requireLogin(reason = 'Entre para continuar.') {
  if (session.user) return Promise.resolve(session.user);
  return openAuth(reason);
}

export function openAuth(reason = '') {
  return new Promise((resolve) => {
    let mode = isDemo ? 'cadastro' : 'entrar';
    let done = null;
    const d = openDialog({
      html: `<form class="dialogo__corpo" method="dialog" novalidate>
        <div class="dialogo__cabeca"><h2 class="dialogo__titulo" data-titulo></h2>${closeButton}</div>
        ${reason ? `<p class="texto-2 texto-peq">${reason}</p>` : ''}
        ${isDemo ? '<p class="texto-2 texto-peq"><strong>Modo demonstração.</strong> Nada sai deste navegador, e não pedimos e-mail nem senha.</p>' : ''}
        <div class="campo" data-so-real><label class="campo__rotulo" for="a-email" data-rotulo-login>E-mail</label><input class="form-control entrada" id="a-email" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>
        <div class="campo" data-so-real><label class="campo__rotulo" for="a-senha">Senha</label><div class="campo-senha"><input class="form-control entrada" id="a-senha" type="password" autocomplete="current-password" minlength="6" required><button class="campo-senha__ver" type="button" data-ver-senha aria-label="Mostrar senha" aria-pressed="false">${icon('olho')}</button></div></div>
        <div class="campo" data-so-cadastro><label class="campo__rotulo" for="a-apelido">Apelido <span class="campo__opcional">(opcional)</span></label><input class="form-control entrada" id="a-apelido" maxlength="40" autocomplete="nickname"><p class="campo__ajuda">É o nome que aparece nas caronas.</p></div>
        <div class="campo" data-so-cadastro-real><label class="campo__rotulo" for="a-usuario">Usuário <span class="campo__opcional">(opcional, para entrar sem digitar o e-mail)</span></label><input class="form-control entrada" id="a-usuario" maxlength="30" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Ex.: joao.silva"><p class="campo__ajuda">De 3 a 30 letras minúsculas, números, ponto ou _.</p></div>
        <div class="campo" data-so-cadastro><label class="campo__rotulo" for="a-telefone">WhatsApp <span class="campo__opcional">(opcional, necessário para caronas)</span></label><input class="form-control entrada" id="a-telefone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="Ex.: 18 99999-0000"><p class="campo__ajuda">Só aparece para quem combinar uma carona com você.</p></div>
        <div data-so-cadastro class="pilha">
          ${transportesHtml()}
          <div class="pilha" data-carro-cadastro hidden><h3 class="secao-titulo">Qual é o seu carro?</h3>${carFieldsHtml()}<p class="campo__ajuda">Tem mais de um? Depois é só adicionar no perfil.</p></div>
        </div>
        <p class="campo__erro" role="alert" hidden></p>
        <button class="btn btn-success botao botao--primario botao--bloco" type="submit" data-enviar></button>
        ${isDemo ? '' : '<button class="btn btn-link botao botao--texto" type="button" data-alternar></button>'}
      </form>`,
      onClose: () => resolve(done),
    });
    const form = $('form', d);
    const err = $('.campo__erro', d);
    const showPassword = (on) => {
      const btn = $('[data-ver-senha]', d);
      $('#a-senha', d).type = on ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Esconder senha' : 'Mostrar senha');
      btn.innerHTML = icon(on ? 'olhoFechado' : 'olho');
    };
    $('[data-ver-senha]', d).addEventListener('click', () => showPassword($('#a-senha', d).type === 'password'));
    const paint = () => {
      const signup = mode === 'cadastro';
      $('#a-senha', d).autocomplete = signup ? 'new-password' : 'current-password';
      $('[data-titulo]', d).textContent = isDemo ? 'Seu apelido' : signup ? 'Criar conta' : 'Entrar';
      $('[data-enviar]', d).textContent = signup ? (isDemo ? 'Continuar' : 'Criar conta') : 'Entrar';
      const alt = $('[data-alternar]', d);
      if (alt) alt.textContent = signup ? 'Já tenho conta' : 'Criar uma conta';
      d.querySelectorAll('[data-so-cadastro]').forEach((el) => { el.hidden = !signup; });
      d.querySelectorAll('[data-so-real]').forEach((el) => { el.hidden = isDemo; });
      d.querySelectorAll('[data-so-cadastro-real]').forEach((el) => { el.hidden = isDemo || !signup; });
      $('[data-rotulo-login]', d).textContent = signup ? 'E-mail' : 'E-mail ou usuário';
      $('#a-email', d).inputMode = signup ? 'email' : 'text';
    };
    paint();

    let carFields = null;
    const carBox = $('[data-carro-cadastro]', d);
    const hasCar = () => $('[data-transporte="carro"]', d).checked;
    $('[data-transporte="carro"]', d).addEventListener('change', () => {
      carBox.hidden = !hasCar();
      if (hasCar()) carFields ??= bindCarFields(carBox);
    });
    $(isDemo ? '#a-apelido' : '#a-email', d).focus();
    $('[data-alternar]', d)?.addEventListener('click', () => { mode = mode === 'cadastro' ? 'entrar' : 'cadastro'; err.hidden = true; paint(); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.hidden = true;
      const payload = {
        email: $('#a-email', d).value.trim(),
        password: $('#a-senha', d).value,
        apelido: $('#a-apelido', d).value.trim(),
        usuario: $('#a-usuario', d).value.trim().toLowerCase(),
        telefone: $('#a-telefone', d).value.replace(/\D/g, ''),
        transportes: readTransportes(d),
      };
      if (!isDemo && (!payload.email || payload.password.length < 6)) {
        err.textContent = mode === 'cadastro' ? 'Informe o e-mail e uma senha com pelo menos 6 caracteres.' : 'Informe o e-mail ou usuário e a senha.';
        err.hidden = false;
        return;
      }
      if (!isDemo && mode === 'cadastro' && !payload.email.includes('@')) {
        err.textContent = 'Confira o e-mail.';
        err.hidden = false;
        return;
      }
      if (mode === 'cadastro' && payload.usuario && !isValidUsername(payload.usuario)) {
        err.textContent = 'O usuário precisa ter de 3 a 30 letras minúsculas, números, ponto ou _.';
        err.hidden = false;
        return;
      }
      if (mode === 'cadastro' && payload.telefone && !/^[0-9]{10,13}$/.test(payload.telefone)) {
        err.textContent = 'Confira o WhatsApp, com DDD.';
        err.hidden = false;
        return;
      }
      if (mode === 'cadastro' && hasCar()) {
        const { car, error } = carFields.read();
        if (error) {
          err.textContent = error;
          err.hidden = false;
          return;
        }
        payload.carro = car;
      }
      showPassword(false);
      const btn = $('[data-enviar]', d);
      btn.disabled = true;
      try {
        const res = mode === 'cadastro' ? await store.signUp(payload) : await store.signIn(payload);
        if (mode === 'cadastro') prefs.clearTransportes();
        setUser(res.user);
        done = res.user;
        d.close();
      } catch (error) {
        err.textContent = error.message;
        err.hidden = false;
      } finally {
        btn.disabled = false;
      }
    });
  });
}
