-- O Supabase dá EXECUTE direto para anon/authenticated em toda função nova do
-- schema public, então o REVOKE ... FROM PUBLIC da migração do cashback não
-- bastou. Estas duas são internas: o gatilho (só roda como trigger) e a
-- leitura de configuração (usada pelas outras funções, que rodam como dono).
-- O EXECUTE do gatilho só é checado ao criar o trigger, não ao disparar.
REVOKE EXECUTE ON FUNCTION cashback_ao_mudar_status() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION cashback_config(TEXT, NUMERIC) FROM anon, authenticated;
