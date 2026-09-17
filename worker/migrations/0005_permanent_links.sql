CREATE TABLE IF NOT EXISTS link_slugs (
  slug TEXT PRIMARY KEY CHECK(length(slug) BETWEEN 3 AND 64),
  product_id TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 1 CHECK(is_primary IN (0,1)),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_link_slugs_product ON link_slugs(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_link_slugs_primary ON link_slugs(product_id) WHERE is_primary=1;
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('direct-box-passivo-2-canais-di-2ps-waldman','product-97ff5eedbdad',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('direct-box-passivo-bypass-di-1ps-waldman-bivolt','product-d4fcb63a1a1d',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('interface-de-audio-teyun-q-24-24-bits-2-canais-com-phantom-power','product-2ea395173c1e',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('microfone-sennheiser-xs1-din-cardioide','product-b65b6d568a8b',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('kit-premium-microfone-condensador-bm800','product-e06f4f5faddd',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('kit-microfones-bateria-arcano-renius-7d-kit-dinamicos-5-mics-car','product-f835eccc5d4e',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('mesa-de-som-digital-teyun-a8-8-canais-bluetooth-usb-phantom-48v','product-7c4b5c5bd9e0',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('4-suportes-microfone-p-bateria-e-percussao-tipo-clamp-mixer','product-f26cd07b9c22',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('suporte-pedestal-girafa-para-microfone-smlight-cachimbo','product-bfbae0421a15',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('amplificador-fone-ouvido-estereoprofissional-palco-8-canais','product-0d67dd706d63',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('projetor-epson-powerlite-e20-xga-3400-lumens-cor-branco','product-03cb5030e458',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('mesa-de-som-16-canais-bluetooth-az-audio-azm16-fx','product-e5b75d97066b',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('mesa-de-som-12-canais-bluetooth-az-audio-azm12-fx','product-a692916fb151',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('amplificador-de-fone-vedo-ha800-p-8-canais','product-9e5b119cd436',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('fone-de-ouvido-akg-k414p-profissional-fechado-preto','product-afb6c48cb1d3',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('cabo-extensor-p2-femea-p10-macho-15m-m-m-cabos','product-d1b921990df2',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('cabo-extensor-p2-femea-p10-macho-10m-m-m-cabos','product-540a6313443a',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('cabo-extensor-p2-femea-p10-macho-5m-m-m-cabos','product-00d926a14ddb',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('canhao-par-luatek-led-cob-200w-branco-quente-e-frio','product-3d813cb5b48a',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('duonn-axios-16-som-digital-de-mesa','product-fbdfaba8a166',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('duonn-axios-24-som-digital-de-mesa','product-38370742c6f7',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('duonn-axios-32-som-digital-de-mesa','product-1ec94591756a',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('rolo-de-cabo-microfone-santo-angelo-x30-30-metros','product-e03d2bae023e',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('kit-20-plug-conector-xlr-cannon-macho-femea-corpo-metalico','product-1a4718417c10',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('mesa-dmx-512-controladora-192-canais-cabo-dmx','product-3c0b10138492',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('kit-10-canhao-refletor-36-leds-par-64-rgb-dmx-slim-strobo','product-b05415ce9d46',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('kit-2-canhao-36-led-rgb-3w-parled-triled-refletor-strobo-dmx','product-dbb40e140216',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('canhao-refletor-spot-par-38-com-bandeira-barndoor-integrado-127','product-fcd3e7c5cfe9',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('lampada-halogena-par-38-120w-e27-branco-quente','product-5099466c6517',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('cabo-de-rede-montado-dupla-capa-blindado-externo-rj45-cat5e','product-bfe51569a83b',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('conector-rj45-cat5e-blindado-banhado-a-ouro-para-redes','product-e1b957b0b92b',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('multicabo-rj45','product-5a3ce0e1f823',1,'2026-09-17T00:00:00.000Z');
INSERT OR IGNORE INTO link_slugs (slug,product_id,is_primary,created_at) VALUES ('camera-ptz-smtav-1080p','product-b2c74e3787c0',1,'2026-09-17T00:00:00.000Z');
