-- Kits do dia a dia: foto do Pay-Pay com fundo branco puro (v4), descrição sem o nome "Alpha Pocket" e com os itens um
-- por linha (o card do kit mostra essas linhas logo abaixo da foto).
UPDATE produtos SET descricao = E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 2 sedas Pay-Pay Go Green Slim\n• 1 piteira Papelito Biodegradável Mega Longa\n\nTudo o que não pode faltar, com produtos das melhores marcas, num kit exclusivo Alpha Galerie. Pronto para sair com você a qualquer momento.'
 WHERE nome = 'PAY-PAY KIT ALPHA';

UPDATE produtos SET descricao = E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 1 tabaco Acrema Blend 20g\n• 1 seda Alpha Hemp Brasil Slim Brown\n• 1 seda Mascotte Slim Brown\n• 1 triturador Papelito\n• 1 piteira Alpha\n• 1 isqueiro BIC grande\n\nO kit completo, com tabaco: tudo o que não pode faltar, com produtos das melhores marcas, num kit exclusivo Alpha Galerie. Pronto para sair com você a qualquer momento.'
 WHERE nome = 'ACREMA KIT ALPHA';

UPDATE produtos SET imagem_url = 'https://www.alphagalerie.com/kits/kit-pay-pay-alpha-v4.jpg'
 WHERE nome = 'PAY-PAY KIT ALPHA';
