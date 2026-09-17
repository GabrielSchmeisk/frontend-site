UPDATE products
SET link_health = 'broken',
    consecutive_failures = 2,
    last_check_message = 'O link terminou na lista genérica do Mercado Livre; anúncio não encontrado.'
WHERE product_url IN (
  'https://meli.la/24DmbcK',
  'https://meli.la/2z8WrjS',
  'https://meli.la/1TY9iqG'
);
