-- Enable RLS on all sensitive tables and define policies.
-- produtos, categorias remain readable by anon (public catalog).
-- All other tables require service_role for read/write.

-- Sensitive tables
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitas_site ENABLE ROW LEVEL SECURITY;

-- pedidos: anon can insert (checkout), only service_role can read/update/delete
DROP POLICY IF EXISTS "allow_anon_insert_orders" ON pedidos;
CREATE POLICY "allow_anon_insert_orders" ON pedidos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_admin_manage_orders" ON pedidos;
CREATE POLICY "allow_admin_manage_orders" ON pedidos
  FOR ALL USING (auth.role() = 'service_role');

-- pedido_itens: anon can insert, only service_role can read/update/delete
DROP POLICY IF EXISTS "allow_anon_insert_order_items" ON pedido_itens;
CREATE POLICY "allow_anon_insert_order_items" ON pedido_itens
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_admin_manage_order_items" ON pedido_itens;
CREATE POLICY "allow_admin_manage_order_items" ON pedido_itens
  FOR ALL USING (auth.role() = 'service_role');

-- clientes: anon can insert (checkout creates client), only service_role can read
DROP POLICY IF EXISTS "allow_anon_insert_clientes" ON clientes;
CREATE POLICY "allow_anon_insert_clientes" ON clientes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_admin_manage_clientes" ON clientes;
CREATE POLICY "allow_admin_manage_clientes" ON clientes
  FOR ALL USING (auth.role() = 'service_role');

-- leads_whatsapp: anon can insert, only service_role can read
DROP POLICY IF EXISTS "allow_anon_insert_leads" ON leads_whatsapp;
CREATE POLICY "allow_anon_insert_leads" ON leads_whatsapp
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_admin_manage_leads" ON leads_whatsapp;
CREATE POLICY "allow_admin_manage_leads" ON leads_whatsapp
  FOR ALL USING (auth.role() = 'service_role');

-- admin_config, configuracoes, visitas_site: service_role only
DROP POLICY IF EXISTS "allow_admin_manage_admin_config" ON admin_config;
CREATE POLICY "allow_admin_manage_admin_config" ON admin_config
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "allow_admin_manage_configuracoes" ON configuracoes;
CREATE POLICY "allow_admin_manage_configuracoes" ON configuracoes
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "allow_anon_insert_visitas" ON visitas_site;
CREATE POLICY "allow_anon_insert_visitas" ON visitas_site
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_admin_manage_visitas" ON visitas_site;
CREATE POLICY "allow_admin_manage_visitas" ON visitas_site
  FOR ALL USING (auth.role() = 'service_role');
