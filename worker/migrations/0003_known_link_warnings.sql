UPDATE products
SET link_health = 'warning',
    consecutive_failures = 1,
    last_checked_at = '2026-09-17T00:00:00.000Z',
    last_check_message = 'O link terminou em uma página genérica do Mercado Livre.'
WHERE product_url IN (
  'https://meli.la/24DmbcK',
  'https://meli.la/2z8WrjS',
  'https://meli.la/1TY9iqG'
);
