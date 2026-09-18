import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

/** Classifica o aparelho a partir do user agent, para o painel saber se o
 *  público chega pelo celular ou pelo computador. */
function detectarDispositivo(): string {
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'Tablet';
  if (/Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)) return 'Celular';
  return 'Computador';
}

/** De onde a pessoa veio: campanha (utm_source), site que linkou, ou acesso
 *  direto. Guarda só a origem, nunca a URL inteira. */
function detectarOrigem(): string {
  try {
    const utm = new URLSearchParams(window.location.search).get('utm_source');
    if (utm) return utm.trim().slice(0, 40);

    const ref = document.referrer;
    if (!ref) return 'Direto';

    const host = new URL(ref).hostname.replace(/^www\./, '');
    if (host === window.location.hostname) return 'Direto';

    const conhecidos: Record<string, string> = {
      'instagram.com': 'Instagram',
      'l.instagram.com': 'Instagram',
      'facebook.com': 'Facebook',
      'l.facebook.com': 'Facebook',
      'google.com': 'Google',
      'google.com.br': 'Google',
      'bing.com': 'Bing',
      'tiktok.com': 'TikTok',
      'youtube.com': 'YouTube',
      't.co': 'X / Twitter',
      'linktr.ee': 'Linktree',
    };
    return conhecidos[host] ?? host.slice(0, 40);
  } catch {
    return 'Direto';
  }
}

export function useVisita() {
  useEffect(() => {
    if (sessionStorage.getItem('ag_visited')) return;
    sessionStorage.setItem('ag_visited', '1');

    // Capturado antes do await: uma navegação interna durante a consulta de
    // geolocalização faria o referrer virar a própria loja.
    const dispositivo = detectarDispositivo();
    const origem = detectarOrigem();

    (async () => {
      let cidade: string | null = null;
      let estado: string | null = null;
      let pais: string | null = null;

      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const d = await res.json();
          cidade = d.city ?? null;
          estado = d.region ?? null;
          pais = d.country_name ?? null;
        }
      } catch { /* geo lookup is optional */ }

      try {
        await supabase.from('visitas_site').insert({
          data: new Date().toISOString().slice(0, 10),
          pagina: 'home',
          ts: new Date().toISOString(),
          cidade,
          estado,
          pais,
          dispositivo,
          origem,
        });
      } catch { /* table may not exist yet — ignore */ }
    })();
  }, []);
}
