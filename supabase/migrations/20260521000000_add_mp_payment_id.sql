-- Migration: Add mp_payment_id to pedidos
-- Description: Stores Mercado Pago payment ID for payment reconciliation and tracking
-- Date: 2026-05-21
-- Status: Safe - adds new nullable column, no changes to existing data

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS mp_payment_id BIGINT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_pedidos_mp_payment_id
    ON pedidos (mp_payment_id);
