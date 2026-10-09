YTM Discord RPC

Estrutura:
- extension/: arquivos carregados pelo Brave/Chromium.
- server/: servidor local e dependências do Discord RPC.

Iniciar o servidor:
1. Abra o Discord desktop.
2. Execute server/dist/YTM_Discord_RPC.exe e deixe-o aberto.

Para iniciar pelo código-fonte, instale o Node.js, abra a pasta server no CMD e execute:
   npm install
   node server.js

Para reconstruir o executável no Windows, use Node.js 24.8 ou mais recente e execute na pasta server:
   npm install
   npm run build:exe

O executável é gerado em server/dist/YTM_Discord_RPC.exe.

Instalação da extensão no Brave:
1. Abra brave://extensions e ative o Modo do desenvolvedor.
2. Clique em Carregar sem compactação.
3. Selecione a pasta extension dentro da pasta do projeto.

Comportamento:
- Tocando: atividade com música, artista e progresso.
- Pausado: atividade removida do Discord.
- Play novamente: atividade recriada.
- Título não é usado como texto da imagem, evitando duplicação.
